'use client';

import { useCallback, ChangeEvent } from 'react';
import { useAtom } from 'jotai';
import { selectedShapefileAtom, selectedShapefileStyleAtom } from '@/lib/store';
import { ShapefileStyle } from '@/types/geometry';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';
import { useThrottle } from '@/hooks/useThrottle';

export default function StyleEditor() {
  const [selectedShapefile] = useAtom(selectedShapefileAtom);
  const [style, setStyle] = useAtom(selectedShapefileStyleAtom);

  // 스타일 변경 핸들러
  const handleStyleChange = useCallback(
    (key: keyof ShapefileStyle, value: string | number) => {
      if (!selectedShapefile) return;

      const newStyle = { ...style, [key]: value };
      setStyle(newStyle);

      toast({
        title: '스타일 업데이트',
        description: '레이어 스타일이 업데이트되었습니다.',
        duration: 3000,
      });
    },
    [selectedShapefile, style, setStyle]
  );

  // 스로틀된 스타일 변경 핸들러
  const throttledStyleChange = useThrottle(handleStyleChange, 1000);

  if (!selectedShapefile) {
    return <div className="text-center py-8 text-muted-foreground">레이어를 선택해주세요.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="color">채우기 색상</Label>
          <input
            type="color"
            id="color"
            value={style.color || '#000000'}
            className="w-16 h-8"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
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
            value={style.strokeColor || style.color || '#000000'}
            className="w-16 h-8"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              throttledStyleChange('strokeColor', e.target.value);
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="weight">선 굵기</Label>
          <span className="text-sm">{style.weight.toFixed(3)}px</span>
        </div>
        <Slider
          id="weight"
          min={0.001}
          max={1}
          step={0.001}
          value={[style.weight]}
          onValueChange={(value) => throttledStyleChange('weight', value[0])}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="opacity">투명도</Label>
          <span className="text-sm">{style.fillOpacity.toFixed(1)}</span>
        </div>
        <Slider
          id="opacity"
          min={0}
          max={1}
          step={0.1}
          value={[style.fillOpacity]}
          onValueChange={(value) => throttledStyleChange('fillOpacity', value[0])}
        />
      </div>
    </div>
  );
}
