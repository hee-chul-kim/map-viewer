import { Feature } from 'geojson';
import { transformCoordinates } from './geometry';

export function detectCollision(
  geoCoords: { lat: number; lng: number },
  feature: Feature,
  ctx: CanvasRenderingContext2D,
  scale: number,
  offset: { x: number; y: number }
): boolean {
  const { geometry } = feature;

  // 캔버스 좌표로 변환
  const { x, y } = transformCoordinates(scale, offset, geoCoords.lng, geoCoords.lat);

  if (geometry.type === 'Point') {
    const [geoX, geoY] = geometry.coordinates as [number, number];
    const { x: canvasX, y: canvasY } = transformCoordinates(scale, offset, geoX, geoY);

    const distance = Math.sqrt(Math.pow(x - canvasX, 2) + Math.pow(y - canvasY, 2));
    return distance <= 5 * scale;
  } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    // 다각형 충돌 감지를 위해 캔버스 API 활용
    ctx.beginPath();

    if (geometry.type === 'Polygon') {
      // 외부 링
      (geometry.coordinates as [number, number][][])[0].forEach(([geoX, geoY], i) => {
        const { x: canvasX, y: canvasY } = transformCoordinates(scale, offset, geoX, geoY);

        if (i === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      });
    } else if (geometry.type === 'MultiPolygon') {
      (geometry.coordinates as [number, number][][][]).forEach((polygon: [number, number][][]) => {
        // 외부 링
        polygon[0].forEach(([geoX, geoY], i) => {
          const { x: canvasX, y: canvasY } = transformCoordinates(scale, offset, geoX, geoY);

          if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        });
      });
    }

    ctx.closePath();
    return ctx.isPointInPath(x, y) as boolean;
  }

  // 라인 및 기타 도형은 단순화된 충돌 감지 (정확한 구현은 복잡함)
  return false;
}
