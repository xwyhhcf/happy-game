import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Navigation } from "@/features/games/navigation";
import s from "@/features/games/site.module.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "桌游小馆 · happy game", template: "%s · 桌游小馆" },
  description:
    "一座小小的桌游收藏馆。欣赏桌游，发现故事，找到适合今天人数的那一款。",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f6f1",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <a href="#main" className={s.skip}>
          跳到主要内容
        </a>
        <div className={s.shell}>
          <header className={s.header}>
            <Link href="/" className={s.brand} aria-label="桌游小馆首页">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
              >
                <rect width="40" height="40" rx="11" fill="#244e3d" />
                <rect
                  x="10"
                  y="10"
                  width="20"
                  height="20"
                  rx="4"
                  stroke="#f6f1da"
                  strokeWidth="1.3"
                  transform="rotate(-8 20 20)"
                />
                <circle cx="15" cy="15" r="1.8" fill="#f6f1da" />
                <circle cx="25" cy="25" r="1.8" fill="#f6f1da" />
                <circle cx="20" cy="20" r="1.8" fill="#f6f1da" />
              </svg>
              <span>
                <strong>桌游小馆</strong>
                <small>HAPPY GAME COLLECTION</small>
              </span>
            </Link>
            <Navigation />
          </header>
          <main id="main" className={s.main}>
            {children}
          </main>
          <footer className={s.footer}>
            <span>收藏好游戏，也收藏相聚的时光。</span>
            <Link href="/admin/games">收藏管理 ↗</Link>
          </footer>
        </div>
        <Navigation mobile />
      </body>
    </html>
  );
}
