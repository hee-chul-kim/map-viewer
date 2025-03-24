/**
 * GeoJSON 관련 타입 정의
 */

// export interface GeoJsonFeature {
//   type: string;
//   geometry: {
//     type: string;
//     coordinates: any;
//   };
//   properties: Record<string, any>;
// }

// export interface GeoJsonCollection {
//   type: string;
//   features: GeoJsonFeature[];
// }

export type ShapefileStyle = {
  color: string;
  strokeColor?: string; // 외곽선 색상 (없으면 color 값 사용)
  weight: number;
  opacity: number;
  fillOpacity: number;
};

export interface Shapefile {
  id: string;
  name: string;
  geojson: FeatureCollection;
  visible: boolean;
  style: ShapefileStyle;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  hasFeatures: boolean;
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface GridTile {
  id: string;
  bounds: Bounds;
  features: Feature[];
}

export interface SpatialGrid {
  tiles: GridTile[];
  rows: number;
  cols: number;
  tileWidth: number;
  tileHeight: number;
}
