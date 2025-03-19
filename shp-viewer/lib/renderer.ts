import { GeoJsonFeature, Shapefile } from '@/types/geometry';
import { transformCoordinates } from './geometry';

type RenderContext = {
  ctx: CanvasRenderingContext2D;
  canvasSize: { width: number; height: number };
  scale: number;
  offset: { x: number; y: number };
  style: Shapefile['style'];
  isHovered: boolean;
};

/**
 * 포인트 도형을 렌더링합니다.
 */
const renderPoint = (context: RenderContext, coordinates: [number, number]) => {
  const { ctx, canvasSize, scale, offset } = context;
  const [x, y] = coordinates;
  const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

  ctx.beginPath();
  ctx.arc(canvasX, canvasY, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

/**
 * 라인스트링 도형을 렌더링합니다.
 */
const renderLineString = (context: RenderContext, coordinates: [number, number][]) => {
  const { ctx, canvasSize, scale, offset } = context;
  ctx.beginPath();

  coordinates.forEach(([x, y], i) => {
    const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

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
  const { ctx, canvasSize, scale, offset } = context;

  ring.forEach(([x, y], i) => {
    const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

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
  const { ctx } = context;
  ctx.beginPath();

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
 * 멀티포인트 도형을 렌더링합니다.
 */
const renderMultiPoint = (context: RenderContext, coordinates: [number, number][]) => {
  coordinates.forEach((point) => renderPoint(context, point));
};

/**
 * 멀티라인스트링 도형을 렌더링합니다.
 */
const renderMultiLineString = (context: RenderContext, coordinates: [number, number][][]) => {
  coordinates.forEach((line) => renderLineString(context, line));
};

/**
 * 멀티폴리곤 도형을 렌더링합니다.
 */
const renderMultiPolygon = (context: RenderContext, coordinates: [number, number][][][]) => {
  coordinates.forEach((polygon) => renderPolygon(context, polygon));
};

/**
 * 피처를 렌더링합니다.
 */
const renderFeature = (
  ctx: CanvasRenderingContext2D,
  feature: GeoJsonFeature,
  style: Shapefile['style'],
  canvasSize: { width: number; height: number },
  scale: number,
  offset: { x: number; y: number },
  isHovered = false
) => {
  const { geometry } = feature;

  // 호버 상태에 따른 스타일 조정
  const strokeColor = isHovered ? '#ff0000' : style.color;
  const lineWidth = isHovered ? style.weight + 1 : style.weight;
  const fillOpacity = isHovered ? Math.min(style.fillOpacity + 0.2, 1) : style.fillOpacity;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.fillStyle = style.color.replace('rgb', 'rgba').replace(')', `, ${fillOpacity})`);

  const context: RenderContext = {
    ctx,
    canvasSize,
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
    case 'MultiPoint':
      renderMultiPoint(context, geometry.coordinates as [number, number][]);
      break;
    case 'MultiLineString':
      renderMultiLineString(context, geometry.coordinates as [number, number][][]);
      break;
    case 'MultiPolygon':
      renderMultiPolygon(context, geometry.coordinates as [number, number][][][]);
      break;
  }
};

export { renderFeature };