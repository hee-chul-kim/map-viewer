'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAtom } from 'jotai';
import { addShapefileAtom } from '@/lib/store';
import { Upload, FileX } from 'lucide-react';

export default function FileUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [, addShapefile] = useAtom(addShapefileAtom);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsLoading(true);
    
    try {
      // SHP 파일 필터링
      const shpFile = acceptedFiles.find(file => file.name.endsWith('.shp'));
      
      if (!shpFile) {
        toast({
          title: '오류',
          description: 'SHP 파일이 포함되어 있지 않습니다.',
          variant: 'destructive',
        });
        return;
      }
      
      // 관련 파일 찾기 (같은 이름의 .dbf, .shx 파일)
      const baseName = shpFile.name.slice(0, -4);
      const dbfFile = acceptedFiles.find(file => file.name === `${baseName}.dbf`);
      const shxFile = acceptedFiles.find(file => file.name === `${baseName}.shx`);
      
      if (!dbfFile || !shxFile) {
        toast({
          title: '경고',
          description: '필수 관련 파일(.dbf, .shx)이 누락되었습니다. 파일이 제대로 로드되지 않을 수 있습니다.',
          variant: 'destructive',
        });
      }
      
      // 파일 처리를 위해 shpjs 동적 임포트
      const shp = await import('shpjs');
      
      // 파일 읽기
      const filePromises = [shpFile, dbfFile, shxFile].filter(Boolean).map(file => {
        return new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file as File);
        });
      });
      
      const fileBuffers = await Promise.all(filePromises);
      
      // shpjs를 사용하여 파일 파싱
      const geojson = await shp.default.parseShp(fileBuffers[0], fileBuffers[2]);
      const dbf = dbfFile ? await shp.default.parseDbf(fileBuffers[1]) : [];
      
      // GeoJSON 생성
      const features = shp.default.combine([geojson, dbf]);
      
      // 스토어에 추가
      addShapefile({
        id: Date.now().toString(),
        name: baseName,
        geojson: features,
        visible: true,
        style: {
          color: '#3B82F6',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.3,
        },
      });
      
      toast({
        title: '성공',
        description: `${baseName} 파일이 성공적으로 로드되었습니다.`,
      });
    } catch (error) {
      console.error('SHP 파일 처리 오류:', error);
      toast({
        title: '오류',
        description: '파일 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addShapefile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/octet-stream': ['.shp', '.dbf', '.shx'],
    },
    multiple: true,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20'
        }`}
      >
        <input {...getInputProps()} />
        {isLoading ? (
          <div className="py-4">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-primary/20 mb-3"></div>
              <div className="h-4 w-32 bg-primary/20 rounded mb-2"></div>
              <div className="h-3 w-24 bg-primary/20 rounded"></div>
            </div>
          </div>
        ) : isDragActive ? (
          <div className="py-4 flex flex-col items-center">
            <Upload className="h-12 w-12 text-primary mb-3" />
            <p className="text-sm font-medium">파일을 여기에 놓으세요</p>
          </div>
        ) : (
          <div className="py-4 flex flex-col items-center">
            <FileX className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">SHP 파일을 드래그하거나 클릭하여 업로드하세요</p>
            <p className="text-xs text-muted-foreground mt-1">
              관련 파일(.dbf, .shx)도 함께 업로드해 주세요
            </p>
          </div>
        )}
      </div>
      <div className="flex justify-center">
        <Button
          onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
          disabled={isLoading}
          className="w-full"
        >
          파일 선택
        </Button>
      </div>
    </div>
  );
} 