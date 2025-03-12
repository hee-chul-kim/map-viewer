'use client';

import { atom, useAtom } from 'jotai';

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

// Jotai atoms 정의
export const shapefilesAtom = atom<Shapefile[]>([]);
export const selectedShapefileAtom = atom<string | null>(null);

// 파생 atoms
export const getShapefileByIdAtom = atom(
  (get) => (id: string) => get(shapefilesAtom).find(sf => sf.id === id)
);

export const visibleShapefilesAtom = atom(
  (get) => get(shapefilesAtom).filter(sf => sf.visible)
);

// 액션 atoms
export const addShapefileAtom = atom(
  null,
  (get, set, shapefile: Shapefile) => {
    set(shapefilesAtom, [...get(shapefilesAtom), shapefile]);
    set(selectedShapefileAtom, shapefile.id);
  }
);

export const removeShapefileAtom = atom(
  null,
  (get, set, id: string) => {
    set(shapefilesAtom, get(shapefilesAtom).filter(sf => sf.id !== id));
    if (get(selectedShapefileAtom) === id) {
      set(selectedShapefileAtom, null);
    }
  }
);

export const updateShapefileVisibilityAtom = atom(
  null,
  (get, set, params: { id: string, visible: boolean }) => {
    const { id, visible } = params;
    set(shapefilesAtom, get(shapefilesAtom).map(sf => 
      sf.id === id ? { ...sf, visible } : sf
    ));
  }
);

export const updateShapefileStyleAtom = atom(
  null,
  (get, set, params: { id: string, style: Partial<ShapefileStyle> }) => {
    const { id, style } = params;
    set(shapefilesAtom, get(shapefilesAtom).map(sf => 
      sf.id === id ? { ...sf, style: { ...sf.style, ...style } } : sf
    ));
  }
);

export const selectShapefileAtom = atom(
  null,
  (get, set, id: string | null) => {
    set(selectedShapefileAtom, id);
  }
);

// 유틸리티 훅 (컴포넌트에서 사용하기 쉽게)
export function useShapefiles() {
  const [shapefiles, setShapefiles] = useAtom(shapefilesAtom);
  const [selectedId, setSelectedId] = useAtom(selectedShapefileAtom);
  const [, addShapefile] = useAtom(addShapefileAtom);
  const [, removeShapefile] = useAtom(removeShapefileAtom);
  const [, updateVisibility] = useAtom(updateShapefileVisibilityAtom);
  const [, updateStyle] = useAtom(updateShapefileStyleAtom);
  
  return {
    shapefiles,
    selectedShapefile: selectedId,
    addShapefile,
    removeShapefile,
    updateShapefileVisibility: (id: string, visible: boolean) => 
      updateVisibility({ id, visible }),
    updateShapefileStyle: (id: string, style: Partial<ShapefileStyle>) => 
      updateStyle({ id, style }),
    selectShapefile: setSelectedId
  };
} 