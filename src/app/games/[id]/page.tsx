import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getGame } from "@/lib/games";
import { Cover } from "@/features/games/cover";
import { BackLink } from "@/features/games/back-link";
import s from "@/features/games/site.module.css";

export const dynamic = "force-dynamic";

export default async function GameDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const game = getGame((await params).id);
  if (!game) notFound();
  const { from } = await searchParams;
  const returnTo =
    from && /^(?:\/(?:games|pick)?)(?:\?[^#]*)?$/.test(from) ? from : "/";
  return (
    <>
      <BackLink href={returnTo} />
      <article>
        <div className={s.detail}>
          <div className={s.detailArt}>
            <Cover coverKey={game.coverKey} name={game.name} large eager />
          </div>
          <div>
            <div className={s.eyebrow}>FROM THE COLLECTION</div>
            <h1>{game.name}</h1>
            <p className={s.detailSummary}>{game.summary}</p>
            <dl className={s.facts}>
              <div>
                <dt>适合人数</dt>
                <dd>
                  {game.minPlayers === game.maxPlayers
                    ? game.minPlayers
                    : `${game.minPlayers}–${game.maxPlayers}`}{" "}
                  人
                </dd>
              </div>
              <div>
                <dt>最佳人数</dt>
                <dd>
                  {game.bestPlayerCounts.length
                    ? `${game.bestPlayerCounts.join(" / ")} 人`
                    : "待补充"}
                </dd>
              </div>
              <div>
                <dt>预计时长</dt>
                <dd>{game.durationMinutes} 分钟</dd>
              </div>
              <div>
                <dt>收藏状态</dt>
                <dd>已拥有</dd>
              </div>
            </dl>
            <div className={s.tags}>
              {game.tags.map((tag) => (
                <span className={s.tag} key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <section className={s.description}>
          <h2>走进这款游戏</h2>
          {game.description ? (
            <div className={s.markdown}>
              <ReactMarkdown skipHtml components={{ img: () => null }}>
                {game.description}
              </ReactMarkdown>
            </div>
          ) : (
            <p className={s.detailSummary}>
              玩法介绍还在整理中。先记下它，下一次围桌时一起探索。
            </p>
          )}
        </section>
      </article>
    </>
  );
}
