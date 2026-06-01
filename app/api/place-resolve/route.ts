import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface NaverLocalItem {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

function stripHtml(s: string): string {
  return (s ?? "").replace(/<[^>]+>/g, "");
}

function similarity(a: string, b: string): number {
  const aa = (a ?? "").replace(/\s+/g, "");
  const bb = (b ?? "").replace(/\s+/g, "");
  if (!aa || !bb) return 0;
  let m = 0;
  const set = new Set(aa.split(""));
  for (const c of bb) if (set.has(c)) m++;
  return m / Math.max(aa.length, bb.length);
}

function coordsToLatLng(mapx: string, mapy: string) {
  const x = Number(mapx);
  const y = Number(mapy);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const lng = x > 1e6 ? x / 1e7 : x;
  const lat = y > 1e6 ? y / 1e7 : y;
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return null;
  return { lat, lng };
}

function makePlaceUrl(item: NaverLocalItem, fallbackName: string): string {
  const coords = coordsToLatLng(item.mapx, item.mapy);
  const title = stripHtml(item.title) || fallbackName;
  // 좌표 hint + 메뉴 탭 path → 네이버 지도가 해당 가게의 메뉴 탭을 우선 띄움
  const path = `placePath=${encodeURIComponent("/menu")}`;
  if (coords) {
    return `https://map.naver.com/p/search/${encodeURIComponent(title)}?c=15.00,${coords.lng},${coords.lat},0,0,0,dh&${path}`;
  }
  return `https://map.naver.com/p/search/${encodeURIComponent(title)}?${path}`;
}

async function naverLocalSearch(query: string, clientId: string, clientSecret: string): Promise<NaverLocalItem[]> {
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.items ?? []) as NaverLocalItem[];
}

function bestByAddress(items: NaverLocalItem[], targetAddress: string): NaverLocalItem | null {
  if (items.length === 0) return null;
  let best: { item: NaverLocalItem; score: number } | null = null;
  for (const it of items) {
    const addr = it.roadAddress || it.address || "";
    const score = similarity(targetAddress, addr);
    if (!best || score > best.score) best = { item: it, score };
  }
  return best ? best.item : items[0];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const address = searchParams.get("address") ?? "";
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Naver creds missing" }, { status: 500 });
  }

  // 도(시·구·동) 키워드 추출 — 주소 더블체크 시 사용
  const locTokens = address.split(/\s+/).filter((t) => /(시|구|동)$/.test(t));
  const dong = locTokens.find((t) => t.endsWith("동")) ?? "";

  const fallbackUrl = `https://map.naver.com/p/search/${encodeURIComponent(name)}`;

  try {
    // 1차: 가게명만으로
    const items1 = await naverLocalSearch(name, clientId, clientSecret);
    if (items1.length === 0) {
      return NextResponse.json({ url: fallbackUrl, source: "fallback-no-results" });
    }
    if (items1.length === 1) {
      return NextResponse.json({ url: makePlaceUrl(items1[0], name), source: "single-result" });
    }

    // 2차: 가게명 + 동(주소)으로 더블체크
    const refineQuery = dong ? `${name} ${dong}` : `${name} ${address}`;
    const items2 = await naverLocalSearch(refineQuery, clientId, clientSecret);
    const candidates = items2.length > 0 ? items2 : items1;
    const best = bestByAddress(candidates, address);
    if (best) {
      return NextResponse.json({ url: makePlaceUrl(best, name), source: "address-disambiguated" });
    }
    return NextResponse.json({ url: makePlaceUrl(items1[0], name), source: "first-of-many" });
  } catch (e) {
    return NextResponse.json({ url: fallbackUrl, source: "error", error: String(e) });
  }
}
