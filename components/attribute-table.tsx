'use client';

import { useState, useMemo } from 'react';
import { useAtom } from 'jotai';
import { selectedShapefileAtom } from '@/lib/store';
import { Button } from '@/components/ui/button';
import type { Feature } from 'geojson';
export default function AttributeTable() {
  const [selectedShapefile] = useAtom(selectedShapefileAtom);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // 속성 데이터 추출
  const { properties, features } = useMemo(() => {
    if (!selectedShapefile) return { properties: [], features: [] };

    const features = selectedShapefile.geojson.features;
    if (features.length === 0) return { properties: [], features: [] };

    // 모든 속성 키 추출
    const allKeys = new Set<string>();
    features.forEach((feature: Feature) => {
      if (feature.properties) {
        Object.keys(feature.properties).forEach((key) => allKeys.add(key));
      }
    });

    return {
      properties: Array.from(allKeys),
      features: features,
    };
  }, [selectedShapefile]);

  // 페이지네이션 관련 계산
  const totalPages = Math.ceil(features.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFeatures = features.slice(startIndex, endIndex);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!selectedShapefile) {
    return <div className="text-center py-8 text-muted-foreground">레이어를 선택해주세요.</div>;
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
              {currentFeatures.map((feature: Feature, index: number) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
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

        {/* 페이지네이션 UI */}
        <div className="px-4 py-2 bg-muted/20 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {startIndex + 1}-{Math.min(endIndex, features.length)} / {features.length} 항목
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              처음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              이전
            </Button>
            <span className="px-3 py-1 text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              다음
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              마지막
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
