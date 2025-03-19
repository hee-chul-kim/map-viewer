import { v4 as uuidv4 } from 'uuid';
import { GeoJsonCollection as GeoJsonCollection, Shapefile } from '@/types/geometry';
import { parseShp, parseDbf, combineShpDbf } from './shp-parser';
import { DEFAULT_STYLE } from './consts';

export default async function loadShapefile(filePath: string): Promise<Shapefile> {
  try {
    // 파일 이름에서 확장자 제거
    const name = filePath.split('/').pop()?.replace('.shp', '') || 'Unknown';

    // 관련 파일들의 경로 생성
    const shpPath = filePath;
    const dbfPath = filePath.replace('.shp', '.dbf');

    // 파일들을 병렬로 로드하고 파싱
    const [shpData, dbfData] = await Promise.all([
      fetch(shpPath)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load SHP file: ${res.statusText}`);
          return res.arrayBuffer();
        })
        .then(buffer => parseShp(buffer)),
      fetch(dbfPath)
        .then(res => {
          if (!res.ok) {
            console.warn(`DBF file not found or failed to load: ${dbfPath}`);
            return null;
          }
          return res.arrayBuffer();
        })
        .then(buffer => buffer ? parseDbf(buffer) : [])
        .catch(() => []) // DBF 파일이 없거나 로드 실패 시 빈 배열 반환
    ]);

    // SHP와 DBF 데이터 결합
    const parsedGeojson = combineShpDbf([shpData, dbfData]);

    // GeoJsonCollection 형식으로 변환
    const geojson: GeoJsonCollection = {
      type: parsedGeojson.type,
      features: parsedGeojson.features.map((feature) => ({
        type: feature.type,
        geometry: feature.geometry,
        properties: feature.properties || {},
      })),
    };

    // Shapefile 객체 생성
    const shapefile: Shapefile = {
      id: uuidv4(),
      name,
      geojson,
      visible: true,
      style: DEFAULT_STYLE,
    };

    return shapefile;
  } catch (error) {
    console.error('Error loading shapefile:', error);
    throw new Error('Failed to load shapefile');
  }
}
