"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
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
  const mapBounds = useAppStore((s) => s.mapBounds);
  const favorites = useAppStore((s) => s.favorites);

  useEffect(() => {
    fetch("/data/restaurants.json")
      .then((r) => r.json())
      .then((data: Restaurant[]) => setRestaurants(data))
      .catch((e) => console.error("Failed to load data", e));
  }, [setRestaurants]);

  // 첫 진입 시 자동 현위치 요청 (조용히 — 권한 거부 alert 없이)
  useEffect(() => {
    const requestUserLocation = useAppStore.getState().requestUserLocation;
    const t = setTimeout(() => {
      requestUserLocation(true);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // 즐겨찾기 로드 (로컬 즉시 + 서버 카운트)
  useEffect(() => {
    useAppStore.getState().loadFavorites();
  }, []);

  const withDistance = useMemo(() => {
    if (!userLocation) return restaurants.map((r) => ({ ...r }));
    return restaurants.map((r) => ({
      ...r,
      distance: haversineKm(userLocation, { lat: r.lat, lng: r.lng }),
    }));
  }, [restaurants, userLocation]);

  // 필터 통과(구/동/카테고리/검색/즐겨찾기) — 지도에 그릴 마커는 이걸로
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

  // 좌측 리스트는 현재 지도 viewport 안의 식당만
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
    <div className="h-screen flex flex-col">
      <header className="border-b bg-white px-4 py-2.5">
        <h1 className="font-bold text-lg">
          🍽️ 성남 점심 지도 <span className="text-xs font-normal text-gray-500">— PAYCO 식권 가맹점</span>
        </h1>
      </header>
      <FilterBar all={restaurants} filteredCount={filtered.length} visibleCount={visibleInView.length} />
      <div className="flex flex-1 min-h-0">
        <div className="w-[340px] flex-shrink-0 border-r bg-white overflow-y-auto">
          <RestaurantList items={visibleInView} totalFiltered={filtered.length} />
        </div>
        <div className="flex-1 relative">
          <LeafletMap filtered={filtered} />
        </div>
        {selectedId && <DetailPanel all={restaurants} />}
      </div>
    </div>
  );
}
