/**
 * SHP 파일 파싱을 위한 유틸리티 함수
 */

// shpjs에서 반환하는 GeoJSON 형식 정의
export interface GeoJSON {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: any;
    };
    properties?: Record<string, any>;
  }>;
}

/**
 * SHP 파일을 파싱하여 GeoJSON으로 변환합니다.
 * @param shpBuffer - SHP 파일 버퍼
 * @param shxBuffer - 선택적 SHX 파일 버퍼
 * @returns GeoJSON 형식으로 변환된 데이터
 */
export async function parseShp(shpBuffer: ArrayBuffer, shxBuffer?: ArrayBuffer): Promise<GeoJSON> {
  const view = new DataView(shpBuffer);
  const shapeType = view.getInt32(32, true);

  console.log(shapeType);


  // 빈 GeoJSON 객체 반환 (실제 구현은 사용자가 직접 작성)
  return {
    type: "FeatureCollection",
    features: []
  };
}

/**
 * DBF 파일을 파싱합니다.
 * @param dbfBuffer - DBF 파일 버퍼
 * @returns 파싱된 속성 데이터 배열
 */
export async function parseDbf(dbfBuffer: ArrayBuffer): Promise<any[]> {
  try {
    // shpjs 동적 임포트
    const shpjs = await import('shpjs');
    
    // DBF 파일 파싱
    const dbfData = await shpjs.default.parseDbf(dbfBuffer);
    
    return dbfData;
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
export function combineShpDbf(data: [GeoJSON, any[]]): GeoJSON {
  try {
    // shpjs 동적 임포트 (동기적으로 사용)
    const shpjs = require('shpjs');
    
    // 데이터 결합
    const result = shpjs.combine(data);
    
    return result as GeoJSON;
  } catch (error) {
    console.error('SHP/DBF 데이터 결합 오류:', error);
    throw error;
  }
} 