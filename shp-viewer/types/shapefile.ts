/**
 * Shapefile 관련 타입 정의
 */

import { GeoJSONCollection } from './geojson';

export interface ShapefileStyle {
  color: string;
  weight: number;
  opacity: number;
  fillOpacity: number;
}

export interface Shapefile {
  id: string;
  name: string;
  geojson: GeoJSONCollection;
  visible: boolean;
  style: ShapefileStyle;
}