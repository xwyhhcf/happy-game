"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendRequest } from "./api";
import s from "./site.module.css";

export function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className={s.form}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        try {
          await sendRequest("/api/admin/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(form)),
          });
          router.push("/admin/games");
          router.refresh();
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "连接失败，请检查网络后重试",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className={s.field}>
        <label htmlFor="username">管理账号</label>
        <input
          name="username"
          id="username"
          autoComplete="username"
          required
          maxLength={100}
        />
      </div>
      <div className={s.field}>
        <label htmlFor="password">密码</label>
        <input
          name="password"
          id="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
        />
      </div>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <button className={s.primary} disabled={busy}>
        {busy ? "正在登录…" : "进入收藏管理 →"}
      </button>
    </form>
  );
}
