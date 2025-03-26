import { Bounds, Shapefile } from '@/types/geometry';
import { MAP_CONSTANTS } from './consts';
import { Feature, Polygon, Position } from 'geojson';

// 경계 계산 함수
const calculateBounds = (visibleShapefiles: Shapefile[]): Bounds => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasFeatures = false;

  visibleShapefiles.forEach((shapefile) => {
    if (!shapefile.visible) return;

    shapefile.geojson.features.forEach((feature: Feature) => {
      const { geometry } = feature;
      hasFeatures = true;

      if (geometry.type === 'Point') {
        const [x, y] = geometry.coordinates as [number, number];
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      } else if (geometry.type === 'LineString') {
        (geometry.coordinates as [number, number][]).forEach(([x, y]) => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });
      } else if (geometry.type === 'Polygon') {
        (geometry.coordinates as [number, number][][]).forEach((ring: [number, number][]) => {
          ring.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        });
      } else if (geometry.type === 'MultiPoint') {
        (geometry.coordinates as [number, number][]).forEach(([x, y]) => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as [number, number][][]).forEach((line: [number, number][]) => {
          line.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        });
      } else if (geometry.type === 'MultiPolygon') {
        (geometry.coordinates as [number, number][][][]).forEach(
          (polygon: [number, number][][]) => {
            polygon.forEach((ring: [number, number][]) => {
              ring.forEach(([x, y]) => {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              });
            });
          }
        );
      }
    });
  });

  if (!hasFeatures) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, hasFeatures: false };
  }

  return { minX, minY, maxX, maxY, hasFeatures };
};

// 좌표 변환 함수
const transformCoordinates = (
  scale: number,
  offset: { x: number; y: number },
  x: number,
  y: number
) => {
  // 기본 스케일
  const baseScale = 144;

  // 현재 스케일과 오프셋 적용
  const canvasX = offset.x + x * baseScale * scale;
  // canvasX - offset.x = x * baseScale * scale;
  // x = (canvasX - offset.X) / baseScale / scale;
  const canvasY = offset.y - y * baseScale * scale;
  // y * baseScale * scale = -canvasY + offset.y
  // y = (-canvasY + offset.y) / baseScale / scale

  return { x: canvasX, y: canvasY };
};

/**
 * 점과 선분 사이의 수직 거리를 계산합니다.
 */
function perpendicularDistance(point: Position, start: Position, end: Position): number {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Douglas-Peucker 알고리즘을 사용하여 라인을 간략화합니다.
 */
export function douglasPeuckerLine(points: Position[], epsilon: number): Position[] {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;

  const end = points.length - 1;
  const start = points[0];
  const last = points[end];

  // 각 점에서 시작점과 끝점을 잇는 선분까지의 수직 거리를 계산
  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], start, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  // 최대 거리가 epsilon보다 크면 해당 점을 기준으로 재귀적으로 분할
  if (maxDistance > epsilon) {
    const firstHalf = douglasPeuckerLine(points.slice(0, index + 1), epsilon);
    const secondHalf = douglasPeuckerLine(points.slice(index), epsilon);
    return [...firstHalf.slice(0, -1), ...secondHalf];
  }

  return [start, last];
}

/**
 * 폴리곤을 간략화합니다.
 * @param polygon - 간략화할 폴리곤 도형
 * @param epsilon - 간략화 임계값 (단위: 미터)
 * @returns 간략화된 폴리곤 도형
 */
export function simplifyPolygon(polygon: Feature<Polygon>, epsilon: number): Feature<Polygon> {
  const simplifiedCoordinates = polygon.geometry.coordinates.map((ring) => {
    // 각 링(외부 및 내부)에 대해 Douglas-Peucker 알고리즘 적용
    const simplified = douglasPeuckerLine(ring, epsilon);

    // 폴리곤의 첫 점과 마지막 점이 같아야 함
    if (simplified[0] !== simplified[simplified.length - 1]) {
      simplified.push(simplified[0]);
    }

    return simplified;
  });

  return {
    ...polygon,
    geometry: {
      ...polygon.geometry,
      coordinates: simplifiedCoordinates,
    },
  };
}

export { calculateBounds, transformCoordinates };
