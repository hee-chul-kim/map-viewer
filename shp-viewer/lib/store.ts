'use client';

import { atom, useAtom } from 'jotai';
import type { Shapefile, ShapefileStyle } from '@/types/geometry';
import { DEFAULT_STYLE } from './consts';

// Jotai atoms 정의
export const shapefilesAtom = atom<Shapefile[]>([]);
export const selectedShapefileAtom = atom<Shapefile | null>(null);

// 파생 atoms
export const getShapefileByIdAtom = atom(
  (get) => (id: string) => get(shapefilesAtom).find((sf) => sf.id === id)
);

export const visibleShapefilesAtom = atom((get) => get(shapefilesAtom).filter((sf) => sf.visible));

// 액션 atoms
export const addShapefileAtom = atom(null, (get, set, shapefile: Shapefile) => {
  set(shapefilesAtom, [...get(shapefilesAtom), shapefile]);
  set(selectedShapefileAtom, shapefile);
});

export const removeShapefileAtom = atom(null, (get, set, id: string) => {
  const selectedShapefile = get(selectedShapefileAtom);
  set(
    shapefilesAtom,
    get(shapefilesAtom).filter((sf) => sf.id !== id)
  );
  if (selectedShapefile?.id === id) {
    set(selectedShapefileAtom, null);
  }
});

export const updateShapefileVisibilityAtom = atom(
  null,
  (get, set, params: { id: string; visible: boolean }) => {
    const { id, visible } = params;
    const shapefiles = get(shapefilesAtom).map((sf) => 
      sf.id === id ? { ...sf, visible } : sf
    );
    set(shapefilesAtom, shapefiles);

    const selectedShapefile = get(selectedShapefileAtom);
    if (selectedShapefile?.id === id) {
      const updatedShapefile = shapefiles.find((sf) => sf.id === id);
      if (updatedShapefile) {
        set(selectedShapefileAtom, updatedShapefile);
      }
    }
  }
);

export const updateShapefileStyleAtom = atom(
  null,
  (get, set, params: { id: string; style: Partial<ShapefileStyle> }) => {
    const { id, style } = params;
    const shapefiles = get(shapefilesAtom).map((sf) =>
      sf.id === id ? { ...sf, style: { ...sf.style, ...style } } : sf
    );
    set(shapefilesAtom, shapefiles);

    const selectedShapefile = get(selectedShapefileAtom);
    if (selectedShapefile?.id === id) {
      const updatedShapefile = shapefiles.find((sf) => sf.id === id);
      if (updatedShapefile) {
        set(selectedShapefileAtom, updatedShapefile);
      }
    }
  }
);

export const selectShapefileAtom = atom(null, (get, set, id: string | null) => {
  if (id === null) {
    set(selectedShapefileAtom, null);
    return;
  }
  
  const shapefile = get(shapefilesAtom).find((sf) => sf.id === id);
  set(selectedShapefileAtom, shapefile || null);
});

// 선택된 shapefile의 스타일을 가져오는 파생 atom
export const selectedShapefileStyleAtom = atom(
  (get) => {
    const selectedShapefile = get(selectedShapefileAtom);
    return selectedShapefile?.style || DEFAULT_STYLE.polygon;
  },
  (get, set, newStyle: Partial<ShapefileStyle>) => {
    const selectedShapefile = get(selectedShapefileAtom);
    if (!selectedShapefile) return;
    
    set(updateShapefileStyleAtom, { id: selectedShapefile.id, style: newStyle });
  }
);

// 유틸리티 훅 (컴포넌트에서 사용하기 쉽게)
export function useShapefiles() {
  const [shapefiles, setShapefiles] = useAtom(shapefilesAtom);
  const [selectedShapefile, setSelectedShapefile] = useAtom(selectedShapefileAtom);
  const [, addShapefile] = useAtom(addShapefileAtom);
  const [, removeShapefile] = useAtom(removeShapefileAtom);
  const [, updateVisibility] = useAtom(updateShapefileVisibilityAtom);
  const [, updateStyle] = useAtom(updateShapefileStyleAtom);
  const [, selectShapefile] = useAtom(selectShapefileAtom);

  return {
    shapefiles,
    selectedShapefile,
    addShapefile,
    removeShapefile,
    updateShapefileVisibility: (id: string, visible: boolean) => updateVisibility({ id, visible }),
    updateShapefileStyle: (id: string, style: Partial<ShapefileStyle>) =>
      updateStyle({ id, style }),
    selectShapefile: (id: string | null) => selectShapefile(id),
  };
}
