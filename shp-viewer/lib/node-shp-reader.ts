/**
 * Node.js 환경에서 SHP 파일을 읽기 위한 유틸리티
 * 이 모듈은 주로 테스트 목적으로 사용되며 브라우저 앱에서는 사용되지 않습니다.
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseShp, parseDbf, combineShpDbf } from './shp-parser';
import { GeoJSONCollection } from '@/types/geometry';

/**
 * Node.js 환경에서 파일 시스템의 SHP 파일을 읽습니다.
 * @param shpFilePath - SHP 파일 경로
 * @param dbfFilePath - 선택적 DBF 파일 경로
 * @param shxFilePath - 선택적 SHX 파일 경로
 * @returns GeoJSON 컬렉션으로 해석되는 Promise
 */
export async function readShapefileNode(
  shpFilePath: string,
  dbfFilePath?: string,
  shxFilePath?: string
): Promise<{
  name: string;
  geojson: GeoJSONCollection;
}> {
  try {
    // 파일 경로 유효성 검사
    if (!shpFilePath || !shpFilePath.endsWith('.shp')) {
      throw new Error('유효하지 않은 SHP 파일 경로');
    }

    // 파일 존재 여부 확인
    if (!fs.existsSync(shpFilePath)) {
      throw new Error(`파일을 찾을 수 없음: ${shpFilePath}`);
    }

    // 기본 이름 추출
    const baseName = path.basename(shpFilePath, '.shp');

    // 파일 읽기
    const shpBuffer = fs.readFileSync(shpFilePath);
    const dbfBuffer =
      dbfFilePath && fs.existsSync(dbfFilePath) ? fs.readFileSync(dbfFilePath) : undefined;
    const shxBuffer =
      shxFilePath && fs.existsSync(shxFilePath) ? fs.readFileSync(shxFilePath) : undefined;

    // ArrayBuffer로 변환
    const shpArrayBuffer = Buffer.from(shpBuffer).buffer as ArrayBuffer;

    // SHP 파일 파싱
    const geojson = await parseShp(shpArrayBuffer);

    // DBF 파일 파싱 (있는 경우)
    let dbfData = [];
    if (dbfBuffer) {
      const dbfArrayBuffer = Buffer.from(dbfBuffer).buffer as ArrayBuffer;
      dbfData = await parseDbf(dbfArrayBuffer);
    }

    // 데이터 결합
    const result = combineShpDbf([geojson, dbfData]);

    return {
      name: baseName,
      geojson: result as GeoJSONCollection,
    };
  } catch (error) {
    console.error('Node 환경에서 SHP 파일 읽기 오류:', error);
    throw error;
  }
}

/**
 * 파일 경로 세트가 유효한 SHP 파일 세트를 포함하는지 검증합니다.
 * @param filePaths - 검증할 파일 경로 배열
 * @returns 검증 결과와 추출된 파일 경로를 포함하는 객체
 */
export function validateShapefileSetNode(filePaths: string[]) {
  // SHP 파일 찾기
  const shpFilePath = filePaths.find((filePath: string) => filePath.endsWith('.shp'));

  if (!shpFilePath) {
    return {
      isValid: false,
      missingFiles: ['.shp'],
    };
  }

  // 기본 이름 추출
  const baseName = path.basename(shpFilePath, '.shp');
  const baseDir = path.dirname(shpFilePath);

  // 관련 파일 찾기
  const dbfFilePath = filePaths.find(
    (filePath: string) => path.basename(filePath) === `${baseName}.dbf`
  );
  const shxFilePath = filePaths.find(
    (filePath: string) => path.basename(filePath) === `${baseName}.shx`
  );

  // 누락된 파일 확인
  const missingFiles = [];
  if (!dbfFilePath) missingFiles.push('.dbf');
  if (!shxFilePath) missingFiles.push('.shx');

  return {
    isValid: missingFiles.length === 0,
    shpFilePath,
    dbfFilePath,
    shxFilePath,
    missingFiles,
    baseName,
  };
}

module.exports = {
  readShapefileNode,
  validateShapefileSetNode,
};
