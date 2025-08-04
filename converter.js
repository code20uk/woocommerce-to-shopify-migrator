const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

class WooCommerceToShopifyConverter {
    constructor() {
        this.shopifyHeaders = [
            'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags', 'Published',
            'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
            'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty',
            'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price',
            'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode', 'Image Src', 'Image Position',
            'Image Alt Text', 'Gift Card', 'SEO Title', 'SEO Description', 'Google Shopping / Google Product Category',
            'Google Shopping / Gender', 'Google Shopping / Age Group', 'Google Shopping / MPN',
            'Google Shopping / Condition', 'Google Shopping / Custom Product', 'Variant Image', 'Variant Weight Unit',
            'Variant Tax Code', 'Cost per item', 'Included / United States', 'Price / United States',
            'Compare At Price / United States', 'Included / International', 'Price / International',
            'Compare At Price / International', 'Status'
        ];
    }

    // Clean and create URL-friendly handle from product name
    createHandle(name) {
        if (!name) return '';
        return name.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    // Convert WooCommerce weight (lbs) to Shopify grams
    convertWeightToGrams(weightLbs) {
        if (!weightLbs || isNaN(weightLbs)) return null;
        return Math.round(weightLbs * 453.592); // 1 lb = 453.592 grams
    }

    // Parse attribute variations from WooCommerce format
    parseVariations(attributeName, attributeValues) {
        if (!attributeValues) return [];
        
        // Split by comma and clean up each value
        return attributeValues.split(',').map(value => value.trim());
    }

    // Filter out variation rows and keep only parent products
    filterParentProducts(products) {
        const parentProducts = products.filter(product => {
            // Keep only 'variable' and 'simple' products, exclude 'variation' products
            return product['Type'] === 'variable' || product['Type'] === 'simple';
        });
        
        console.log(`Filtered ${parentProducts.length} parent products from ${products.length} total rows`);
        return parentProducts;
    }

    // Create a mapping of variations to their pricing data
    createVariationPricingMap(allProducts) {
        const variationMap = new Map();
        
        // Get all variation rows
        const variations = allProducts.filter(product => product['Type'] === 'variation');
        
        variations.forEach(variation => {
            const fullName = variation['Name'] || '';
            // Extract the parent product name and variant value
            const parts = fullName.split(' - ');
            if (parts.length >= 2) {
                const parentName = parts[0];
                const variantValue = parts.slice(1).join(' - '); // Handle multi-part variants like "SPF 30 - Vanilla"
                
                const key = `${parentName}|${variantValue}`;
                variationMap.set(key, {
                    regularPrice: variation['Regular price'],
                    salePrice: variation['Sale price'],
                    stock: variation['Stock'],
                    inStock: variation['In stock?']
                });
            }
        });
        
        console.log(`Created pricing map for ${variationMap.size} variations`);
        return variationMap;
    }

    // Parse multiple images from WooCommerce format
    parseImages(imageString) {
        if (!imageString) return [];
        
        // Split by comma and clean up each URL
        return imageString.split(',').map(url => url.trim()).filter(url => url.length > 0);
    }

    // Convert a single WooCommerce parent product to Shopify variants
    convertSingleProduct(wooProduct, variationPricingMap) {
        const productName = wooProduct['Name'] || '';
        const handle = this.createHandle(productName);
        const isVariable = wooProduct['Type'] === 'variable';
        
        // Parse images
        const images = this.parseImages(wooProduct['Images']);
        
        let optionName = '';
        let optionValues = [];
        
        if (isVariable && wooProduct['Attribute 1 name'] && wooProduct['Attribute 1 value(s)']) {
            // Variable product with defined attributes
            optionName = wooProduct['Attribute 1 name'];
            optionValues = this.parseVariations(
                wooProduct['Attribute 1 name'], 
                wooProduct['Attribute 1 value(s)']
            );
        } else {
            // Simple product - single variant
            optionValues = [''];
        }
        
        const shopifyProducts = [];
        
        // Create variants for this product
        optionValues.forEach((optionValue, variantIndex) => {
            // Get pricing from variation map if available
            let variantPrice = wooProduct['Sale price'] || wooProduct['Regular price'] || wooProduct['Meta: _min_variation_price'] || 0;
            let compareAtPrice = '';
            let variantStock = wooProduct['Stock'] || 0;
            let inventoryPolicy = wooProduct['In stock?'] === 1 ? 'continue' : 'deny';
            
            if (isVariable && optionValue) {
                // Look up pricing from variation data
                const variationKey = `${productName}|${optionValue}`;
                const variationData = variationPricingMap.get(variationKey);
                
                if (variationData) {
                    variantPrice = variationData.salePrice || variationData.regularPrice || variantPrice;
                    compareAtPrice = variationData.salePrice && variationData.regularPrice ? variationData.regularPrice : '';
                    variantStock = variationData.stock || variantStock;
                    inventoryPolicy = variationData.inStock === 1 ? 'continue' : 'deny';
                }
            }
            
            const shopifyProduct = {
                'Handle': handle,
                'Title': variantIndex === 0 ? productName : '', // Only first variant gets title
                'Body (HTML)': variantIndex === 0 ? (wooProduct['Description'] || wooProduct['Short description'] || '') : '',
                'Vendor': variantIndex === 0 ? '' : '',
                'Product Category': variantIndex === 0 ? (wooProduct['Categories'] || '') : '',
                'Type': variantIndex === 0 ? (wooProduct['Categories'] || '') : '',
                'Tags': variantIndex === 0 ? (wooProduct['Tags'] || '') : '',
                'Published': variantIndex === 0 ? (wooProduct['Published'] === 1 ? 'TRUE' : 'FALSE') : '',
                'Option1 Name': variantIndex === 0 ? optionName : '',
                'Option1 Value': optionValue,
                'Option2 Name': '',
                'Option2 Value': '',
                'Option3 Name': '',
                'Option3 Value': '',
                'Variant SKU': wooProduct['SKU'] || '',
                'Variant Grams': this.convertWeightToGrams(wooProduct['Weight (lbs)']),
                'Variant Inventory Tracker': 'shopify',
                'Variant Inventory Qty': variantStock,
                'Variant Inventory Policy': inventoryPolicy,
                'Variant Fulfillment Service': 'manual',
                'Variant Price': variantPrice,
                'Variant Compare At Price': compareAtPrice,
                'Variant Requires Shipping': 'TRUE',
                'Variant Taxable': 'TRUE',
                'Variant Barcode': wooProduct['GTIN, UPC, EAN, or ISBN'] || '',
                'Image Src': variantIndex === 0 && images.length > 0 ? images[0] : '', // Only first variant gets first image
                'Image Position': variantIndex === 0 && images.length > 0 ? 1 : '',
                'Image Alt Text': variantIndex === 0 && images.length > 0 ? productName : '',
                'Gift Card': 'FALSE',
                'SEO Title': variantIndex === 0 ? productName : '',
                'SEO Description': variantIndex === 0 ? (wooProduct['Short description'] || '') : '',
                'Google Shopping / Google Product Category': '',
                'Google Shopping / Gender': '',
                'Google Shopping / Age Group': 'adult',
                'Google Shopping / MPN': wooProduct['GTIN, UPC, EAN, or ISBN'] || '',
                'Google Shopping / Condition': 'new',
                'Google Shopping / Custom Product': 'FALSE',
                'Variant Image': '',
                'Variant Weight Unit': 'g',
                'Variant Tax Code': '',
                'Cost per item': '',
                'Included / United States': 'TRUE',
                'Price / United States': '',
                'Compare At Price / United States': '',
                'Included / International': 'TRUE',
                'Price / International': '',
                'Compare At Price / International': '',
                'Status': variantIndex === 0 ? (wooProduct['Published'] === 1 ? 'active' : 'draft') : ''
            };
            
            shopifyProducts.push(shopifyProduct);
        });
        
        // Add additional rows for additional images (if any)
        if (images.length > 1) {
            for (let i = 1; i < images.length; i++) {
                const additionalImageRow = {
                    'Handle': handle,
                    'Title': '',
                    'Body (HTML)': '',
                    'Vendor': '',
                    'Product Category': '',
                    'Type': '',
                    'Tags': '',
                    'Published': '',
                    'Option1 Name': '',
                    'Option1 Value': '',
                    'Option2 Name': '',
                    'Option2 Value': '',
                    'Option3 Name': '',
                    'Option3 Value': '',
                    'Variant SKU': '',
                    'Variant Grams': '',
                    'Variant Inventory Tracker': '',
                    'Variant Inventory Qty': '',
                    'Variant Inventory Policy': '',
                    'Variant Fulfillment Service': '',
                    'Variant Price': '',
                    'Variant Compare At Price': '',
                    'Variant Requires Shipping': '',
                    'Variant Taxable': '',
                    'Variant Barcode': '',
                    'Image Src': images[i],
                    'Image Position': i + 1,
                    'Image Alt Text': productName,
                    'Gift Card': '',
                    'SEO Title': '',
                    'SEO Description': '',
                    'Google Shopping / Google Product Category': '',
                    'Google Shopping / Gender': '',
                    'Google Shopping / Age Group': '',
                    'Google Shopping / MPN': '',
                    'Google Shopping / Condition': '',
                    'Google Shopping / Custom Product': '',
                    'Variant Image': '',
                    'Variant Weight Unit': '',
                    'Variant Tax Code': '',
                    'Cost per item': '',
                    'Included / United States': '',
                    'Price / United States': '',
                    'Compare At Price / United States': '',
                    'Included / International': '',
                    'Price / International': '',
                    'Compare At Price / International': '',
                    'Status': ''
                };
                
                shopifyProducts.push(additionalImageRow);
            }
        }
        
        return shopifyProducts;
    }

    // Convert parent products to Shopify format without grouping
    // Each WooCommerce parent product becomes one Shopify product
    convertParentProducts(parentProducts, variationPricingMap) {
        const shopifyProducts = [];
        
        parentProducts.forEach((wooProduct, index) => {
            try {
                const convertedProducts = this.convertSingleProduct(wooProduct, variationPricingMap);
                shopifyProducts.push(...convertedProducts);
                
                console.log(`Processed product ${index + 1}/${parentProducts.length}: "${wooProduct.Name}" → ${convertedProducts.length} rows`);
            } catch (error) {
                console.error(`Error converting product "${wooProduct.Name}":`, error.message);
            }
        });
        
        return shopifyProducts;
    }

    // Main conversion function
    async convertFile(inputPath, outputPath = null) {
        try {
            console.log('Reading WooCommerce export file...');
            const csvContent = fs.readFileSync(inputPath, 'utf8');
            
            console.log('Parsing CSV data...');
            const parseResult = Papa.parse(csvContent, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                delimitersToGuess: [',', '\t', '|', ';']
            });

            if (parseResult.errors.length > 0) {
                console.warn('CSV parsing warnings:', parseResult.errors);
            }

            console.log(`Found ${parseResult.data.length} total rows...`);
            
            // Filter to only parent products (not individual variations)
            const parentProducts = this.filterParentProducts(parseResult.data);
            
            // Create pricing map from variation data
            console.log('Creating pricing map from variation data...');
            const variationPricingMap = this.createVariationPricingMap(parseResult.data);
            
            console.log('Converting parent products to Shopify format...');
            const shopifyProducts = this.convertParentProducts(parentProducts, variationPricingMap);

            console.log(`Converting ${shopifyProducts.length} product variants to CSV...`);
            
            // Convert to CSV
            const csvOutput = Papa.unparse({
                fields: this.shopifyHeaders,
                data: shopifyProducts
            });

            // Determine output path
            if (!outputPath) {
                const inputDir = path.dirname(inputPath);
                const inputName = path.basename(inputPath, path.extname(inputPath));
                outputPath = path.join(inputDir, `${inputName}_shopify_import.csv`);
            }

            // Write output file
            fs.writeFileSync(outputPath, csvOutput, 'utf8');
            
            console.log(`✅ Conversion completed successfully!`);
            console.log(`📁 Output saved to: ${outputPath}`);
            console.log(`📊 Converted ${parentProducts.length} WooCommerce parent products to ${parentProducts.length} Shopify products with ${shopifyProducts.length} total variants`);
            
            return {
                success: true,
                inputPath,
                outputPath,
                originalProducts: parentProducts.length,
                shopifyProducts: parentProducts.length,
                totalVariants: shopifyProducts.length
            };

        } catch (error) {
            console.error('❌ Conversion failed:', error.message);
            throw error;
        }
    }
}

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
🛍️  WooCommerce to Shopify Product Converter

Usage:
  node converter.js <input-file> [output-file]

Examples:
  node converter.js products.csv
  node converter.js products.csv shopify_products.csv
  
The converter will:
✓ Convert WooCommerce product exports to Shopify import format
✓ Handle variable products with options/variations
✓ Keep each WooCommerce parent product as a separate Shopify product
✓ Convert weights from pounds to grams
✓ Map product fields appropriately
✓ Generate SEO-friendly handles
✓ Set appropriate inventory and shipping defaults
        `);
        process.exit(1);
    }

    const inputFile = args[0];
    const outputFile = args[1];

    if (!fs.existsSync(inputFile)) {
        console.error(`❌ Input file not found: ${inputFile}`);
        process.exit(1);
    }

    const converter = new WooCommerceToShopifyConverter();
    
    converter.convertFile(inputFile, outputFile)
        .then(result => {
            console.log('\n🎉 Conversion Summary:');
            console.log(`   Original WooCommerce parent products: ${result.originalProducts}`);
            console.log(`   Shopify products created: ${result.shopifyProducts}`);
            console.log(`   Total variants/rows: ${result.totalVariants}`);
            console.log(`   Output file: ${result.outputPath}`);
        })
        .catch(error => {
            console.error('\n💥 Conversion failed:', error.message);
            process.exit(1);
        });
}

module.exports = WooCommerceToShopifyConverter;