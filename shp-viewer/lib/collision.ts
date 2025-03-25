import { GeoCoordinate } from '@/types/geometry';
import { Feature, Point, Polygon } from 'geojson';

/**
 * 두 지점 간의 거리를 하버사인 공식을 사용하여 계산합니다. (단위: km)
 */
function haversineDistance(point1: GeoCoordinate, point2: GeoCoordinate): number {
  const R = 6371; // 지구의 반경 (km)
  const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Point 타입의 충돌을 감지합니다.
 */
function detectPointCollision(
  geoCoords: GeoCoordinate,
  feature: Feature<Point>,
  scale: number
): boolean {
  const coordinates = feature.geometry.coordinates;
  const featurePoint = { lng: coordinates[0], lat: coordinates[1] };

  // 거리를 km 단위로 계산
  const distance = haversineDistance(geoCoords, featurePoint);

  // 스케일에 반비례하여 허용 거리 조정 (줌아웃할수록 더 넓은 범위 허용)
  // 기본 허용 거리를 1km로 설정하고 스케일에 따라 조정
  const threshold = 1 / scale;

  return distance <= threshold;
}

/**
 * Ray Casting 알고리즘을 사용하여 점이 다각형 내부에 있는지 확인합니다.
 */
function isPointInPolygon(point: GeoCoordinate, polygon: GeoCoordinate[]): boolean {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * 점이 GeoJSON bbox 내부에 있는지 확인합니다.
 */
function isPointInGeoBBox(point: GeoCoordinate, bbox: number[]): boolean {
  const [minX, minY, maxX, maxY] = bbox;
  return point.lng >= minX && point.lng <= maxX && point.lat >= minY && point.lat <= maxY;
}

/**
 * Polygon 타입의 충돌을 감지합니다.
 */
function detectPolygonCollision(
  point: GeoCoordinate,
  feature: Feature<Polygon>,
  scale: number
): boolean {
  // 1. bbox 검사 (있는 경우에만)
  if (feature.bbox && !isPointInGeoBBox(point, feature.bbox)) {
    return false;
  }

  // 2. Ray Casting 알고리즘
  const coordinates = feature.geometry.coordinates;
  const polygonPoints: GeoCoordinate[] = coordinates[0].map(([lng, lat]) => ({ lng, lat }));

  return isPointInPolygon(point, polygonPoints);
}

/**
 * 피처와 좌표 간의 충돌을 감지합니다.
 */
export function detectCollision(
  geoCoords: GeoCoordinate,
  feature: Feature,
  scale: number
): boolean {
  switch (feature.geometry.type) {
    case 'Point':
      return detectPointCollision(geoCoords, feature as Feature<Point>, scale);
    case 'Polygon':
      return detectPolygonCollision(geoCoords, feature as Feature<Polygon>, scale);
    default:
      // 라인 및 기타 도형은 단순화된 충돌 감지 (정확한 구현은 복잡함)
      return false;
  }
}
