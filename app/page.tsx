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

  useEffect(() => {
    fetch("/data/restaurants.json")
      .then((r) => r.json())
      .then((data: Restaurant[]) => setRestaurants(data))
      .catch((e) => console.error("Failed to load data", e));
  }, [setRestaurants]);

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
    if (sortByDistance) {
      xs = [...xs].sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
    }
    return xs;
  }, [withDistance, filters, sortByDistance]);

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b bg-white px-4 py-2.5">
        <h1 className="font-bold text-lg">
          🍽️ 성남 점심 지도 <span className="text-xs font-normal text-gray-500">— PAYCO 식권 가맹점</span>
        </h1>
      </header>
      <FilterBar all={restaurants} filteredCount={filtered.length} />
      <div className="flex flex-1 min-h-0">
        <div className="w-[320px] flex-shrink-0 border-r bg-white overflow-y-auto">
          <RestaurantList items={filtered} />
        </div>
        <div className="flex-1 relative">
          <LeafletMap filtered={filtered} />
        </div>
        {selectedId && <DetailPanel all={restaurants} />}
      </div>
    </div>
  );
}
