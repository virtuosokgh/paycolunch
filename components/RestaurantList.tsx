"use client";

import { useAppStore } from "../lib/store";
import { CATEGORY_COLORS } from "../lib/categoryMap";
import type { Restaurant } from "../lib/types";

function distanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

export default function RestaurantList({
  items,
  totalFiltered,
}: {
  items: Array<Restaurant & { distance?: number }>;
  totalFiltered: number;
}) {
  const selectedId = useAppStore((s) => s.selectedId);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const setHoveredId = useAppStore((s) => s.setHoveredId);
  const sortByDistance = useAppStore((s) => s.sortByDistance);
  const favorites = useAppStore((s) => s.favorites);
  const favoriteCounts = useAppStore((s) => s.favoriteCounts);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        <div className="text-3xl mb-2">🔍</div>
        <div className="font-medium text-gray-700">현재 지도 영역에 식당이 없어요</div>
        <div className="text-xs text-gray-400 mt-1">
          지도를 다른 곳으로 옮기거나 줌 아웃 해보세요
          {totalFiltered > 0 && ` (필터 결과 ${totalFiltered}곳)`}
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {items.map((r) => {
        const selected = r.id === selectedId;
        const color = CATEGORY_COLORS[r.categoryGroup];
        const isFav = favorites.has(r.id);
        const favCount = favoriteCounts[r.id] ?? 0;
        return (
          <li
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            onMouseEnter={() => setHoveredId(r.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={`group px-3 sm:px-4 py-3 sm:py-3.5 cursor-pointer transition-colors active:bg-emerald-100 ${
              selected ? "bg-emerald-50 border-l-4 border-emerald-500" : "border-l-4 border-transparent hover:bg-amber-50/40"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-[15px] text-gray-900 leading-snug truncate flex-1">
                {r.name}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {sortByDistance && r.distance !== undefined && (
                  <span className="text-[12px] text-gray-500 font-medium">
                    {distanceLabel(r.distance)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(r.id);
                  }}
                  className={`text-base leading-none transition-transform hover:scale-125 ${
                    isFav ? "text-yellow-400" : "text-gray-300 hover:text-yellow-300"
                  }`}
                  title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                  aria-label="즐겨찾기"
                >
                  {isFav ? "★" : "☆"}
                </button>
                {favCount > 0 && (
                  <span className="text-[10px] text-amber-600 font-bold tabular-nums">
                    {favCount}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded"
                style={{ background: `${color}1a`, color }}
              >
                {r.categoryGroup}
              </span>
              {r.category && (
                <span className="text-[12px] text-gray-500 truncate">
                  {r.category.split(">").slice(-1)[0].trim()}
                </span>
              )}
            </div>

            <div className="mt-1.5 text-[12px] text-gray-500 truncate">
              {r.gu} {r.dong}
              {r.address ? ` · ${r.address.replace(/^경기도 성남시 (분당구|수정구|중원구)\s?/, "")}` : ""}
            </div>

            <div className="mt-2 flex items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-0.5 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> PAYCO 식권
              </span>
              {r.phone && <span className="text-gray-400">· {r.phone}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
