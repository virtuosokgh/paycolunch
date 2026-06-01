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
  const resetFilters = useAppStore((s) => s.resetFilters);

  const dongOptions = useMemo(() => {
    if (!filters.gu) return [];
    return Array.from(new Set(all.filter((r) => r.gu === filters.gu).map((r) => r.dong)))
      .filter(Boolean)
      .sort();
  }, [all, filters.gu]);

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-white shadow-sm">
      <select
        value={filters.gu ?? ""}
        onChange={(e) => setGu(e.target.value || null)}
        className="border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
        className="border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      >
        <option value="">전체 동</option>
        {dongOptions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">🔍</span>
        <input
          value={filters.search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="식당 이름 검색"
          className="border border-gray-200 rounded-full pl-8 pr-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_GROUPS.map((c) => {
          const active = filters.categories.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggleCategory(c)}
              className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
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
      </div>

      <button
        onClick={resetFilters}
        className="text-xs text-gray-500 hover:text-gray-700 ml-1"
      >
        초기화
      </button>

      <div className="ml-auto text-xs text-gray-500 leading-tight text-right">
        <div>
          화면 <span className="font-bold text-emerald-600 text-sm">{visibleCount.toLocaleString()}</span>
        </div>
        <div className="text-[11px] text-gray-400">
          필터 {filteredCount.toLocaleString()} / 전체 {all.length.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
