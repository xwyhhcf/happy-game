import Link from "next/link";
import s from "@/features/games/site.module.css";
export default function NotFound() {
  return (
    <div className={s.empty}>
      <div className={s.eyebrow}>404 · NOT FOUND</div>
      <h1>这一页暂时不在收藏里</h1>
      <p>链接可能已失效，或这款桌游已经移出了收藏。</p>
      <Link href="/" className={s.primary}>
        回到画廊
      </Link>
    </div>
  );
}
