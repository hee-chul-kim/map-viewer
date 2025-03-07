'use client';

import { useState, useEffect } from 'react';
import { useShapefileStore, Shapefile, ShapefileStyle } from '@/lib/store';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';

export default function StyleEditor() {
  const { shapefiles, selectedShapefile, updateShapefileStyle } = useShapefileStore();
  const [style, setStyle] = useState<ShapefileStyle>({
    color: '#3B82F6',
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.3,
  });

  // 선택된 shapefile이 변경될 때 스타일 업데이트
  useEffect(() => {
    if (!selectedShapefile) return;
    
    const shapefile = shapefiles.find(sf => sf.id === selectedShapefile);
    if (shapefile) {
      setStyle(shapefile.style);
    }
  }, [selectedShapefile, shapefiles]);

  // 스타일 변경 핸들러
  const handleStyleChange = (key: keyof ShapefileStyle, value: string | number) => {
    if (!selectedShapefile) return;
    
    const newStyle = { ...style, [key]: value };
    setStyle(newStyle);
    updateShapefileStyle(selectedShapefile, { [key]: value });
    
    toast({
      title: '스타일 업데이트',
      description: '레이어 스타일이 업데이트되었습니다.',
    });
  };

  if (!selectedShapefile) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        레이어를 선택해주세요.
      </div>
    );
  }

  const selectedLayer = shapefiles.find(sf => sf.id === selectedShapefile);
  if (!selectedLayer) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="color">색상</Label>
          <div className="flex items-center space-x-2">
            <div 
              className="w-6 h-6 rounded-full border" 
              style={{ backgroundColor: style.color }}
            />
            <input
              id="color"
              type="color"
              value={style.color}
              onChange={(e) => handleStyleChange('color', e.target.value)}
              className="w-10 h-8"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="weight">선 두께</Label>
          <span className="text-sm">{style.weight}px</span>
        </div>
        <Slider
          id="weight"
          min={1}
          max={10}
          step={1}
          value={[style.weight]}
          onValueChange={(value) => handleStyleChange('weight', value[0])}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="opacity">선 투명도</Label>
          <span className="text-sm">{Math.round(style.opacity * 100)}%</span>
        </div>
        <Slider
          id="opacity"
          min={0}
          max={1}
          step={0.1}
          value={[style.opacity]}
          onValueChange={(value) => handleStyleChange('opacity', value[0])}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="fillOpacity">채우기 투명도</Label>
          <span className="text-sm">{Math.round(style.fillOpacity * 100)}%</span>
        </div>
        <Slider
          id="fillOpacity"
          min={0}
          max={1}
          step={0.1}
          value={[style.fillOpacity]}
          onValueChange={(value) => handleStyleChange('fillOpacity', value[0])}
        />
      </div>
    </div>
  );
} 