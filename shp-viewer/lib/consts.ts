import { ShapefileStyle } from '@/types/geometry';

// 기본 파일 목록
export const DEFAULT_FILES = [
  'files/point/PFP.shp',
  'files/line/TLLK.shp',
  'files/polygon/WLA.shp'
] as const;

// 기본 스타일 설정
export const DEFAULT_STYLE: ShapefileStyle = {
  color: '#3B82F6',
  weight: 1,
  opacity: 1,
  fillOpacity: 0.2,
};

// 지도 관련 상수
export const MAP_CONSTANTS = {
  // 대한민국 위경도 범위
  BOUNDS: {
    MIN_X: 124,
    MAX_X: 132,
    MIN_Y: 33.06,
    MAX_Y: 38.37,
  },
  // 서울 좌표
  SEOUL_COORDINATES: {
    LAT: 37.5665,
    LNG: 126.9780,
  },
  // 기본 지도 설정
  DEFAULT_ZOOM: 7,
  BASE_SCALE: 144,
  MIN_SCALE: 0.1,
  MAX_SCALE: 10,
  SCALE_STEP: 0.1,
} as const;

// Canvas 관련 상수
export const CANVAS_CONSTANTS = {
  DEFAULT_PADDING: 20,
  TOOLTIP: {
    LINE_HEIGHT: 20,
    PADDING: 10,
    WIDTH: 200,
    OFFSET: 10,
    BACKGROUND: 'rgba(255, 255, 255, 0.9)',
    BORDER_COLOR: '#333',
    TEXT_COLOR: '#333',
    FONT: '12px Arial',
    CORNER_RADIUS: 5,
  },
} as const; 

// SHP 파일 형식 상수
export const SHAPE_TYPE = {
    NULL: 0,
    POINT: 1,
    POLYLINE: 3,
    POLYGON: 5,
    MULTIPOINT: 8,
    POINTZ: 11,
    POLYLINEZ: 13,
    POLYGONZ: 15,
    MULTIPOINTZ: 18,
    POINTM: 21,
    POLYLINEM: 23,
    POLYGONM: 25,
    MULTIPOINTM: 28,
    MULTIPATCH: 31,
  };