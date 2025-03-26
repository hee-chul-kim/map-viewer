'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAtom } from 'jotai';
import { shapefilesAtom } from '@/lib/store';
import { loadShapefile } from '@/lib/shape-loader';
import { DEFAULT_FILES } from '@/lib/consts';

// Canvas 컴포넌트는 클라이언트 사이드에서만 렌더링되어야 함
const CanvasMapComponent = dynamic(() => import('@/components/canvas-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-secondary/30 animate-pulse flex items-center justify-center">
      <p className="text-muted-foreground">뷰어 로딩 중...</p>
    </div>
  ),
});

export default function MapViewer() {
  const [shapefiles, setShapefiles] = useAtom(shapefilesAtom);
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트 사이드에서만 렌더링
  useEffect(() => {
    setIsMounted(true);

    // 기본 파일 로드
    const loadDefaultFiles = async () => {
      try {
        for (const file of DEFAULT_FILES) {
          try {
            const shapefile = await loadShapefile(`${file}`);
            setShapefiles((prev) => [...prev, shapefile]);
          } catch (error) {
            console.error(`Error loading shapefile ${file}:`, error);
          }
        }
      } catch (error) {
        console.error('기본 파일 로드 중 오류 발생:', error);
      }
    };

    if (shapefiles.length === 0) {
      loadDefaultFiles();
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full min-h-[500px] bg-secondary/30 flex items-center justify-center">
        <p className="text-muted-foreground">뷰어 초기화 중...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full border rounded-lg overflow-hidden p-4">
      <div className="w-full h-[calc(100vh-8rem)]">
        <CanvasMapComponent shapefiles={shapefiles} />
      </div>
    </div>
  );
}
