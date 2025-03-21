import { v4 as uuidv4 } from 'uuid';
import { GeoJsonCollection as GeoJsonCollection, Shapefile } from '@/types/geometry';
import { parseShp, parseDbf, parsePrj } from './parser';
import { COORDINATE_SYSTEMS, DEFAULT_STYLE } from './consts';
import proj4 from 'proj4';

/**
 * 좌표를 지정된 좌표계로 변환합니다.
 * @param coordinates - 변환할 좌표 [x, y]
 * @param fromCrs - 원본 좌표계 (WKT 형식)
 * @param toCrs - 목표 좌표계 (예: 'EPSG:4301')
 * @returns 변환된 좌표 [x, y]
 */
function transformCoordinates(coordinates: [number, number], fromCrs: string, toCrs: string = COORDINATE_SYSTEMS.EPSG3375): [number, number] {
  if (!fromCrs) {
    // 좌표계 정보가 없으면 그대로 반환
    return coordinates;
  }

  try {
    debugger
    // 좌표 변환
    const [x, y] = coordinates;
    const transformed = proj4(fromCrs, toCrs, coordinates);
    console.log(`좌표 변환: [${x}, ${y}] -> [${transformed[0]}, ${transformed[1]}]`);
    
    return transformed;
  } catch (error) {
    console.warn('좌표 변환 실패:', error);
    return coordinates;
  }
}

/**
 * GeoJSON 좌표를 지정된 좌표계로 변환합니다.
 * @param coordinates - 변환할 GeoJSON 좌표
 * @param fromCrs - 원본 좌표계
 * @param toCrs - 목표 좌표계
 * @returns 변환된 GeoJSON 좌표
 */
function transformGeoJSONCoordinates(coordinates: any, fromCrs: string, toCrs: string): any {
  if (!coordinates) return coordinates;

  if (Array.isArray(coordinates) && coordinates.length === 2 && typeof coordinates[0] === 'number') {
    // 단일 좌표 [x, y]
    return transformCoordinates(coordinates as [number, number], fromCrs, toCrs);
  } else if (Array.isArray(coordinates)) {
    // 좌표 배열 (LineString, MultiPoint 등)
    return coordinates.map(coord => transformGeoJSONCoordinates(coord, fromCrs, toCrs));
  }

  return coordinates;
}

/**
 * SHP 데이터의 좌표를 지정된 좌표계로 변환합니다.
 * @param shpData - 변환할 SHP 데이터
 * @param fromCrs - 원본 좌표계
 * @param toCrs - 목표 좌표계
 * @returns 변환된 SHP 데이터
 */
function projectShp(shpData: GeoJsonCollection, fromCrs: string, toCrs: string): GeoJsonCollection {
  if (!fromCrs) {
    console.log('좌표계 정보가 없어 변환을 건너뜁니다.');
    return shpData;
  }

  console.log('좌표계 변환 시작:', fromCrs, '->', toCrs);
  console.log('변환 전 첫 번째 좌표:', shpData.features[0]?.geometry.coordinates);

  const transformedFeatures = shpData.features.map(feature => ({
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: transformGeoJSONCoordinates(feature.geometry.coordinates, fromCrs, toCrs),
    },
  }));

  console.log('변환 후 첫 번째 좌표:', transformedFeatures[0]?.geometry.coordinates);
  console.log('좌표계 변환 완료');

  return {
    ...shpData,
    features: transformedFeatures,
  };
}

export async function loadShapefile(filePath: string): Promise<Shapefile> {
  try {
    // 파일 이름에서 확장자 제거
    const name = filePath.split('/').pop()?.replace('.shp', '') || 'Unknown';

    // 관련 파일들의 경로 생성
    const shpPath = filePath;
    const dbfPath = filePath.replace('.shp', '.dbf');
    const prjPath = filePath.replace('.shp', '.prj');

    // 파일들을 병렬로 로드하고 파싱
    const [shpBuffer, dbfData, prjData] = await Promise.all([
      fetch(shpPath)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load SHP file: ${res.statusText}`);
          return res.arrayBuffer();
        }),
      fetch(dbfPath)
        .then((res) => {
          if (!res.ok) {
            console.warn(`DBF file not found or failed to load: ${dbfPath}`);
            return null;
          }
          return res.arrayBuffer();
        })
        .then((buffer) => (buffer ? parseDbf(buffer) : []))
        .catch(() => []), // DBF 파일이 없거나 로드 실패 시 빈 배열 반환
      fetch(prjPath)
        .then((res) => {
          if (!res.ok) {
            console.warn(`PRJ file not found or failed to load: ${prjPath}`);
            return null;
          }
          return res.arrayBuffer();
        })
        .then((buffer) => (buffer ? parsePrj(buffer) : COORDINATE_SYSTEMS.EPSG4326))
        .catch(() => COORDINATE_SYSTEMS.EPSG4326), // PRJ 파일이 없거나 로드 실패 시 EPSG4326 반환
    ]);

    // SHP 파일 파싱
    const shpData = await parseShp(shpBuffer);

    // SHP와 DBF 데이터 결합
    const parsedGeojson = combineShpDbf([shpData, dbfData]);

    // 좌표계 변환
    const projectedShpData = projectShp(parsedGeojson, prjData, COORDINATE_SYSTEMS.EPSG3375);

    // GeoJsonCollection 형식으로 변환
    const geojson: GeoJsonCollection = {
      type: projectedShpData.type,
      features: projectedShpData.features.map((feature) => ({
        type: feature.type,
        geometry: feature.geometry,
        properties: feature.properties || {},
      })),
    };

    // Shapefile 객체 생성 및 도형 타입에 따른 스타일 적용
    const getStyleByGeometryType = (geojson: GeoJsonCollection) => {
      const firstFeature = geojson.features[0];
      if (!firstFeature) return DEFAULT_STYLE.polygon;

      const geometryType = firstFeature.geometry.type;
      if (geometryType.includes('Point')) return DEFAULT_STYLE.point;
      if (geometryType.includes('LineString')) return DEFAULT_STYLE.line;
      return DEFAULT_STYLE.polygon;
    };

    const shapefile: Shapefile = {
      id: uuidv4(),
      name,
      geojson,
      visible: true,
      style: getStyleByGeometryType(geojson),
    };

    return shapefile;
  } catch (error) {
    console.error('Error loading shapefile:', error);
    throw new Error('Failed to load shapefile');
  }
}

/**
 * SHP와 DBF 데이터를 결합합니다.
 */
function combineShpDbf(data: [GeoJsonCollection, Record<string, any>[]]): GeoJsonCollection {
  const [shpData, dbfData] = data;

  if (!dbfData || dbfData.length === 0) {
    console.log('DBF 데이터가 없습니다. SHP 데이터만 반환합니다.');
    return shpData;
  }

  const combinedFeatures = shpData.features.map((feature, index) => {
    if (index >= dbfData.length) {
      console.warn(`DBF 레코드가 부족합니다. 인덱스: ${index}`);
      return feature;
    }

    return {
      ...feature,
      properties: {
        ...feature.properties,
        ...dbfData[index],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features: combinedFeatures,
  };
}
