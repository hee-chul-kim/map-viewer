'use client';

import { create } from 'zustand';

// GeoJSON 타입 정의
export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

// 스타일 타입 정의
export interface ShapefileStyle {
  color: string;
  weight: number;
  opacity: number;
  fillOpacity: number;
}

// Shapefile 타입 정의
export interface Shapefile {
  id: string;
  name: string;
  geojson: GeoJSONCollection;
  visible: boolean;
  style: ShapefileStyle;
}

// 스토어 상태 타입 정의
interface ShapefileState {
  shapefiles: Shapefile[];
  selectedShapefile: string | null;
  addShapefile: (shapefile: Shapefile) => void;
  removeShapefile: (id: string) => void;
  updateShapefileVisibility: (id: string, visible: boolean) => void;
  updateShapefileStyle: (id: string, style: Partial<ShapefileStyle>) => void;
  selectShapefile: (id: string | null) => void;
}

// Zustand 스토어 생성
export const useShapefileStore = create<ShapefileState>((set) => ({
  shapefiles: [],
  selectedShapefile: null,
  
  // 새 Shapefile 추가
  addShapefile: (shapefile) => 
    set((state) => ({
      shapefiles: [...state.shapefiles, shapefile],
      selectedShapefile: shapefile.id,
    })),
  
  // Shapefile 제거
  removeShapefile: (id) => 
    set((state) => ({
      shapefiles: state.shapefiles.filter((sf) => sf.id !== id),
      selectedShapefile: state.selectedShapefile === id ? null : state.selectedShapefile,
    })),
  
  // Shapefile 가시성 업데이트
  updateShapefileVisibility: (id, visible) => 
    set((state) => ({
      shapefiles: state.shapefiles.map((sf) => 
        sf.id === id ? { ...sf, visible } : sf
      ),
    })),
  
  // Shapefile 스타일 업데이트
  updateShapefileStyle: (id, style) => 
    set((state) => ({
      shapefiles: state.shapefiles.map((sf) => 
        sf.id === id ? { ...sf, style: { ...sf.style, ...style } } : sf
      ),
    })),
  
  // Shapefile 선택
  selectShapefile: (id) => 
    set(() => ({
      selectedShapefile: id,
    })),
})); 