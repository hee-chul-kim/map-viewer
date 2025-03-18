/**
 * GeoJSON 관련 타입 정의
 */

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  hasFeatures: boolean;
}
