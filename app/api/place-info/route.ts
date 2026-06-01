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

  // 지역 키워드 1~2개만 추출 (시·구·동) → 노이즈 줄임
  const locationHint = address
    .split(/\s+/)
    .filter((t) => /(시|구|동)$/.test(t))
    .slice(0, 2)
    .join(" ");
  const query = encodeURIComponent(`${name} ${locationHint}`.trim());

  const headers = {
    "X-Naver-Client-Id": clientId,
    "X-Naver-Client-Secret": clientSecret,
  };

  const [imageRes, blogRes] = await Promise.allSettled([
    fetch(`https://openapi.naver.com/v1/search/image?query=${query}&display=12&filter=large&sort=sim`, { headers }),
    fetch(`https://openapi.naver.com/v1/search/blog.json?query=${query}&display=5&sort=sim`, { headers }),
  ]);

  let images: Array<{ title: string; link: string; thumbnail: string }> = [];
  let blogs: Array<{ title: string; link: string; description: string; bloggername: string; postdate: string }> = [];

  if (imageRes.status === "fulfilled" && imageRes.value.ok) {
    const json = await imageRes.value.json();
    images = ((json.items ?? []) as NaverImageItem[]).map((it) => ({
      title: stripHtml(it.title),
      link: it.link,
      thumbnail: it.thumbnail,
    }));
  }

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
    { images, blogs },
    { headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
