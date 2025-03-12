/**
 * Integration test for SHP file reading
 * Uses real file names from the CT:PFP folder but mocks the actual file reading
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

describe('SHP File Reading Tests with CT:PFP Files', () => {
  // Create mock files with real names from the CT:PFP folder
  const mockShpFile = new File([], 'PFP.shp');
  const mockDbfFile = new File([], 'PFP.dbf');
  const mockShxFile = new File([], 'PFP.shx');
  
  // Sample GeoJSON data that would be returned by shpjs
  const mockGeoJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [126.978275, 37.566642], // Seoul coordinates
        },
      },
    ],
  };

  // Sample attribute data that would be in the DBF file
  const mockDbfData = [
    { 
      ID: 1, 
      NAME: '횡단보도', 
      TYPE: 'CROSSWALK',
      CREATED_AT: '2023-01-01',
      STATUS: 'ACTIVE'
    }
  ];

  // Combined data with geometry and attributes
  const mockCombinedData = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [126.978275, 37.566642],
        },
        properties: { 
          ID: 1, 
          NAME: '횡단보도', 
          TYPE: 'CROSSWALK',
          CREATED_AT: '2023-01-01',
          STATUS: 'ACTIVE'
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock return values
    (shpjs.default.parseShp as jest.Mock).mockResolvedValue(mockGeoJSON);
    (shpjs.default.parseDbf as jest.Mock).mockResolvedValue(mockDbfData);
    (shpjs.default.combine as jest.Mock).mockReturnValue(mockCombinedData);
  });

  describe('validateShapefileSet', () => {
    test('should correctly identify PFP files', () => {
      const allFiles = [mockShpFile, mockDbfFile, mockShxFile];
      const result = validateShapefileSet(allFiles);
      
      expect(result.isValid).toBe(true);
      expect(result.shpFile?.name).toBe('PFP.shp');
      expect(result.dbfFile?.name).toBe('PFP.dbf');
      expect(result.shxFile?.name).toBe('PFP.shx');
      expect(result.baseName).toBe('PFP');
      expect(result.missingFiles).toHaveLength(0);
    });

    test('should detect missing files in PFP set', () => {
      // Test with only SHP file
      const result1 = validateShapefileSet([mockShpFile]);
      expect(result1.isValid).toBe(false);
      expect(result1.missingFiles).toContain('.dbf');
      expect(result1.missingFiles).toContain('.shx');
      
      // Test with SHP and DBF but no SHX
      const result2 = validateShapefileSet([mockShpFile, mockDbfFile]);
      expect(result2.isValid).toBe(false);
      expect(result2.missingFiles).toContain('.shx');
      expect(result2.missingFiles).not.toContain('.dbf');
    });
  });

  describe('readShapefile', () => {
    test('should process PFP shapefile correctly', async () => {
      const result = await readShapefile(mockShpFile, mockDbfFile, mockShxFile);
      
      // Verify the correct methods were called
      expect(shpjs.default.parseShp).toHaveBeenCalledTimes(1);
      expect(shpjs.default.parseDbf).toHaveBeenCalledTimes(1);
      expect(shpjs.default.combine).toHaveBeenCalledTimes(1);
      
      // Verify the result
      expect(result.name).toBe('PFP');
      expect(result.geojson.type).toBe('FeatureCollection');
      expect(result.geojson.features).toHaveLength(1);
      
      // Check the feature data
      const feature = result.geojson.features[0];
      expect(feature.geometry.type).toBe('Point');
      expect(feature.geometry.coordinates).toEqual([126.978275, 37.566642]);
      expect(feature.properties.NAME).toBe('횡단보도');
      expect(feature.properties.TYPE).toBe('CROSSWALK');
    });

    test('should handle missing DBF file in PFP set', async () => {
      const result = await readShapefile(mockShpFile, undefined, mockShxFile);
      
      expect(shpjs.default.parseShp).toHaveBeenCalledTimes(1);
      expect(shpjs.default.parseDbf).not.toHaveBeenCalled();
      expect(shpjs.default.combine).toHaveBeenCalledTimes(1);
      
      expect(result.name).toBe('PFP');
    });

    test('should handle missing SHX file in PFP set', async () => {
      const result = await readShapefile(mockShpFile, mockDbfFile);
      
      expect(shpjs.default.parseShp).toHaveBeenCalledTimes(1);
      expect(shpjs.default.parseDbf).toHaveBeenCalledTimes(1);
      expect(shpjs.default.combine).toHaveBeenCalledTimes(1);
      
      expect(result.name).toBe('PFP');
    });
  });
}); 