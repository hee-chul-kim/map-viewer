import { v4 as uuidv4 } from 'uuid';
import { Shapefile } from '@/types/geometry';
import { parseShp, parseDbf, parsePrj } from './parser';
import { COORDINATE_SYSTEMS, DEFAULT_STYLE } from './consts';
import proj4 from 'proj4';
import type {
  FeatureCollection,
  Feature,
  Geometry,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
} from 'geojson';
import { douglasPeuckerLine } from './geometry';
import { toast } from '@/components/ui/use-toast';

// EPSG:4301 (한국 2000) 정의
proj4.defs('EPSG:4301', '+proj=longlat +ellps=GRS80 +datum=WGS84 +no_defs');

/**
 * 좌표를 지정된 좌표계로 변환합니다.
 * @param coordinates - 변환할 좌표 [x, y]
 * @param fromCrs - 원본 좌표계 (WKT 형식)
 * @param toCrs - 목표 좌표계 (예: 'EPSG:4301')
 * @returns 변환된 좌표 [x, y]
 */
function transformCoordinates(
  coordinates: [number, number],
  fromCrs: string,
  toCrs: string = 'EPSG:4301'
): [number, number] {
  try {
    // 좌표 변환
    const transformed = proj4(fromCrs, toCrs, coordinates);
    //console.log(`좌표 변환: [${coordinates[0]}, ${coordinates[1]}] -> [${transformed[0]}, ${transformed[1]}]`);
    return transformed;
  } catch (error) {
    console.warn('좌표 변환 실패:', error);
    return coordinates;
  }
}

/**
 * GeoJSON 좌표를 지정된 좌표계로 변환합니다.
 * @param coordinates - 변환할 GeoJSON 좌표
 * @param fromCrs - 원본 좌표계 (WKT 형식)
 * @param toCrs - 목표 좌표계 (예: 'EPSG:4301')
 * @returns 변환된 GeoJSON 좌표
 */
function transformGeoJSONCoordinates(
  coordinates: any,
  fromCrs: string,
  toCrs: string = 'EPSG:4301'
): any {
  if (!coordinates) return coordinates;

  if (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    typeof coordinates[0] === 'number'
  ) {
    // 단일 좌표 [x, y]
    return transformCoordinates(coordinates as [number, number], fromCrs, toCrs);
  } else if (Array.isArray(coordinates)) {
    // 좌표 배열 (LineString, MultiPoint 등)
    return coordinates.map((coord) => transformGeoJSONCoordinates(coord, fromCrs, toCrs));
  }

  return coordinates;
}

/**
 * SHP 데이터의 좌표를 지정된 좌표계로 변환합니다.
 * @param shpData - 변환할 SHP 데이터
 * @param fromCrs - 원본 좌표계 (WKT 형식)
 * @param toCrs - 목표 좌표계 (예: 'EPSG:4301')
 * @returns 변환된 SHP 데이터
 */
function projectShp(
  shpData: FeatureCollection,
  fromCrs: string,
  toCrs: string
): Promise<FeatureCollection> {
  if (!fromCrs) {
    return Promise.resolve(shpData);
  }

  if (fromCrs === toCrs) {
    return Promise.resolve(shpData);
  }

  console.log('좌표계 변환 시작:', fromCrs, '->', toCrs);
  // @ts-ignore - 좌표계 변환 중 타입 오류 무시
  console.log('변환 전 첫 번째 좌표:', shpData.features[0]?.geometry.coordinates);

  return new Promise((resolve, reject) => {
    const features = shpData.features;
    const totalFeatures = features.length;
    const numWorkers = navigator.hardwareConcurrency || 4;
    const chunkSize = Math.ceil(totalFeatures / numWorkers);

    console.log(`총 ${totalFeatures}개의 좌표를 ${numWorkers}개의 Worker로 분산 처리합니다.`);

    const totalStartTime = performance.now();
    const workers = Array.from(
      { length: numWorkers },
      () => new Worker(new URL('./coordinate-worker.ts', import.meta.url))
    );

    const results: any[] = [];
    let completedWorkers = 0;
    let processedFeatures = 0;

    // Worker 메시지 핸들러
    const handleMessage = (e: MessageEvent) => {
      const { features, featureCount, startIndex, endIndex } = e.data;

      // 결과 저장
      results.push({ features, startIndex, endIndex });
      completedWorkers++;
      processedFeatures += featureCount;

      // 진행 상황 표시
      const progress = ((processedFeatures / totalFeatures) * 100).toFixed(1);
      console.log(
        `Worker ${completedWorkers}/${numWorkers} 완료: ${featureCount}개 처리 (${progress}%)`
      );

      // 모든 Worker가 완료되면 결과 병합
      if (completedWorkers === numWorkers) {
        // 시작 인덱스 순으로 정렬
        results.sort((a, b) => a.startIndex - b.startIndex);

        // 모든 결과 병합
        const allFeatures = results.flatMap((result) => result.features);

        // 전체 종료 시간 기록 및 계산
        const totalEndTime = performance.now();
        const totalElapsedTime = (totalEndTime - totalStartTime).toFixed(2);

        console.log('변환 후 첫 번째 좌표:', allFeatures[0]?.geometry.coordinates);
        console.log('좌표계 변환 완료');
        console.log(`총 소요 시간: ${totalElapsedTime}ms`);
        console.log(`변환된 좌표 수: ${allFeatures.length}개`);
        console.log(`사용된 Worker 수: ${numWorkers}개`);

        // 메모리 정리
        workers.forEach((worker) => worker.terminate());
        results.length = 0;

        // 완료 메시지를 toast로 표시
        toast({
          title: '좌표 변환 완료',
          description: `총 소요 시간: ${totalElapsedTime}ms\n변환된 좌표 수: ${allFeatures.length}개\n사용된 Worker 수: ${numWorkers}개`,
        });

        resolve({
          ...shpData,
          features: allFeatures,
        });
      }
    };

    // Worker 에러 핸들러
    const handleError = (error: ErrorEvent) => {
      console.error('Worker 에러:', error);
      workers.forEach((worker) => worker.terminate());
      toast({
        variant: 'destructive',
        title: '오류',
        description: '좌표 변환 중 오류가 발생했습니다.',
      });
      reject(error);
    };

    // 각 Worker에 이벤트 리스너 등록
    workers.forEach((worker) => {
      worker.onmessage = handleMessage;
      worker.onerror = handleError;
    });

    // 각 Worker에 작업 할당
    workers.forEach((worker, index) => {
      const startIndex = index * chunkSize;
      const endIndex = Math.min(startIndex + chunkSize, totalFeatures);

      worker.postMessage({
        features: features.slice(startIndex, endIndex),
        fromCrs,
        toCrs,
        startIndex,
        endIndex,
      });
    });
  });
}

/**
 * GeoJSON을 간략화합니다.
 * @param geojson - 원본 GeoJSON
 * @param epsilon - 간략화 임계값
 * @returns 간략화된 GeoJSON
 */
function simplifyGeoJSON(geojson: FeatureCollection, epsilon: number): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geojson.features.map((feature) => {
      const { geometry } = feature;
      let simplifiedGeometry = { ...geometry };

      switch (geometry.type) {
        case 'LineString': {
          const lineString = geometry as LineString;
          simplifiedGeometry = {
            ...geometry,
            coordinates: douglasPeuckerLine(lineString.coordinates, epsilon),
          };
          break;
        }
        case 'Polygon': {
          const polygon = geometry as Polygon;
          simplifiedGeometry = {
            ...geometry,
            coordinates: polygon.coordinates.map((ring) => douglasPeuckerLine(ring, epsilon)),
          };
          break;
        }
        case 'MultiLineString': {
          const multiLineString = geometry as MultiLineString;
          simplifiedGeometry = {
            ...geometry,
            coordinates: multiLineString.coordinates.map((line) =>
              douglasPeuckerLine(line, epsilon)
            ),
          };
          break;
        }
        case 'MultiPolygon': {
          const multiPolygon = geometry as MultiPolygon;
          simplifiedGeometry = {
            ...geometry,
            coordinates: multiPolygon.coordinates.map((polygon) =>
              polygon.map((ring) => douglasPeuckerLine(ring, epsilon))
            ),
          };
          break;
        }
      }

      return {
        ...feature,
        geometry: simplifiedGeometry as Geometry,
      };
    }),
  };
}

export async function loadShapefile(filePath: string): Promise<Shapefile> {
  try {
    // 파일 이름에서 확장자 제거
    const name = filePath.split('/').pop()?.replace('.shp', '') || 'Unknown';

    // 관련 파일들의 경로 생성
    const shpPath = filePath;
    const dbfPath = filePath.replace('.shp', '.dbf');
    const prjPath = filePath.replace('.shp', '.prj');

    // 파일들을 병렬로 로드하고 파싱
    const [shpBuffer, dbfData, prjData] = await Promise.all([
      fetch(shpPath).then((res) => {
        if (!res.ok) throw new Error(`Failed to load SHP file: ${res.statusText}`);
        return res.arrayBuffer();
      }),
      fetch(dbfPath)
        .then((res) => {
          if (!res.ok) {
            console.warn(`DBF file not found or failed to load: ${dbfPath}`);
            return null;
          }
          return res.arrayBuffer();
        })
        .then((buffer) => (buffer ? parseDbf(buffer) : []))
        .catch(() => []), // DBF 파일이 없거나 로드 실패 시 빈 배열 반환
      fetch(prjPath)
        .then((res) => {
          if (!res.ok) {
            console.warn(`PRJ file not found or failed to load: ${prjPath}`);
            return null;
          }
          return res.arrayBuffer();
        })
        .then((buffer) => (buffer ? parsePrj(buffer) : COORDINATE_SYSTEMS.EPSG4326))
        .catch(() => COORDINATE_SYSTEMS.EPSG4326), // PRJ 파일이 없거나 로드 실패 시 EPSG4326 반환
    ]);

    // SHP 파일 파싱
    const shpData = await parseShp(shpBuffer, name);

    // SHP와 DBF 데이터 결합
    let combined = combineShpDbf([shpData, dbfData]);

    // 좌표계 변환
    const projected = await projectShp(combined, prjData, COORDINATE_SYSTEMS.EPSG3375);

    // Shapefile 객체 생성 및 도형 타입에 따른 스타일 적용
    const getStyleByGeometryType = (geojson: FeatureCollection) => {
      const firstFeature = geojson.features[0];
      if (!firstFeature) return DEFAULT_STYLE.polygon;

      const geometryType = firstFeature.geometry.type;
      if (geometryType.includes('Point')) return DEFAULT_STYLE.point;
      if (geometryType.includes('LineString')) return DEFAULT_STYLE.line;
      return DEFAULT_STYLE.polygon;
    };

    // 간략화된 버전 생성 (epsilon 값은 적절히 조정 필요)
    const simplified = simplifyGeoJSON(projected, 0.001);

    const shapefile: Shapefile = {
      id: uuidv4(),
      name,
      geojson: projected,
      simplified,
      style: getStyleByGeometryType(projected),
      visible: true,
    };
    return shapefile;
  } catch (error) {
    console.error('Error loading shapefile:', error);
    throw new Error('Failed to load shapefile');
  }
}

/**
 * SHP와 DBF 데이터를 결합합니다.
 */
function combineShpDbf(data: [FeatureCollection, Record<string, any>[]]): FeatureCollection {
  const [shpData, dbfData] = data;

  if (!dbfData || dbfData.length === 0) {
    console.log('DBF 데이터가 없습니다. SHP 데이터만 반환합니다.');
    return shpData;
  }

  const combinedFeatures = shpData.features.map((feature, index) => {
    if (index >= dbfData.length) {
      console.warn(`DBF 레코드가 부족합니다. 인덱스: ${index}`);
      return feature;
    }

    return {
      ...feature,
      properties: {
        ...feature.properties,
        ...dbfData[index],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features: combinedFeatures,
  };
}
