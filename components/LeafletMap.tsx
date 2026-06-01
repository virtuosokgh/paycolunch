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

function svgPinIcon(color: string): L.DivIcon {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='28' height='36' viewBox='0 0 28 36'><path d='M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z' fill='${color}' stroke='white' stroke-width='2'/><circle cx='14' cy='14' r='5' fill='white'/></svg>`;
  return L.divIcon({
    html: svg,
    className: "pin-marker",
    iconSize: [28, 36],
    iconAnchor: [14, 36],
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

  // init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: SEONGNAM_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
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
      marker.on("click", () => {
        setSelectedId(r.id);
        mapRef.current?.panTo([r.lat, r.lng]);
      });
      markersRef.current.set(r.id, marker);
      newMarkers.push(marker);
    }
    cluster.addLayers(newMarkers);
  }, [filtered, setSelectedId]);

  // pan to selection
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const m = markersRef.current.get(selectedId);
    if (m) {
      const pos = m.getLatLng();
      mapRef.current.panTo(pos);
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
      mapRef.current.panTo([userLocation.lat, userLocation.lng]);
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
