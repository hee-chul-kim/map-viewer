/**
 * SHP 파일 파싱을 위한 유틸리티 함수
 */

import type { GeoJsonCollection } from '@/types/geometry';
export { parseDbf } from './dbf-parser';
import { SHAPE_TYPE } from '../consts';

/**
 * SHP 파일을 파싱하여 GeoJSON으로 변환합니다.
 * @param shpBuffer - SHP 파일 버퍼
 * @param shxBuffer - 선택적 SHX 파일 버퍼
 * @returns GeoJSON 형식으로 변환된 데이터
 */
export async function parseShp(shpBuffer: ArrayBuffer): Promise<GeoJsonCollection> {
  try {
    // SHP 파일 헤더 파싱
    const view = new DataView(shpBuffer);

    // 파일 코드 확인 (9994 여야 함)
    const fileCode = view.getInt32(0, false);
    if (fileCode !== 9994) {
      throw new Error(`유효하지 않은 SHP 파일: 파일 코드 ${fileCode}는 9994가 아닙니다.`);
    }

    // 파일 길이 (16비트 워드 단위)
    const fileLength = view.getInt32(24, false) * 2;

    // 버전 확인 (1000 이어야 함)
    const version = view.getInt32(28, true);
    if (version !== 1000) {
      throw new Error(`지원되지 않는 SHP 버전: ${version}`);
    }

    // 도형 타입
    const shapeType = view.getInt32(32, true);
    console.log(`도형 타입: ${shapeType} (${getShapeTypeName(shapeType)})`);

    // 경계 상자 (바운딩 박스)
    const bbox = {
      xMin: view.getFloat64(36, true),
      yMin: view.getFloat64(44, true),
      xMax: view.getFloat64(52, true),
      yMax: view.getFloat64(60, true),
      zMin: view.getFloat64(68, true),
      zMax: view.getFloat64(76, true),
      mMin: view.getFloat64(84, true),
      mMax: view.getFloat64(92, true),
    };

    console.log(`바운딩 박스: [${bbox.xMin}, ${bbox.yMin}, ${bbox.xMax}, ${bbox.yMax}]`);

    // 헤더 크기는 100바이트
    let offset = 100;
    const features = [];

    // 레코드 파싱
    while (offset < fileLength) {
      // 레코드 번호 (1부터 시작)
      const recordNumber = view.getInt32(offset, false);

      // 레코드 내용 길이 (16비트 워드 단위)
      const contentLength = view.getInt32(offset + 4, false) * 2;

      // 레코드 시작 위치 (헤더 8바이트 이후)
      const recordOffset = offset + 8;

      // 레코드 도형 타입
      const recordShapeType = view.getInt32(recordOffset, true);

      // 도형 타입에 따라 파싱
      let geometry;

      switch (recordShapeType) {
        case SHAPE_TYPE.POINT:
          geometry = parsePoint(view, recordOffset + 4);
          break;
        case SHAPE_TYPE.POLYLINE:
          geometry = parsePolyline(view, recordOffset + 4);
          break;
        case SHAPE_TYPE.POLYGON:
          geometry = parsePolygon(view, recordOffset + 4);
          break;
        case SHAPE_TYPE.MULTIPOINT:
          geometry = parseMultiPoint(view, recordOffset + 4);
          break;
        case SHAPE_TYPE.NULL:
          // NULL 도형은 건너뜀
          geometry = null;
          break;
        default:
          console.warn(`지원되지 않는 도형 타입: ${recordShapeType}`);
          geometry = null;
      }

      // 유효한 도형이면 피처에 추가
      if (geometry) {
        features.push({
          type: 'Feature',
          geometry,
          properties: {
            id: recordNumber - 1, // 0부터 시작하는 인덱스로 변환
          },
        });
      }

      // 다음 레코드로 이동
      offset += 8 + contentLength;
    }

    console.log(`feature 개수 : ${features.length}개`);

    return {
      type: 'FeatureCollection',
      features,
    };
  } catch (error) {
    console.error('SHP 파일 파싱 오류:', error);
    throw error;
  }
}

/**
 * 도형 타입 이름을 반환합니다.
 */
function getShapeTypeName(shapeType: number): string {
  const types = {
    0: 'Null Shape',
    1: 'Point',
    3: 'Polyline',
    5: 'Polygon',
    8: 'MultiPoint',
    11: 'PointZ',
    13: 'PolylineZ',
    15: 'PolygonZ',
    18: 'MultiPointZ',
    21: 'PointM',
    23: 'PolylineM',
    25: 'PolygonM',
    28: 'MultiPointM',
    31: 'MultiPatch',
  };

  // @ts-ignore
  return types[shapeType] || 'Unknown';
}

/**
 * Point 도형을 파싱합니다.
 */
function parsePoint(view: DataView, offset: number) {
  const x = view.getFloat64(offset, true);
  const y = view.getFloat64(offset + 8, true);

  return {
    type: 'Point',
    coordinates: [x, y],
  };
}

/**
 * Polyline 도형을 파싱합니다.
 */
function parsePolyline(view: DataView, offset: number) {
  // 바운딩 박스
  const bbox = {
    xMin: view.getFloat64(offset, true),
    yMin: view.getFloat64(offset + 8, true),
    xMax: view.getFloat64(offset + 16, true),
    yMax: view.getFloat64(offset + 24, true),
  };

  // 파트 수 (라인 수)
  const numParts = view.getInt32(offset + 32, true);

  // 포인트 수
  const numPoints = view.getInt32(offset + 36, true);

  // 파트 인덱스 배열
  const parts = [];
  for (let i = 0; i < numParts; i++) {
    parts.push(view.getInt32(offset + 40 + i * 4, true));
  }

  // 포인트 배열
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const pointOffset = offset + 40 + numParts * 4 + i * 16;
    const x = view.getFloat64(pointOffset, true);
    const y = view.getFloat64(pointOffset + 8, true);
    points.push([x, y]);
  }

  // 파트별로 라인스트링 구성
  const coordinates = [];
  for (let i = 0; i < numParts; i++) {
    const start = parts[i];
    const end = i < numParts - 1 ? parts[i + 1] : numPoints;
    const line = points.slice(start, end);
    coordinates.push(line);
  }

  // 라인스트링이 하나면 LineString, 여러 개면 MultiLineString
  if (coordinates.length === 1) {
    return {
      type: 'LineString',
      coordinates: coordinates[0],
    };
  } else {
    return {
      type: 'MultiLineString',
      coordinates,
    };
  }
}


/**
 * Polygon 도형을 파싱합니다.
 */
function parsePolygon(view: DataView, offset: number) {
  // 바운딩 박스
  const bbox = {
    xMin: view.getFloat64(offset, true),
    yMin: view.getFloat64(offset + 8, true),
    xMax: view.getFloat64(offset + 16, true),
    yMax: view.getFloat64(offset + 24, true),
  };

  // 파트 수 (링 수)
  const numParts = view.getInt32(offset + 32, true);

  // 포인트 수
  const numPoints = view.getInt32(offset + 36, true);

  // 파트 인덱스 배열
  const parts = [];
  for (let i = 0; i < numParts; i++) {
    parts.push(view.getInt32(offset + 40 + i * 4, true));
  }

  // 포인트 배열
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    const pointOffset = offset + 40 + numParts * 4 + i * 16;
    const x = view.getFloat64(pointOffset, true);
    const y = view.getFloat64(pointOffset + 8, true);
    points.push([x, y]);
  }

  // 파트별로 링 구성
  const rings = [];
  for (let i = 0; i < numParts; i++) {
    const start = parts[i];
    const end = i < numParts - 1 ? parts[i + 1] : numPoints;
    const ring = points.slice(start, end);
    rings.push(ring);
  }

  // 폴리곤 구성 (외부 링과 내부 링 구분)
  // 참고: SHP에서는 외부 링은 시계 방향, 내부 링은 반시계 방향으로 정의됨
  const coordinates = [];

  // 간단한 구현: 첫 번째 링을 외부 링으로 간주
  if (rings.length > 0) {
    coordinates.push(rings[0]);

    // 나머지 링은 내부 링(홀)으로 간주
    for (let i = 1; i < rings.length; i++) {
      coordinates.push(rings[i]);
    }
  }

  return {
    type: 'Polygon',
    coordinates,
  };
}

/**
 * MultiPoint 도형을 파싱합니다.
 */
function parseMultiPoint(view: DataView, offset: number) {
  // 바운딩 박스
  const bbox = {
    xMin: view.getFloat64(offset, true),
    yMin: view.getFloat64(offset + 8, true),
    xMax: view.getFloat64(offset + 16, true),
    yMax: view.getFloat64(offset + 24, true),
  };

  // 포인트 수
  const numPoints = view.getInt32(offset + 32, true);

  // 포인트 배열
  const coordinates = [];
  for (let i = 0; i < numPoints; i++) {
    const pointOffset = offset + 36 + i * 16;
    const x = view.getFloat64(pointOffset, true);
    const y = view.getFloat64(pointOffset + 8, true);
    coordinates.push([x, y]);
  }

  return {
    type: 'MultiPoint',
    coordinates,
  };
}
