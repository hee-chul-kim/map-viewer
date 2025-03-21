import proj4 from 'proj4';

// EPSG:4301 (한국 2000) 정의
proj4.defs('EPSG:4301', '+proj=longlat +ellps=GRS80 +datum=WGS84 +no_defs');

// 좌표 변환 함수
function transformCoordinates(coordinates: [number, number], fromCrs: string, toCrs: string): [number, number] {
  try {
    return proj4(fromCrs, toCrs, coordinates);
  } catch (error) {
    console.warn('좌표 변환 실패:', error);
    return coordinates;
  }
}

// GeoJSON 좌표 변환 함수
function transformGeoJSONCoordinates(coordinates: any, fromCrs: string, toCrs: string): any {
  if (!coordinates) return coordinates;

  if (Array.isArray(coordinates) && coordinates.length === 2 && typeof coordinates[0] === 'number') {
    return transformCoordinates(coordinates as [number, number], fromCrs, toCrs);
  } else if (Array.isArray(coordinates)) {
    return coordinates.map(coord => transformGeoJSONCoordinates(coord, fromCrs, toCrs));
  }

  return coordinates;
}

// Worker 메시지 핸들러
self.onmessage = (e) => {
  const { features, fromCrs, toCrs, startIndex, endIndex } = e.data;
  
  // 시작 시간 기록
  const startTime = performance.now();

  // 지정된 범위의 features만 변환
  const transformedFeatures = features.slice(startIndex, endIndex).map((feature: any) => ({
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: transformGeoJSONCoordinates(feature.geometry.coordinates, fromCrs, toCrs),
    },
  }));

  // 종료 시간 기록
  const endTime = performance.now();
  const elapsedTime = (endTime - startTime).toFixed(2);

  // 결과 전송
  self.postMessage({
    features: transformedFeatures,
    elapsedTime,
    featureCount: transformedFeatures.length,
    startIndex,
    endIndex,
  });
}; 