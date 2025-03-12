/**
 * Utility functions for handling SHP files
 */
import type { GeoJSONCollection, GeoJSONFeature } from './store';

// Define a type that matches what shpjs returns
interface ShpjsGeoJSON {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: any;
    };
    properties?: Record<string, any>;
  }>;
}

/**
 * Reads and parses SHP files and related files (.dbf, .shx)
 * @param shpFile - The main SHP file
 * @param dbfFile - Optional DBF file containing attribute data
 * @param shxFile - Optional SHX file containing index data
 * @returns Promise resolving to a GeoJSON collection
 */
export async function readShapefile(
  shpFile: File,
  dbfFile?: File,
  shxFile?: File
): Promise<{
  geojson: GeoJSONCollection;
  name: string;
}> {
  try {
    // Validate input
    if (!shpFile || !shpFile.name.endsWith('.shp')) {
      throw new Error('Invalid SHP file');
    }

    // Extract base name
    const baseName = shpFile.name.slice(0, -4);

    // Dynamically import shpjs
    const shp = await import('shpjs');

    // Read files as ArrayBuffers
    const fileBuffers = await Promise.all(
      [shpFile, dbfFile, shxFile].filter(Boolean).map((file) => {
        return new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file as File);
        });
      })
    );

    // Parse SHP file (with optional SHX)
    const geojson = await shp.default.parseShp(fileBuffers[0], fileBuffers[2]);
    
    // Parse DBF file if available
    const dbf = dbfFile ? await shp.default.parseDbf(fileBuffers[1]) : [];

    // Combine the data
    const features = shp.default.combine([geojson, dbf]) as ShpjsGeoJSON;

    // Convert to our GeoJSONCollection type
    const result: GeoJSONCollection = {
      type: features.type,
      features: features.features.map(feature => ({
        type: feature.type,
        geometry: feature.geometry,
        properties: feature.properties || {}
      })) as GeoJSONFeature[]
    };

    return {
      geojson: result,
      name: baseName,
    };
  } catch (error) {
    console.error('Error reading shapefile:', error);
    throw error;
  }
}

/**
 * Validates if a set of files contains a valid SHP file set
 * @param files - Array of files to validate
 * @returns Object containing validation result and extracted files
 */
export function validateShapefileSet(files: File[]): {
  isValid: boolean;
  shpFile?: File;
  dbfFile?: File;
  shxFile?: File;
  missingFiles: string[];
  baseName?: string;
} {
  // Find SHP file
  const shpFile = files.find((file) => file.name.endsWith('.shp'));
  
  if (!shpFile) {
    return {
      isValid: false,
      missingFiles: ['.shp'],
    };
  }

  // Extract base name
  const baseName = shpFile.name.slice(0, -4);
  
  // Find related files
  const dbfFile = files.find((file) => file.name === `${baseName}.dbf`);
  const shxFile = files.find((file) => file.name === `${baseName}.shx`);
  
  // Check for missing files
  const missingFiles = [];
  if (!dbfFile) missingFiles.push('.dbf');
  if (!shxFile) missingFiles.push('.shx');
  
  return {
    isValid: missingFiles.length === 0,
    shpFile,
    dbfFile,
    shxFile,
    missingFiles,
    baseName,
  };
} 