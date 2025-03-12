/**
 * Command-line script to read SHP file from a file path
 * Usage: npx ts-node scripts/read-file-path.ts <path-to-shp-file>
 */
import * as fs from 'fs';
import * as path from 'path';
import { GeoJSONCollection } from '../lib/store';

// 파일 경로에서 SHP 파일 읽기
async function readShapefileFromPath(shpFilePath: string): Promise<{
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
    const directory = path.dirname(shpFilePath);

    // 관련 파일 경로 찾기
    const dbfFilePath = path.join(directory, `${baseName}.dbf`);
    const shxFilePath = path.join(directory, `${baseName}.shx`);

    // 관련 파일 존재 여부 확인
    const hasDbf = fs.existsSync(dbfFilePath);
    const hasShx = fs.existsSync(shxFilePath);

    console.log('SHP File Information:');
    console.log(`- SHP: ${shpFilePath} (Found)`);
    console.log(`- DBF: ${dbfFilePath} (${hasDbf ? 'Found' : 'Missing'})`);
    console.log(`- SHX: ${shxFilePath} (${hasShx ? 'Found' : 'Missing'})`);

    // shpjs 동적 임포트
    const shpjs = await import('shpjs');

    // 파일 읽기
    const shpBuffer = fs.readFileSync(shpFilePath);
    const dbfBuffer = hasDbf ? fs.readFileSync(dbfFilePath) : undefined;
    const shxBuffer = hasShx ? fs.readFileSync(shxFilePath) : undefined;

    // ArrayBuffer로 변환 (타입 단언을 사용하여 타입 오류 해결)
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
    console.error('Error reading shapefile from path:', error);
    throw error;
  }
}

async function main() {
  try {
    // 명령줄 인수에서 SHP 파일 경로 가져오기
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error('Please provide a path to a SHP file');
      console.error('Usage: npx ts-node scripts/read-file-path.ts <path-to-shp-file>');
      process.exit(1);
    }

    const shpFilePath = args[0];
    
    // SHP 파일 읽기
    console.log('\nReading SHP file...');
    const result = await readShapefileFromPath(shpFilePath);
    
    console.log('\nSHP File Contents:');
    console.log(`- Name: ${result.name}`);
    console.log(`- Type: ${result.geojson.type}`);
    console.log(`- Features: ${result.geojson.features.length}`);
    
    // 첫 번째 피처 표시
    if (result.geojson.features.length > 0) {
      const firstFeature = result.geojson.features[0];
      console.log('\nFirst Feature:');
      console.log(`- Type: ${firstFeature.geometry.type}`);
      console.log(`- Coordinates: ${JSON.stringify(firstFeature.geometry.coordinates).slice(0, 100)}...`);
      
      // 속성 표시
      console.log('- Properties:');
      Object.entries(firstFeature.properties).slice(0, 5).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value}`);
      });
      
      if (Object.keys(firstFeature.properties).length > 5) {
        console.log(`  - ... and ${Object.keys(firstFeature.properties).length - 5} more properties`);
      }
    }
    
    // 샘플 데이터를 JSON 파일로 저장
    const sampleData = {
      type: result.geojson.type,
      features: result.geojson.features.slice(0, 5),
    };
    
    const sampleFilePath = path.join(path.dirname(shpFilePath), `${result.name}-sample-path.json`);
    fs.writeFileSync(sampleFilePath, JSON.stringify(sampleData, null, 2));
    console.log(`\nSample data saved to: ${sampleFilePath}`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// 스크립트 실행
main(); 