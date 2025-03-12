/**
 * Command-line script to read and display SHP file contents
 * Usage: npx ts-node scripts/read-shp.ts <path-to-shp-file>
 */
const path = require('path');
const fs = require('fs');
const shpReader = require('../lib/node-shp-reader');

async function main() {
  try {
    // Get the SHP file path from command line arguments
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Please provide a path to a SHP file');
      console.error('Usage: npx ts-node scripts/read-shp.ts <path-to-shp-file>');
      process.exit(1);
    }

    const shpFilePath = args[0];
    
    // Check if the file exists
    if (!fs.existsSync(shpFilePath)) {
      console.error(`File not found: ${shpFilePath}`);
      process.exit(1);
    }
    
    // Get the directory and base name
    const directory = path.dirname(shpFilePath);
    const baseName = path.basename(shpFilePath, '.shp');
    
    // Find related files
    const dbfFilePath = path.join(directory, `${baseName}.dbf`);
    const shxFilePath = path.join(directory, `${baseName}.shx`);
    
    // Check if related files exist
    const hasDbf = fs.existsSync(dbfFilePath);
    const hasShx = fs.existsSync(shxFilePath);
    
    console.log('SHP File Information:');
    console.log(`- SHP: ${shpFilePath} (${fs.existsSync(shpFilePath) ? 'Found' : 'Missing'})`);
    console.log(`- DBF: ${dbfFilePath} (${hasDbf ? 'Found' : 'Missing'})`);
    console.log(`- SHX: ${shxFilePath} (${hasShx ? 'Found' : 'Missing'})`);
    
    // Validate the shapefile set
    const filePaths = fs.readdirSync(directory)
      .filter((file: string) => file.startsWith(baseName))
      .map((file: string) => path.join(directory, file));
    
    const validationResult = shpReader.validateShapefileSetNode(filePaths);
    console.log('\nValidation Result:');
    console.log(`- Valid Set: ${validationResult.isValid}`);
    if (validationResult.missingFiles.length > 0) {
      console.log(`- Missing Files: ${validationResult.missingFiles.join(', ')}`);
    }
    
    // Read the shapefile if all required files are present
    if (fs.existsSync(shpFilePath)) {
      console.log('\nReading SHP file...');
      const result = await shpReader.readShapefileNode(
        shpFilePath,
        hasDbf ? dbfFilePath : undefined,
        hasShx ? shxFilePath : undefined
      );
      
      console.log('\nSHP File Contents:');
      console.log(`- Name: ${result.name}`);
      console.log(`- Type: ${result.geojson.type}`);
      console.log(`- Features: ${result.geojson.features.length}`);
      
      // Display the first feature
      if (result.geojson.features.length > 0) {
        const firstFeature = result.geojson.features[0];
        console.log('\nFirst Feature:');
        console.log(`- Type: ${firstFeature.geometry.type}`);
        console.log(`- Coordinates: ${JSON.stringify(firstFeature.geometry.coordinates).slice(0, 100)}...`);
        
        // Display properties
        console.log('- Properties:');
        Object.entries(firstFeature.properties).slice(0, 5).forEach(([key, value]) => {
          console.log(`  - ${key}: ${value}`);
        });
        
        if (Object.keys(firstFeature.properties).length > 5) {
          console.log(`  - ... and ${Object.keys(firstFeature.properties).length - 5} more properties`);
        }
      }
      
      // Save a sample of the data to a JSON file for inspection
      const sampleData = {
        type: result.geojson.type,
        features: result.geojson.features.slice(0, 5),
      };
      
      const sampleFilePath = path.join(directory, `${baseName}-sample.json`);
      fs.writeFileSync(sampleFilePath, JSON.stringify(sampleData, null, 2));
      console.log(`\nSample data saved to: ${sampleFilePath}`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 