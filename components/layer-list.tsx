'use client';

import { useAtom } from 'jotai';
import {
  shapefilesAtom,
  selectedShapefileAtom,
  updateShapefileVisibilityAtom,
  removeShapefileAtom,
  selectShapefileAtom,
} from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function LayerList() {
  const [shapefiles] = useAtom(shapefilesAtom);
  const [selectedShapefile] = useAtom(selectedShapefileAtom);
  const [, updateShapefileVisibility] = useAtom(updateShapefileVisibilityAtom);
  const [, removeShapefile] = useAtom(removeShapefileAtom);
  const [, selectShapefile] = useAtom(selectShapefileAtom);

  if (shapefiles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">업로드된 레이어가 없습니다.</div>
    );
  }

  const handleToggleVisibility = (id: string, currentVisibility: boolean) => {
    updateShapefileVisibility({ id, visible: !currentVisibility });
  };

  const handleRemoveLayer = (id: string, name: string) => {
    removeShapefile(id);
    toast({
      title: '레이어 삭제',
      description: `${name} 레이어가 삭제되었습니다.`,
      duration: 3000,
    });
  };

  return (
    <div className="space-y-2">
      {shapefiles.map((shapefile) => (
        <div
          key={shapefile.id}
          className={`flex items-center justify-between p-3 rounded-md border ${
            selectedShapefile?.id === shapefile.id ? 'bg-primary/5 border-primary/50' : 'bg-background'
          }`}
          onClick={() => selectShapefile(shapefile.id)}
        >
          <div className="flex items-center space-x-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleVisibility(shapefile.id, shapefile.visible);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              {shapefile.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <div className="truncate max-w-[180px]">
              <div className="font-medium text-sm">{shapefile.name}</div>
              <div className="text-xs text-muted-foreground">
                {shapefile.geojson.features.length} 객체
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveLayer(shapefile.id, shapefile.name);
            }}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
