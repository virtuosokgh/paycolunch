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
  menuImages: PlaceImage[];
  images: PlaceImage[];
  blogs: PlaceBlog[];
}

function formatDate(yyyymmdd: string): string {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

function ImageGrid({ images, cols = 3 }: { images: PlaceImage[]; cols?: 3 | 4 }) {
  const gridClass = cols === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <div className={`grid ${gridClass} gap-1`}>
      {images.map((img, i) => (
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
  );
}

function SkeletonGrid({ cols = 3, count = 6 }: { cols?: 3 | 4; count?: number }) {
  const gridClass = cols === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <div className={`grid ${gridClass} gap-1`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded" />
      ))}
    </div>
  );
}

export default function DetailPanel({ all }: { all: Restaurant[] }) {
  const selectedId = useAppStore((s) => s.selectedId);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const restaurant = all.find((r) => r.id === selectedId);

  const [info, setInfo] = useState<PlaceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!restaurant) {
      setInfo(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setInfo(null);
    const url = `/api/place-info?name=${encodeURIComponent(restaurant.name)}&address=${encodeURIComponent(restaurant.address)}`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: PlaceInfo) => {
        if (!cancelled) setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo({ menuImages: [], images: [], blogs: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurant?.id, restaurant?.name, restaurant?.address]);

  if (!restaurant) return null;

  const handleOpenNaverMap = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (resolving) return;
    setResolving(true);
    // 사용자가 광고 차단/팝업 차단으로 새 탭이 막힐 가능성 — 미리 빈 탭을 열어두고 URL만 갈아끼움
    const newWin = window.open("about:blank", "_blank");
    try {
      const res = await fetch(
        `/api/place-resolve?name=${encodeURIComponent(restaurant.name)}&address=${encodeURIComponent(restaurant.address)}`,
      );
      const { url } = await res.json();
      if (newWin) newWin.location.href = url;
      else window.open(url, "_blank");
    } catch {
      const fallback = `https://map.naver.com/p/search/${encodeURIComponent(restaurant.name)}`;
      if (newWin) newWin.location.href = fallback;
      else window.open(fallback, "_blank");
    } finally {
      setResolving(false);
    }
  };

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

        <button
          type="button"
          onClick={handleOpenNaverMap}
          disabled={resolving}
          className="block w-full text-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white rounded font-semibold text-sm"
        >
          {resolving ? "🔍 가게 페이지 찾는 중…" : "🗺️ 네이버 지도에서 자세히 보기"}
        </button>

        {/* Menu */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-2">🍴 메뉴</h3>
          <p className="text-[11px] text-gray-400 mb-2">
            * 네이버는 정확한 메뉴 데이터를 API로 공개하지 않아, 메뉴판 사진으로 대체합니다.
            네이버 지도 페이지를 열면 정식 메뉴/가격 확인 가능합니다.
          </p>
          {loading && !info ? (
            <SkeletonGrid cols={4} count={8} />
          ) : info && (info.menuImages ?? []).length > 0 ? (
            <ImageGrid images={(info.menuImages ?? []).slice(0, 8)} cols={4} />
          ) : (
            <div className="text-xs text-gray-400 py-2">메뉴 이미지 결과 없음</div>
          )}
        </section>

        {/* Photos */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-2">📸 음식 사진</h3>
          {loading && !info ? (
            <SkeletonGrid cols={3} count={6} />
          ) : info && (info.images ?? []).length > 0 ? (
            <ImageGrid images={(info.images ?? []).slice(0, 9)} cols={3} />
          ) : (
            <div className="text-xs text-gray-400 py-2">사진 결과 없음</div>
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
          ) : info && (info.blogs ?? []).length > 0 ? (
            <ul className="space-y-2">
              {(info.blogs ?? []).map((b, i) => (
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
