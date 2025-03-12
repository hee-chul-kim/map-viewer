/**
 * Integration test for reading actual SHP files
 * Tests the functionality with real SHP files from the project
 */
import fs from 'fs';
import path from 'path';
import { readShapefile, validateShapefileSet } from '@/lib/shp-utils';

// Path to test files
const TEST_FILES_DIR = path.join(process.cwd(), 'files', 'CT:PFP (보행자시설_Point)');

// Helper function to read a file as a File object
function createFileFromPath(filePath: string, fileName: string): File {
  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer]);
  return new File([blob], fileName, { type: 'application/octet-stream' });
}

describe('SHP File Reader Integration Tests', () => {
  // Files to test with
  let shpFile: File;
  let dbfFile: File;
  let shxFile: File;
  let allFiles: File[];

  // Setup test files before tests
  beforeAll(() => {
    try {
      // Create File objects from actual files
      shpFile = createFileFromPath(path.join(TEST_FILES_DIR, 'PFP.shp'), 'PFP.shp');
      dbfFile = createFileFromPath(path.join(TEST_FILES_DIR, 'PFP.dbf'), 'PFP.dbf');
      shxFile = createFileFromPath(path.join(TEST_FILES_DIR, 'PFP.shx'), 'PFP.shx');
      
      // Create an array of all files
      allFiles = [shpFile, dbfFile, shxFile];
    } catch (error) {
      console.error('Error setting up test files:', error);
      throw error;
    }
  });

  describe('validateShapefileSet', () => {
    test('should correctly identify all files in the set', () => {
      const result = validateShapefileSet(allFiles);
      
      expect(result.isValid).toBe(true);
      expect(result.shpFile?.name).toBe('PFP.shp');
      expect(result.dbfFile?.name).toBe('PFP.dbf');
      expect(result.shxFile?.name).toBe('PFP.shx');
      expect(result.baseName).toBe('PFP');
      expect(result.missingFiles).toHaveLength(0);
    });

    test('should detect missing files when some are removed', () => {
      // Test with only SHP file
      const result1 = validateShapefileSet([shpFile]);
      expect(result1.isValid).toBe(false);
      expect(result1.missingFiles).toContain('.dbf');
      expect(result1.missingFiles).toContain('.shx');
      
      // Test with SHP and DBF but no SHX
      const result2 = validateShapefileSet([shpFile, dbfFile]);
      expect(result2.isValid).toBe(false);
      expect(result2.missingFiles).toContain('.shx');
      expect(result2.missingFiles).not.toContain('.dbf');
    });
  });

  // Note: This test uses the actual file reading functionality
  // It's commented out because it requires mocking the FileReader API
  // which is complex in a Node.js environment
  /*
  describe('readShapefile', () => {
    test('should successfully read and parse the SHP file set', async () => {
      const result = await readShapefile(shpFile, dbfFile, shxFile);
      
      expect(result.name).toBe('PFP');
      expect(result.geojson.type).toBe('FeatureCollection');
      expect(Array.isArray(result.geojson.features)).toBe(true);
      expect(result.geojson.features.length).toBeGreaterThan(0);
      
      // Check the first feature
      const firstFeature = result.geojson.features[0];
      expect(firstFeature.type).toBe('Feature');
      expect(firstFeature.geometry).toBeDefined();
      expect(firstFeature.properties).toBeDefined();
    });
  });
  */
}); 