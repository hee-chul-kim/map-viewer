import { v4 as uuidv4 } from 'uuid';
import { Shapefile } from '@/types/shapefile';
import { GeoJSONCollection } from '@/types/geojson';
import { parseShp, parseDbf, combineShpDbf } from './shp-parser';

export async function loadShapefileFromPath(filePath: string): Promise<Shapefile> {
  try {
    // 파일 이름에서 확장자 제거
    const name = filePath.split('/').pop()?.replace('.shp', '') || 'Unknown';
    
    // 관련 파일들의 경로 생성
    const shpPath = filePath;
    const dbfPath = filePath.replace('.shp', '.dbf');
        
    // 파일들을 fetch로 로드
    const [shpResponse, dbfResponse] = await Promise.all([
      fetch(shpPath),
      fetch(dbfPath),
  
    ]);
    
    // Response를 ArrayBuffer로 변환
    const [shpBuffer, dbfBuffer] = await Promise.all([
      shpResponse.arrayBuffer(),
      dbfResponse.arrayBuffer()
    ]);
    
    // SHP와 DBF 파일 파싱
    const [shpData, dbfData] = await Promise.all([
      parseShp(shpBuffer),
      parseDbf(dbfBuffer)
    ]);
    
    // SHP와 DBF 데이터 결합
    const parsedGeojson = combineShpDbf([shpData, dbfData]);
    
    // GeoJSONCollection 형식으로 변환
    const geojson: GeoJSONCollection = {
      type: parsedGeojson.type,
      features: parsedGeojson.features.map(feature => ({
        type: feature.type,
        geometry: feature.geometry,
        properties: feature.properties || {}
      }))
    };
    
    // Shapefile 객체 생성
    const shapefile: Shapefile = {
      id: uuidv4(),
      name,
      geojson,
      visible: true,
      style: {
        color: '#3B82F6',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.2
      }
    };
    
    return shapefile;
  } catch (error) {
    console.error('Error loading shapefile:', error);
    throw new Error('Failed to load shapefile');
  }
} 