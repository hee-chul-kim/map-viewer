/**
 * Integration test for SHP file reading with mocked file content
 * Uses real file names but mocks the file content and reading process
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

describe('SHP File Reader with Real File Names', () => {
  // Create mock files with real names from the CT:PFP folder
  const mockShpFile = new File([], 'PFP.shp');
  const mockDbfFile = new File([], 'PFP.dbf');
  const mockShxFile = new File([], 'PFP.shx');
  const mockPrjFile = new File([], 'PFP.prj');
  const mockQixFile = new File([], 'PFP.qix');
  
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
    test('should correctly identify all required files', () => {
      const allFiles = [mockShpFile, mockDbfFile, mockShxFile, mockPrjFile, mockQixFile];
      const result = validateShapefileSet(allFiles);
      
      expect(result.isValid).toBe(true);
      expect(result.shpFile?.name).toBe('PFP.shp');
      expect(result.dbfFile?.name).toBe('PFP.dbf');
      expect(result.shxFile?.name).toBe('PFP.shx');
      expect(result.baseName).toBe('PFP');
      expect(result.missingFiles).toHaveLength(0);
    });

    test('should handle multiple SHP files and pick the first one', () => {
      const anotherShpFile = new File([], 'ANOTHER.shp');
      const anotherDbfFile = new File([], 'ANOTHER.dbf');
      
      const allFiles = [
        mockShpFile, mockDbfFile, mockShxFile, 
        anotherShpFile, anotherDbfFile
      ];
      
      const result = validateShapefileSet(allFiles);
      
      // It should pick the first SHP file it finds
      expect(result.shpFile?.name).toBe('PFP.shp');
      expect(result.baseName).toBe('PFP');
    });
  });

  describe('readShapefile', () => {
    test('should process the PFP shapefile correctly', async () => {
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

    test('should handle missing DBF file gracefully', async () => {
      const result = await readShapefile(mockShpFile, undefined, mockShxFile);
      
      expect(shpjs.default.parseShp).toHaveBeenCalledTimes(1);
      expect(shpjs.default.parseDbf).not.toHaveBeenCalled();
      expect(shpjs.default.combine).toHaveBeenCalledTimes(1);
      
      expect(result.name).toBe('PFP');
    });

    test('should handle missing SHX file', async () => {
      const result = await readShapefile(mockShpFile, mockDbfFile);
      
      expect(shpjs.default.parseShp).toHaveBeenCalledTimes(1);
      expect(shpjs.default.parseDbf).toHaveBeenCalledTimes(1);
      expect(shpjs.default.combine).toHaveBeenCalledTimes(1);
      
      expect(result.name).toBe('PFP');
    });
  });
}); 