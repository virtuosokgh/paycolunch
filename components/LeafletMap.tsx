"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useAppStore } from "../lib/store";
import { CATEGORY_COLORS } from "../lib/categoryMap";
import type { Restaurant } from "../lib/types";

const SEONGNAM_CENTER: L.LatLngTuple = [37.4019, 127.1086]; // 판교
const DEFAULT_ZOOM = 14;

function svgPinIcon(color: string, selected = false): L.DivIcon {
  const size = selected ? 40 : 28;
  const height = selected ? 50 : 36;
  const stroke = selected ? 3 : 2;
  const inner = selected ? 7 : 5;
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${height}' viewBox='0 0 28 36'
         style='filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));'>
      <path d='M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z'
            fill='${color}' stroke='white' stroke-width='${stroke}'/>
      <circle cx='14' cy='14' r='${inner}' fill='white'/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "pin-marker",
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
  });
}

function userDotIcon(): L.DivIcon {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='12' cy='12' r='10' fill='#3b82f6' fill-opacity='0.25'/><circle cx='12' cy='12' r='5' fill='#3b82f6' stroke='white' stroke-width='2'/></svg>`;
  return L.divIcon({
    html: svg,
    className: "user-dot",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

export default function LeafletMap({ filtered }: { filtered: Restaurant[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<any>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const userMarkerRef = useRef<L.Marker | null>(null);

  const selectedId = useAppStore((s) => s.selectedId);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const userLocation = useAppStore((s) => s.userLocation);
  const setMapBounds = useAppStore((s) => s.setMapBounds);

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: SEONGNAM_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });

    const VWORLD_KEY = process.env.NEXT_PUBLIC_VWORLD_KEY;
    const vworldUrl = (layer: string, ext: "png" | "jpeg" = "png") =>
      `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/${layer}/{z}/{y}/{x}.${ext}`;
    const vworldAttr =
      '<a href="https://www.vworld.kr">VWorld</a> | 국토교통부 © | <a href="https://carto.com/attributions">CARTO</a>';

    // CartoDB Voyager — VWorld 실패 시 fallback으로도 사용
    const carto = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 20,
        subdomains: "abcd",
        attribution: vworldAttr,
      },
    );

    // VWorld 한국 지도 (네이버급 디테일)
    const base = L.tileLayer(vworldUrl("Base"), {
      maxZoom: 19,
      attribution: vworldAttr,
    });
    const gray = L.tileLayer(vworldUrl("Gray"), {
      maxZoom: 19,
      attribution: vworldAttr,
    });
    const satellite = L.tileLayer(vworldUrl("Satellite", "jpeg"), {
      maxZoom: 19,
      attribution: vworldAttr,
    });
    const hybridLabels = L.tileLayer(vworldUrl("Hybrid"), {
      maxZoom: 19,
      pane: "overlayPane",
    });
    const satelliteWithLabels = L.layerGroup([satellite, hybridLabels]);

    // VWorld 타일 에러 카운트 — 다수 실패 시 자동 CartoDB로 전환
    let vworldErrors = 0;
    let vworldFallbackTriggered = false;
    const onTileError = () => {
      vworldErrors++;
      if (vworldErrors >= 5 && !vworldFallbackTriggered) {
        vworldFallbackTriggered = true;
        console.warn("VWorld tiles failing — falling back to CartoDB");
        if (map.hasLayer(base)) {
          map.removeLayer(base);
          carto.addTo(map);
        }
      }
    };
    base.on("tileerror", onTileError);
    gray.on("tileerror", onTileError);
    satellite.on("tileerror", onTileError);

    base.addTo(map);

    L.control
      .layers(
        { "🗺️ 일반": base, "🌫️ 회색": gray, "🛰️ 위성": satelliteWithLabels, "🌐 기본(CartoDB)": carto },
        {},
        { position: "topright", collapsed: false },
      )
      .addTo(map);

    mapRef.current = map;

    const cluster = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
    });
    cluster.addTo(map);
    clusterRef.current = cluster;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 지도 bounds 추적 — ResizeObserver로 컨테이너 크기까지 추적
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const container = m.getContainer();
    const update = () => {
      const b = m.getBounds();
      const south = b.getSouth();
      const north = b.getNorth();
      const west = b.getWest();
      const east = b.getEast();
      // 컨테이너 크기 0 이거나 bounds가 점에 수렴하면 무효 — viewport 무시
      if (Math.abs(north - south) < 1e-4 || Math.abs(east - west) < 1e-4) {
        setMapBounds(null);
        return;
      }
      setMapBounds({ south, west, north, east });
    };
    m.on("moveend", update);
    m.on("zoomend", update);
    m.on("load", update);

    const ro = new ResizeObserver(() => {
      m.invalidateSize();
      update();
    });
    ro.observe(container);

    // 초기 보정 (next tick + 짧은 딜레이)
    requestAnimationFrame(() => {
      m.invalidateSize();
      update();
    });
    const t = setTimeout(() => {
      m.invalidateSize();
      update();
    }, 500);

    return () => {
      m.off("moveend", update);
      m.off("zoomend", update);
      m.off("load", update);
      ro.disconnect();
      clearTimeout(t);
    };
  }, [setMapBounds]);

  // update markers when filtered changes
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    markersRef.current.clear();

    const newMarkers: L.Marker[] = [];
    for (const r of filtered) {
      const marker = L.marker([r.lat, r.lng], {
        icon: svgPinIcon(CATEGORY_COLORS[r.categoryGroup]),
        title: r.name,
      });
      (marker as any)._cat = r.categoryGroup;
      marker.on("click", () => {
        setSelectedId(r.id);
        mapRef.current?.panTo([r.lat, r.lng]);
      });
      markersRef.current.set(r.id, marker);
      newMarkers.push(marker);
    }
    cluster.addLayers(newMarkers);
  }, [filtered, setSelectedId]);

  // pan to selection + 강조
  useEffect(() => {
    if (!mapRef.current) return;
    // 모든 마커 기본 사이즈로
    markersRef.current.forEach((m, id) => {
      const cat = (m as any)._cat as string | undefined;
      const color = cat ? CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] : "#6b7280";
      m.setIcon(svgPinIcon(color, id === selectedId));
      if (id === selectedId) m.setZIndexOffset(500);
      else m.setZIndexOffset(0);
    });
    if (selectedId) {
      const m = markersRef.current.get(selectedId);
      if (m) mapRef.current.panTo(m.getLatLng());
    }
  }, [selectedId]);

  // user location marker
  useEffect(() => {
    if (!mapRef.current) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userLocation) {
      const m = L.marker([userLocation.lat, userLocation.lng], {
        icon: userDotIcon(),
        zIndexOffset: 1000,
      });
      m.addTo(mapRef.current);
      userMarkerRef.current = m;
      // 위치만 옮기지 말고 동네 디테일이 보이는 줌으로 (도로명/건물 outline 보임)
      mapRef.current.setView([userLocation.lat, userLocation.lng], 17);
    }
  }, [userLocation]);

  const requestUserLocation = useAppStore((s) => s.requestUserLocation);
  const clearUserLocation = useAppStore((s) => s.clearUserLocation);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      <button
        type="button"
        onClick={() => (userLocation ? clearUserLocation() : requestUserLocation())}
        title={userLocation ? "내 위치 끄기" : "현재 위치로 이동"}
        aria-label="현재 위치"
        className={`absolute bottom-6 right-6 z-[400] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          userLocation
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "bg-white text-gray-700 hover:bg-gray-50 border"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        </svg>
      </button>
    </div>
  );
}
