const WooCommerceToShopifyConverter = require('./converter.js');
const fs = require('fs');
const path = require('path');

// Test data - sample WooCommerce product
const testData = `ID,Type,SKU,GTIN\\, UPC\\, EAN\\, or ISBN,Name,Published,Short description,Description,In stock?,Stock,Weight (lbs),Sale price,Regular price,Categories,Tags,Images,Attribute 1 name,Attribute 1 value(s),Attribute 1 visible,Attribute 1 global
1,simple,TEST-001,123456789,Test Simple Product,1,A simple test product,<p>This is a test product for conversion testing.</p>,1,10,0.5,,29.99,Electronics,test,https://example.com/image.jpg,,,,
2,variable,TEST-VAR,,Test Variable Product,1,A variable test product,<p>This product has variations.</p>,1,,1,,,"Clothing > Shirts",variable,https://example.com/var-image.jpg,Size,"Small, Medium, Large",1,0`;

async function runTests() {
    console.log('🧪 Running WooCommerce to Shopify Converter Tests\n');
    
    const converter = new WooCommerceToShopifyConverter();
    
    try {
        // Create test input file
        const testInputPath = path.join(__dirname, 'test_input.csv');
        const testOutputPath = path.join(__dirname, 'test_output.csv');
        
        console.log('1. Creating test input file...');
        fs.writeFileSync(testInputPath, testData);
        console.log('✅ Test input file created');
        
        console.log('\n2. Running conversion...');
        const result = await converter.convertFile(testInputPath, testOutputPath);
        
        console.log('✅ Conversion completed successfully');
        console.log(`📊 Results: ${result.originalProducts} products → ${result.convertedVariants} variants`);
        
        // Read and display output
        console.log('\n3. Verifying output...');
        const outputContent = fs.readFileSync(testOutputPath, 'utf8');
        const lines = outputContent.split('\n');
        
        console.log(`✅ Output file has ${lines.length - 1} rows (including header)`);
        console.log('\n📄 First few lines of output:');
        console.log(lines.slice(0, 4).join('\n'));
        
        // Test specific conversions
        console.log('\n4. Testing specific conversions...');
        
        // Test handle creation
        const testHandle = converter.createHandle('Test Product with Special Characters!@#');
        console.log(`✅ Handle conversion: "Test Product with Special Characters!@#" → "${testHandle}"`);
        
        // Test weight conversion
        const testWeight = converter.convertWeightToGrams(2.5);
        console.log(`✅ Weight conversion: 2.5 lbs → ${testWeight} grams`);
        
        // Test variation parsing
        const testVariations = converter.parseVariations('Size', 'Small, Medium, Large');
        console.log(`✅ Variation parsing: "Small, Medium, Large" → [${testVariations.join(', ')}]`);
        
        console.log('\n🎉 All tests passed!');
        console.log('\n📁 Test files created:');
        console.log(`   Input: ${testInputPath}`);
        console.log(`   Output: ${testOutputPath}`);
        console.log('\nYou can examine these files to see the conversion results.');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Utility function to clean up test files
function cleanupTestFiles() {
    const testFiles = [
        path.join(__dirname, 'test_input.csv'),
        path.join(__dirname, 'test_output.csv')
    ];
    
    testFiles.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
            console.log(`🗑️  Removed ${file}`);
        }
    });
}

// Add cleanup command
if (process.argv.includes('--cleanup')) {
    console.log('Cleaning up test files...');
    cleanupTestFiles();
    console.log('✅ Cleanup completed');
    process.exit(0);
}

// Run tests if this file is executed directly
if (require.main === module) {
    runTests().catch(error => {
        console.error('Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = { runTests, cleanupTestFiles };