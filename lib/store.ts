import { create } from "zustand";
import type { CategoryGroup, Restaurant, UserLocation } from "./types";

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface Filters {
  gu: string | null;
  dong: string | null;
  categories: CategoryGroup[];
  search: string;
  favoritesOnly: boolean;
}

interface AppState {
  restaurants: Restaurant[];
  setRestaurants: (rs: Restaurant[]) => void;

  filters: Filters;
  setGu: (gu: string | null) => void;
  setDong: (dong: string | null) => void;
  toggleCategory: (c: CategoryGroup) => void;
  setSearch: (q: string) => void;
  setFavoritesOnly: (v: boolean) => void;
  resetFilters: () => void;

  favorites: Set<string>;
  favoriteCounts: Record<string, number>;
  toggleFavorite: (id: string) => void;
  loadFavorites: () => Promise<void>;

  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;

  userLocation: UserLocation | null;
  sortByDistance: boolean;
  requestUserLocation: (silent?: boolean) => Promise<void>;
  clearUserLocation: () => void;

  mapBounds: MapBounds | null;
  setMapBounds: (b: MapBounds | null) => void;
}

const defaultFilters: Filters = {
  gu: null,
  dong: null,
  categories: [],
  search: "",
  favoritesOnly: false,
};

const LS_FAV_KEY = "paycolunch:favorites";

function readLocalFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_FAV_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeLocalFavorites(s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_FAV_KEY, JSON.stringify([...s]));
  } catch {
    // ignore
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  restaurants: [],
  setRestaurants: (rs) => set({ restaurants: rs }),

  filters: defaultFilters,
  setGu: (gu) => set((s) => ({ filters: { ...s.filters, gu, dong: null } })),
  setDong: (dong) => set((s) => ({ filters: { ...s.filters, dong } })),
  toggleCategory: (c) =>
    set((s) => {
      const has = s.filters.categories.includes(c);
      return {
        filters: {
          ...s.filters,
          categories: has ? s.filters.categories.filter((x) => x !== c) : [...s.filters.categories, c],
        },
      };
    }),
  setSearch: (q) => set((s) => ({ filters: { ...s.filters, search: q } })),
  setFavoritesOnly: (v) => set((s) => ({ filters: { ...s.filters, favoritesOnly: v } })),
  resetFilters: () => set({ filters: defaultFilters }),

  favorites: new Set<string>(),
  favoriteCounts: {},
  toggleFavorite: (id: string) => {
    const current = get().favorites;
    const next = new Set(current);
    const willAdd = !next.has(id);
    if (willAdd) next.add(id);
    else next.delete(id);
    writeLocalFavorites(next);
    set({ favorites: next });

    // 서버 동기화 (실패해도 로컬은 유지)
    fetch(`/api/favorites?id=${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify({ action: willAdd ? "add" : "remove" }),
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((data: { counts?: Record<string, number> }) => {
        if (data.counts) set({ favoriteCounts: data.counts });
      })
      .catch(() => {});
  },
  loadFavorites: async () => {
    // 1) 로컬 즉시 반영
    const local = readLocalFavorites();
    set({ favorites: local });
    // 2) 서버에서 글로벌 즐겨찾기 카운트 가져오기
    try {
      const r = await fetch("/api/favorites", { cache: "no-store" });
      if (r.ok) {
        const data = (await r.json()) as { counts: Record<string, number> };
        set({ favoriteCounts: data.counts ?? {} });
      }
    } catch {
      // 서버 미연결이면 로컬만 사용
    }
  },

  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

  hoveredId: null,
  setHoveredId: (id) => set({ hoveredId: id }),

  userLocation: null,
  sortByDistance: false,
  requestUserLocation: async (silent = false) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (!silent) alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
      return;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          set({
            userLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            sortByDistance: true,
          });
          resolve();
        },
        (err) => {
          if (silent) {
            // 자동 호출 (페이지 첫 진입)에서는 조용히 실패
            resolve();
            return;
          }
          let msg = "";
          if (err.code === 1) {
            msg =
              "위치 권한이 차단되어 있어요.\n\n" +
              "📍 권한 다시 켜는 법 (Chrome)\n" +
              "1. 주소창 좌측 자물쇠/방패 아이콘 클릭\n" +
              "2. '사이트 설정' → '위치'\n" +
              "3. '차단' → '허용'으로 변경\n" +
              "4. 페이지 새로고침";
          } else if (err.code === 2) {
            msg = "현재 위치를 가져올 수 없습니다. (네트워크나 GPS를 확인해주세요)";
          } else if (err.code === 3) {
            msg = "위치 요청 시간이 초과되었습니다. 다시 시도해주세요.";
          } else {
            msg = `위치 접근 실패: ${err.message}`;
          }
          alert(msg);
          resolve();
        },
        { enableHighAccuracy: false, timeout: 8000 },
      );
    });
  },
  clearUserLocation: () => set({ userLocation: null, sortByDistance: false }),

  mapBounds: null,
  setMapBounds: (b) => set({ mapBounds: b }),
}));
