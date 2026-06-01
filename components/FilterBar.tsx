"use client";

import { useMemo } from "react";
import { useAppStore } from "../lib/store";
import { CATEGORY_GROUPS, CATEGORY_COLORS } from "../lib/categoryMap";
import type { Restaurant } from "../lib/types";

const GU_OPTIONS = ["분당구", "수정구", "중원구"];

export default function FilterBar({
  all,
  filteredCount,
}: {
  all: Restaurant[];
  filteredCount: number;
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
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-white">
      <select
        value={filters.gu ?? ""}
        onChange={(e) => setGu(e.target.value || null)}
        className="border rounded px-2 py-1.5 text-sm bg-white"
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
        className="border rounded px-2 py-1.5 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value="">전체 동</option>
        {dongOptions.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <input
        value={filters.search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="식당 이름 검색"
        className="border rounded px-3 py-1.5 text-sm w-48"
      />

      <div className="flex flex-wrap gap-1">
        {CATEGORY_GROUPS.map((c) => {
          const active = filters.categories.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggleCategory(c)}
              className={`text-xs px-2 py-1 rounded-full border ${
                active ? "text-white" : "bg-white text-gray-700"
              }`}
              style={{
                borderColor: CATEGORY_COLORS[c],
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
        className="text-xs text-gray-500 underline ml-1"
      >
        초기화
      </button>

      <div className="ml-auto text-sm text-gray-600 font-medium">
        {filteredCount.toLocaleString()} / {all.length.toLocaleString()} 곳
      </div>
    </div>
  );
}
