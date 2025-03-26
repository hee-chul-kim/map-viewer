import { Feature } from 'geojson';

interface TooltipProps {
  feature: Feature;
  mouseX: number;
  mouseY: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function renderTooltip(
  ctx: CanvasRenderingContext2D,
  { feature, mouseX, mouseY, canvasWidth, canvasHeight }: TooltipProps
) {
  // 툴팁 배경
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;

  const properties = feature.properties || {};
  const lines = Object.entries(properties).map(([key, value]) => `${key}: ${value}`);

  const lineHeight = 20;
  const padding = 10;
  const tooltipWidth = 200;
  const tooltipHeight = lines.length * lineHeight + padding * 2;

  // 툴팁이 화면 밖으로 나가지 않도록 위치 조정
  let tooltipX = mouseX + 10;
  let tooltipY = mouseY + 10;

  if (tooltipX + tooltipWidth > canvasWidth) {
    tooltipX = mouseX - tooltipWidth - 10;
  }

  if (tooltipY + tooltipHeight > canvasHeight) {
    tooltipY = mouseY - tooltipHeight - 10;
  }

  // 툴팁 그리기
  ctx.beginPath();
  ctx.roundRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 5);
  ctx.fill();
  ctx.stroke();

  // 텍스트 그리기
  ctx.fillStyle = '#333';
  ctx.font = '12px Arial';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  lines.forEach((line, i) => {
    ctx.fillText(line, tooltipX + padding, tooltipY + padding + i * lineHeight);
  });
}
