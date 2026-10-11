import Link from "next/link";
import { InputError, parseQuery } from "./model";
import { listGames } from "@/lib/games";
import { Collection } from "./collection";
import s from "./site.module.css";

export type SearchProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function CollectionPage({
  searchParams,
  mode,
}: SearchProps & { mode: "gallery" | "list" | "pick" }) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const name of ["q", "players"]) {
    if (typeof raw[name] === "string") params.set(name, raw[name]);
  }
  let query;
  try {
    query = parseQuery(params);
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    return (
      <div className={s.empty}>
        <h1>筛选条件需要调整</h1>
        <p role="alert">{error.message}</p>
        <Link className={s.primary} href={mode === "pick" ? "/pick" : "/games"}>
          重新选择
        </Link>
      </div>
    );
  }
  const data = listGames(query);
  const pick = mode === "pick";
  return (
    <>
      <div className={s.intro}>
        <section className={s.hero}>
          <div className={s.eyebrow}>
            {pick
              ? "A GAME FOR EVERY GATHERING"
              : "A LITTLE CABINET OF GOOD TIMES"}
          </div>
          <h1>
            {pick ? (
              "人刚刚好，游戏也刚刚好。"
            ) : mode === "list" ? (
              "每一款，都有它的故事。"
            ) : (
              <>
                把好时光，
                <br />
                收藏在这一桌。
              </>
            )}
          </h1>
          <p>
            {pick
              ? "从已有收藏中，找到适合今天人数的那一款。"
              : "欣赏桌游里的世界，期待下一次围桌而坐。"}
          </p>
        </section>
        {mode !== "pick" && (
          <Link href="/pick" className={s.pickLink}>
            <span>♧　几个人玩？</span>
            <span aria-hidden="true">↗</span>
          </Link>
        )}
      </div>
      <Collection
        key={`${mode}:${query.q}:${query.players}`}
        initial={data}
        query={query}
        mode={mode}
      />
    </>
  );
}
