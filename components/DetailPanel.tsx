"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "../lib/store";
import { CATEGORY_COLORS } from "../lib/categoryMap";
import type { Restaurant } from "../lib/types";

interface PlaceImage {
  title: string;
  link: string;
  thumbnail: string;
}
interface PlaceBlog {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  postdate: string;
}
interface PlaceInfo {
  images: PlaceImage[];
  blogs: PlaceBlog[];
}

function formatDate(yyyymmdd: string): string {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

export default function DetailPanel({ all }: { all: Restaurant[] }) {
  const selectedId = useAppStore((s) => s.selectedId);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const restaurant = all.find((r) => r.id === selectedId);

  const [info, setInfo] = useState<PlaceInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!restaurant) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setInfo(null);
    const url = `/api/place-info?name=${encodeURIComponent(restaurant.name)}&address=${encodeURIComponent(restaurant.address)}`;
    fetch(url)
      .then((r) => r.json())
      .then((data: PlaceInfo) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo({ images: [], blogs: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurant?.id, restaurant?.name, restaurant?.address]);

  if (!restaurant) return null;

  const placeUrl =
    restaurant.placeUrl ||
    `https://map.naver.com/p/search/${encodeURIComponent(restaurant.name + " " + restaurant.address)}`;

  return (
    <aside className="w-[420px] flex-shrink-0 border-l bg-white overflow-y-auto">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
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

        <a
          href={placeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-semibold text-sm"
        >
          🗺️ 네이버 지도에서 자세히 보기
        </a>

        {/* Photos */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-2">📸 사진 / 메뉴</h3>
          {loading && !info ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : info && info.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {info.images.slice(0, 12).map((img, i) => (
                <a
                  key={i}
                  href={img.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square overflow-hidden rounded bg-gray-100"
                  title={img.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.thumbnail}
                    alt={img.title}
                    loading="lazy"
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </a>
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-400 py-2">사진 검색 결과 없음</div>
          )}
        </section>

        {/* Reviews */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-2">📝 블로그 리뷰</h3>
          {loading && !info ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />
              ))}
            </div>
          ) : info && info.blogs.length > 0 ? (
            <ul className="space-y-2">
              {info.blogs.map((b, i) => (
                <li key={i}>
                  <a
                    href={b.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border rounded p-2.5 hover:bg-gray-50"
                  >
                    <div className="text-sm font-medium text-gray-800 line-clamp-1">
                      {b.title}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {b.description}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      {b.bloggername} · {formatDate(b.postdate)}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-xs text-gray-400 py-2">블로그 후기 없음</div>
          )}
        </section>

        {restaurant.externalLink && (
          <a
            href={restaurant.externalLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center px-4 py-2 bg-white border hover:bg-gray-50 rounded text-sm text-gray-700"
          >
            🔗 가게 자체 페이지 (홈페이지/SNS)
          </a>
        )}
      </div>
    </aside>
  );
}
