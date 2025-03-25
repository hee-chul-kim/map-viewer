import { BBox, Feature, Geometry, LineString, Point, Polygon } from 'geojson';
import proj4 from 'proj4';

// EPSG:4301 (한국 2000) 정의
proj4.defs('EPSG:4301', '+proj=longlat +ellps=GRS80 +datum=WGS84 +no_defs');

// 좌표 변환 함수
function transformCoordinates(
  coordinates: [number, number],
  fromCrs: string,
  toCrs: string
): [number, number] {
  try {
    return proj4(fromCrs, toCrs, coordinates);
  } catch (error) {
    console.warn('좌표 변환 실패:', error);
    return coordinates;
  }
}

// BBox 변환 함수
function transformBBox(bbox: BBox | null, fromCrs: string, toCrs: string): BBox | null {
  if (!bbox) return null;

  try {
    const minCoord = transformCoordinates([bbox[0], bbox[1]], fromCrs, toCrs);
    const maxCoord = transformCoordinates([bbox[2], bbox[3]], fromCrs, toCrs);

    return [minCoord[0], minCoord[1], maxCoord[0], maxCoord[1]];
  } catch (error) {
    console.warn('BBox 변환 실패:', error);
    return bbox;
  }
}

// GeoJSON 좌표 변환 함수
function transformGeoJSONCoordinates(coordinates: any, fromCrs: string, toCrs: string): any {
  if (!coordinates) return coordinates;

  if (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    typeof coordinates[0] === 'number'
  ) {
    return transformCoordinates(coordinates as [number, number], fromCrs, toCrs);
  } else if (Array.isArray(coordinates)) {
    return coordinates.map((coord) => transformGeoJSONCoordinates(coord, fromCrs, toCrs));
  }

  return coordinates;
}

// Worker 메시지 핸들러
self.onmessage = (e) => {
  const { features, fromCrs, toCrs, startIndex, endIndex } = e.data;

  // 지정된 범위의 features만 변환
  const transformedFeatures = features.map((feature: Feature<Point | LineString | Polygon>) => ({
    ...feature,
    bbox: transformBBox(feature.bbox!, fromCrs, toCrs),
    geometry: {
      ...feature.geometry,
      bbox: transformBBox(feature.geometry.bbox!, fromCrs, toCrs),
      coordinates: transformGeoJSONCoordinates(feature.geometry.coordinates, fromCrs, toCrs),
    },
  }));

  // 결과 전송
  self.postMessage({
    features: transformedFeatures,
    featureCount: transformedFeatures.length,
    startIndex,
    endIndex,
  });
};
