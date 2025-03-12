/**
 * 간단한 readShapefile 테스트 스크립트 (Node.js 환경용)
 * 사용법: npx ts-node scripts/test-read-shapefile.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { readShapefileNode } from '../lib/node-shp-reader';
import { GeoJSONCollection } from '../lib/store';

async function main() {
  try {
    console.log('SHP 파일 읽기 테스트 시작 (Node.js 환경)...\n');

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
    const result : {
      name: string;
      geojson: GeoJSONCollection;
    } = await readShapefileNode(shpFilePath, dbfFilePath, shxFilePath);

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

    console.log('\nSHP 파일 읽기 테스트 완료!');
  } catch (error) {
    console.error('오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main(); 