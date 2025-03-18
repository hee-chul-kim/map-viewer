/**
 * SHP 파일 처리를 위한 유틸리티 함수
 */
import type { GeoJSONCollection, GeoJSONFeature } from '@/types/geometry';

// shpjs가 반환하는 형식과 일치하는 타입 정의
interface ShpjsGeoJSON {
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
 * SHP 파일 및 관련 파일(.dbf, .shx)을 읽고 파싱합니다
 * @param shpFile - 메인 SHP 파일
 * @param dbfFile - 속성 데이터를 포함하는 선택적 DBF 파일
 * @param shxFile - 인덱스 데이터를 포함하는 선택적 SHX 파일
 * @returns GeoJSON 컬렉션으로 해결되는 Promise
 */
export async function readShapefile(
  shpFile: File,
  dbfFile?: File,
  shxFile?: File
): Promise<{
  geojson: GeoJSONCollection;
  name: string;
}> {
  try {
    // 입력 유효성 검사
    if (!shpFile || !shpFile.name.endsWith('.shp')) {
      throw new Error('유효하지 않은 SHP 파일');
    }

    // 기본 이름 추출
    const baseName = shpFile.name.slice(0, -4);

    // shpjs 동적 임포트
    const shp = await import('shpjs');

    // 파일을 ArrayBuffer로 읽기
    const fileBuffers = await Promise.all(
      [shpFile, dbfFile, shxFile].filter(Boolean).map((file) => {
        return new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file as File);
        });
      })
    );

    // SHP 파일 파싱 (선택적 SHX 포함)
    const geojson = await shp.default.parseShp(fileBuffers[0], fileBuffers[2]);

    // DBF 파일이 있는 경우 파싱
    const dbf = dbfFile ? await shp.default.parseDbf(fileBuffers[1]) : [];

    // 데이터 결합
    const features = shp.default.combine([geojson, dbf]) as ShpjsGeoJSON;

    // GeoJSONCollection 타입으로 변환
    const result: GeoJSONCollection = {
      type: features.type,
      features: features.features.map((feature) => ({
        type: feature.type,
        geometry: feature.geometry,
        properties: feature.properties || {},
      })) as GeoJSONFeature[],
    };

    return {
      geojson: result,
      name: baseName,
    };
  } catch (error) {
    console.error('쉐이프파일 읽기 오류:', error);
    throw error;
  }
}

/**
 * 파일 세트가 유효한 SHP 파일 세트를 포함하는지 검증합니다
 * @param files - 검증할 파일 배열
 * @returns 검증 결과와 추출된 파일을 포함하는 객체
 */
export function validateShapefileSet(files: File[]): {
  isValid: boolean;
  shpFile?: File;
  dbfFile?: File;
  shxFile?: File;
  missingFiles: string[];
  baseName?: string;
} {
  // SHP 파일 찾기
  const shpFile = files.find((file) => file.name.endsWith('.shp'));

  if (!shpFile) {
    return {
      isValid: false,
      missingFiles: ['.shp'],
    };
  }

  // 기본 이름 추출
  const baseName = shpFile.name.slice(0, -4);

  // 관련 파일 찾기
  const dbfFile = files.find((file) => file.name === `${baseName}.dbf`);
  const shxFile = files.find((file) => file.name === `${baseName}.shx`);

  // 누락된 파일 확인
  const missingFiles = [];
  if (!dbfFile) missingFiles.push('.dbf');
  if (!shxFile) missingFiles.push('.shx');

  return {
    isValid: missingFiles.length === 0,
    shpFile,
    dbfFile,
    shxFile,
    missingFiles,
    baseName,
  };
}
