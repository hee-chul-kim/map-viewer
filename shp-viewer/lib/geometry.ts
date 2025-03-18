import { Bounds, GeoJSONFeature, Shapefile } from '@/types/geometry';

// 경계 계산 함수
const calculateBounds = (visibleShapefiles: Shapefile[]): Bounds => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasFeatures = false;

  visibleShapefiles.forEach((shapefile) => {
    if (!shapefile.visible) return;

    shapefile.geojson.features.forEach((feature) => {
      const { geometry } = feature;
      hasFeatures = true;

      if (geometry.type === 'Point') {
        const [x, y] = geometry.coordinates as [number, number];
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      } else if (geometry.type === 'LineString') {
        (geometry.coordinates as [number, number][]).forEach(([x, y]) => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });
      } else if (geometry.type === 'Polygon') {
        (geometry.coordinates as [number, number][][]).forEach((ring: [number, number][]) => {
          ring.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        });
      } else if (geometry.type === 'MultiPoint') {
        (geometry.coordinates as [number, number][]).forEach(([x, y]) => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as [number, number][][]).forEach((line: [number, number][]) => {
          line.forEach(([x, y]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        });
      } else if (geometry.type === 'MultiPolygon') {
        (geometry.coordinates as [number, number][][][]).forEach(
          (polygon: [number, number][][]) => {
            polygon.forEach((ring: [number, number][]) => {
              ring.forEach(([x, y]) => {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              });
            });
          }
        );
      }
    });
  });

  if (!hasFeatures) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1, hasFeatures: false };
  }

  return { minX, minY, maxX, maxY, hasFeatures };
};

// 좌표 변환 함수
const transformCoordinates = (
  canvasSize: { width: number; height: number },
  scale: number,
  offset: { x: number; y: number },
  x: number,
  y: number,
  padding = 20
) => {
  //const { minX, minY, maxX, maxY } = bounds;
  // const rangeX = maxX - minX;
  // const rangeY = maxY - minY;

  // 대한민국 위경도 범위로 설정
  //const maxX = 132;
  //const maxY = 38.37;
  const minX = 124;
  const minY = 33.06;
  //const rangeX = maxX - minX;
  //const rangeY = maxY - minY;

  // 가로세로 비율 유지를 위한 스케일 계산
  // const scaleX = (canvasSize.width - padding * 2) / rangeX;
  // const scaleY = (canvasSize.height - padding * 2) / rangeY;
  // const baseScale = Math.min(scaleX, scaleY);

  // 기본 스케일
  const baseScale = 144;

  // 현재 스케일과 오프셋 적용
  const canvasX = padding + (x - minX) * baseScale * scale + offset.x;
  const canvasY = canvasSize.height - padding - (y - minY) * baseScale * scale + offset.y;

  return { x: canvasX, y: canvasY };
};

// 피처 렌더링 함수
const renderFeature = (
  ctx: CanvasRenderingContext2D,
  feature: GeoJSONFeature,
  style: Shapefile['style'],
  canvasSize: { width: number; height: number },
  scale: number,
  offset: { x: number; y: number },
  isHovered = false
) => {
  console.log('render');

  const { geometry } = feature;

  // 호버 상태에 따른 스타일 조정
  const strokeColor = isHovered ? '#ff0000' : style.color;
  const lineWidth = isHovered ? style.weight + 1 : style.weight;
  const fillOpacity = isHovered ? Math.min(style.fillOpacity + 0.2, 1) : style.fillOpacity;

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.fillStyle = style.color.replace('rgb', 'rgba').replace(')', `, ${fillOpacity})`);

  if (geometry.type === 'Point') {
    const [x, y] = geometry.coordinates as [number, number];
    const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (geometry.type === 'LineString') {
    ctx.beginPath();

    (geometry.coordinates as [number, number][]).forEach(([x, y], i) => {
      const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    });

    ctx.stroke();
  } else if (geometry.type === 'Polygon') {
    ctx.beginPath();

    // 외부 링
    (geometry.coordinates as [number, number][][])[0].forEach(([x, y], i) => {
      const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

      if (i === 0) {
        ctx.moveTo(canvasX, canvasY);
      } else {
        ctx.lineTo(canvasX, canvasY);
      }
    });

    ctx.closePath();

    // 내부 링 (홀)
    for (let j = 1; j < (geometry.coordinates as [number, number][][]).length; j++) {
      const ring = (geometry.coordinates as [number, number][][])[j];

      ring.forEach(([x, y], i) => {
        const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

        if (i === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      });

      ctx.closePath();
    }

    ctx.fill();
    ctx.stroke();
  } else if (geometry.type === 'MultiPoint') {
    (geometry.coordinates as [number, number][]).forEach(([x, y]) => {
      const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  } else if (geometry.type === 'MultiLineString') {
    (geometry.coordinates as [number, number][][]).forEach((line: [number, number][]) => {
      ctx.beginPath();

      line.forEach(([x, y], i) => {
        const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

        if (i === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      });

      ctx.stroke();
    });
  } else if (geometry.type === 'MultiPolygon') {
    (geometry.coordinates as [number, number][][][]).forEach((polygon: [number, number][][]) => {
      ctx.beginPath();

      // 외부 링
      polygon[0].forEach(([x, y], i) => {
        const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

        if (i === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      });

      ctx.closePath();

      // 내부 링 (홀)
      for (let j = 1; j < polygon.length; j++) {
        const ring = polygon[j];

        ring.forEach(([x, y], i) => {
          const { x: canvasX, y: canvasY } = transformCoordinates(canvasSize, scale, offset, x, y);

          if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        });

        ctx.closePath();
      }

      ctx.fill();
      ctx.stroke();
    });
  }
};

export { calculateBounds, transformCoordinates, renderFeature };
