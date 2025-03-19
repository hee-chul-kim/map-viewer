'use client';

import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { useAtom } from 'jotai';
import { shapefilesAtom, selectedShapefileAtom, updateShapefileStyleAtom } from '@/lib/store';
import { ShapefileStyle } from '@/types/geometry';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';
import { DEFAULT_STYLE } from '@/lib/consts';
import { useThrottle } from '@/hooks/useThrottle';

export default function StyleEditor() {
  const [shapefiles] = useAtom(shapefilesAtom);
  const [selectedShapefile] = useAtom(selectedShapefileAtom);
  const [, updateShapefileStyle] = useAtom(updateShapefileStyleAtom);

  const [style, setStyle] = useState<ShapefileStyle>(DEFAULT_STYLE.polygon);
  const [localStyle, setLocalStyle] = useState(style);

  // 선택된 shapefile이 변경될 때 스타일 업데이트
  useEffect(() => {
    if (!selectedShapefile) return;

    const shapefile = shapefiles.find((sf) => sf.id === selectedShapefile);
    if (shapefile) {
      setStyle(shapefile.style);
      setLocalStyle(shapefile.style);
    }
  }, [selectedShapefile, shapefiles]);

  // 스타일 변경 핸들러 (실시간 업데이트용)
  const handleLocalStyleChange = (key: keyof ShapefileStyle, value: string | number) => {
    setLocalStyle((prev) => ({ ...prev, [key]: value }));
  };

  // 스타일 변경 핸들러 (최종 적용용)
  const handleStyleChange = useCallback(
    (key: keyof ShapefileStyle, value: string | number) => {
      if (!selectedShapefile) return;

      const newStyle = { ...style, [key]: value };
      setStyle(newStyle);
      setLocalStyle(newStyle);
      updateShapefileStyle({ id: selectedShapefile, style: newStyle });

      toast({
        title: '스타일 업데이트',
        description: '레이어 스타일이 업데이트되었습니다.',
        duration: 3000,
      });
    },
    [selectedShapefile, style, updateShapefileStyle]
  );

  // 스로틀된 스타일 변경 핸들러
  const throttledStyleChange = useThrottle(handleStyleChange, 1000);

  if (!selectedShapefile) {
    return <div className="text-center py-8 text-muted-foreground">레이어를 선택해주세요.</div>;
  }

  const selectedLayer = shapefiles.find((sf) => sf.id === selectedShapefile);
  if (!selectedLayer) return null;

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="color">채우기 색상</Label>
          <input
            type="color"
            id="color"
            value={localStyle.color || '#000000'}
            className="w-16 h-8"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              handleLocalStyleChange('color', e.target.value);
              throttledStyleChange('color', e.target.value);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="strokeColor">외곽선 색상</Label>
          <input
            type="color"
            id="strokeColor"
            value={localStyle.strokeColor || localStyle.color || '#000000'}
            className="w-16 h-8"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              handleLocalStyleChange('strokeColor', e.target.value);
              throttledStyleChange('strokeColor', e.target.value);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="weight">선 굵기</Label>
          <span className="text-sm">{localStyle.weight.toFixed(3)}px</span>
        </div>
        <Slider
          id="weight"
          min={0.001}
          max={1}
          step={0.001}
          value={[localStyle.weight]}
          onValueChange={(value) => handleLocalStyleChange('weight', value[0])}
          onValueCommit={(value) => handleStyleChange('weight', value[0])}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="opacity">투명도</Label>
          <span className="text-sm">{localStyle.fillOpacity.toFixed(1)}</span>
        </div>
        <Slider
          id="opacity"
          min={0}
          max={1}
          step={0.1}
          value={[localStyle.fillOpacity]}
          onValueChange={(value) => handleLocalStyleChange('fillOpacity', value[0])}
          onValueCommit={(value) => handleStyleChange('fillOpacity', value[0])}
        />
      </div>
    </div>
  );
}
