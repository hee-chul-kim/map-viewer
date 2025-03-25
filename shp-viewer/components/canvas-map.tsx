'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GeoCoordinate, Shapefile } from '@/types/geometry';
import { renderFeature } from '@/lib/renderer';
import { MAP_CONSTANTS } from '@/lib/consts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { renderTooltip } from './tooltip';
import type { Feature } from 'geojson';
import { detectCollision } from '@/lib/collision';
import { createSpatialGrid, assignFeaturesToGrid, findFeatureAtPoint } from '@/lib/spatial-grid';
import { SpatialGrid } from '@/types/geometry';

interface CanvasMapProps {
  shapefiles: Shapefile[];
}

interface HoveredFeature {
  shapefile: Shapefile;
  feature: Feature;
  mouseX: number;
  mouseY: number;
}

// 대한민국 위경도 범위로 설정
const minX = MAP_CONSTANTS.BOUNDS.MIN_X;
const minY = MAP_CONSTANTS.BOUNDS.MIN_Y;

// 기본 스케일
const baseScale = 144;

export default function CanvasMap({ shapefiles }: CanvasMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  const [initOffset, setInitOffset] = useState({ x: 0, y: 0 }); // View Offset 초기값
  const [offsetDelta, setOffsetDelta] = useState({ x: 0, y: 0 }); // 드래그로 변경된 View Offset
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // 현재 Offset

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredFeature, setHoveredFeature] = useState<HoveredFeature | null>(null);
  const [showPopup, setShowPopup] = useState(true); // 팝업 표시 여부 상태 추가
  const [cursorCoords, setCursorCoords] = useState<GeoCoordinate | null>(null);
  const [spatialGrid, setSpatialGrid] = useState<SpatialGrid | null>(null);

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
    // Canvas 왼쪽 offset
    // e.g. -(125 * 144 * 1.0)
    let initX = -(minX * baseScale * scale);
    // 화면 중앙 기준으로 확대/축소 하기 위해 Canvas 너비 증가값의 절반만큼 뺀다
    initX -= canvasSize.width * ((scale - 1) / 2);

    let initY = canvasSize.height + minY * baseScale * scale;
    initY += canvasSize.height * ((scale - 1) / 2);

    setInitOffset({
      x: initX,
      y: initY,
    });
  }, [canvasSize, scale]);

  useLayoutEffect(() => {
    setOffset({ x: initOffset.x + offsetDelta.x, y: initOffset.y + offsetDelta.y });
  }, [initOffset, offsetDelta]);

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      shapefile.geojson.features.forEach((feature: Feature) => {
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
      renderTooltip(ctx, {
        feature,
        mouseX,
        mouseY,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
      });
    }

    // 커서 좌표 표시
    if (cursorCoords) {
      const text = `위도: ${cursorCoords.lat.toFixed(6)}° / 경도: ${cursorCoords.lng.toFixed(6)}°`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.font = '12px Arial';
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'right';
      ctx.fillText(text, canvas.width - 10, canvas.height - 10);
    }
  }, [shapefiles, canvasSize, scale, offset, hoveredFeature, cursorCoords]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setScale((prev) => Math.max(0.1, Math.min(10, prev + 0.1)));
      } else if (e.key === '-') {
        e.preventDefault();
        setScale((prev) => Math.max(0.1, Math.min(10, prev - 0.1)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

    // 마우스 위치를 위경도로 변환
    const geoX = (mouseX - offset.x) / (baseScale * scale);
    const geoY = -(mouseY - offset.y) / (baseScale * scale);
    setCursorCoords({ lat: geoY, lng: geoX });

    // 드래깅 처리
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setOffsetDelta((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // 호버링 처리
    const ctx = canvas.getContext('2d');
    if (!ctx || !spatialGrid || !showPopup) {
      setHoveredFeature(null);
      return;
    }

    const visibleShapefiles = shapefiles.filter((sf) => sf.visible);
    const hasFeatures = visibleShapefiles.some(
      (shapefile) => shapefile.geojson?.features?.length > 0
    );
    if (!hasFeatures) {
      setHoveredFeature(null);
      return;
    }

    // 공간 그리드를 사용하여 충돌 감지 최적화
    let found = false;
    for (const shapefile of visibleShapefiles) {
      const feature = findFeatureAtPoint(spatialGrid, cursorCoords, scale);

      if (feature) {
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
    setCursorCoords(null);
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
    setOffsetDelta({ x: 0, y: 0 });
  };

  // 캔버스 크기가 변경될 때마다 공간 그리드 재생성
  useEffect(() => {
    const grid = createSpatialGrid();
    setSpatialGrid(grid);
  }, []);

  // shapefile이 변경되거나 공간 그리드가 생성될 때마다 피처 할당
  useEffect(() => {
    if (!spatialGrid) return;

    const visibleShapefiles = shapefiles.filter((sf) => sf.visible);
    const allFeatures = visibleShapefiles.flatMap((sf) => sf.geojson.features);
    assignFeaturesToGrid(spatialGrid, allFeatures);
  }, [shapefiles, spatialGrid]);

  return (
    <div className="relative w-full h-full">
      <canvas
        width={canvasSize.width}
        height={canvasSize.height}
        ref={canvasRef}
        className="w-full h-full cursor-grab"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />

      {/* 컨트롤 패널 */}
      <div className="absolute top-4 right-4 bg-white p-2 rounded shadow space-y-2">
        <button className="px-2 py-1 bg-blue-500 text-white rounded" onClick={handleReset}>
          초기화
        </button>
        <div className="text-sm">확대/축소: {Math.round(scale * 100)}%</div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showPopup"
            checked={showPopup}
            onCheckedChange={(checked) => {
              setShowPopup(checked === true);
              if (!checked) {
                setHoveredFeature(null);
              }
            }}
          />
          <Label htmlFor="showPopup" className="text-sm">
            팝업 표시
          </Label>
        </div>
      </div>
    </div>
  );
}
