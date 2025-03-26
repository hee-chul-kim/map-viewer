'use client';

import { atom, useAtom } from 'jotai';
import type { Shapefile, ShapefileStyle } from '@/types/geometry';
import { DEFAULT_STYLE } from './consts';

/**
 * 전역 상태 관리를 위한 Jotai atoms
 */

// 기본 atoms
export const shapefilesAtom = atom<Shapefile[]>([]); // 업로드된 모든 shapefile 목록
export const selectedShapefileAtom = atom<Shapefile | null>(null); // 현재 선택된 shapefile

// ID로 shapefile을 찾는 유틸리티 atom
export const getShapefileByIdAtom = atom(
  (get) => (id: string) => get(shapefilesAtom).find((sf) => sf.id === id)
);

// 보이는 shapefile만 필터링
export const visibleShapefilesAtom = atom((get) => get(shapefilesAtom).filter((sf) => sf.visible)); 

// Shapefile (Layer) 추가
export const addShapefileAtom = atom(null, (get, set, shapefile: Shapefile) => {
  set(shapefilesAtom, [...get(shapefilesAtom), shapefile]); // 새로운 shapefile 추가
  set(selectedShapefileAtom, shapefile); // 추가된 shapefile을 선택 상태로 설정
});

// Shapefile (Layer) 삭제
export const removeShapefileAtom = atom(null, (get, set, id: string) => {
  const selectedShapefile = get(selectedShapefileAtom);
  set(
    shapefilesAtom,
    get(shapefilesAtom).filter((sf) => sf.id !== id) // 지정된 ID의 shapefile 제거
  );
  if (selectedShapefile?.id === id) {
    set(selectedShapefileAtom, null); // 삭제된 shapefile이 선택된 상태였다면 선택 해제
  }
});

// Shapefile (Layer) 노출 여부 변경
export const updateShapefileVisibilityAtom = atom(
  null,
  (get, set, params: { id: string; visible: boolean }) => {
    const { id, visible } = params;
    const shapefiles = get(shapefilesAtom).map((sf) => 
      sf.id === id ? { ...sf, visible } : sf // 지정된 shapefile의 가시성 업데이트
    );
    set(shapefilesAtom, shapefiles);

    const selectedShapefile = get(selectedShapefileAtom);
    if (selectedShapefile?.id === id) {
      const updatedShapefile = shapefiles.find((sf) => sf.id === id);
      if (updatedShapefile) {
         // 노출 여부 업데이트한 레이어를 선택
         // TODO - 무조건 선택해도 되나?
        set(selectedShapefileAtom, updatedShapefile);
      }
    }
  }
);

// Shapefile (Layer) Style 설정
export const updateShapefileStyleAtom = atom(
  null,
  (get, set, params: { id: string; style: Partial<ShapefileStyle> }) => {
    const { id, style } = params;
    const shapefiles = get(shapefilesAtom).map((sf) =>
      sf.id === id ? { ...sf, style: { ...sf.style, ...style } } : sf // 지정된 shapefile의 스타일 업데이트
    );
    set(shapefilesAtom, shapefiles);

    const selectedShapefile = get(selectedShapefileAtom);
    if (selectedShapefile?.id === id) {
      const updatedShapefile = shapefiles.find((sf) => sf.id === id);
      if (updatedShapefile) {
        set(selectedShapefileAtom, updatedShapefile); // 선택된 shapefile의 상태도 함께 업데이트
      }
    }
  }
);

// Shapefile (Layer) 선택
export const selectShapefileAtom = atom(null, (get, set, id: string | null) => {
  if (id === null) {
    set(selectedShapefileAtom, null); // shapefile 선택 해제
    return;
  }
  
  const shapefile = get(shapefilesAtom).find((sf) => sf.id === id);
  set(selectedShapefileAtom, shapefile || null); // 지정된 ID의 shapefile 선택
});

// 선택된 Shapefile (Layer)의 스타일
export const selectedShapefileStyleAtom = atom(
  (get) => {
    const selectedShapefile = get(selectedShapefileAtom);
    return selectedShapefile?.style || DEFAULT_STYLE.polygon; // 선택된 shapefile의 스타일 또는 기본 스타일 반환
  },
  (get, set, newStyle: Partial<ShapefileStyle>) => {
    const selectedShapefile = get(selectedShapefileAtom);
    if (!selectedShapefile) return;
    
    set(updateShapefileStyleAtom, { id: selectedShapefile.id, style: newStyle }); // 선택된 shapefile의 스타일 업데이트
  }
);

/**
 * 컴포넌트에서 사용하기 쉽도록 만든 유틸리티 훅
 */
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
