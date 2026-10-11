import Link from "next/link";
import Form from "next/form";
import { requireAdmin } from "@/lib/auth";
import { listGames } from "@/lib/games";
import { DeleteButton, LogoutButton } from "@/features/games/admin-actions";
import { parseQuery } from "@/features/games/model";
import s from "@/features/games/site.module.css";

export const metadata = {
  title: "收藏管理",
  robots: { index: false, follow: false },
};
export default async function AdminGames({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; saved?: string }>;
}) {
  await requireAdmin(true);
  const search = await searchParams;
  let query;
  try {
    query = parseQuery(
      new URLSearchParams({ q: search.q || "", page: search.page || "1" }),
    );
  } catch {
    query = { q: "", page: 1 };
  }
  const data = listGames(query);
  return (
    <>
      <div className={s.adminHeading}>
        <div>
          <div className={s.eyebrow}>CURATE YOUR COLLECTION</div>
          <h1>我的收藏管理</h1>
          <p>共 {data.total} 款桌游，让每款收藏都有自己的位置。</p>
        </div>
        <div className={s.actions}>
          <Link className={s.primary} href="/admin/games/new">
            ＋ 录入桌游
          </Link>
          <LogoutButton />
        </div>
      </div>
      {search.saved && (
        <p className={s.notice} role="status">
          已保存，朋友现在就能看到这款桌游。
        </p>
      )}
      <Form action="/admin/games" className={s.filters}>
        <div className={s.search}>
          <label htmlFor="admin-q">查找收藏</label>
          <input
            id="admin-q"
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder="输入桌游名称…"
            maxLength={100}
          />
        </div>
        <button type="submit">查找</button>
      </Form>
      {data.items.map((game) => (
        <article className={s.adminCard} key={game.id}>
          <img
            src={`/media/${game.coverKey.replace(".webp", "-thumb.webp")}`}
            alt=""
            loading="lazy"
          />
          <div className={s.adminInfo}>
            <h2>{game.name}</h2>
            <div className={s.meta}>
              {game.minPlayers}–{game.maxPlayers} 人 · {game.durationMinutes}{" "}
              分钟
            </div>
          </div>
          <div className={s.actions}>
            <Link className={s.secondary} href={`/games/${game.id}`}>
              查看
            </Link>
            <Link className={s.secondary} href={`/admin/games/${game.id}/edit`}>
              编辑
            </Link>
            <DeleteButton id={game.id} name={game.name} />
          </div>
        </article>
      ))}
      {!data.items.length && (
        <div className={s.empty}>
          <h2>{query.q ? "没有找到这款收藏" : "从第一款桌游开始"}</h2>
          <p>
            {query.q
              ? "换个名称再试试。"
              : "上传封面，写下简介，把你喜欢的游戏介绍给朋友。"}
          </p>
          <Link className={s.primary} href="/admin/games/new">
            录入桌游
          </Link>
        </div>
      )}
      <div className={s.actions} style={{ marginTop: 24 }}>
        {query.page > 1 && (
          <Link
            className={s.secondary}
            href={`/admin/games?q=${encodeURIComponent(query.q)}&page=${query.page - 1}`}
          >
            ← 上一页
          </Link>
        )}
        {query.page * 24 < data.total && (
          <Link
            className={s.secondary}
            href={`/admin/games?q=${encodeURIComponent(query.q)}&page=${query.page + 1}`}
          >
            下一页 →
          </Link>
        )}
      </div>
    </>
  );
}
