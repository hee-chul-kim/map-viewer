/**
 * Utility for reading SHP files in a Node.js environment
 * This is primarily for testing purposes and not used in the browser app
 */
const fs = require('fs');
const path = require('path');
import type { GeoJSONCollection } from './store';

// Import shpjs dynamically to avoid issues with browser/node environments
let shp: any = null;

/**
 * Reads a shapefile from the filesystem in a Node.js environment
 * @param shpFilePath - Path to the SHP file
 * @param dbfFilePath - Optional path to the DBF file
 * @param shxFilePath - Optional path to the SHX file
 * @returns Promise resolving to a GeoJSON collection
 */
async function readShapefileNode(
  shpFilePath: string,
  dbfFilePath?: string,
  shxFilePath?: string
) {
  try {
    // Validate input
    if (!shpFilePath || !shpFilePath.endsWith('.shp')) {
      throw new Error('Invalid SHP file path');
    }

    // Extract base name
    const baseName = path.basename(shpFilePath, '.shp');

    // Dynamically import shpjs if not already loaded
    if (!shp) {
      const shpModule = await import('shpjs');
      shp = shpModule.default;
    }

    // Read files as buffers
    const shpBuffer = fs.readFileSync(shpFilePath);
    const dbfBuffer = dbfFilePath ? fs.readFileSync(dbfFilePath) : undefined;
    
    // Convert Node.js Buffer to ArrayBuffer for shpjs
    const shpArrayBuffer = shpBuffer.buffer.slice(
      shpBuffer.byteOffset,
      shpBuffer.byteOffset + shpBuffer.byteLength
    );
    
    // Parse the SHP file
    const geojson = await shp.parseShp(shpArrayBuffer);
    
    // Parse the DBF file if available
    let dbfData = [];
    if (dbfBuffer) {
      const dbfArrayBuffer = dbfBuffer.buffer.slice(
        dbfBuffer.byteOffset,
        dbfBuffer.byteOffset + dbfBuffer.byteLength
      );
      dbfData = await shp.parseDbf(dbfArrayBuffer);
    }
    
    // Combine the data
    const result = shp.combine([geojson, dbfData]);

    return {
      geojson: result,
      name: baseName,
    };
  } catch (error) {
    console.error('Error reading shapefile in Node environment:', error);
    throw error;
  }
}

/**
 * Validates if a set of file paths contains a valid SHP file set
 * @param filePaths - Array of file paths to validate
 * @returns Object containing validation result and extracted file paths
 */
function validateShapefileSetNode(filePaths: string[]) {
  // Find SHP file
  const shpFilePath = filePaths.find((filePath: string) => filePath.endsWith('.shp'));
  
  if (!shpFilePath) {
    return {
      isValid: false,
      missingFiles: ['.shp'],
    };
  }

  // Extract base name
  const baseName = path.basename(shpFilePath, '.shp');
  const baseDir = path.dirname(shpFilePath);
  
  // Find related files
  const dbfFilePath = filePaths.find((filePath: string) => path.basename(filePath) === `${baseName}.dbf`);
  const shxFilePath = filePaths.find((filePath: string) => path.basename(filePath) === `${baseName}.shx`);
  
  // Check for missing files
  const missingFiles = [];
  if (!dbfFilePath) missingFiles.push('.dbf');
  if (!shxFilePath) missingFiles.push('.shx');
  
  return {
    isValid: missingFiles.length === 0,
    shpFilePath,
    dbfFilePath,
    shxFilePath,
    missingFiles,
    baseName,
  };
}

module.exports = {
  readShapefileNode,
  validateShapefileSetNode
}; 