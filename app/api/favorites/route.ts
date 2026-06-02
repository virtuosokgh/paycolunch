import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Upstash Redis 환경변수가 있으면 영구 저장, 없으면 메모리 fallback
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const KV_KEY_FAVORITED = "paycolunch:favorited"; // 글로벌 즐겨찾기 식당 ID 목록
const KV_KEY_COUNTS = "paycolunch:fav-counts"; // 각 식당의 누적 즐겨찾기 누른 횟수

// 메모리 fallback (서버리스 함수 인스턴스마다 따로, 재시작 시 리셋)
const memoryStore: {
  favorited: Set<string>;
  counts: Record<string, number>;
} = { favorited: new Set(), counts: {} };

async function readState() {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const [favRes, countRes] = await Promise.all([
        fetch(`${UPSTASH_URL}/get/${KV_KEY_FAVORITED}`, {
          headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
          cache: "no-store",
        }),
        fetch(`${UPSTASH_URL}/get/${KV_KEY_COUNTS}`, {
          headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
          cache: "no-store",
        }),
      ]);
      const fJ = await favRes.json();
      const cJ = await countRes.json();
      const favArr = fJ.result ? (JSON.parse(fJ.result) as string[]) : [];
      const counts = cJ.result
        ? (JSON.parse(cJ.result) as Record<string, number>)
        : {};
      return { favorited: new Set(favArr), counts };
    } catch {
      return memoryStore;
    }
  }
  return memoryStore;
}

async function writeState(
  favorited: Set<string>,
  counts: Record<string, number>,
) {
  memoryStore.favorited = favorited;
  memoryStore.counts = counts;
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await Promise.all([
        fetch(`${UPSTASH_URL}/set/${KV_KEY_FAVORITED}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([...favorited]),
        }),
        fetch(`${UPSTASH_URL}/set/${KV_KEY_COUNTS}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(counts),
        }),
      ]);
    } catch {
      // 무시
    }
  }
}

export async function GET() {
  const s = await readState();
  return NextResponse.json(
    { favorited: [...s.favorited], counts: s.counts },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  let action: "add" | "remove" = "add";
  try {
    const body = await req.json();
    if (body?.action === "remove") action = "remove";
  } catch {
    // body 없으면 기본 add
  }

  const s = await readState();
  if (action === "add") {
    s.favorited.add(id);
    // counts는 누적 통계 — remove에선 줄이지 않음
    s.counts[id] = (s.counts[id] ?? 0) + 1;
  } else {
    s.favorited.delete(id);
  }
  await writeState(s.favorited, s.counts);

  return NextResponse.json({
    favorited: [...s.favorited],
    counts: s.counts,
  });
}
