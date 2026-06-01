import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Upstash Redis 환경변수가 있으면 영구 저장, 없으면 메모리 (서버 재시작 시 사라짐)
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const KV_KEY = "paycolunch:fav-counts";

// 메모리 fallback (Vercel 함수가 죽지 않는 한 유지)
const memoryStore: { counts: Record<string, number> } = { counts: {} };

async function readCounts(): Promise<Record<string, number>> {
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const r = await fetch(`${UPSTASH_URL}/get/${KV_KEY}`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (j.result) {
        return JSON.parse(j.result) as Record<string, number>;
      }
      return {};
    } catch {
      return memoryStore.counts;
    }
  }
  return memoryStore.counts;
}

async function writeCounts(counts: Record<string, number>) {
  memoryStore.counts = counts;
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await fetch(`${UPSTASH_URL}/set/${KV_KEY}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(counts),
      });
    } catch {
      // 무시
    }
  }
}

export async function GET() {
  const counts = await readCounts();
  return NextResponse.json(
    { counts },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  let action: "add" | "remove" = "add";
  try {
    const body = await req.json();
    if (body?.action === "remove") action = "remove";
  } catch {
    // body 없으면 add 기본
  }

  const counts = await readCounts();
  const cur = counts[id] ?? 0;
  if (action === "add") counts[id] = cur + 1;
  else counts[id] = Math.max(0, cur - 1);
  if (counts[id] === 0) delete counts[id];

  await writeCounts(counts);
  return NextResponse.json({ counts });
}
