/**
 * Tests for SHP file utilities
 */
import { readShapefile, validateShapefileSet } from '@/lib/shp-utils';
import * as shpjs from 'shpjs';

// Mock the shpjs module
jest.mock('shpjs', () => ({
  __esModule: true,
  default: {
    parseShp: jest.fn(),
    parseDbf: jest.fn(),
    combine: jest.fn(),
  },
}));

// Mock FileReader
class MockFileReader {
  onload: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;
  result: ArrayBuffer | null = null;

  readAsArrayBuffer(file: Blob) {
    // Simulate successful read
    setTimeout(() => {
      this.result = new ArrayBuffer(8);
      if (this.onload) this.onload();
    }, 0);
  }
}

// Replace the global FileReader with our mock
global.FileReader = MockFileReader as any;

describe('SHP Utilities', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateShapefileSet', () => {
    test('should return isValid=false when no SHP file is provided', () => {
      const files = [
        new File([], 'test.dbf'),
        new File([], 'test.shx'),
      ];

      const result = validateShapefileSet(files);

      expect(result.isValid).toBe(false);
      expect(result.missingFiles).toContain('.shp');
    });

    test('should detect missing DBF and SHX files', () => {
      const files = [
        new File([], 'test.shp'),
      ];

      const result = validateShapefileSet(files);

      expect(result.isValid).toBe(false);
      expect(result.missingFiles).toContain('.dbf');
      expect(result.missingFiles).toContain('.shx');
    });

    test('should return isValid=true when all required files are present', () => {
      const files = [
        new File([], 'test.shp'),
        new File([], 'test.dbf'),
        new File([], 'test.shx'),
      ];

      const result = validateShapefileSet(files);

      expect(result.isValid).toBe(true);
      expect(result.missingFiles).toHaveLength(0);
      expect(result.shpFile).toBeDefined();
      expect(result.dbfFile).toBeDefined();
      expect(result.shxFile).toBeDefined();
      expect(result.baseName).toBe('test');
    });

    test('should correctly match related files by basename', () => {
      const files = [
        new File([], 'map1.shp'),
        new File([], 'map1.dbf'),
        new File([], 'map1.shx'),
        new File([], 'map2.shp'),
        new File([], 'map2.dbf'),
      ];

      const result = validateShapefileSet(files);

      expect(result.isValid).toBe(true);
      expect(result.baseName).toBe('map1');
      expect(result.shpFile?.name).toBe('map1.shp');
      expect(result.dbfFile?.name).toBe('map1.dbf');
      expect(result.shxFile?.name).toBe('map1.shx');
    });
  });

  describe('readShapefile', () => {
    const mockShpFile = new File([], './files/point/PFP.shp');
    const mockDbfFile = new File([], './files/point/PFP.dbf');
    const mockShxFile = new File([], './files/point/PFP.shx');

    const mockGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0, 0],
          },
        },
      ],
    };

    const mockDbfData = [{ id: 1, name: 'Test' }];

    const mockCombinedData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [0, 0],
          },
          properties: { id: 1, name: 'Test' },
        },
      ],
    };

    beforeEach(() => {
      // Setup mock return values
      (shpjs.default.parseShp as jest.Mock).mockResolvedValue(mockGeoJSON);
      (shpjs.default.parseDbf as jest.Mock).mockResolvedValue(mockDbfData);
      (shpjs.default.combine as jest.Mock).mockReturnValue(mockCombinedData);
    });

    test('should throw an error if SHP file is invalid', async () => {
      await expect(readShapefile(new File([], 'invalid.txt'))).rejects.toThrow('Invalid SHP file');
    });

    test('should process SHP file without DBF and SHX', async () => {
      const result = await readShapefile(mockShpFile);

      expect(shpjs.default.parseShp).toHaveBeenCalledTimes(1);
      expect(shpjs.default.parseDbf).not.toHaveBeenCalled();
      expect(shpjs.default.combine).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('test');
      expect(result.geojson.type).toBe('FeatureCollection');
    });

    test('should process SHP file with DBF and SHX', async () => {
      const result = await readShapefile(mockShpFile, mockDbfFile, mockShxFile);

      expect(shpjs.default.parseShp).toHaveBeenCalledTimes(1);
      expect(shpjs.default.parseDbf).toHaveBeenCalledTimes(1);
      expect(shpjs.default.combine).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('test');
      expect(result.geojson.type).toBe('FeatureCollection');
      expect(result.geojson.features[0].properties).toBeDefined();
    });

    test('should handle errors during file processing', async () => {
      // Mock a failure
      (shpjs.default.parseShp as jest.Mock).mockRejectedValue(new Error('Parse error'));
      
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(readShapefile(mockShpFile)).rejects.toThrow('Parse error');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
}); 