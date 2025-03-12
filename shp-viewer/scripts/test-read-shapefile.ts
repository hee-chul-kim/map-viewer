/**
 * 간단한 readShapefile 테스트 스크립트 (Node.js 환경용)
 * 사용법: npx ts-node scripts/test-read-shapefile.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { GeoJSONCollection } from '../lib/store';

// Node.js 환경에서 SHP 파일 읽기 함수
async function readShapefileNode(
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
      throw new Error('Invalid SHP file path');
    }

    // 파일 존재 여부 확인
    if (!fs.existsSync(shpFilePath)) {
      throw new Error(`File not found: ${shpFilePath}`);
    }

    // 기본 이름 추출
    const baseName = path.basename(shpFilePath, '.shp');

    // shpjs 동적 임포트
    const shpjs = await import('shpjs');

    // 파일 읽기
    const shpBuffer = fs.readFileSync(shpFilePath);
    const dbfBuffer = dbfFilePath && fs.existsSync(dbfFilePath) 
      ? fs.readFileSync(dbfFilePath) 
      : undefined;
    const shxBuffer = shxFilePath && fs.existsSync(shxFilePath)
      ? fs.readFileSync(shxFilePath)
      : undefined;

    // ArrayBuffer로 변환
    const shpArrayBuffer = Buffer.from(shpBuffer).buffer as ArrayBuffer;

    // SHP 파일 파싱
    const geojson = await shpjs.default.parseShp(shpArrayBuffer);

    // DBF 파일 파싱 (있는 경우)
    let dbfData = [];
    if (dbfBuffer) {
      const dbfArrayBuffer = Buffer.from(dbfBuffer).buffer as ArrayBuffer;
      dbfData = await shpjs.default.parseDbf(dbfArrayBuffer);
    }

    // 데이터 결합
    const result = shpjs.default.combine([geojson, dbfData]);

    return {
      name: baseName,
      geojson: result as GeoJSONCollection,
    };
  } catch (error) {
    console.error('Error reading shapefile:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('readShapefile 함수 테스트 시작 (Node.js 환경)...\n');

    // 테스트 파일 경로
    const shpFilePath = './files/point/PFP.shp';
    const dbfFilePath = './files/point/PFP.dbf';
    const shxFilePath = './files/point/PFP.shx';

    // 파일 존재 여부 확인
    if (!fs.existsSync(shpFilePath)) {
      throw new Error(`SHP 파일을 찾을 수 없습니다: ${shpFilePath}`);
    }
    if (!fs.existsSync(dbfFilePath)) {
      throw new Error(`DBF 파일을 찾을 수 없습니다: ${dbfFilePath}`);
    }
    if (!fs.existsSync(shxFilePath)) {
      throw new Error(`SHX 파일을 찾을 수 없습니다: ${shxFilePath}`);
    }

    console.log('파일 정보:');
    console.log(`- SHP: ${shpFilePath} (존재함)`);
    console.log(`- DBF: ${dbfFilePath} (존재함)`);
    console.log(`- SHX: ${shxFilePath} (존재함)`);

    // readShapefileNode 함수 호출
    console.log('\nreadShapefileNode 함수 호출 중...');
    const result = await readShapefileNode(shpFilePath, dbfFilePath, shxFilePath);

    // 결과 출력
    console.log('\n결과:');
    console.log(`- 이름: ${result.name}`);
    console.log(`- 타입: ${result.geojson.type}`);
    console.log(`- 피처 수: ${result.geojson.features.length}`);

    // 첫 번째 피처 정보 출력
    if (result.geojson.features.length > 0) {
      const firstFeature = result.geojson.features[0];
      console.log('\n첫 번째 피처:');
      console.log(`- 타입: ${firstFeature.geometry.type}`);
      console.log(`- 좌표: ${JSON.stringify(firstFeature.geometry.coordinates).slice(0, 100)}...`);
      
      // 속성 정보 출력
      console.log('- 속성:');
      Object.entries(firstFeature.properties).slice(0, 5).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value}`);
      });
      
      if (Object.keys(firstFeature.properties).length > 5) {
        console.log(`  - ... 외 ${Object.keys(firstFeature.properties).length - 5}개 속성`);
      }
    }

    // 샘플 데이터 저장
    const sampleData = {
      type: result.geojson.type,
      features: result.geojson.features.slice(0, 5),
    };
    
    const sampleFilePath = './files/point/PFP-test-result.json';
    fs.writeFileSync(sampleFilePath, JSON.stringify(sampleData, null, 2));
    console.log(`\n샘플 데이터 저장 완료: ${sampleFilePath}`);

    console.log('\nreadShapefile 함수 테스트 완료!');
  } catch (error) {
    console.error('오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main(); 