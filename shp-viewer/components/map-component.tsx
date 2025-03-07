'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Shapefile } from '@/lib/store';

// Leaflet 기본 아이콘 문제 해결
const fixLeafletIcon = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
};

interface MapComponentProps {
  shapefiles: Shapefile[];
}

export default function MapComponent({ shapefiles }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<string, L.GeoJSON>>({});

  // 지도 초기화
  useEffect(() => {
    fixLeafletIcon();

    if (!mapRef.current) {
      const map = L.map('map', {
        center: [37.5665, 126.9780], // 서울 좌표
        zoom: 7,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Shapefile 데이터 처리
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentLayers = { ...layersRef.current };

    // 기존 레이어 제거 (더 이상 존재하지 않는 shapefile)
    Object.keys(currentLayers).forEach((id) => {
      const shapefile = shapefiles.find((sf) => sf.id === id);
      if (!shapefile) {
        map.removeLayer(currentLayers[id]);
        delete currentLayers[id];
      }
    });

    // 새 레이어 추가 또는 기존 레이어 업데이트
    shapefiles.forEach((shapefile) => {
      const { id, geojson, visible, style } = shapefile;

      // 이미 존재하는 레이어 업데이트
      if (currentLayers[id]) {
        const layer = currentLayers[id];
        
        // 스타일 업데이트
        layer.setStyle(style);
        
        // 가시성 업데이트
        if (visible && !map.hasLayer(layer)) {
          layer.addTo(map);
        } else if (!visible && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      } 
      // 새 레이어 생성
      else {
        const layer = L.geoJSON(geojson as any, {
          style: style,
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const popupContent = Object.entries(feature.properties)
                .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                .join('<br>');
              
              layer.bindPopup(popupContent);
            }
          }
        });
        
        if (visible) {
          layer.addTo(map);
        }
        
        currentLayers[id] = layer;
      }
    });

    // 모든 레이어가 보이도록 지도 영역 조정
    if (Object.keys(currentLayers).length > 0 && shapefiles.some(sf => sf.visible)) {
      const visibleLayers = Object.values(currentLayers).filter((_, i) => 
        shapefiles[i] && shapefiles[i].visible
      );
      
      if (visibleLayers.length > 0) {
        const group = L.featureGroup(visibleLayers as any);
        map.fitBounds(group.getBounds(), { padding: [20, 20] });
      }
    }

    layersRef.current = currentLayers;
  }, [shapefiles]);

  return <div id="map" className="w-full h-full" />;
} 