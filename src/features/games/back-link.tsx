"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import s from "./site.module.css";

export function BackLink({ href }: { href: string }) {
  const router = useRouter();
  return (
    <Link
      className={s.back}
      href={href}
      onClick={(event) => {
        if (
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          window.history.length > 1 &&
          document.referrer.startsWith(window.location.origin)
        ) {
          event.preventDefault();
          router.back();
        }
      }}
    >
      ← 返回收藏
    </Link>
  );
}
