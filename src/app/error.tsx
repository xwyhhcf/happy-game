"use client";
import Link from "next/link";
import s from "@/features/games/site.module.css";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className={s.empty}>
      <h1>小馆暂时打了个盹</h1>
      <p>暂时无法加载内容，请重试；如果仍然失败，稍后再来看看。</p>
      <div className={s.actions}>
        <button className={s.primary} onClick={reset}>
          重新加载
        </button>
        <Link href="/" className={s.secondary}>
          回到首页
        </Link>
      </div>
    </div>
  );
}
