"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendRequest } from "./api";
import s from "./site.module.css";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await sendRequest("/api/admin/session", { method: "DELETE" });
            router.replace("/admin/login");
            router.refresh();
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "退出失败，请重试",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "正在退出…" : "退出登录"}
      </button>
      {error && (
        <span className={s.fieldError} role="alert">
          {error}
        </span>
      )}
    </>
  );
}

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className={s.danger}
        onClick={() => {
          setError("");
          dialog.current?.showModal();
        }}
      >
        删除
      </button>
      <dialog
        ref={dialog}
        className={s.deleteDialog}
        aria-labelledby={`delete-${id}`}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2 id={`delete-${id}`}>移出收藏？</h2>
        <p>
          将删除「{name}
          」及其封面，访客将无法再查看或推荐到这款游戏。此操作无法撤销。
        </p>
        {error && (
          <p className={s.error} role="alert">
            {error}
          </p>
        )}
        <div className={s.actions}>
          <button disabled={busy} onClick={() => dialog.current?.close()}>
            保留这款
          </button>
          <button
            className={s.danger}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await sendRequest(`/api/games/${id}`, { method: "DELETE" });
                dialog.current?.close();
                router.refresh();
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : "删除失败，请重试",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "正在删除…" : "确认删除"}
          </button>
        </div>
      </dialog>
    </>
  );
}
