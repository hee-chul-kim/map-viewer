/**
 * GeoJSON 관련 타입 정의
 */

export interface GeoJsonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJsonCollection {
  type: string;
  features: GeoJsonFeature[];
}

export interface ShapefileStyle {
  color: string;
  weight: number;
  opacity: number;
  fillOpacity: number;
}

export interface Shapefile {
  id: string;
  name: string;
  geojson: GeoJsonCollection;
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
