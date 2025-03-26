'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GeoCoordinate, Shapefile, GridTile } from '@/types/geometry';
import { renderFeature, renderSpatialGrid } from '@/lib/renderer';
import { MAP_CONSTANTS } from '@/lib/consts';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { renderTooltip } from './tooltip';
import type { Feature } from 'geojson';
import { detectCollision } from '@/lib/collision';
import {
  createSpatialGrid,
  assignFeaturesToGrid,
  findFeatureAtPoint,
  findTileAtPoint,
} from '@/lib/spatial-grid';
import { SpatialGrid } from '@/types/geometry';

interface CanvasMapProps {
  shapefiles: Shapefile[];
}

interface HoveredFeature {
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

  // 현재 보이는 tile을 계산하는 함수
  const getVisibleTiles = () => {
    if (!spatialGrid || !canvasRef.current) return [];

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // 캔버스의 네 모서리 좌표를 위경도로 변환
    const corners = [
      { x: 0, y: 0 },
      { x: rect.width, y: 0 },
      { x: rect.width, y: rect.height },
      { x: 0, y: rect.height },
    ].map(({ x, y }) => ({
      lat: -(y - offset.y) / (baseScale * scale),
      lng: (x - offset.x) / (baseScale * scale),
    }));

    // 위경도 범위 계산
    const bounds = {
      minX: Math.min(...corners.map((c) => c.lng)),
      maxX: Math.max(...corners.map((c) => c.lng)),
      minY: Math.min(...corners.map((c) => c.lat)),
      maxY: Math.max(...corners.map((c) => c.lat)),
      hasFeatures: true,
    };

    // 위경도 범위와 겹치는 모든 tile 찾기
    const visibleTiles = spatialGrid.tiles.filter((tile) => {
      return !(
        tile.bounds.maxX < bounds.minX ||
        tile.bounds.minX > bounds.maxX ||
        tile.bounds.maxY < bounds.minY ||
        tile.bounds.minY > bounds.maxY
      );
    });

    return visibleTiles;
  };

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // 캔버스 초기화
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height); // 보이는 shapefile만 필터링

    // 보이는 shapefile
    const visibleShapefiles = shapefiles.filter((sf) => sf.visible);
    // 렌더링 최적화를 위한 설정
    ctx.imageSmoothingEnabled = false;

    // 현재 보이는 tile들 가져오기
    const visibleTiles = getVisibleTiles();
    console.log('visibleTiles', visibleTiles);

    // Layer 순서대로 렌더링
    // 아니면 1번 타일의 포인트 일부가 2번 타일의 폴리곤에 덮이는 경우 생김
    visibleShapefiles.forEach((shapefile) => {
      // 현재 뷰포트에 있는 피처만 렌더링
      const useSimplified = scale <= 3; // 스케일이 3 이하일 때 간략화된 버전 사용

      // 보이는 tile들의 feature만 렌더링
      visibleTiles.forEach((tile) => {
        const features = useSimplified ? tile.simplifiedFeatures : tile.features;
        features
          .filter((feature) => feature.properties?.fileName === shapefile.name)
          .forEach((feature: Feature) => {
            const isHovered =
              hoveredFeature &&
              // simplified 일 수도 있으므로 object 비교 대신 id 비교
              hoveredFeature.feature.properties!.id! === feature.properties!.id!;

            // 피처 렌더링
            renderFeature(ctx, feature, shapefile.style, scale, offset, !!isHovered);
          });
      });
    });

    // Spatial Grid 렌더링 (feature 위에 그리기)
    if (spatialGrid) {
      renderSpatialGrid(ctx, spatialGrid, canvasSize, offset, scale);
    }

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
  }, [shapefiles, scale, offset, hoveredFeature, canvasSize, spatialGrid]);

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
    // 역순으로 검사하여 가장 위에 그려진 shapefile부터 확인
    const feature = findFeatureAtPoint(spatialGrid, cursorCoords, scale);
    if (feature) {
      setHoveredFeature({
        feature,
        mouseX,
        mouseY,
      });
    } else {
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

  // spatial grid 초기화 및 피처 할당
  useEffect(() => {
    const grid = createSpatialGrid();
    const visibleFeatures = shapefiles
      .filter((sf) => sf.visible)
      .flatMap((sf) => sf.geojson.features);
    const simplifiedFeatures = shapefiles
      .filter((sf) => sf.visible)
      .flatMap((sf) => sf.simplified?.features ?? []);
    assignFeaturesToGrid(grid, visibleFeatures, simplifiedFeatures);
    setSpatialGrid(grid);
  }, [shapefiles]);

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

      {/* 위경도 좌표 표시 */}
      {cursorCoords && (
        <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1.5 rounded shadow text-sm">
          위도: {cursorCoords.lat.toFixed(6)}° / 경도: {cursorCoords.lng.toFixed(6)}°
        </div>
      )}

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
