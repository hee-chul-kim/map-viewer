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