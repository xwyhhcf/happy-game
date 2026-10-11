"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Game } from "./model";
import { RequestError, sendRequest } from "./api";
import s from "./site.module.css";

export function GameForm({ game }: { game?: Game }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [expired, setExpired] = useState(false);
  const [preview, setPreview] = useState("");
  const status = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const invalid = (name: string) => ({
    "aria-invalid": !!fields[name],
    "aria-describedby": fields[name] ? `${name}-error` : undefined,
  });
  const fieldError = (name: string) =>
    fields[name] && (
      <span className={s.fieldError} id={`${name}-error`}>
        {fields[name]}
      </span>
    );

  return (
    <form
      className={s.form}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        setFields({});
        setExpired(false);
        try {
          await sendRequest<Game>(
            game ? `/api/games/${game.id}` : "/api/games",
            { method: game ? "PATCH" : "POST", body: form },
          );
          router.push("/admin/games?saved=1");
          router.refresh();
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "连接失败，请检查网络后重新保存",
          );
          if (cause instanceof RequestError) {
            setFields(cause.fields);
            setExpired(cause.status === 401);
          }
          requestAnimationFrame(() => status.current?.focus());
        } finally {
          setBusy(false);
        }
      }}
    >
      <section className={s.formSection}>
        <h2>01 · 封面与故事</h2>
        <div className={s.field}>
          <label htmlFor="cover">
            桌游封面{!game && " *"}
            <small>
              JPEG、PNG 或 WebP，最大 5 MB。建议上传完整的盒面照片。
            </small>
          </label>
          {(preview || game?.coverKey) && (
            <img
              className={s.preview}
              src={preview || `/media/${game!.coverKey}`}
              alt="封面预览"
            />
          )}
          <input
            type="file"
            id="cover"
            name="cover"
            accept="image/jpeg,image/png,image/webp"
            required={!game}
            {...invalid("cover")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : "");
            }}
          />
          {fieldError("cover")}
        </div>
        <div className={s.field}>
          <label htmlFor="name">桌游名称 *</label>
          <input
            name="name"
            id="name"
            required
            maxLength={100}
            defaultValue={game?.name}
            placeholder="例如：你收藏的第一款桌游"
            {...invalid("name")}
          />
          {fieldError("name")}
        </div>
        <div className={s.field}>
          <label htmlFor="summary">
            一句话介绍 *<small>它讲了什么故事？最吸引你的是什么？</small>
          </label>
          <textarea
            name="summary"
            id="summary"
            required
            maxLength={500}
            rows={3}
            defaultValue={game?.summary}
            {...invalid("summary")}
          />
          {fieldError("summary")}
        </div>
      </section>
      <section className={s.formSection}>
        <h2>02 · 开一局需要什么</h2>
        <div className={s.row}>
          {[
            { name: "minPlayers", label: "最少人数", value: game?.minPlayers },
            { name: "maxPlayers", label: "最多人数", value: game?.maxPlayers },
          ].map((field) => (
            <div className={s.field} key={field.name}>
              <label htmlFor={field.name}>{field.label} *</label>
              <input
                type="number"
                inputMode="numeric"
                name={field.name}
                id={field.name}
                min={1}
                max={10000}
                step={1}
                required
                defaultValue={field.value}
                {...invalid(field.name)}
              />
              {fieldError(field.name)}
            </div>
          ))}
        </div>
        <div className={s.field}>
          <label htmlFor="bestPlayerCounts">
            最佳人数
            <small>多个用逗号分隔，例如 4, 5；暂时不清楚可以留空。</small>
          </label>
          <input
            name="bestPlayerCounts"
            id="bestPlayerCounts"
            defaultValue={game?.bestPlayerCounts.join(", ")}
            placeholder="例如：4, 5"
            {...invalid("bestPlayerCounts")}
          />
          {fieldError("bestPlayerCounts")}
        </div>
        <div className={s.field}>
          <label htmlFor="durationMinutes">预计单局时长（分钟） *</label>
          <input
            name="durationMinutes"
            id="durationMinutes"
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={10000}
            step={1}
            defaultValue={game?.durationMinutes}
            placeholder="例如：45"
            {...invalid("durationMinutes")}
          />
          {fieldError("durationMinutes")}
        </div>
        <div className={s.field}>
          <label htmlFor="tags">
            类型标签
            <small>多个用逗号分隔，例如：合作, 推理；最多 10 个。</small>
          </label>
          <input
            name="tags"
            id="tags"
            defaultValue={game?.tags.join(", ")}
            placeholder="合作, 策略, 聚会…"
            {...invalid("tags")}
          />
          {fieldError("tags")}
        </div>
      </section>
      <section className={s.formSection}>
        <h2>03 · 再多讲一点</h2>
        <div className={s.field}>
          <label htmlFor="description">
            玩法介绍
            <small>
              可选。支持 Markdown 标题、列表和链接，方便朋友快速了解游戏。
            </small>
          </label>
          <textarea
            name="description"
            id="description"
            rows={9}
            maxLength={20000}
            defaultValue={game?.description}
            placeholder="游戏目标、基本流程，以及开局前想告诉朋友的事…"
            {...invalid("description")}
          />
          {fieldError("description")}
        </div>
      </section>
      {error && (
        <div ref={status} tabIndex={-1} className={s.error} role="alert">
          {error}
          {expired && (
            <p>
              <Link href="/admin/login" target="_blank" rel="noopener">
                在新窗口重新登录 ↗
              </Link>
              ，然后回到这里保存，填写内容会保留。
            </p>
          )}
        </div>
      )}
      <div className={s.actions}>
        <button className={s.primary} disabled={busy}>
          {busy ? "正在保存…" : game ? "保存修改" : "加入收藏"}
        </button>
        <Link href="/admin/games" className={s.secondary}>
          返回管理
        </Link>
        <span className={s.formHint}>保存后，朋友即可浏览。</span>
      </div>
    </form>
  );
}
