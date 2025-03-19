/**
 * DBF 파일 파싱을 위한 유틸리티 함수
 */

import type { GeoJsonCollection } from '@/types/geometry';

/**
 * DBF 파일을 파싱하여 레코드 배열로 변환합니다.
 * @param dbfBuffer - DBF 파일 버퍼
 * @returns 레코드 배열
 */
export async function parseDbf(dbfBuffer: ArrayBuffer): Promise<Record<string, any>[]> {
  try {
    const view = new DataView(dbfBuffer);

    // DBF 파일 헤더 파싱
    const version = view.getUint8(0);
    const lastUpdate = new Date(
      1900 + view.getUint8(1),
      view.getUint8(2) - 1,
      view.getUint8(3)
    );
    const numRecords = view.getUint32(4, true);
    const headerLength = view.getUint16(8, true);
    const recordLength = view.getUint16(10, true);

    // 필드 설명자 파싱
    const fields = [];
    let offset = 32; // 필드 설명자 시작 위치

    while (view.getUint8(offset) !== 0x0D) {
      const field = {
        name: '',
        type: String.fromCharCode(view.getUint8(offset + 11)),
        length: view.getUint8(offset + 16),
        decimal: view.getUint8(offset + 17),
      };

      // 필드 이름 파싱 (최대 11바이트, null 종료)
      for (let i = 0; i < 11; i++) {
        const char = view.getUint8(offset + i);
        if (char === 0) break;
        field.name += String.fromCharCode(char);
      }

      field.name = field.name.trim();
      fields.push(field);
      offset += 32;
    }

    // 레코드 파싱
    const records: Record<string, any>[] = [];
    offset = headerLength; // 데이터 영역 시작

    for (let i = 0; i < numRecords; i++) {
      // 삭제된 레코드 표시 확인
      const isDeleted = view.getUint8(offset) === 0x2A;
      if (isDeleted) {
        offset += recordLength;
        continue;
      }

      const record: Record<string, any> = {};
      let fieldOffset = offset + 1; // 삭제 표시 다음부터 시작

      for (const field of fields) {
        let value: any = '';

        // 필드 값 추출
        for (let j = 0; j < field.length; j++) {
          value += String.fromCharCode(view.getUint8(fieldOffset + j));
        }

        value = value.trim();

        // 필드 타입에 따른 값 변환
        switch (field.type) {
          case 'C': // 문자
            record[field.name] = value;
            break;
          case 'N': // 숫자
            if (field.decimal > 0) {
              record[field.name] = parseFloat(value) || 0;
            } else {
              record[field.name] = parseInt(value) || 0;
            }
            break;
          case 'F': // 부동 소수점
            record[field.name] = parseFloat(value) || 0;
            break;
          case 'L': // 논리
            record[field.name] = ['Y', 'y', 'T', 't'].includes(value);
            break;
          case 'D': // 날짜 (YYYYMMDD)
            if (value.length === 8) {
              record[field.name] = new Date(
                parseInt(value.slice(0, 4)),
                parseInt(value.slice(4, 6)) - 1,
                parseInt(value.slice(6, 8))
              );
            } else {
              record[field.name] = null;
            }
            break;
          default:
            record[field.name] = value;
        }

        fieldOffset += field.length;
      }

      records.push(record);
      offset += recordLength;
    }

    return records;
  } catch (error) {
    console.error('DBF 파일 파싱 오류:', error);
    throw error;
  }
}
