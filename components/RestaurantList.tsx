"use client";

import { useAppStore } from "../lib/store";
import { CATEGORY_COLORS } from "../lib/categoryMap";
import type { Restaurant } from "../lib/types";

export default function RestaurantList({
  items,
}: {
  items: Array<Restaurant & { distance?: number }>;
}) {
  const selectedId = useAppStore((s) => s.selectedId);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const sortByDistance = useAppStore((s) => s.sortByDistance);

  if (items.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-500">
        조건에 맞는 식당이 없습니다.
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((r) => {
        const selected = r.id === selectedId;
        return (
          <li
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
              selected ? "bg-blue-50" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              <span
                className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: CATEGORY_COLORS[r.categoryGroup] }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-medium truncate">{r.name}</div>
                  {sortByDistance && r.distance !== undefined && (
                    <div className="text-xs text-gray-500 flex-shrink-0">
                      {r.distance < 1
                        ? `${Math.round(r.distance * 1000)}m`
                        : `${r.distance.toFixed(1)}km`}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  <span>{r.categoryGroup}</span>
                  <span className="mx-1">·</span>
                  <span>
                    {r.gu} {r.dong}
                  </span>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
