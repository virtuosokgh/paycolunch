import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "성남 점심 지도 — PAYCO 가맹점",
  description: "성남시 PAYCO 식권 가맹점 1,100여 곳을 지도에서 찾아보세요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
