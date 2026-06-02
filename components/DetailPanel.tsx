"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "../lib/store";
import { CATEGORY_COLORS } from "../lib/categoryMap";
import type { Restaurant } from "../lib/types";
import ImageLightbox, { type LightboxImage } from "./ImageLightbox";

// 모듈 레벨 캐시 — 같은 식당 다시 클릭 시 즉시 표시
const placeInfoCache = new Map<string, PlaceInfo>();
const resolveUrlCache = new Map<string, string>();

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
interface ExtractedMenu {
  name: string;
  price: string;
}
interface PlaceInfo {
  menuImages: PlaceImage[];
  images: PlaceImage[];
  blogs: PlaceBlog[];
  menuExtracted?: ExtractedMenu[];
  error?: string;
}

function formatDate(yyyymmdd: string): string {
  if (!/^\d{8}$/.test(yyyymmdd)) return yyyymmdd;
  return `${yyyymmdd.slice(0, 4)}.${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

function ImageGrid({
  images,
  cols = 3,
  onPick,
}: {
  images: PlaceImage[];
  cols?: 3 | 4;
  onPick: (i: number) => void;
}) {
  const gridClass = cols === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <div className={`grid ${gridClass} gap-1`}>
      {images.map((img, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          className="block aspect-square overflow-hidden rounded bg-gray-100 group"
          title={img.title}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.thumbnail}
            alt={img.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
          />
        </button>
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
  const favorites = useAppStore((s) => s.favorites);
  const favoriteCounts = useAppStore((s) => s.favoriteCounts);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const restaurant = all.find((r) => r.id === selectedId);

  const [info, setInfo] = useState<PlaceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  useEffect(() => {
    if (!restaurant) {
      setInfo(null);
      setResolvedUrl(null);
      return;
    }
    let cancelled = false;

    // 즉시 폴백 URL 세팅 (resolve API 응답 전에도 버튼 작동)
    const fallbackUrl = `https://map.naver.com/p/search/${encodeURIComponent(restaurant.name)}`;
    setResolvedUrl(resolveUrlCache.get(restaurant.id) ?? fallbackUrl);

    // 1) place-info: 캐시 hit이면 즉시 렌더, 아니면 fetch
    const cachedInfo = placeInfoCache.get(restaurant.id);
    if (cachedInfo) {
      setInfo(cachedInfo);
      setLoading(false);
    } else {
      setLoading(true);
      setInfo(null);
      const infoUrl = `/api/place-info?name=${encodeURIComponent(restaurant.name)}&address=${encodeURIComponent(restaurant.address)}&categoryGroup=${encodeURIComponent(restaurant.categoryGroup)}`;
      fetch(infoUrl) // 캐시 헤더 + 브라우저 캐시 활용
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) {
            return {
              menuImages: [],
              images: [],
              blogs: [],
              error: data?.error ?? `HTTP ${r.status}`,
            } as PlaceInfo;
          }
          return data as PlaceInfo;
        })
        .then((data: PlaceInfo) => {
          if (cancelled) return;
          if (!data.error) placeInfoCache.set(restaurant.id, data);
          setInfo(data);
        })
        .catch(() => {
          if (!cancelled)
            setInfo({ menuImages: [], images: [], blogs: [], error: "네트워크 오류" });
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    // 2) place-resolve: 캐시 hit이면 즉시, 아니면 fetch
    if (!resolveUrlCache.has(restaurant.id)) {
      const resolveUrl = `/api/place-resolve?name=${encodeURIComponent(restaurant.name)}&address=${encodeURIComponent(restaurant.address)}`;
      fetch(resolveUrl)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled || !data.url) return;
          resolveUrlCache.set(restaurant.id, data.url);
          setResolvedUrl(data.url);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [restaurant?.id, restaurant?.name, restaurant?.address, restaurant?.categoryGroup]);

  if (!restaurant) return null;

  const isFav = favorites.has(restaurant.id);
  const favCount = favoriteCounts[restaurant.id] ?? 0;

  const menuImagesArr = info?.menuImages ?? [];
  const photoImagesArr = info?.images ?? [];
  // 전체 보기용: 메뉴 → 일반 사진 순서로 합침, 중복 제거
  const allImagesSeen = new Set<string>();
  const allImages: LightboxImage[] = [];
  for (const im of [...menuImagesArr, ...photoImagesArr]) {
    if (!allImagesSeen.has(im.thumbnail)) {
      allImagesSeen.add(im.thumbnail);
      allImages.push(im);
    }
  }

  const openLightbox = (images: LightboxImage[], idx: number) => {
    setLightbox({ images, index: idx });
  };
  const closeLightbox = () => setLightbox(null);
  const prevImage = () =>
    setLightbox((s) => (s && s.index > 0 ? { ...s, index: s.index - 1 } : s));
  const nextImage = () =>
    setLightbox((s) => (s && s.index < s.images.length - 1 ? { ...s, index: s.index + 1 } : s));

  return (
    <aside className="w-full sm:w-[420px] flex-shrink-0 sm:border-l bg-white overflow-y-auto h-full">
      <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
        <span
          className="inline-block px-2 py-0.5 rounded text-xs text-white"
          style={{ background: CATEGORY_COLORS[restaurant.categoryGroup] }}
        >
          {restaurant.categoryGroup}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleFavorite(restaurant.id)}
            className={`flex items-center gap-1 text-xl leading-none transition-transform hover:scale-110 ${
              isFav ? "text-yellow-400" : "text-gray-300 hover:text-yellow-300"
            }`}
            title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
            aria-label="즐겨찾기"
          >
            {isFav ? "★" : "☆"}
            {favCount > 0 && (
              <span className="text-[11px] text-amber-600 font-bold tabular-nums">
                {favCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setSelectedId(null)}
            className="text-gray-400 hover:text-gray-700 text-lg"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
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
          href={resolvedUrl ?? `https://map.naver.com/p/search/${encodeURIComponent(restaurant.name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-semibold text-sm"
        >
          🗺️ 네이버 지도에서 자세히 보기
        </a>

        {/* 본문에서 추출한 메뉴 */}
        {info && !info.error && (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-emerald-800">
                📋 본문에서 추출한 메뉴
              </h3>
              {(info.menuExtracted ?? []).length > 0 && (
                <span className="text-[10px] text-emerald-600 font-medium">
                  {(info.menuExtracted ?? []).length}개
                </span>
              )}
            </div>
            {(info.menuExtracted ?? []).length > 0 ? (
              <>
                <p className="text-[10px] text-emerald-700/80 mb-2 leading-relaxed">
                  ※ 블로그 리뷰 본문에서 자동 추출한 메뉴/가격입니다. 정확하지 않을 수
                  있어요.
                </p>
                <ul className="space-y-1">
                  {(info.menuExtracted ?? []).slice(0, 12).map((m, i) => (
                    <li
                      key={i}
                      className="flex justify-between items-baseline gap-3 text-sm border-b border-emerald-200/50 pb-1 last:border-0 last:pb-0"
                    >
                      <span className="text-gray-800 truncate">{m.name}</span>
                      <span className="font-bold text-emerald-700 flex-shrink-0 tabular-nums">
                        {m.price}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-xs text-emerald-700/70 leading-relaxed">
                블로그 본문에서 가격 정보를 찾지 못했어요. 정식 메뉴는 아래{" "}
                <span className="font-semibold">네이버 지도에서 자세히 보기</span>에서
                확인하세요.
              </p>
            )}
          </section>
        )}

        {/* Menu */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-800">🍴 메뉴 사진</h3>
            {allImages.length > 0 && (
              <button
                type="button"
                onClick={() => openLightbox(allImages, 0)}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                전체 보기 ({allImages.length}장) →
              </button>
            )}
          </div>
          {info?.error ? (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3 leading-relaxed">
              <div className="font-semibold mb-1">⚠️ API 호출 실패: {info.error}</div>
              <div>
                Vercel에 <code className="bg-white px-1 rounded">NAVER_CLIENT_ID</code> /{" "}
                <code className="bg-white px-1 rounded">NAVER_CLIENT_SECRET</code> 환경변수가
                등록되지 않았거나, 로컬 <code className="bg-white px-1 rounded">.env.local</code>이
                비어있을 가능성이 큽니다.
              </div>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-gray-400 mb-2">
                * 네이버는 정확한 메뉴 데이터를 API로 공개하지 않아, 메뉴판 사진으로 대체합니다.
                사진을 클릭하면 크게 볼 수 있어요.
              </p>
              {loading && !info ? (
                <SkeletonGrid cols={4} count={8} />
              ) : menuImagesArr.length > 0 ? (
                <ImageGrid
                  images={menuImagesArr.slice(0, 8)}
                  cols={4}
                  onPick={(i) => openLightbox(allImages, i)}
                />
              ) : (
                <div className="text-xs text-gray-400 py-2">메뉴 이미지 결과 없음</div>
              )}
            </>
          )}
        </section>

        {/* Photos */}
        <section>
          <h3 className="text-sm font-bold text-gray-800 mb-2">📸 음식 사진</h3>
          {loading && !info ? (
            <SkeletonGrid cols={3} count={6} />
          ) : photoImagesArr.length > 0 ? (
            <ImageGrid
              images={photoImagesArr.slice(0, 9)}
              cols={3}
              onPick={(i) => {
                // 전체 이미지 배열 안에서의 index 계산 (메뉴 + 사진 순서)
                const thumb = photoImagesArr[i].thumbnail;
                const idx = allImages.findIndex((im) => im.thumbnail === thumb);
                openLightbox(allImages, idx >= 0 ? idx : 0);
              }}
            />
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

      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
    </aside>
  );
}
