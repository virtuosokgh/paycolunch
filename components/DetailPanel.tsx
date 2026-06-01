"use client";

import { useAppStore } from "../lib/store";
import { CATEGORY_COLORS } from "../lib/categoryMap";
import type { Restaurant } from "../lib/types";

export default function DetailPanel({ all }: { all: Restaurant[] }) {
  const selectedId = useAppStore((s) => s.selectedId);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const restaurant = all.find((r) => r.id === selectedId);

  if (!restaurant) return null;

  const placeUrl =
    restaurant.placeUrl ||
    `https://map.naver.com/p/search/${encodeURIComponent(restaurant.name + " " + restaurant.address)}`;
  const directionsUrl = `https://map.naver.com/p/directions/-/-/-/${encodeURIComponent(restaurant.address)}/walk?c=15.00,0,0,0,dh`;

  return (
    <aside className="w-[380px] flex-shrink-0 border-l bg-white overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
        <span
          className="inline-block px-2 py-0.5 rounded text-xs text-white"
          style={{ background: CATEGORY_COLORS[restaurant.categoryGroup] }}
        >
          {restaurant.categoryGroup}
        </span>
        <button
          onClick={() => setSelectedId(null)}
          className="text-gray-400 hover:text-gray-700 text-lg"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h2 className="text-xl font-bold">{restaurant.name}</h2>
          {restaurant.category && (
            <div className="text-xs text-gray-500 mt-1">{restaurant.category}</div>
          )}
        </div>

        <div className="space-y-1 text-sm text-gray-700">
          <div className="flex gap-2">
            <span className="text-gray-400 w-12 flex-shrink-0">주소</span>
            <span>{restaurant.address}</span>
          </div>
          {restaurant.phone && (
            <div className="flex gap-2">
              <span className="text-gray-400 w-12 flex-shrink-0">전화</span>
              <a href={`tel:${restaurant.phone}`} className="text-blue-600">
                {restaurant.phone}
              </a>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-gray-400 w-12 flex-shrink-0">결제</span>
            <span className="text-emerald-600 font-medium">PAYCO 식권 가능</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <a
            href={placeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-semibold text-sm"
          >
            🗺️ 네이버 지도에서 보기 (메뉴/사진/리뷰)
          </a>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold text-sm"
          >
            🚗 길찾기
          </a>
          {restaurant.externalLink && (
            <a
              href={restaurant.externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-4 py-2 bg-white border hover:bg-gray-50 rounded text-sm text-gray-700"
            >
              🔗 가게 자체 페이지
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
