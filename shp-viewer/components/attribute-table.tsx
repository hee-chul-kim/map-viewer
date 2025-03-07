'use client';

import { useState, useMemo } from 'react';
import { useShapefileStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function AttributeTable() {
  const { shapefiles, selectedShapefile } = useShapefileStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const selectedLayer = useMemo(() => {
    if (!selectedShapefile) return null;
    return shapefiles.find(sf => sf.id === selectedShapefile);
  }, [shapefiles, selectedShapefile]);
  
  // 속성 데이터 추출
  const { properties, features } = useMemo(() => {
    if (!selectedLayer) return { properties: [], features: [] };
    
    const features = selectedLayer.geojson.features;
    if (features.length === 0) return { properties: [], features: [] };
    
    // 모든 속성 키 추출
    const allKeys = new Set<string>();
    features.forEach(feature => {
      if (feature.properties) {
        Object.keys(feature.properties).forEach(key => allKeys.add(key));
      }
    });
    
    return {
      properties: Array.from(allKeys),
      features: features,
    };
  }, [selectedLayer]);
  
  // 검색 필터링
  const filteredFeatures = useMemo(() => {
    if (!searchTerm.trim() || features.length === 0) return features;
    
    return features.filter(feature => {
      if (!feature.properties) return false;
      
      return Object.entries(feature.properties).some(([key, value]) => {
        const stringValue = String(value).toLowerCase();
        return stringValue.includes(searchTerm.toLowerCase());
      });
    });
  }, [features, searchTerm]);
  
  // CSV 내보내기
  const exportCSV = () => {
    if (!selectedLayer || features.length === 0) return;
    
    // CSV 헤더
    let csv = properties.join(',') + '\n';
    
    // CSV 데이터 행
    features.forEach(feature => {
      const row = properties.map(prop => {
        const value = feature.properties?.[prop] ?? '';
        // 쉼표가 포함된 값은 따옴표로 감싸기
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      });
      csv += row.join(',') + '\n';
    });
    
    // 다운로드 링크 생성
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedLayer.name}_attributes.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'CSV 내보내기',
      description: `${selectedLayer.name} 속성 데이터가 CSV로 내보내졌습니다.`,
    });
  };
  
  if (!selectedLayer) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        레이어를 선택해주세요.
      </div>
    );
  }
  
  if (features.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        이 레이어에는 속성 데이터가 없습니다.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative">
          <input
            type="text"
            placeholder="속성 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCSV}
          className="flex items-center gap-1"
        >
          <Download className="h-4 w-4" />
          <span>CSV</span>
        </Button>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                {properties.map((prop) => (
                  <th key={prop} className="px-4 py-2 text-left font-medium">
                    {prop}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.slice(0, 100).map((feature, index) => (
                <tr 
                  key={index} 
                  className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                >
                  {properties.map((prop) => (
                    <td key={`${index}-${prop}`} className="px-4 py-2 border-t">
                      {feature.properties?.[prop] !== undefined 
                        ? String(feature.properties[prop]) 
                        : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredFeatures.length > 100 && (
          <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/20 border-t">
            표시된 항목: 100 / {filteredFeatures.length}
          </div>
        )}
      </div>
    </div>
  );
} 