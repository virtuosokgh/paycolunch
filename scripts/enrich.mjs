import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { parse } from "csv-parse/sync";
import pLimit from "p-limit";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
  console.error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET missing in .env.local");
  process.exit(1);
}

const INPUT_CSV = resolve(process.cwd(), "data/raw/seongnam_payco.csv");
const OUTPUT_JSON = resolve(process.cwd(), "public/data/restaurants.json");
const CACHE_PATH = resolve(process.cwd(), "data/cache/enrich-cache.json");

function classifyCategory(rawCategory, restaurantName) {
  const text = `${rawCategory ?? ""} ${restaurantName}`.toLowerCase();
  const has = (...keys) => keys.some((k) => text.includes(k.toLowerCase()));

  if (has("편의점", "cu", "gs25", "세븐일레븐", "이마트24", "미니스톱")) return "편의점";
  if (has("베이커리", "제과", "빵", "뚜레쥬르", "파리바게뜨", "파리바게트", "bakery")) return "베이커리";
  if (has("카페", "커피", "디저트", "cafe", "coffee", "스타벅스", "이디야", "투썸", "할리스", "메가커피", "컴포즈", "빽다방", "공차", "아이스크림", "베스킨", "요거트"))
    return "카페·디저트";
  if (has("패스트푸드", "버거", "맥도날드", "버거킹", "롯데리아", "맘스터치", "kfc", "써브웨이", "subway", "치킨", "bbq", "교촌", "굽네", "처갓집", "bhc"))
    return "패스트푸드";
  if (has("술집", "호프", "포차", "주점", "이자카야", "bar", "와인")) return "술집";
  if (has("일식", "스시", "초밥", "라멘", "라면", "돈까스", "돈가스", "우동", "소바", "규동", "텐동", "오마카세", "japanese", "sushi", "ramen")) return "일식";
  if (has("중식", "짜장", "짬뽕", "마라", "탕수", "양꼬치", "차이나", "중국", "chinese")) return "중식";
  if (has("양식", "파스타", "피자", "스테이크", "이탈리", "italian", "burger", "샐러드", "salad", "멕시", "mexican", "타코")) return "양식";
  if (has("분식", "떡볶이", "김밥", "튀김", "어묵", "순대", "토스트")) return "분식";
  if (has("한식", "국밥", "곰탕", "설렁탕", "삼계탕", "찌개", "백반", "비빔밥", "냉면", "쌈밥", "구이", "갈비", "삼겹", "한정식", "보쌈", "족발", "korean")) return "한식";
  return "기타";
}

function stripHtml(s) {
  return (s ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function loadCsv(path) {
  const text = readFileSync(path, "utf-8");
  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
    relax_column_count: true,
  });
  return rows
    .map((r) => ({
      name: (r["가맹점명"] ?? "").trim(),
      rawAddress: (r["주소"] ?? "").trim(),
    }))
    .filter((r) => r.name && r.rawAddress);
}

function parseAddress(raw) {
  const zipMatch = raw.match(/^(\d{5})\)\s*/);
  const zipcode = zipMatch ? zipMatch[1] : null;
  const withoutZip = zipMatch ? raw.slice(zipMatch[0].length) : raw;
  const guMatch = withoutZip.match(/(분당구|수정구|중원구)/);
  const gu = guMatch ? guMatch[1] : "";
  const dongMatch = withoutZip.match(/\(([가-힣]+동)/);
  const dong = dongMatch ? dongMatch[1] : "";
  const beforeParen = withoutZip.split("(")[0].trim();
  return { zipcode, address: beforeParen || withoutZip, gu, dong };
}

function keyOf(name, rawAddress) {
  return `${name}__${rawAddress}`;
}

function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  mkdirSync(dirname(CACHE_PATH), { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function naverFetch(url, attempt = 0) {
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": NAVER_CLIENT_ID,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
    },
  });
  if (res.status === 429) {
    if (attempt >= 5) {
      throw new Error(`Naver API 429 after ${attempt} retries`);
    }
    const backoff = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s, 16s
    await sleep(backoff);
    return naverFetch(url, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Naver API ${res.status}: ${body}`);
  }
  return res.json();
}

function similarity(a, b) {
  const aa = (a ?? "").replace(/\s+/g, "");
  const bb = (b ?? "").replace(/\s+/g, "");
  if (!aa || !bb) return 0;
  let m = 0;
  const set = new Set(aa.split(""));
  for (const c of bb) if (set.has(c)) m++;
  return m / Math.max(aa.length, bb.length);
}

// "한촌설렁탕(판교테크노밸리점)" → "한촌설렁탕"
// "1992덮밥&짜글이(판교파미어스몰점)_KIOSK" → "1992덮밥&짜글이"
function cleanName(name) {
  return name
    .replace(/\([^)]*\)/g, "")
    .replace(/_KIOSK/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "경기도 성남시 분당구 대왕판교로606번길 41 지하 1층" → "경기도 성남시 분당구 대왕판교로606번길 41"
function roadAddressCore(rawAddress) {
  const { address } = parseAddress(rawAddress);
  const m = address.match(/^(.*?(?:번길|길|로|대로)\s*\d+(?:-\d+)?)/);
  return m ? m[1] : address;
}

function nameSimilarEnough(targetName, candidateTitle) {
  const a = (targetName ?? "").replace(/\s+/g, "").toLowerCase();
  const b = stripHtml(candidateTitle ?? "").replace(/\s+/g, "").toLowerCase();
  if (!a || !b) return false;
  if (b.includes(a) || a.includes(b)) return true;
  return similarity(a, b) >= 0.5;
}

function pickBestItem(name, dong, items) {
  if (items.length === 0) return null;
  let best = null;
  for (const it of items) {
    const title = stripHtml(it.title);
    let score = 0;
    if (dong && (it.address?.includes(dong) || it.roadAddress?.includes(dong))) score += 3;
    score += similarity(name, title) * 2;
    if (!best || score > best.score) best = { item: it, score };
  }
  return best ? best.item : items[0];
}

// 네이버 mapx/mapy → WGS84 lat/lng
// 2024-12-04 이후 WGS84 경위도 × 10^7
function naverCoordsToLatLng(mapx, mapy) {
  const x = Number(mapx);
  const y = Number(mapy);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  // 두 가지 포맷 모두 처리 가능하도록: 값이 1e6보다 크면 ×10^7로 가정
  const lng = x > 1e6 ? x / 1e7 : x;
  const lat = y > 1e6 ? y / 1e7 : y;
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return null;
  return { lat, lng };
}

async function searchNaver(query) {
  const q = encodeURIComponent(query);
  const url = `https://openapi.naver.com/v1/search/local.json?query=${q}&display=5&sort=random`;
  const resp = await naverFetch(url);
  return resp.items ?? [];
}

function buildResult(name, rawAddress, picked, matchedBy) {
  const { zipcode, address, gu, dong } = parseAddress(rawAddress);
  const coords = naverCoordsToLatLng(picked.mapx, picked.mapy);
  if (!coords) return null;
  const cat = stripHtml(picked.category) || null;
  const placeName = stripHtml(picked.title) || name;
  const roadOrAddr = picked.roadAddress || picked.address || address;
  // 가게명만으로 검색 (주소까지 붙이면 네이버 지도 검색이 안 됨)
  const placeUrl = `https://map.naver.com/p/search/${encodeURIComponent(name)}`;
  return {
    result: {
      id: `${name}-${zipcode ?? "x"}-${dong}-${rawAddress.slice(-10)}`.replace(/\s+/g, ""),
      name,
      address: roadOrAddr,
      zipcode,
      gu,
      dong,
      lat: coords.lat,
      lng: coords.lng,
      category: cat,
      categoryGroup: classifyCategory(cat, name),
      phone: picked.telephone || null,
      placeUrl,
      externalLink: picked.link || null,
    },
    matchedBy,
  };
}

async function enrichRow(row) {
  const { name, rawAddress } = row;
  const { address, gu, dong } = parseAddress(rawAddress);
  const cleaned = cleanName(name);
  const roadCore = roadAddressCore(rawAddress);

  // Pass 1: name + dong (현재)
  try {
    const items = await searchNaver(`${name} ${dong || gu || "성남"}`);
    const picked = pickBestItem(name, dong, items);
    if (picked) {
      const r = buildResult(name, rawAddress, picked, "naver");
      if (r) return r;
    }
  } catch (e) {
    console.warn(`pass1 fail "${name}": ${e.message}`);
  }

  // Pass 2: cleanedName + road address core
  if (cleaned && roadCore) {
    try {
      const items = await searchNaver(`${cleaned} ${roadCore}`);
      const picked = pickBestItem(cleaned, dong, items);
      if (picked && nameSimilarEnough(cleaned, picked.title)) {
        const r = buildResult(name, rawAddress, picked, "naver-cleaned");
        if (r) return r;
      }
    } catch (e) {
      console.warn(`pass2 fail "${name}": ${e.message}`);
    }
  }

  // Pass 3: road address only (find item whose title resembles the name)
  if (roadCore) {
    try {
      const items = await searchNaver(roadCore);
      // 주소만으로 검색하면 같은 건물의 여러 업체가 나옴 → 이름 유사도로 강하게 거름
      const candidate = items.find((it) =>
        nameSimilarEnough(cleaned || name, it.title),
      );
      if (candidate) {
        const r = buildResult(name, rawAddress, candidate, "naver-addr");
        if (r) return r;
      }
    } catch (e) {
      console.warn(`pass3 fail "${name}": ${e.message}`);
    }
  }

  return { result: null, matchedBy: "none" };
}

async function main() {
  const rows = loadCsv(INPUT_CSV);
  console.log(`Loaded ${rows.length} rows from CSV`);

  const cache = loadCache();
  // 매칭 안 된 항목(result null)은 재시도; 카카오로 받은 옛 캐시도 무효화
  for (const k of Object.keys(cache)) {
    const e = cache[k];
    if (!e.result) delete cache[k];
    else if (!String(e.matchedBy).startsWith("naver")) delete cache[k];
  }

  const limit = pLimit(2);
  let done = 0;
  let ok = 0,
    none = 0;
  const cacheHits = Object.keys(cache).length;

  const results = await Promise.all(
    rows.map((row) =>
      limit(async () => {
        const k = keyOf(row.name, row.rawAddress);
        if (cache[k]) {
          const e = cache[k];
          if (e.result) ok++;
          else none++;
          done++;
          if (done % 100 === 0) console.log(`  cached ${done}/${rows.length}`);
          return e;
        }
        const entry = await enrichRow(row);
        cache[k] = entry;
        await sleep(120); // gentle pacing
        if (entry.result) ok++;
        else none++;
        done++;
        if (done % 25 === 0) {
          console.log(`  ${done}/${rows.length}  ok=${ok} none=${none}`);
          saveCache(cache);
        }
        return entry;
      }),
    ),
  );

  saveCache(cache);

  const restaurants = results.map((r) => r.result).filter((r) => r !== null);

  const seen = new Set();
  const unique = [];
  for (const r of restaurants) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    unique.push(r);
  }

  mkdirSync(dirname(OUTPUT_JSON), { recursive: true });
  writeFileSync(OUTPUT_JSON, JSON.stringify(unique, null, 2), "utf-8");

  console.log("");
  console.log("=== Enrichment Summary ===");
  console.log(`  total rows:       ${rows.length}`);
  console.log(`  cache hits:       ${cacheHits}`);
  console.log(`  matched (naver):  ${ok}`);
  console.log(`  unmatched:        ${none}`);
  console.log(`  unique output:    ${unique.length}`);
  console.log(`  written to:       ${OUTPUT_JSON}`);
  console.log(`  match rate:       ${((ok / rows.length) * 100).toFixed(1)}%`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
