'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GeoJsonFeature, Shapefile } from '@/types/geometry';
import { transformCoordinates } from '@/lib/geometry';
import { renderFeature } from '@/lib/renderer';
import { MAP_CONSTANTS } from '@/lib/consts';

interface CanvasMapComponentProps {
  shapefiles: Shapefile[];
}

interface HoveredFeature {
  shapefile: Shapefile;
  feature: GeoJsonFeature;
  mouseX: number;
  mouseY: number;
}

// 대한민국 위경도 범위로 설정
const minX = MAP_CONSTANTS.BOUNDS.MIN_X;
const minY = MAP_CONSTANTS.BOUNDS.MIN_Y;

// 기본 스케일
const baseScale = 144;

export default function CanvasMapComponent({ shapefiles }: CanvasMapComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // 드래그로 변경된 View Offset
  const [initOffset, setInitOffset] = useState({ ...offset }); // View Offset 초기값
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredFeature, setHoveredFeature] = useState<HoveredFeature | null>(null);

  // 캔버스 크기 설정
  useLayoutEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        // 브라우저 창의 높이에서 여유 공간을 뺀 값을 Canvas 높이로 설정
        const windowHeight = window.innerHeight;
        const headerHeight = 0; // 헤더가 있다면 이 값을 조정
        const padding = 32; // 상하 여백

        setCanvasSize({
          width: container.clientWidth,
          height: Math.min(windowHeight - headerHeight - padding, container.clientHeight),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  useLayoutEffect(() => {
    setInitOffset({
      x: - (minX * baseScale * scale),
      y: canvasSize.height + minY * baseScale * scale
    });
  }, [canvasSize, scale])

  useLayoutEffect(() => {
    setOffset(initOffset);
  }, [initOffset])

  // 피처 충돌 감지 함수 (마우스 호버링용)
  const isPointInFeature = (
    x: number,
    y: number,
    feature: GeoJsonFeature,
    ctx: CanvasRenderingContext2D
  ): boolean => {
    const { geometry } = feature;

    if (geometry.type === 'Point') {
      const [geoX, geoY] = geometry.coordinates as [number, number];
      const { x: canvasX, y: canvasY } = transformCoordinates(
        scale,
        offset,
        geoX,
        geoY
      );

      const distance = Math.sqrt(Math.pow(x - canvasX, 2) + Math.pow(y - canvasY, 2));
      return distance <= 5 * scale;
    } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
      // 다각형 충돌 감지를 위해 캔버스 API 활용
      ctx.beginPath();

      if (geometry.type === 'Polygon') {
        // 외부 링
        (geometry.coordinates as [number, number][][])[0].forEach(([geoX, geoY], i) => {
          const { x: canvasX, y: canvasY } = transformCoordinates(
            scale,
            offset,
            geoX,
            geoY
          );

          if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        });
      } else if (geometry.type === 'MultiPolygon') {
        (geometry.coordinates as [number, number][][][]).forEach(
          (polygon: [number, number][][]) => {
            // 외부 링
            polygon[0].forEach(([geoX, geoY], i) => {
              const { x: canvasX, y: canvasY } = transformCoordinates(
                scale,
                offset,
                geoX,
                geoY
              );

              if (i === 0) {
                ctx.moveTo(canvasX, canvasY);
              } else {
                ctx.lineTo(canvasX, canvasY);
              }
            });
          }
        );
      }

      ctx.closePath();
      return ctx.isPointInPath(x, y) as boolean;
    }

    // 라인 및 기타 도형은 단순화된 충돌 감지 (정확한 구현은 복잡함)
    return false;
  };

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 크기 설정
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // 캔버스 초기화
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 보이는 shapefile만 필터링
    const visibleShapefiles = shapefiles.filter((sf) => sf.visible);

    // 피처가 없는 shapefile은 렌더링하지 않음
    const hasFeatures = visibleShapefiles.some(
      (shapefile) => shapefile.geojson?.features?.length > 0
    );
    if (!hasFeatures) {
      return;
    }

    // 모든 shapefile 렌더링
    visibleShapefiles.forEach((shapefile) => {
      shapefile.geojson.features.forEach((feature) => {
        const isHovered =
          hoveredFeature &&
          hoveredFeature.shapefile.id === shapefile.id &&
          hoveredFeature.feature === feature;

        renderFeature(ctx, feature, shapefile.style, scale, offset, Boolean(isHovered));
      });
    });

    // 호버된 피처가 있으면 툴팁 표시
    if (hoveredFeature) {
      const { feature, mouseX, mouseY } = hoveredFeature;

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

      if (tooltipX + tooltipWidth > canvas.width) {
        tooltipX = mouseX - tooltipWidth - 10;
      }

      if (tooltipY + tooltipHeight > canvas.height) {
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

      lines.forEach((line, i) => {
        ctx.fillText(line, tooltipX + padding, tooltipY + padding + i * lineHeight);
      });
    }
  }, [shapefiles, canvasSize, scale, offset, hoveredFeature]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 드래깅 처리
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setOffset((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // 호버링 처리
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const visibleShapefiles = shapefiles.filter((shapefile) => shapefile.visible);
    const hasFeatures = visibleShapefiles.some(
      (shapefile) => shapefile.geojson?.features?.length > 0
    );
    if (!hasFeatures) {
      setHoveredFeature(null);
      return;
    }

    // 모든 피처를 확인하여 마우스 아래에 있는 피처 찾기
    let found = false;

    for (const shapefile of visibleShapefiles) {
      for (const feature of shapefile.geojson.features) {
        if (isPointInFeature(mouseX, mouseY, feature, ctx)) {
          setHoveredFeature({
            shapefile,
            feature,
            mouseX,
            mouseY,
          });
          found = true;
          break;
        }
      }

      if (found) break;
    }

    if (!found) {
      setHoveredFeature(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredFeature(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    //e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // 확대/축소 처리
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.1, Math.min(10, scale + delta));

    setScale(newScale);
  };

  // 초기화 버튼 핸들러
  const handleReset = () => {
    setScale(1);
    setInitOffset((prev) => Object.assign({}, prev));
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />

      {/* 컨트롤 패널 */}
      <div className="absolute top-4 right-4 bg-white p-2 rounded shadow">
        <button className="px-2 py-1 bg-blue-500 text-white rounded" onClick={handleReset}>
          초기화
        </button>
        <div className="mt-2 text-sm">확대/축소: {Math.round(scale * 100)}%</div>
      </div>
    </div>
  );
}
