import { Bounds, Shapefile } from '@/types/geometry';
import { MAP_CONSTANTS } from './consts';
import { Feature } from 'geojson';

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
  const canvasY = offset.y - y * baseScale * scale;

  return { x: canvasX, y: canvasY };
};

export { calculateBounds, transformCoordinates };
