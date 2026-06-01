import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface NaverImageItem {
  title: string;
  link: string;
  thumbnail: string;
  sizeheight: string;
  sizewidth: string;
}

interface NaverBlogItem {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  bloggerlink: string;
  postdate: string;
}

function stripHtml(s: string): string {
  return (s ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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

  // 가게명에서 괄호(지점명) 제거 — 검색 노이즈 줄임
  const cleanName = name.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  // 지역 키워드 1~2개만 추출 (구·동) → 시는 빼서 더 유연하게
  const locationHint = address
    .split(/\s+/)
    .filter((t) => /(구|동)$/.test(t))
    .slice(0, 2)
    .join(" ");
  const query = encodeURIComponent(`${cleanName} ${locationHint}`.trim());

  const headers = {
    "X-Naver-Client-Id": clientId,
    "X-Naver-Client-Secret": clientSecret,
  };

  // 메뉴 검색: 가게명 + "메뉴판"만 (지역 hint 빼면 결과가 더 많음)
  // 메뉴 키워드 여러 개 시도 — 가게마다 검색되는 키워드가 달라서
  const menuQueries = [
    `${cleanName} 메뉴`,
    `${cleanName} 메뉴판`,
    `${cleanName} 가격`,
  ];

  const [m1, m2, m3, imageRes, blogRes] = await Promise.allSettled([
    fetch(`https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(menuQueries[0])}&display=10&filter=large&sort=sim`, { headers }),
    fetch(`https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(menuQueries[1])}&display=8&filter=large&sort=sim`, { headers }),
    fetch(`https://openapi.naver.com/v1/search/image?query=${encodeURIComponent(menuQueries[2])}&display=6&filter=large&sort=sim`, { headers }),
    fetch(`https://openapi.naver.com/v1/search/image?query=${query}&display=12&filter=large&sort=sim`, { headers }),
    fetch(`https://openapi.naver.com/v1/search/blog.json?query=${query}&display=5&sort=sim`, { headers }),
  ]);

  const toImages = (res: PromiseSettledResult<Response>) =>
    res.status === "fulfilled" && res.value.ok
      ? res.value.json().then((json) =>
          ((json.items ?? []) as NaverImageItem[]).map((it) => ({
            title: stripHtml(it.title),
            link: it.link,
            thumbnail: it.thumbnail,
          })),
        )
      : Promise.resolve([] as Array<{ title: string; link: string; thumbnail: string }>);

  const [menu1, menu2, menu3, allImages] = await Promise.all([
    toImages(m1),
    toImages(m2),
    toImages(m3),
    toImages(imageRes),
  ]);

  // 메뉴 결과 합치기 + 중복 제거 (thumbnail URL 기준)
  const seen = new Set<string>();
  const dedupe = (arr: Array<{ title: string; link: string; thumbnail: string }>) =>
    arr.filter((it) => {
      if (seen.has(it.thumbnail)) return false;
      seen.add(it.thumbnail);
      return true;
    });

  let menuImages = dedupe([...menu1, ...menu2, ...menu3]);
  // 메뉴 결과가 부족하면 일반 이미지에서 채워서 최소 8개 보장
  if (menuImages.length < 8) {
    menuImages = [...menuImages, ...dedupe(allImages)].slice(0, 12);
  }
  const images = allImages.filter((it) => !menuImages.some((m) => m.thumbnail === it.thumbnail));

  let blogs: Array<{ title: string; link: string; description: string; bloggername: string; postdate: string }> = [];
  if (blogRes.status === "fulfilled" && blogRes.value.ok) {
    const json = await blogRes.value.json();
    blogs = ((json.items ?? []) as NaverBlogItem[]).map((it) => ({
      title: stripHtml(it.title),
      link: it.link,
      description: stripHtml(it.description),
      bloggername: it.bloggername,
      postdate: it.postdate,
    }));
  }

  return NextResponse.json(
    { menuImages, images, blogs },
    { headers: { "Cache-Control": "no-store" } },
  );
}
