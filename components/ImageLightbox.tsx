"use client";

import { useEffect } from "react";

export interface LightboxImage {
  title: string;
  link: string;
  thumbnail: string;
}

export default function ImageLightbox({
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [onClose, onPrev, onNext]);

  if (index < 0 || index >= images.length) return null;
  const img = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* 상단 카운트 */}
      <div className="absolute top-5 left-5 text-white/90 text-sm font-medium tabular-nums select-none">
        {index + 1} / {images.length}
      </div>

      {/* 닫기 (X) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-2xl flex items-center justify-center transition-colors"
        aria-label="닫기"
        title="닫기 (Esc)"
      >
        ✕
      </button>

      {/* 이전 */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white text-3xl flex items-center justify-center transition-colors"
          aria-label="이전"
          title="이전 (←)"
        >
          ‹
        </button>
      )}

      {/* 다음 */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white text-3xl flex items-center justify-center transition-colors"
          aria-label="다음"
          title="다음 (→)"
        >
          ›
        </button>
      )}

      {/* 이미지 — link 우선, 실패 시 thumbnail로 fallback */}
      <img
        key={img.link}
        src={img.link}
        alt={img.title}
        onClick={(e) => e.stopPropagation()}
        onError={(e) => {
          const el = e.currentTarget;
          if (el.src !== img.thumbnail) el.src = img.thumbnail;
        }}
        className="max-w-[92vw] max-h-[82vh] object-contain rounded shadow-2xl"
      />

      {/* 하단 캡션 + 원본 페이지 링크 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3 text-white text-xs"
      >
        <div className="truncate max-w-[70%] opacity-90">{img.title}</div>
        <a
          href={img.link}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/15 hover:bg-white/30 px-3 py-1.5 rounded whitespace-nowrap transition-colors"
        >
          원본 페이지 ↗
        </a>
      </div>
    </div>
  );
}
