import { GeoCoordinate } from '@/types/geometry';
import { Feature, Point, Polygon, LineString } from 'geojson';

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
  // 기본 허용 거리를 10km로 설정하고 스케일에 따라 조정
  const threshold = 10 / scale;

  return distance <= threshold;
}

/**
 * 점과 선분 사이의 최단 거리를 계산합니다. (단위: km)
 */
function pointToLineSegmentDistance(
  point: GeoCoordinate,
  start: GeoCoordinate,
  end: GeoCoordinate
): number {
  const d1 = haversineDistance(point, start);
  const d2 = haversineDistance(point, end);
  const lineLength = haversineDistance(start, end);

  // 선분의 양 끝점과의 거리 중 짧은 것을 기본값으로 설정
  let distance = Math.min(d1, d2);

  // 점이 선분을 수직으로 내린 점이 선분 위에 있는 경우를 처리
  const dot =
    ((point.lng - start.lng) * (end.lng - start.lng) +
      (point.lat - start.lat) * (end.lat - start.lat)) /
    Math.pow(lineLength, 2);

  if (dot >= 0 && dot <= 1) {
    // 선분 위로 수선을 내릴 수 있는 경우
    const proj = {
      lng: start.lng + dot * (end.lng - start.lng),
      lat: start.lat + dot * (end.lat - start.lat),
    };
    distance = haversineDistance(point, proj);
  }

  return distance;
}

/**
 * LineString 타입의 충돌을 감지합니다.
 */
function detectLineStringCollision(
  point: GeoCoordinate,
  feature: Feature<LineString>,
  scale: number
): boolean {
  // 1. bbox 검사 (있는 경우에만)
  if (feature.bbox && !isPointInGeoBBox(point, feature.bbox)) {
    return false;
  }

  // 2. 각 선분과의 최단 거리 계산
  const coordinates = feature.geometry.coordinates;
  const threshold = 10 / scale; // 10km를 기본 허용 거리로 설정

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = { lng: coordinates[i][0], lat: coordinates[i][1] };
    const end = { lng: coordinates[i + 1][0], lat: coordinates[i + 1][1] };
    const distance = pointToLineSegmentDistance(point, start, end);

    if (distance <= threshold) {
      return true;
    }
  }

  return false;
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

  // 2. 모든 coordinates 배열에 대해 Ray Casting 알고리즘 적용
  const coordinates = feature.geometry.coordinates;

  // 각 coordinates 배열에 대해 검사
  for (const ring of coordinates) {
    const polygonPoints: GeoCoordinate[] = ring.map(([lng, lat]) => ({ lng, lat }));
    if (isPointInPolygon(point, polygonPoints)) {
      return true;
    }
  }

  return false;
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
    case 'LineString':
      return detectLineStringCollision(geoCoords, feature as Feature<LineString>, scale);
    case 'Polygon':
      return detectPolygonCollision(geoCoords, feature as Feature<Polygon>, scale);
    default:
      // 기타 도형은 단순화된 충돌 감지 (정확한 구현은 복잡함)
      return false;
  }
}
