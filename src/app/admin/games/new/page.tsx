import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { GameForm } from "@/features/games/game-form";
import s from "@/features/games/site.module.css";

export const metadata = {
  title: "录入桌游",
  robots: { index: false, follow: false },
};
export default async function NewGame() {
  await requireAdmin(true);
  return (
    <div className={s.edit}>
      <Link href="/admin/games" className={s.back}>
        ← 返回收藏管理
      </Link>
      <div className={s.eyebrow}>A NEW STORY ON THE SHELF</div>
      <h1>给新收藏一个位置</h1>
      <GameForm />
    </div>
  );
}
