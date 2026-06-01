"use client";

import { useMemo } from "react";
import { useAppStore } from "../lib/store";
import { CATEGORY_GROUPS, CATEGORY_COLORS } from "../lib/categoryMap";
import type { Restaurant } from "../lib/types";

const GU_OPTIONS = ["분당구", "수정구", "중원구"];

export default function FilterBar({
  all,
  filteredCount,
  visibleCount,
}: {
  all: Restaurant[];
  filteredCount: number;
  visibleCount: number;
}) {
  const filters = useAppStore((s) => s.filters);
  const setGu = useAppStore((s) => s.setGu);
  const setDong = useAppStore((s) => s.setDong);
  const toggleCategory = useAppStore((s) => s.toggleCategory);
  const setSearch = useAppStore((s) => s.setSearch);
  const setFavoritesOnly = useAppStore((s) => s.setFavoritesOnly);
  const resetFilters = useAppStore((s) => s.resetFilters);
  const favorites = useAppStore((s) => s.favorites);

  const dongOptions = useMemo(() => {
    if (!filters.gu) return [];
    return Array.from(new Set(all.filter((r) => r.gu === filters.gu).map((r) => r.dong)))
      .filter(Boolean)
      .sort();
  }, [all, filters.gu]);

  return (
    <div className="border-b bg-white shadow-sm flex-shrink-0">
      {/* 1열: 검색 + 즐겨찾기 + 구/동 */}
      <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 overflow-x-auto whitespace-nowrap scrollbar-thin">
        <div className="relative flex-shrink-0">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
            🔍
          </span>
          <input
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="식당 검색"
            className="border border-gray-200 rounded-full pl-7 pr-3 py-1.5 text-xs sm:text-sm w-32 sm:w-52 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
          />
        </div>

        <button
          type="button"
          onClick={() => setFavoritesOnly(!filters.favoritesOnly)}
          className={`flex-shrink-0 text-xs px-2.5 py-1.5 rounded-full border font-medium transition-colors flex items-center gap-1 ${
            filters.favoritesOnly
              ? "bg-yellow-400 text-white border-yellow-400 shadow-sm"
              : "bg-white text-gray-700 border-gray-200 hover:bg-yellow-50 hover:border-yellow-300"
          }`}
          title="즐겨찾기한 가게만"
        >
          <span>{filters.favoritesOnly ? "★" : "☆"}</span>
          <span className="hidden sm:inline">즐겨찾기</span>
          {favorites.size > 0 && (
            <span
              className={`text-[10px] px-1 rounded ${
                filters.favoritesOnly ? "bg-yellow-500" : "bg-gray-100 text-gray-600"
              }`}
            >
              {favorites.size}
            </span>
          )}
        </button>

        <select
          value={filters.gu ?? ""}
          onChange={(e) => setGu(e.target.value || null)}
          className="flex-shrink-0 border border-gray-200 rounded-full px-2.5 py-1.5 text-xs sm:text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">전체 구</option>
          {GU_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={filters.dong ?? ""}
          onChange={(e) => setDong(e.target.value || null)}
          disabled={!filters.gu}
          className="flex-shrink-0 border border-gray-200 rounded-full px-2.5 py-1.5 text-xs sm:text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">전체 동</option>
          {dongOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <button
          onClick={resetFilters}
          className="flex-shrink-0 text-[11px] sm:text-xs text-gray-500 hover:text-gray-700 px-1"
        >
          초기화
        </button>

        {/* 데스크탑 카운트는 우측 */}
        <div className="hidden sm:block ml-auto text-xs text-gray-500 leading-tight text-right flex-shrink-0">
          <div>
            화면{" "}
            <span className="font-bold text-emerald-600 text-sm">
              {visibleCount.toLocaleString()}
            </span>
          </div>
          <div className="text-[11px] text-gray-400">
            필터 {filteredCount.toLocaleString()} / 전체 {all.length.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 2열: 카테고리 칩 (가로 스크롤) */}
      <div className="flex items-center gap-1.5 px-3 sm:px-4 pb-2 sm:pb-2.5 overflow-x-auto whitespace-nowrap scrollbar-thin">
        {CATEGORY_GROUPS.map((c) => {
          const active = filters.categories.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggleCategory(c)}
              className={`flex-shrink-0 text-[11px] sm:text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                active ? "text-white shadow-sm" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
              style={{
                borderColor: active ? CATEGORY_COLORS[c] : "#e5e7eb",
                background: active ? CATEGORY_COLORS[c] : undefined,
              }}
            >
              {c}
            </button>
          );
        })}

        {/* 모바일에서만: 우측에 작은 카운트 */}
        <div className="sm:hidden ml-auto pl-2 text-[11px] text-gray-500 flex-shrink-0 leading-none">
          <span className="font-bold text-emerald-600 text-sm">{visibleCount.toLocaleString()}</span>
          <span className="text-gray-400"> / {all.length.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
