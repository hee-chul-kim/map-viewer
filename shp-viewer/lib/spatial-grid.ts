import { Feature } from 'geojson';
import { Bounds, GeoCoordinate, GridTile, SpatialGrid } from '@/types/geometry';
import { calculateBounds } from './geometry';
import { transformCoordinates } from './geometry';
import { detectCollision } from './collision';
import { MAP_CONSTANTS } from '@/lib/consts';

// 위경도 기준 그리드 타일의 크기
const TILE_LNG_WIDTH = 1; // 경도 0.5도
const TILE_LAT_HEIGHT = 1; // 위도 0.5도

/**
 * 두 경계(bounds)가 겹치는지 확인합니다.
 */
function boundsIntersect(bounds1: Bounds, bounds2: Bounds): boolean {
  return !(
    bounds1.maxX < bounds2.minX ||
    bounds1.minX > bounds2.maxX ||
    bounds1.maxY < bounds2.minY ||
    bounds1.minY > bounds2.maxY
  );
}

/**
 * 주어진 좌표가 경계(bounds) 내에 있는지 확인합니다.
 */
function isPointInBounds(x: number, y: number, bounds: Bounds): boolean {
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

/**
 * 위경도 범위 기반으로 공간 그리드를 생성합니다.
 */
export function createSpatialGrid(): SpatialGrid {
  const minLng = MAP_CONSTANTS.BOUNDS.MIN_X;
  const maxLng = MAP_CONSTANTS.BOUNDS.MAX_X;
  const minLat = MAP_CONSTANTS.BOUNDS.MIN_Y;
  const maxLat = MAP_CONSTANTS.BOUNDS.MAX_Y;

  // 위경도 범위를 기준으로 타일 수 계산
  const numCols = Math.ceil((maxLng - minLng) / TILE_LNG_WIDTH);
  const numRows = Math.ceil((maxLat - minLat) / TILE_LAT_HEIGHT);
  const tiles: GridTile[] = [];

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      const minX = minLng + col * TILE_LNG_WIDTH;
      const minY = minLat + row * TILE_LAT_HEIGHT;
      const maxX = Math.min(minX + TILE_LNG_WIDTH, maxLng);
      const maxY = Math.min(minY + TILE_LAT_HEIGHT, maxLat);

      tiles.push({
        id: `${row}-${col}`,
        bounds: {
          minX,
          minY,
          maxX,
          maxY,
          hasFeatures: false,
        },
        features: [],
        simplifiedFeatures: [],
      });
    }
  }

  return {
    tiles,
    rows: numRows,
    cols: numCols,
    tileWidth: TILE_LNG_WIDTH,
    tileHeight: TILE_LAT_HEIGHT,
  };
}

/**
 * 피처들을 공간 그리드에 할당합니다.
 */
export function assignFeaturesToGrid(
  grid: SpatialGrid,
  features: Feature[],
  simplifiedFeatures: Feature[]
): void {
  // 기존 할당 초기화
  grid.tiles.forEach((tile) => {
    tile.features = [];
    tile.simplifiedFeatures = [];
  });

  // 각 피처를 해당하는 타일에 할당
  features.forEach((feature, idx) => {
    // 지원하지 않는 geometry 타입은 건너뛰기
    if (!['Point', 'LineString', 'Polygon'].includes(feature.geometry.type)) {
      return;
    }

    let featureBounds: Bounds;

    if (feature.geometry.type === 'Point') {
      // Point 타입인 경우 좌표를 직접 사용
      const [lng, lat] = feature.geometry.coordinates;
      featureBounds = {
        minX: lng,
        minY: lat,
        maxX: lng,
        maxY: lat,
        hasFeatures: true,
      };
    } else if (!feature.bbox) {
      return; // bbox가 없고 Point도 아닌 경우 건너뜀
    } else {
      // bbox가 있는 경우 bbox 사용
      featureBounds = {
        minX: feature.bbox[0],
        minY: feature.bbox[1],
        maxX: feature.bbox[2],
        maxY: feature.bbox[3],
        hasFeatures: true,
      };
    }

    grid.tiles.forEach((tile) => {
      if (boundsIntersect(featureBounds, tile.bounds)) {
        tile.features.push(feature);
        tile.simplifiedFeatures.push(simplifiedFeatures[idx]);
      }
    });
  });
}

/**
 * 주어진 위경도 좌표가 속한 타일을 찾습니다.
 */
export function findTileAtPoint(grid: SpatialGrid, geoCoords: GeoCoordinate): GridTile | null {
  return (
    grid.tiles.find((tile) => isPointInBounds(geoCoords.lng, geoCoords.lat, tile.bounds)) || null
  );
}

/**
 * 주어진 좌표에서 충돌하는 피처를 찾습니다.
 */
export function findFeatureAtPoint(
  grid: SpatialGrid,
  geoCoords: GeoCoordinate | null,
  scale: number
): Feature | null {
  if (!geoCoords) return null;

  // 위경도 좌표로 타일 찾기
  const tile = findTileAtPoint(grid, geoCoords);
  if (!tile) return null;

  // 역순으로 피처를 검사하여 가장 위에 그려진 피처가 먼저 선택되도록 함
  const reversedFeatures = [...tile.features].reverse();

  // 해당 타일의 피처들에 대해서만 충돌 감지 수행
  for (const feature of reversedFeatures) {
    // 정확한 충돌 감지 수행
    if (detectCollision(geoCoords, feature, scale)) {
      return feature;
    }
  }

  return null;
}
