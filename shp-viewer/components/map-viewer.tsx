'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAtom } from 'jotai';
import { shapefilesAtom } from '@/lib/store';

// Leaflet 컴포넌트는 클라이언트 사이드에서만 렌더링되어야 함
const MapComponent = dynamic(() => import('@/components/map-component'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[500px] bg-secondary/30 animate-pulse flex items-center justify-center">
      <p className="text-muted-foreground">지도 로딩 중...</p>
    </div>
  ),
});

export default function MapViewer() {
  const [shapefiles] = useAtom(shapefilesAtom);
  const [isMounted, setIsMounted] = useState(false);

  // 클라이언트 사이드에서만 렌더링
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full min-h-[500px] bg-secondary/30 flex items-center justify-center">
        <p className="text-muted-foreground">지도 초기화 중...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full border rounded-lg overflow-hidden">
      <div className="w-full h-full min-h-[500px]">
        <MapComponent shapefiles={shapefiles} />
      </div>
    </div>
  );
} 