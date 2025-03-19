# SHP Viewer - 지리 정보 시각화 도구

SHP Viewer는 SHP(Shapefile) 파일을 웹 브라우저에서 쉽게 업로드하고 시각화할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- SHP 파일 업로드 및 관리
- 지도 기반 시각화
- 레이어 스타일 편집
- 속성 데이터 조회 및 검색
- CSV 내보내기

## 기술 스택

- Next.js 14 (App Router)
- TypeScript
- Leaflet (지도 시각화)
- Tailwind CSS (스타일링)
- Shadcn UI (UI 컴포넌트)
- Zustand (상태 관리)
- shpjs (SHP 파일 파싱)

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

- Node.js 18.0.0 이상
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

## 사용 방법

1. **파일 업로드**: SHP 파일과 관련 파일(.dbf, .shx)을 함께 업로드합니다.
2. **레이어 관리**: 업로드된 레이어의 가시성을 관리하고 선택합니다.
3. **스타일 편집**: 선택한 레이어의 색상, 선 두께, 투명도 등을 조정합니다.
4. **속성 데이터**: 레이어의 속성 데이터를 조회하고 검색할 수 있습니다.
5. **CSV 내보내기**: 속성 데이터를 CSV 형식으로 내보낼 수 있습니다.

## 라이선스

MIT

## 기여하기

이슈와 풀 리퀘스트는 언제나 환영합니다. 기여하기 전에 프로젝트의 코드 스타일과 가이드라인을 확인해주세요.
