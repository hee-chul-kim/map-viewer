'use client';

import { useState } from 'react';
import { useAtom } from 'jotai';
import { shapefilesAtom, selectedShapefileAtom } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LayerList from '@/components/layer-list';
import StyleEditor from '@/components/style-editor';
import AttributeTable from '@/components/attribute-table';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState('layers');
  const [shapefiles] = useAtom(shapefilesAtom);
  const [selectedShapefile] = useAtom(selectedShapefileAtom);

  const hasShapefiles = shapefiles.length > 0;
  const hasSelectedShapefile = !!selectedShapefile;

  return (
    <div className="w-[400px] border-r bg-background p-4 overflow-auto h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="layers" disabled={!hasShapefiles}>
            레이어
          </TabsTrigger>
          <TabsTrigger value="style" disabled={!hasSelectedShapefile}>
            스타일
          </TabsTrigger>
          <TabsTrigger value="data" disabled={!hasSelectedShapefile}>
            데이터
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layers" className="mt-4 flex-1 overflow-auto">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">레이어 관리</h2>
            <p className="text-sm text-muted-foreground">레이어의 가시성을 관리하고 선택하세요.</p>
            <LayerList />
          </div>
        </TabsContent>

        <TabsContent value="style" className="mt-4 flex-1 overflow-auto">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">스타일 편집</h2>
            <p className="text-sm text-muted-foreground">선택한 레이어의 스타일을 변경하세요.</p>
            {hasSelectedShapefile && <StyleEditor />}
          </div>
        </TabsContent>

        <TabsContent value="data" className="mt-4 flex-1 overflow-auto">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">속성 데이터</h2>
            <p className="text-sm text-muted-foreground">
              선택한 레이어의 속성 데이터를 확인하세요.
            </p>
            {hasSelectedShapefile && <AttributeTable />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
