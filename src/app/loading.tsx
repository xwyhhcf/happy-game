import s from "@/features/games/site.module.css";
export default function Loading() {
  return (
    <div className={s.empty} role="status">
      <div className={s.emptyIcon} aria-hidden="true">
        ▦
      </div>
      <p>正在打开收藏馆…</p>
    </div>
  );
}
