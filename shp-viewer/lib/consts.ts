import { ShapefileStyle } from '@/types/geometry';

// 기본 파일 목록
export const DEFAULT_FILES = [
  'files/polygon/WLA.shp',
  'files/polygon2/SIG.shp',
  'files/line/TLLK.shp',
  'files/point/PFP.shp',
  //'files/polygon3/3ring.shp',
] as const;

// 기본 스타일 설정
export const DEFAULT_STYLE = {
  point: {
    color: '#FF6B6B', // 산호색 (포인트는 눈에 잘 띄어야 함)
    weight: 0.5,
    opacity: 1,
    fillOpacity: 0.2,
  },
  line: {
    color: '#3B82F6', // 밝은 파랑색 (선은 시원한 느낌으로)
    weight: 2,
    opacity: 1,
    fillOpacity: 0.2,
  },
  polygon: {
    color: '#E2E8F0', // 매우 밝은 슬레이트 그레이 (채우기)
    strokeColor: '#475569', // 더 진한 슬레이트 그레이 (외곽선)
    weight: 1,
    opacity: 1,
    fillOpacity: 0.3,
  },
} as const;

// 지도 관련 상수
export const MAP_CONSTANTS = {
  // 대한민국 위경도 범위
  BOUNDS: {
    MIN_X: 124,
    MAX_X: 132,
    MIN_Y: 33.06,
    MAX_Y: 38.8,
  },
  // 서울 좌표
  SEOUL_COORDINATES: {
    LAT: 37.5665,
    LNG: 126.978,
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

// 좌표계 상수
export const COORDINATE_SYSTEMS = {
  // WGS84 좌표계 (EPSG:4326) - 국제 표준 위경도 좌표계
  EPSG4326:
    'PROJCS["PCS_ITRF2000_TM",GEOGCS["GCS_ITRF_2000",DATUM["D_ITRF_2000",SPHEROID["GRS_1980",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",1000000.0],PARAMETER["False_Northing",2000000.0],PARAMETER["Central_Meridian",127.5],PARAMETER["Scale_Factor",0.9996],PARAMETER["Latitude_Of_Origin",38.0],UNIT["Meter",1.0]]',

  // 동경측지계 (EPSG:3375) - 한국/일본에서 사용하는 구 좌표계
  EPSG3375:
    'GEOGCS["GCS_Tokyo",DATUM["D_Tokyo",SPHEROID["Bessel_1841",6377397.155,299.1528128]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]',
} as const;
