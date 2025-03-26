import type { FeatureCollection, Feature } from 'geojson';

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
  simplified?: FeatureCollection;
  style: ShapefileStyle;
  visible: boolean;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  hasFeatures: boolean;
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface GridTile {
  id: string;
  bounds: Bounds;
  features: Feature[];
  simplifiedFeatures: Feature[];
}

export interface SpatialGrid {
  tiles: GridTile[];
  rows: number;
  cols: number;
  tileWidth: number;
  tileHeight: number;
}
