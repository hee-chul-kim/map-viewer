import { Shapefile } from '@/types/geometry';
import { transformCoordinates } from './geometry';
import { MAP_CONSTANTS } from './consts';
import { Feature, Position } from 'geojson';
import { douglasPeuckerLine } from './geometry';
import { SpatialGrid } from '@/types/geometry';

// 기본 스케일
const baseScale = 144;

type RenderContext = {
  ctx: CanvasRenderingContext2D;
  scale: number;
  offset: { x: number; y: number };
  style: Shapefile['style'];
  isHovered: boolean;
};

/**
 * 포인트 도형을 렌더링합니다.
 */
const renderPoint = (context: RenderContext, coordinates: [number, number]) => {
  const { ctx, scale, offset, style } = context;
  const [x, y] = coordinates;
  const { x: canvasX, y: canvasY } = transformCoordinates(scale, offset, x, y);

  ctx.beginPath();
  ctx.arc(canvasX, canvasY, style.weight * 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

/**
 * 라인스트링 도형을 렌더링합니다.
 */
const renderLineString = (context: RenderContext, coordinates: [number, number][]) => {
  const { ctx, scale, offset } = context;
  ctx.beginPath();

  coordinates.forEach(([x, y], i) => {
    const { x: canvasX, y: canvasY } = transformCoordinates(scale, offset, x, y);

    if (i === 0) {
      ctx.moveTo(canvasX, canvasY);
    } else {
      ctx.lineTo(canvasX, canvasY);
    }
  });

  ctx.stroke();
};

/**
 * 폴리곤의 링(외부 또는 내부)을 렌더링합니다.
 */
const renderPolygonRing = (context: RenderContext, ring: [number, number][]) => {
  const { ctx, scale, offset } = context;

  ring.forEach(([x, y], i) => {
    const { x: canvasX, y: canvasY } = transformCoordinates(scale, offset, x, y);

    if (i === 0) {
      ctx.moveTo(canvasX, canvasY);
    } else {
      ctx.lineTo(canvasX, canvasY);
    }
  });

  ctx.closePath();
};

/**
 * 폴리곤 도형을 렌더링합니다.
 */
const renderPolygon = (context: RenderContext, coordinates: [number, number][][]) => {
  const { ctx, scale, style } = context;
  ctx.beginPath();
  // 외각선 두께를 scale에 비례하도록 조정
  ctx.lineWidth = style.weight * scale;

  // 외부 링
  renderPolygonRing(context, coordinates[0]);

  // 내부 링 (홀)
  for (let j = 1; j < coordinates.length; j++) {
    renderPolygonRing(context, coordinates[j]);
  }

  ctx.fill();
  ctx.stroke();
};

/**
 * 피처를 렌더링합니다.
 */
const renderFeature = (
  ctx: CanvasRenderingContext2D,
  feature: Feature,
  style: Shapefile['style'],
  scale: number,
  offset: { x: number; y: number },
  isHovered: boolean
) => {
  const { geometry } = feature;

  // 호버 상태에 따른 스타일 조정
  const strokeColor = isHovered ? '#ff0000' : style.strokeColor || style.color;
  const lineWidth = isHovered ? style.weight + 1 : style.weight;
  const fillOpacity = isHovered ? Math.min(style.fillOpacity + 0.2, 1) : style.fillOpacity;
  const fillColor = isHovered ? '#ff0000' : style.color;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.fillStyle = fillColor.replace('rgb', 'rgba').replace(')', `, ${fillOpacity})`);

  const context: RenderContext = {
    ctx,
    scale,
    offset,
    style,
    isHovered,
  };

  switch (geometry.type) {
    case 'Point':
      renderPoint(context, geometry.coordinates as [number, number]);
      break;
    case 'LineString':
      renderLineString(context, geometry.coordinates as [number, number][]);
      break;
    case 'Polygon':
      renderPolygon(context, geometry.coordinates as [number, number][][]);
      break;
  }
};

/**
 * Spatial Grid를 렌더링합니다.
 */
export function renderSpatialGrid(
  ctx: CanvasRenderingContext2D,
  spatialGrid: SpatialGrid,
  canvasSize: { width: number; height: number },
  offset: { x: number; y: number },
  scale: number
): void {
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;

  // 각 타일의 경계를 그립니다
  spatialGrid.tiles.forEach((tile) => {
    const { minX, minY, maxX, maxY } = tile.bounds;

    // 타일의 네 모서리 좌표를 캔버스 좌표로 변환
    const topLeft = transformCoordinates(scale, offset, minX, maxY);
    const topRight = transformCoordinates(scale, offset, maxX, maxY);
    const bottomLeft = transformCoordinates(scale, offset, minX, minY);
    const bottomRight = transformCoordinates(scale, offset, maxX, minY);

    // 타일 경계 그리기
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topRight.x, topRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomLeft.x, bottomLeft.y);
    ctx.closePath();
    ctx.stroke();

    // 타일 ID와 피처 수 표시
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const { x: canvasX, y: canvasY } = transformCoordinates(scale, offset, centerX, centerY);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 타일 ID 표시
    ctx.fillText(tile.id, canvasX, canvasY - 10);

    // 피처 수 표시
    if (tile.features.length > 0) {
      ctx.fillText(tile.features.length.toString(), canvasX, canvasY + 10);
    }
  });
}

export { renderFeature };
