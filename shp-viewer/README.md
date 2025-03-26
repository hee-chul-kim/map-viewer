# SHP Viewer

SHP 파일을 웹에서 시각화하고 편집할 수 있는 도구입니다.

## 핵심 자료구조

### Shapefile 구조

```mermaid
classDiagram
    class Shapefile {
        +String id
        +String name
        +FeatureCollection geojson
        +FeatureCollection? simplified
        +ShapefileStyle style
        +Boolean visible
    }

    class FeatureCollection {
        +String type
        +Feature[] features
    }

    class Feature {
        +String type
        +Geometry geometry
        +Object properties
    }

    class Geometry {
        +String type
        +Array coordinates
    }

    class ShapefileStyle {
        +String color
        +String? strokeColor
        +Number weight
        +Number opacity
        +Number fillOpacity
    }

    Shapefile --> FeatureCollection : contains
    FeatureCollection --> Feature : contains
    Feature --> Geometry : contains
    Shapefile --> ShapefileStyle : has
```

### Spatial Grid 구조

```mermaid
classDiagram
    class SpatialGrid {
        +GridTile[] tiles
        +Number rows
        +Number cols
        +Number tileWidth
        +Number tileHeight
    }

    class GridTile {
        +String id
        +Bounds bounds
        +Feature[] features
        +Feature[] simplifiedFeatures
    }

    class Bounds {
        +Number minX
        +Number minY
        +Number maxX
        +Number maxY
        +Boolean hasFeatures
    }

    SpatialGrid --> GridTile : contains
    GridTile --> Bounds : has
    GridTile --> Feature : contains
```

### 상태 관리 구조

```mermaid
classDiagram
    class Store {
        +Atom<Shapefile[]> shapefiles
        +Atom<Shapefile?> selectedShapefile
        +Atom<ShapefileStyle> selectedShapefileStyle
    }

    class Shapefile {
        +String id
        +String name
        +FeatureCollection geojson
        +FeatureCollection? simplified
        +ShapefileStyle style
        +Boolean visible
    }

    Store --> Shapefile : manages
```

### 페이지 로드 및 렌더링 프로세스

```mermaid
sequenceDiagram
    participant map-viewer.tsx
    participant canvas-map.tsx
    participant spatial-grid.ts
    participant renderer.ts
    participant shape-loader.ts
    participant parser.ts

    map-viewer.tsx->>shape-loader.ts: loadShapefile()
    Note over map-viewer.tsx,shape-loader.ts: 파일 업로드 후 Shapefile 로드 요청

    shape-loader.ts->>parser.ts: parseShp(), parseDbf(), parsePrj()
    Note over shape-loader.ts,parser.ts: 각 파일 형식에 맞게 파싱 수행

    parser.ts->>shape-loader.ts: parseResult 전달
    Note over parser.ts,shape-loader.ts: 파싱된 데이터를 GeoJSON 형식으로 변환

    shape-loader.ts->>shape-loader.ts: transformCoordinates()
    Note over shape-loader.ts: 원본 좌표계에서 EPSG:3375로 변환

    shape-loader.ts->>shape-loader.ts: simplify()
    Note over shape-loader.ts: Douglas-Peucker 알고리즘으로 지오메트리 단순화

    shape-loader.ts->>map-viewer.tsx: transformedData, simplifiedData 전달
    Note over shape-loader.ts,map-viewer.tsx: 변환 및 단순화된 GeoJSON 데이터 전달

    map-viewer.tsx->>canvas-map.tsx: setShapefile()
    Note over map-viewer.tsx,canvas-map.tsx: Shapefile 데이터를 캔버스에 설정

    canvas-map.tsx->>spatial-grid.ts: initializeGrid()
    Note over canvas-map.tsx,spatial-grid.ts: 공간 그리드 초기화 및 설정

    spatial-grid.ts->>spatial-grid.ts: createTiles()
    Note over spatial-grid.ts: 데이터를 타일 단위로 분할

    spatial-grid.ts->>canvas-map.tsx: getTiles() 반환
    Note over spatial-grid.ts,canvas-map.tsx: 생성된 타일 정보 반환

    canvas-map.tsx->>canvas-map.tsx: calculateVisibleTiles()
    Note over canvas-map.tsx: 현재 뷰포트에 보이는 타일만 계산

    canvas-map.tsx->>renderer.ts: renderFeatures()
    Note over canvas-map.tsx,renderer.ts: 보이는 타일의 피처만 렌더링

    renderer.ts->>renderer.ts: drawFeature()
    Note over renderer.ts: 각 피처 타입(Point, LineString, Polygon)에 맞게 그리기

    Note over renderer.ts: 1. Point, LineString, Polygon<br/>2. 스타일 적용<br/>3. 호버 효과
```

## 주요 기능

- SHP 파일 업로드 및 시각화
- 레이어별 스타일 커스터마이징
- 레이어 표시/숨김
- 확대/축소 및 이동
- 피처 호버 시 정보 표시
- 좌표계 변환

## 기술 스택

- Next.js 15
- TypeScript
- Tailwind CSS
- Shadcn UI
- Jotai (상태 관리)
- Proj4js (좌표계 변환)
- Web Workers (좌표계 변환 최적화)

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 프로젝트 구조

```
shp-viewer/
├── app/                      # Next.js 앱 디렉토리
│   ├── globals.css           # 전역 스타일
│   ├── layout.tsx            # 레이아웃 컴포넌트
│   └── page.tsx              # 메인 페이지
├── components/               # 리액트 컴포넌트
│   ├── ui/                   # UI 컴포넌트
│   │   ├── button.tsx        # 버튼 컴포넌트
│   │   ├── label.tsx         # 레이블 컴포넌트
│   │   ├── slider.tsx        # 슬라이더 컴포넌트
│   │   ├── tabs.tsx          # 탭 컴포넌트
│   │   ├── toast.tsx         # 토스트 컴포넌트
│   │   ├── toaster.tsx       # 토스터 컴포넌트
│   │   └── use-toast.ts      # 토스트 훅
│   ├── attribute-table.tsx   # 속성 테이블 컴포넌트
│   ├── file-upload.tsx       # 파일 업로드 컴포넌트
│   ├── layer-list.tsx        # 레이어 목록 컴포넌트
│   ├── map-component.tsx     # 지도 컴포넌트
│   ├── map-viewer.tsx        # 지도 뷰어 컴포넌트
│   ├── sidebar.tsx           # 사이드바 컴포넌트
│   └── style-editor.tsx      # 스타일 편집기 컴포넌트
├── lib/                      # 유틸리티 및 상태 관리
│   ├── store.ts              # Zustand 스토어
│   └── utils.ts              # 유틸리티 함수
├── types/                    # 타입 정의
│   └── shpjs.d.ts            # shpjs 타입 정의
├── public/                   # 정적 파일
├── .gitignore                # Git 무시 파일
├── next.config.js            # Next.js 설정
├── package.json              # 패키지 정보
├── postcss.config.js         # PostCSS 설정
├── tailwind.config.js        # Tailwind CSS 설정
└── tsconfig.json             # TypeScript 설정
```

## 시작하기

### 필수 요구사항

- Node.js 22.0.0 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/yourusername/shp-viewer.git
cd shp-viewer

# 의존성 설치
npm install
# 또는
yarn install

# 개발 서버 실행
npm run dev
# 또는
yarn dev
```

브라우저에서 `http://localhost:3000`으로 접속하여 애플리케이션을 사용할 수 있습니다.
