import { Bounds, GeoJsonFeature, Shapefile } from '@/types/geometry';
import { MAP_CONSTANTS } from './consts';

// 경계 계산 함수
const calculateBounds = (visibleShapefiles: Shapefile[]): Bounds => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasFeatures = false;

  visibleShapefiles.forEach((shapefile) => {
    if (!shapefile.visible) return;

    shapefile.geojson.features.forEach((feature) => {
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
  canvasSize: { width: number; height: number },
  scale: number,
  offset: { x: number; y: number },
  x: number,
  y: number,
  padding = 20
) => {
  //const { minX, minY, maxX, maxY } = bounds;
  // const rangeX = maxX - minX;
  // const rangeY = maxY - minY;

  // 대한민국 위경도 범위로 설정
  //const maxY = 38.37;
  const minX = MAP_CONSTANTS.BOUNDS.MIN_X;
  const minY = MAP_CONSTANTS.BOUNDS.MIN_Y;
  // const maxX = MAP_CONSTANTS.BOUNDS.MAX_X;
  // const maxY = MAP_CONSTANTS.BOUNDS.MAX_Y;
  // const rangeX = maxX - minX;
  // const rangeY = maxY - minY;

  // 가로세로 비율 유지를 위한 스케일 계산
  // const scaleX = (canvasSize.width - padding * 2) / rangeX;
  // const scaleY = (canvasSize.height - padding * 2) / rangeY;
  // const baseScale = Math.min(scaleX, scaleY);

  // 기본 스케일
  const baseScale = 144;

  // 현재 스케일과 오프셋 적용
  const canvasX = padding + (x - minX) * baseScale * scale + offset.x;
  const canvasY = canvasSize.height - padding - (y - minY) * baseScale * scale + offset.y;

  return { x: canvasX, y: canvasY };
};

export { calculateBounds, transformCoordinates };
