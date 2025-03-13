'use client';

import { useEffect, useRef, useState } from 'react';
import { Shapefile, GeoJSONFeature } from '@/lib/store';

interface CanvasMapComponentProps {
  shapefiles: Shapefile[];
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  hasFeatures: boolean;
}

interface HoveredFeature {
  shapefile: Shapefile;
  feature: GeoJSONFeature;
  mouseX: number;
  mouseY: number;
}

export default function CanvasMapComponent({ shapefiles }: CanvasMapComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredFeature, setHoveredFeature] = useState<HoveredFeature | null>(null);
  
  // 캔버스 크기 설정
  useEffect(() => {
    const updateDimensions = () => {
      const container = canvasRef.current?.parentElement;
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // 경계 계산 함수
  const calculateBounds = (visibleShapefiles: Shapefile[]): Bounds => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasFeatures = false;

    visibleShapefiles.forEach(shapefile => {
      if (!shapefile.visible) return;
      
      shapefile.geojson.features.forEach(feature => {
        const { geometry } = feature;
        hasFeatures = true;
        
        if (geometry.type === 'Point') {
          const [x, y] = geometry.coordinates as [number, number];
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        } 
        else if (geometry.type === 'LineString') {
          (geometry.coordinates as [number, number][]).forEach(([x, y]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        } 
        else if (geometry.type === 'Polygon') {
          (geometry.coordinates as [number, number][][]).forEach((ring: [number, number][]) => {
            ring.forEach(([x, y]) => {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            });
          });
        }
        else if (geometry.type === 'MultiPoint') {
          (geometry.coordinates as [number, number][]).forEach(([x, y]) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          });
        }
        else if (geometry.type === 'MultiLineString') {
          (geometry.coordinates as [number, number][][]).forEach((line: [number, number][]) => {
            line.forEach(([x, y]) => {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            });
          });
        }
        else if (geometry.type === 'MultiPolygon') {
          (geometry.coordinates as [number, number][][][]).forEach((polygon: [number, number][][]) => {
            polygon.forEach((ring: [number, number][]) => {
              ring.forEach(([x, y]) => {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              });
            });
          });
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
    x: number, 
    y: number, 
    bounds: Bounds,
    padding = 20
  ) => {
    const { minX, minY, maxX, maxY } = bounds;
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    // 가로세로 비율 유지를 위한 스케일 계산
    const scaleX = (dimensions.width - padding * 2) / rangeX;
    const scaleY = (dimensions.height - padding * 2) / rangeY;
    const baseScale = Math.min(scaleX, scaleY);
    
    // 현재 스케일과 오프셋 적용
    const canvasX = padding + (x - minX) * baseScale * scale + offset.x;
    const canvasY = dimensions.height - padding - (y - minY) * baseScale * scale + offset.y;
    
    return { x: canvasX, y: canvasY };
  };

  // 피처 렌더링 함수
  const renderFeature = (
    ctx: CanvasRenderingContext2D, 
    feature: GeoJSONFeature, 
    style: Shapefile['style'], 
    bounds: Bounds,
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
    
    if (geometry.type === 'Point') {
      const [x, y] = geometry.coordinates as [number, number];
      const { x: canvasX, y: canvasY } = transformCoordinates(x, y, bounds);
      
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } 
    else if (geometry.type === 'LineString') {
      ctx.beginPath();
      
      (geometry.coordinates as [number, number][]).forEach(([x, y], i) => {
        const { x: canvasX, y: canvasY } = transformCoordinates(x, y, bounds);
        
        if (i === 0) {
          ctx.moveTo(canvasX, canvasY);
        } else {
          ctx.lineTo(canvasX, canvasY);
        }
      });
      
      ctx.stroke();
    } 
    else if (geometry.type === 'Polygon') {
      ctx.beginPath();
      
      // 외부 링
      (geometry.coordinates as [number, number][][])[0].forEach(([x, y], i) => {
        const { x: canvasX, y: canvasY } = transformCoordinates(x, y, bounds);
        
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
          const { x: canvasX, y: canvasY } = transformCoordinates(x, y, bounds);
          
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
    }
    else if (geometry.type === 'MultiPoint') {
      (geometry.coordinates as [number, number][]).forEach(([x, y]) => {
        const { x: canvasX, y: canvasY } = transformCoordinates(x, y, bounds);
        
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
    else if (geometry.type === 'MultiLineString') {
      (geometry.coordinates as [number, number][][]).forEach((line: [number, number][]) => {
        ctx.beginPath();
        
        line.forEach(([x, y], i) => {
          const { x: canvasX, y: canvasY } = transformCoordinates(x, y, bounds);
          
          if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        });
        
        ctx.stroke();
      });
    }
    else if (geometry.type === 'MultiPolygon') {
      (geometry.coordinates as [number, number][][][]).forEach((polygon: [number, number][][]) => {
        ctx.beginPath();
        
        // 외부 링
        polygon[0].forEach(([x, y], i) => {
          const { x: canvasX, y: canvasY } = transformCoordinates(x, y, bounds);
          
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
            const { x: canvasX, y: canvasY } = transformCoordinates(x, y, bounds);
            
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

  // 피처 충돌 감지 함수 (마우스 호버링용)
  const isPointInFeature = (
    x: number, 
    y: number, 
    feature: GeoJSONFeature, 
    bounds: Bounds,
    ctx: CanvasRenderingContext2D
  ): boolean => {
    const { geometry } = feature;
    
    if (geometry.type === 'Point') {
      const [geoX, geoY] = geometry.coordinates as [number, number];
      const { x: canvasX, y: canvasY } = transformCoordinates(geoX, geoY, bounds);
      
      const distance = Math.sqrt(Math.pow(x - canvasX, 2) + Math.pow(y - canvasY, 2));
      return distance <= 5 * scale;
    } 
    else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
      // 다각형 충돌 감지를 위해 캔버스 API 활용
      ctx.beginPath();
      
      if (geometry.type === 'Polygon') {
        // 외부 링
        (geometry.coordinates as [number, number][][])[0].forEach(([geoX, geoY], i) => {
          const { x: canvasX, y: canvasY } = transformCoordinates(geoX, geoY, bounds);
          
          if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
          } else {
            ctx.lineTo(canvasX, canvasY);
          }
        });
      } 
      else if (geometry.type === 'MultiPolygon') {
        (geometry.coordinates as [number, number][][][]).forEach((polygon: [number, number][][]) => {
          // 외부 링
          polygon[0].forEach(([geoX, geoY], i) => {
            const { x: canvasX, y: canvasY } = transformCoordinates(geoX, geoY, bounds);
            
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
  };

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 캔버스 크기 설정
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    // 캔버스 초기화
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 보이는 shapefile만 필터링
    const visibleShapefiles = shapefiles.filter(sf => sf.visible);
    
    // 경계 계산
    const bounds = calculateBounds(visibleShapefiles);
    if (!bounds.hasFeatures) return;
    
    // 모든 shapefile 렌더링
    visibleShapefiles.forEach(shapefile => {
      shapefile.geojson.features.forEach(feature => {
        const isHovered = hoveredFeature && 
                         hoveredFeature.shapefile.id === shapefile.id && 
                         hoveredFeature.feature === feature;
        
        renderFeature(ctx, feature, shapefile.style, bounds, Boolean(isHovered));
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
    
  }, [shapefiles, dimensions, scale, offset, hoveredFeature]);

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
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // 호버링 처리
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const visibleShapefiles = shapefiles.filter(sf => sf.visible);
    const bounds = calculateBounds(visibleShapefiles);
    
    if (!bounds.hasFeatures) {
      setHoveredFeature(null);
      return;
    }
    
    // 모든 피처를 확인하여 마우스 아래에 있는 피처 찾기
    let found = false;
    
    for (const shapefile of visibleShapefiles) {
      for (const feature of shapefile.geojson.features) {
        if (isPointInFeature(mouseX, mouseY, feature, bounds, ctx)) {
          setHoveredFeature({ 
            shapefile, 
            feature, 
            mouseX, 
            mouseY 
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
    e.preventDefault();
    
    // 확대/축소 처리
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.1, Math.min(10, scale + delta));
    
    setScale(newScale);
  };

  // 초기화 버튼 핸들러
  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
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
        <button 
          className="px-2 py-1 bg-blue-500 text-white rounded"
          onClick={handleReset}
        >
          초기화
        </button>
        <div className="mt-2 text-sm">
          확대/축소: {Math.round(scale * 100)}%
        </div>
      </div>
    </div>
  );
} 