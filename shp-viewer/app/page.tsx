import { Metadata } from 'next';
import MapViewer from '@/components/map-viewer';
import Sidebar from '@/components/sidebar';

export const metadata: Metadata = {
  title: 'SHP Viewer - 지리 정보 시각화 도구',
  description: 'SHP 파일을 웹 브라우저에서 쉽게 시각화하고 분석할 수 있는 도구입니다.',
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">SHP Viewer</h1>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/yourusername/shp-viewer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 overflow-auto p-4">
          <MapViewer />
        </div>
      </div>
    </main>
  );
}
