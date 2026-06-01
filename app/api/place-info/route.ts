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
  const menuQuery = encodeURIComponent(`${cleanName} 메뉴판`.trim());

  const [menuRes, imageRes, blogRes] = await Promise.allSettled([
    fetch(`https://openapi.naver.com/v1/search/image?query=${menuQuery}&display=8&filter=large&sort=sim`, { headers }),
    fetch(`https://openapi.naver.com/v1/search/image?query=${query}&display=9&filter=large&sort=sim`, { headers }),
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

  const [menuImages, images] = await Promise.all([toImages(menuRes), toImages(imageRes)]);

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
