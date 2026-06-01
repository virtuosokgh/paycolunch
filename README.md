# 🍽️ paycolunch — 성남 점심 지도

성남시 **PAYCO 식권 가맹점 800여 곳**을 지도에서 찾아보고, 필터로 좁혀서 점심 메뉴를 고를 수 있는 웹앱입니다.

- 지도: OpenStreetMap + Leaflet (마커 클러스터링)
- 데이터: PAYCO 가맹점 CSV → 네이버 검색 API로 좌표·카테고리·플레이스 링크 보강
- 식당 클릭 → 네이버 지도 장소 페이지로 이동 (메뉴/사진/리뷰)

## 스크린샷

좌측 리스트 + 중앙 지도 + 우측 상세 패널의 3분할 레이아웃. 카테고리별로 마커 색상이 다르고, 줌 레벨에 따라 자동으로 클러스터링됩니다.

## 사용 스택

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Zustand (상태 관리)
- Leaflet + leaflet.markercluster (지도)
- 네이버 검색 API (지역검색)

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # 네이버 키 입력
npm run enrich                      # CSV → JSON 데이터 보강 (한 번만)
npm run dev                         # http://localhost:3000
```

### 네이버 API 키 발급

https://developers.naver.com → 애플리케이션 등록 → 사용 API에서 **"검색"** 선택 → 웹 서비스 URL에 `http://localhost:3000` 등록 → Client ID / Secret 발급

`.env.local`:

```
NAVER_CLIENT_ID=발급받은_client_id
NAVER_CLIENT_SECRET=발급받은_client_secret
```

## 기능

- 🗺️ **지도**: 분당구/수정구/중원구 전 가맹점을 마커로 표시, 카테고리별 색상 구분
- 🔍 **필터**: 구/동, 카테고리 (한식/일식/카페·디저트 등 11종), 식당명 검색
- 📍 **현재 위치**: 브라우저 위치 권한 받아서 가까운 순으로 정렬
- 📖 **상세 패널**: 식당 클릭 시 이름/주소/카테고리/네이버 지도 페이지/길찾기 링크
- 🔗 **외부 링크**: 식당이 등록한 인스타그램/홈페이지가 있으면 함께 표시

## 데이터

`data/raw/seongnam_payco.csv` — PAYCO 식권 가맹점 원본 (성남시, 1,118행)

`npm run enrich` 실행 시 → 네이버 지역검색 API로 보강 → `public/data/restaurants.json` (800여 건)

캐시(`data/cache/enrich-cache.json`)가 있어서 재실행 시 처리된 행은 건너뜁니다.

## 디렉토리 구조

```
app/                 # Next.js App Router
  page.tsx           # 메인 페이지 (지도 + 사이드바)
  layout.tsx
  globals.css
components/
  LeafletMap.tsx     # 지도 + 클러스터링
  FilterBar.tsx      # 필터 UI
  RestaurantList.tsx # 좌측 리스트
  DetailPanel.tsx    # 우측 상세 패널
lib/
  store.ts           # Zustand 글로벌 상태
  types.ts
  haversine.ts       # 거리 계산
  categoryMap.ts     # 카테고리 분류 + 색상
scripts/
  enrich.mjs         # 데이터 보강 스크립트
data/
  raw/               # 원본 CSV
public/
  data/              # 보강된 JSON
```
