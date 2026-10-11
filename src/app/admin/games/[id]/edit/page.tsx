import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getGame } from "@/lib/games";
import { GameForm } from "@/features/games/game-form";
import s from "@/features/games/site.module.css";

export const metadata = {
  title: "编辑桌游",
  robots: { index: false, follow: false },
};
export default async function EditGame({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin(true);
  const game = getGame((await params).id);
  if (!game) notFound();
  return (
    <div className={s.edit}>
      <Link href="/admin/games" className={s.back}>
        ← 返回收藏管理
      </Link>
      <div className={s.eyebrow}>CURATE THE DETAILS</div>
      <h1>完善这款收藏</h1>
      <GameForm game={game} />
    </div>
  );
}
