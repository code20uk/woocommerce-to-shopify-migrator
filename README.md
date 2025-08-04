# WooCommerce to Shopify Product Converter

A Node.js application that converts WooCommerce product exports to Shopify import format. This tool handles both simple and variable products, including proper mapping of product attributes, variations, pricing, and inventory data.

## Features

✅ **Complete Product Conversion**: Converts WooCommerce products to Shopify format  
✅ **Variable Product Support**: Handles products with variations/options  
✅ **Weight Conversion**: Automatically converts pounds to grams  
✅ **SEO-Friendly Handles**: Generates URL-friendly product handles  
✅ **Inventory Mapping**: Maps stock status and quantities  
✅ **Image Support**: Preserves product images  
✅ **Pricing**: Handles regular and sale prices  
✅ **Bulk Processing**: Processes large product catalogs efficiently  

## Installation

1. **Clone or download this project**
   ```bash
   git clone <repository-url>
   cd woocommerce-to-shopify-converter
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

## Usage

### Command Line Interface

```bash
# Basic usage - output file will be auto-generated
node converter.js your-woocommerce-export.csv

# Specify custom output file
node converter.js your-woocommerce-export.csv shopify-import.csv
```

### Programmatic Usage

```javascript
const WooCommerceToShopifyConverter = require('./converter.js');

const converter = new WooCommerceToShopifyConverter();

converter.convertFile('input.csv', 'output.csv')
  .then(result => {
    console.log('Conversion completed!');
    console.log(`Converted ${result.originalProducts} products to ${result.convertedVariants} variants`);
  })
  .catch(error => {
    console.error('Conversion failed:', error);
  });
```

## Field Mapping

| WooCommerce Field | Shopify Field | Notes |
|------------------|---------------|-------|
| Name | Title | Product title |
| Description | Body (HTML) | Product description |
| Short description | SEO Description | Used for meta description |
| SKU | Variant SKU | Product SKU |
| Regular price | Variant Price | Regular selling price |
| Sale price | Variant Price | Sale price takes precedence |
| Regular price | Variant Compare At Price | When sale price exists |
| Categories | Type | Product type/category |
| Tags | Tags | Product tags |
| Weight (lbs) | Variant Grams | Converted to grams |
| Stock | Variant Inventory Qty | Inventory quantity |
| In stock? | Variant Inventory Policy | continue/deny |
| Images | Image Src | Product images |
| Published | Status | active/draft |
| Attribute 1 name | Option1 Name | Variation attribute name |
| Attribute 1 value(s) | Option1 Value | Variation values (split) |

## Variable Products

The converter automatically detects WooCommerce variable products and creates separate Shopify variants for each variation:

- **Parent Product**: Contains main product information (title, description, images)
- **Child Variants**: Each variation becomes a separate row with specific option values
- **Pricing**: Uses variation-specific pricing when available
- **Options**: Maps WooCommerce attributes to Shopify options

## Examples

### Simple Product Conversion
```
WooCommerce: "Basic T-Shirt" → Shopify: Single variant with all product data
```

### Variable Product Conversion
```
WooCommerce: "T-Shirt" with sizes S, M, L
↓
Shopify: 
- Row 1: "T-Shirt" with Size=S (includes title, description, images)
- Row 2: "" with Size=M (variant data only)
- Row 3: "" with Size=L (variant data only)
```

## File Requirements

### Input File (WooCommerce Export)
- CSV format from WooCommerce Product Export plugin
- Must include standard WooCommerce product fields
- Supports both simple and variable products

### Output File (Shopify Import)
- CSV format compatible with Shopify's product import
- Includes all required Shopify fields
- Ready for direct import into Shopify admin

## Supported Product Types

- ✅ Simple products
- ✅ Variable products (with variations)
- ✅ Products with custom attributes
- ✅ Products with multiple images
- ✅ Products with sale pricing
- ⚠️ Grouped products (converted as simple)
- ⚠️ External products (converted as simple)

## Error Handling

The converter includes comprehensive error handling:

- **Invalid CSV**: Graceful parsing with error reporting
- **Missing Fields**: Uses sensible defaults for missing data
- **Data Validation**: Validates numeric fields and formats
- **Progress Tracking**: Shows conversion progress for large files

## Troubleshooting

### Common Issues

1. **"File not found" error**
   - Check file path is correct
   - Ensure file has .csv extension

2. **"Parsing failed" error**
   - Verify CSV format is valid
   - Check for special characters in product names
   - Ensure proper CSV encoding (UTF-8)

3. **Missing product data**
   - Check WooCommerce export includes all required fields
   - Verify products are published in WooCommerce

### Data Validation

Before importing to Shopify:
- Review converted file in spreadsheet software
- Check product titles and descriptions
- Verify pricing and inventory data
- Confirm image URLs are accessible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review your WooCommerce export format
3. Create an issue with sample data (anonymized)

---

**Note**: Always backup your data before importing to Shopify. Test with a small batch of products first to ensure the conversion meets your needs.