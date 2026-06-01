import { create } from "zustand";
import type { CategoryGroup, Restaurant, UserLocation } from "./types";

interface Filters {
  gu: string | null;
  dong: string | null;
  categories: CategoryGroup[];
  search: string;
}

interface AppState {
  restaurants: Restaurant[];
  setRestaurants: (rs: Restaurant[]) => void;

  filters: Filters;
  setGu: (gu: string | null) => void;
  setDong: (dong: string | null) => void;
  toggleCategory: (c: CategoryGroup) => void;
  setSearch: (q: string) => void;
  resetFilters: () => void;

  selectedId: string | null;
  setSelectedId: (id: string | null) => void;

  userLocation: UserLocation | null;
  sortByDistance: boolean;
  requestUserLocation: () => Promise<void>;
  clearUserLocation: () => void;
}

const defaultFilters: Filters = {
  gu: null,
  dong: null,
  categories: [],
  search: "",
};

export const useAppStore = create<AppState>((set) => ({
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
  resetFilters: () => set({ filters: defaultFilters }),

  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id }),

  userLocation: null,
  sortByDistance: false,
  requestUserLocation: async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("브라우저가 위치 정보를 지원하지 않습니다.");
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
          alert(`위치 접근 실패: ${err.message}`);
          resolve();
        },
        { enableHighAccuracy: false, timeout: 8000 },
      );
    });
  },
  clearUserLocation: () => set({ userLocation: null, sortByDistance: false }),
}));
