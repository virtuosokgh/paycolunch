import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AXZ음식점 찾기",
  description: "AXZ 직원이 사용할 수 있는 PAYCO 식권 가맹점을 지도에서 찾아보세요",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
