/**
 * SHP 파일 파싱을 위한 유틸리티 함수
 */

import type { GeoJSONCollection } from '@/types/geometry';

// SHP 파일 형식 상수
const SHAPE_TYPE = {
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

/**
 * SHP 파일을 파싱하여 GeoJSON으로 변환합니다.
 * @param shpBuffer - SHP 파일 버퍼
 * @param shxBuffer - 선택적 SHX 파일 버퍼
 * @returns GeoJSON 형식으로 변환된 데이터
 */
export async function parseShp(shpBuffer: ArrayBuffer): Promise<GeoJSONCollection> {
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

/**
 * DBF 파일을 파싱합니다.
 * @param dbfBuffer - DBF 파일 버퍼
 * @returns 파싱된 속성 데이터 배열
 */
export async function parseDbf(dbfBuffer: ArrayBuffer): Promise<any[]> {
  try {
    // iconv-lite 동적 임포트
    const iconv = await import('iconv-lite');

    const view = new DataView(dbfBuffer);
    const results: Record<string, any>[] = [];

    // DBF 헤더 파싱
    const version = view.getUint8(0);
    const recordCount = view.getUint32(4, true);
    const headerSize = view.getUint16(8, true);
    const recordSize = view.getUint16(10, true);

    console.log(
      `DBF 버전: ${version}, 레코드 수: ${recordCount}, 헤더 크기: ${headerSize}, 레코드 크기: ${recordSize}`
    );

    // 필드 정보 파싱
    const fields: Array<{
      name: string;
      type: string;
      size: number;
      offset: number;
    }> = [];

    let offset = 32; // 필드 설명 시작 위치
    let fieldOffset = 1; // 레코드 내 필드 오프셋 (첫 바이트는 삭제 플래그)

    // 필드 설명 파싱 (0x0D로 끝남)
    while (view.getUint8(offset) !== 0x0d) {
      // 필드 이름 (최대 11자, 널 종료)
      const nameBytes = new Uint8Array(11);
      for (let i = 0; i < 11; i++) {
        nameBytes[i] = view.getUint8(offset + i);
      }

      // ASCII로 필드 이름 디코딩 (필드 이름은 일반적으로 ASCII만 사용)
      let name = '';
      for (let i = 0; i < 11; i++) {
        if (nameBytes[i] !== 0) {
          name += String.fromCharCode(nameBytes[i]);
        }
      }
      name = name.trim();

      // 필드 타입 (1바이트 문자)
      const type = String.fromCharCode(view.getUint8(offset + 11));

      // 필드 크기
      const size = view.getUint8(offset + 16);

      fields.push({
        name,
        type,
        size,
        offset: fieldOffset,
      });

      fieldOffset += size;
      offset += 32; // 다음 필드 설명으로 이동

      // 안전 장치: 헤더 크기를 넘어가면 중단
      if (offset >= headerSize - 1) {
        break;
      }
    }

    console.log(`필드 수: ${fields.length}`);
    fields.forEach((field) => {
      console.log(
        `필드: ${field.name}, 타입: ${field.type}, 크기: ${field.size}, 오프셋: ${field.offset}`
      );
    });

    // 레코드 파싱
    const recordStart = headerSize;

    for (let i = 0; i < recordCount; i++) {
      const recordOffset = recordStart + i * recordSize;
      const record: Record<string, any> = {};

      // 삭제 플래그 확인 (0x20: 활성, 0x2A: 삭제됨)
      const deleteFlag = view.getUint8(recordOffset);
      if (deleteFlag === 0x2a) {
        // 삭제된 레코드는 건너뜀
        continue;
      }

      // 각 필드 값 파싱
      for (const field of fields) {
        const fieldOffset = recordOffset + field.offset;
        let value: any;

        // 필드 타입에 따라 파싱
        switch (field.type) {
          case 'C': // 문자열
            // EUC-KR 인코딩으로 문자열 읽기
            const charBytes = new Uint8Array(field.size);
            for (let j = 0; j < field.size; j++) {
              charBytes[j] = view.getUint8(fieldOffset + j);
            }

            // iconv-lite를 사용하여 EUC-KR에서 UTF-8로 변환
            try {
              value = iconv.decode(Buffer.from(charBytes), 'euc-kr').trim();
            } catch (e) {
              // 디코딩 실패 시 기본 ASCII 처리
              value = '';
              for (let j = 0; j < field.size; j++) {
                const charCode = view.getUint8(fieldOffset + j);
                if (charCode !== 0) {
                  value += String.fromCharCode(charCode);
                }
              }
              value = value.trim();
            }
            break;

          case 'N': // 숫자
            value = '';
            for (let j = 0; j < field.size; j++) {
              const charCode = view.getUint8(fieldOffset + j);
              if (charCode !== 0) {
                value += String.fromCharCode(charCode);
              }
            }
            value = value.trim();
            if (value.includes('.')) {
              value = parseFloat(value);
            } else {
              value = parseInt(value, 10);
            }
            // 숫자가 아니면 null로 설정
            if (isNaN(value)) {
              value = null;
            }
            break;

          case 'F': // 부동 소수점
            value = '';
            for (let j = 0; j < field.size; j++) {
              const charCode = view.getUint8(fieldOffset + j);
              if (charCode !== 0) {
                value += String.fromCharCode(charCode);
              }
            }
            value = parseFloat(value.trim());
            if (isNaN(value)) {
              value = null;
            }
            break;

          case 'L': // 논리값 (T/F)
            const char = String.fromCharCode(view.getUint8(fieldOffset));
            value = char.toUpperCase() === 'T' || char === 'Y' || char === '1';
            break;

          case 'D': // 날짜 (YYYYMMDD)
            let dateStr = '';
            for (let j = 0; j < field.size; j++) {
              const charCode = view.getUint8(fieldOffset + j);
              if (charCode !== 0) {
                dateStr += String.fromCharCode(charCode);
              }
            }
            dateStr = dateStr.trim();
            if (dateStr && dateStr !== '00000000') {
              const year = parseInt(dateStr.substring(0, 4), 10);
              const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 0-based month
              const day = parseInt(dateStr.substring(6, 8), 10);
              value = new Date(year, month, day);
            } else {
              value = null;
            }
            break;

          case 'M': // Memo 필드 (텍스트 블록)
            // EUC-KR 인코딩으로 문자열 읽기
            const memoBytes = new Uint8Array(field.size);
            for (let j = 0; j < field.size; j++) {
              memoBytes[j] = view.getUint8(fieldOffset + j);
            }

            // iconv-lite를 사용하여 EUC-KR에서 UTF-8로 변환
            try {
              value = iconv.decode(Buffer.from(memoBytes), 'euc-kr').trim();
            } catch (e) {
              // 디코딩 실패 시 기본 ASCII 처리
              value = '';
              for (let j = 0; j < field.size; j++) {
                const charCode = view.getUint8(fieldOffset + j);
                if (charCode !== 0) {
                  value += String.fromCharCode(charCode);
                }
              }
              value = value.trim();
            }
            break;

          default:
            // 지원되지 않는 타입은 문자열로 처리하고 EUC-KR 인코딩 적용
            const unknownBytes = new Uint8Array(field.size);
            for (let j = 0; j < field.size; j++) {
              unknownBytes[j] = view.getUint8(fieldOffset + j);
            }

            try {
              value = iconv.decode(Buffer.from(unknownBytes), 'euc-kr').trim();
            } catch (e) {
              value = '';
              for (let j = 0; j < field.size; j++) {
                const charCode = view.getUint8(fieldOffset + j);
                if (charCode !== 0) {
                  value += String.fromCharCode(charCode);
                }
              }
              value = value.trim();
            }
        }

        record[field.name] = value;
      }

      results.push(record);
    }

    return results;
  } catch (error) {
    console.error('DBF 파일 파싱 오류:', error);
    throw error;
  }
}

/**
 * GeoJSON과 DBF 데이터를 결합합니다.
 * @param data - 결합할 데이터 배열 [GeoJSON, DBF 데이터]
 * @returns 결합된 GeoJSON
 */
export function combineShpDbf(data: [GeoJSONCollection, any[]]): GeoJSONCollection {
  try {
    const [geoJson, dbfData] = data;

    // DBF 데이터가 없거나 GeoJSON 피처가 없으면 원본 GeoJSON 반환
    if (!dbfData || !dbfData.length || !geoJson.features || !geoJson.features.length) {
      return geoJson;
    }

    // 피처 수와 DBF 레코드 수 확인
    const featureCount = geoJson.features.length;
    const recordCount = dbfData.length;

    console.log(`피처 수: ${featureCount}, DBF 레코드 수: ${recordCount}`);

    // 피처와 DBF 레코드 결합
    // 일반적으로 피처와 레코드는 1:1 매핑이지만, 수가 다를 수 있음
    const combinedFeatures = geoJson.features.map((feature, index) => {
      // 인덱스가 유효한 범위 내에 있는지 확인
      if (index < recordCount) {
        // 기존 속성과 DBF 속성 병합
        const properties = {
          ...feature.properties,
          ...dbfData[index],
        };

        // 새 피처 반환
        return {
          ...feature,
          properties,
        };
      }

      // 매칭되는 DBF 레코드가 없으면 원본 피처 반환
      return feature;
    });

    // 결합된 GeoJSON 반환
    return {
      ...geoJson,
      features: combinedFeatures,
    };
  } catch (error) {
    console.error('SHP/DBF 데이터 결합 오류:', error);
    throw error;
  }
}
