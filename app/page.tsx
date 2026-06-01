"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../lib/store";
import { haversineKm } from "../lib/haversine";
import FilterBar from "../components/FilterBar";
import RestaurantList from "../components/RestaurantList";
import DetailPanel from "../components/DetailPanel";
import type { Restaurant } from "../lib/types";

const LeafletMap = dynamic(() => import("../components/LeafletMap"), { ssr: false });

export default function Home() {
  const restaurants = useAppStore((s) => s.restaurants);
  const setRestaurants = useAppStore((s) => s.setRestaurants);
  const filters = useAppStore((s) => s.filters);
  const userLocation = useAppStore((s) => s.userLocation);
  const sortByDistance = useAppStore((s) => s.sortByDistance);
  const selectedId = useAppStore((s) => s.selectedId);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const mapBounds = useAppStore((s) => s.mapBounds);
  const favorites = useAppStore((s) => s.favorites);

  // 모바일 하단 시트 상태: 'collapsed' (peek), 'expanded' (full)
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false);

  useEffect(() => {
    fetch("/data/restaurants.json")
      .then((r) => r.json())
      .then((data: Restaurant[]) => setRestaurants(data))
      .catch((e) => console.error("Failed to load data", e));
  }, [setRestaurants]);

  useEffect(() => {
    const requestUserLocation = useAppStore.getState().requestUserLocation;
    const t = setTimeout(() => {
      requestUserLocation(true);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    useAppStore.getState().loadFavorites();
  }, []);

  // 식당 선택 시 모바일 시트 자동 collapse (지도가 보이도록)
  useEffect(() => {
    if (selectedId) setMobileSheetExpanded(false);
  }, [selectedId]);

  const withDistance = useMemo(() => {
    if (!userLocation) return restaurants.map((r) => ({ ...r }));
    return restaurants.map((r) => ({
      ...r,
      distance: haversineKm(userLocation, { lat: r.lat, lng: r.lng }),
    }));
  }, [restaurants, userLocation]);

  const filtered = useMemo(() => {
    let xs: Array<Restaurant & { distance?: number }> = withDistance;
    if (filters.gu) xs = xs.filter((r) => r.gu === filters.gu);
    if (filters.dong) xs = xs.filter((r) => r.dong === filters.dong);
    if (filters.categories.length > 0)
      xs = xs.filter((r) => filters.categories.includes(r.categoryGroup));
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      xs = xs.filter((r) => r.name.toLowerCase().includes(q));
    }
    if (filters.favoritesOnly) {
      xs = xs.filter((r) => favorites.has(r.id));
    }
    if (sortByDistance) {
      xs = [...xs].sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
    }
    return xs;
  }, [withDistance, filters, sortByDistance, favorites]);

  const visibleInView = useMemo(() => {
    if (!mapBounds) return filtered;
    return filtered.filter(
      (r) =>
        r.lat >= mapBounds.south &&
        r.lat <= mapBounds.north &&
        r.lng >= mapBounds.west &&
        r.lng <= mapBounds.east,
    );
  }, [filtered, mapBounds]);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <header className="border-b bg-white px-3 sm:px-4 py-2 sm:py-2.5 flex-shrink-0">
        <h1 className="font-bold text-base sm:text-lg leading-tight">
          🍽️ AXZ음식점 찾기{" "}
          <span className="text-[10px] sm:text-xs font-normal text-gray-500 block sm:inline">
            — PAYCO 식권 가맹점
          </span>
        </h1>
      </header>

      <FilterBar
        all={restaurants}
        filteredCount={filtered.length}
        visibleCount={visibleInView.length}
      />

      <div className="flex flex-1 min-h-0 relative">
        {/* 데스크탑 좌측 리스트 (sm 이상) */}
        <aside className="hidden sm:flex flex-col w-[340px] flex-shrink-0 border-r bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <RestaurantList items={visibleInView} totalFiltered={filtered.length} />
          </div>
        </aside>

        {/* 지도 */}
        <div className="flex-1 relative">
          <LeafletMap filtered={filtered} />

          {/* 모바일 하단 시트 핸들/리스트 */}
          <div
            className={`sm:hidden absolute inset-x-0 bottom-0 z-[450] bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] transition-[height] duration-300 ease-out flex flex-col ${
              mobileSheetExpanded ? "h-[70%]" : "h-[140px]"
            }`}
          >
            <button
              type="button"
              onClick={() => setMobileSheetExpanded((v) => !v)}
              className="flex items-center justify-between px-4 py-2.5 border-b cursor-pointer select-none"
            >
              <div className="flex flex-col items-start">
                <div className="w-10 h-1.5 bg-gray-300 rounded-full mb-1 self-center" />
                <span className="text-sm font-semibold text-gray-800">
                  지도에 표시된 식당{" "}
                  <span className="text-emerald-600">{visibleInView.length}</span>곳
                </span>
              </div>
              <span className="text-gray-400 text-lg">
                {mobileSheetExpanded ? "▾" : "▴"}
              </span>
            </button>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <RestaurantList items={visibleInView} totalFiltered={filtered.length} />
            </div>
          </div>
        </div>

        {/* 데스크탑 상세 패널 (sm 이상) */}
        {selectedId && (
          <div className="hidden sm:block">
            <DetailPanel all={restaurants} />
          </div>
        )}

        {/* 모바일 상세 패널: 풀스크린 오버레이 */}
        {selectedId && (
          <div className="sm:hidden fixed inset-0 z-[500] bg-white flex flex-col">
            <div className="flex-shrink-0 px-3 py-2 border-b flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-1 px-2 py-1 -ml-1 text-gray-700 font-medium text-sm"
                aria-label="목록으로"
              >
                <span className="text-lg leading-none">‹</span> 목록
              </button>
              <h2 className="font-bold text-sm text-gray-900 truncate flex-1 text-center pr-12">
                {restaurants.find((r) => r.id === selectedId)?.name ?? "상세"}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DetailPanel all={restaurants} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
