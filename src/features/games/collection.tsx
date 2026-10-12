"use client";

import { useEffect, useRef, useState } from "react";
import Form from "next/form";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { GamePage, GameQuery } from "./model";
import { Cover } from "./cover";
import s from "./site.module.css";

export function Collection({
  initial,
  query,
  mode,
}: {
  initial: GamePage;
  query: GameQuery;
  mode: "gallery" | "list" | "pick";
}) {
  const path = usePathname();
  const search = useSearchParams();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(!!query.q || !!query.players);
  const pageRef = useRef(initial.page);
  const galleryRef = useRef<HTMLDivElement>(null);
  const currentUrl = `${path}${search.size ? `?${search}` : ""}`;
  const storageKey = `collection:${currentUrl}`;
  const filterParams = new URLSearchParams();
  if (query.q) filterParams.set("q", query.q);
  if (query.players) filterParams.set("players", String(query.players));
  const suffix = filterParams.size ? `?${filterParams}` : "";

  useEffect(() => {
    let active = true;
    let snapshot: { page: number; y: number } | undefined;
    try {
      snapshot =
        JSON.parse(sessionStorage.getItem(storageKey) || "null") ?? undefined;
      sessionStorage.removeItem(storageKey);
    } catch {
      /* 浏览器禁用存储时仍可正常浏览 */
    }
    if (
      !snapshot ||
      !Number.isInteger(snapshot.page) ||
      snapshot.page < 1 ||
      snapshot.page > 50
    )
      return;
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.players) params.set("players", String(query.players));
    const requests = Array.from(
      { length: Math.max(0, snapshot.page - initial.page) },
      (_, i) => {
        params.set("page", String(i + initial.page + 1));
        return fetch(`/api/games?${params}`, { cache: "no-store" }).then(
          async (response) => {
            if (!response.ok) throw new Error("恢复浏览位置失败");
            return response.json() as Promise<GamePage>;
          },
        );
      },
    );
    Promise.all(requests)
      .then((pages) => {
        if (!active) return;
        pageRef.current = snapshot!.page;
        setData({
          ...initial,
          page: snapshot!.page,
          items: [...initial.items, ...pages.flatMap((p) => p.items)],
        });
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (active) window.scrollTo(0, snapshot!.y || 0);
          }),
        );
      })
      .catch(() => {
        /* 恢复失败时保留可用的第一页 */
      });
    return () => {
      active = false;
    };
  }, [storageKey, initial, query.q, query.players]);

  async function loadMore() {
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams(filterParams);
      params.set("page", String(data.page + 1));
      const response = await fetch(`/api/games?${params}`, {
        cache: "no-store",
      });
      const next = await response.json();
      if (!response.ok) throw new Error(next.message || "加载失败，请重试");
      setData((previous) => ({
        ...next,
        items: [...previous.items, ...next.items],
      }));
      pageRef.current = next.page;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "网络暂时不通，请重试");
    } finally {
      setBusy(false);
    }
  }

  function rememberPosition() {
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ page: pageRef.current, y: window.scrollY }),
      );
    } catch {
      /* 存储不可用不阻断导航 */
    }
  }

  const cards = data.items.map((game, i) => (
    <article key={game.id} className={s.card}>
      <Link
        className={s.cardLink}
        href={`/games/${game.id}?from=${encodeURIComponent(currentUrl)}`}
        onClick={rememberPosition}
      >
        <div className={s.art}>
          <Cover coverKey={game.coverKey} name={game.name} eager={i < 4} />
        </div>
        <div className={s.listContent}>
          <h2 className={s.cardTitle}>{game.name}</h2>
          <div className={s.meta}>
            <span>
              {game.minPlayers === game.maxPlayers
                ? game.minPlayers
                : `${game.minPlayers}–${game.maxPlayers}`}{" "}
              人
            </span>
            <span className={s.dot}>·</span>
            <span>{game.durationMinutes} 分钟</span>
          </div>
          {game.match && (
            <span className={s.badge}>
              {game.match === "best" ? "✦ 最佳人数匹配" : "支持该人数"}
            </span>
          )}
          {mode === "list" && <p className={s.summary}>{game.summary}</p>}
        </div>
      </Link>
    </article>
  ));

  function scrollGallery(direction: "left" | "right") {
    galleryRef.current?.scrollBy({
      left:
        direction === "right"
          ? galleryRef.current.clientWidth * 0.82
          : -galleryRef.current.clientWidth * 0.82,
      behavior: "smooth",
    });
  }

  return (
    <>
      {mode !== "pick" && (
        <button
          type="button"
          className={s.filterToggle}
          aria-expanded={showFilters}
          aria-controls="collection-filters"
          onClick={() => setShowFilters((value) => !value)}
        >
          <span>⌕　搜索与筛选</span>
          <span>{showFilters ? "收起 −" : "展开 ＋"}</span>
        </button>
      )}
      <Form
        action={path}
        id="collection-filters"
        className={`${s.filters} ${mode !== "pick" && !showFilters ? s.collapsed : ""}`}
        key={suffix}
        aria-label={mode === "pick" ? "按人数选游" : "筛选收藏"}
      >
        {mode !== "pick" && (
          <div className={s.search}>
            <label htmlFor="q">寻找一款桌游</label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query.q}
              placeholder="输入桌游名称…"
              maxLength={100}
            />
          </div>
        )}
        <div className={s.number}>
          <label htmlFor="players">
            {mode === "pick" ? "今天几个人玩？" : "参与人数"}
          </label>
          <input
            id="players"
            name="players"
            type="number"
            inputMode="numeric"
            min={1}
            max={10000}
            step={1}
            required={mode === "pick"}
            defaultValue={query.players ?? ""}
            placeholder={mode === "pick" ? "输入人数" : "不限"}
          />
        </div>
        <button className={s.primary} type="submit">
          {mode === "pick" ? "寻找适合的桌游 →" : "查找"}
        </button>
        {(query.q || query.players) && (
          <Link className={s.secondary} href={path}>
            重置
          </Link>
        )}
      </Form>
      {mode === "pick" && !query.players ? (
        <div className={s.empty}>
          <div className={s.emptyIcon} aria-hidden="true">
            ♧
          </div>
          <h2>人到齐了，玩哪一款？</h2>
          <p>
            输入今天的人数，从收藏中找一款刚刚好的桌游。最佳人数匹配的游戏会优先展示。
          </p>
        </div>
      ) : (
        <>
          <div className={s.sectionBar}>
            <div className={s.count}>
              <strong>{data.total}</strong>
              {query.players
                ? `款适合 ${query.players} 人的桌游`
                : "款桌游 · 慢慢逛，不着急"}
            </div>
            {mode !== "pick" && (
              <div className={s.switcher} aria-label="展示方式">
                <Link
                  href={`/${suffix}`}
                  aria-current={mode === "gallery" ? "page" : undefined}
                >
                  ▦ 画廊
                </Link>
                <Link
                  href={`/games${suffix}`}
                  aria-current={mode === "list" ? "page" : undefined}
                >
                  ☷ 列表
                </Link>
              </div>
            )}
          </div>
          {data.items.length ? (
            <div
              className={
                mode === "list"
                  ? s.list
                  : mode === "gallery"
                    ? s.galleryStage
                    : s.grid
              }
            >
              {mode === "gallery" ? (
                <>
                  <div className={s.galleryTrack} ref={galleryRef}>
                    {cards}
                  </div>
                  <div className={s.galleryControls}>
                    <span>左右滑动，慢慢发现</span>
                    <div>
                      <button
                        type="button"
                        aria-label="向左浏览"
                        onClick={() => scrollGallery("left")}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        aria-label="向右浏览"
                        onClick={() => scrollGallery("right")}
                      >
                        →
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                cards
              )}
            </div>
          ) : (
            <div className={s.empty}>
              <div className={s.emptyIcon} aria-hidden="true">
                ▤
              </div>
              <h2>
                {query.players
                  ? `暂无适合 ${query.players} 人的桌游`
                  : query.q
                    ? "还没有找到这款桌游"
                    : "收藏，等待第一段故事"}
              </h2>
              <p>
                {query.players || query.q
                  ? "试试调整人数或搜索内容，也可以看看全部收藏。"
                  : "这里会展示收藏的每一款好游戏。准备好之后，一起开一局。"}
              </p>
              <div className={s.actions}>
                <Link href="/" className={s.secondary}>
                  查看全部收藏
                </Link>
                {!query.q && !query.players && (
                  <Link href="/admin/games/new" className={s.primary}>
                    录入第一款桌游
                  </Link>
                )}
              </div>
            </div>
          )}
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          {data.items.length < data.total && (
            <div className={s.more}>
              <button disabled={busy} onClick={loadMore}>
                {busy ? "正在加载…" : "加载更多桌游 ↓"}
              </button>
              <p>
                已展示 {data.items.length} / {data.total} 款
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
