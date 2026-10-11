import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionValid } from "@/lib/auth";
import { LoginForm } from "@/features/games/login-form";
import s from "@/features/games/site.module.css";

export const metadata = {
  title: "管理登录",
  robots: { index: false, follow: false },
};
export default async function Login() {
  if (sessionValid((await cookies()).get(SESSION_COOKIE)?.value))
    redirect("/admin/games");
  const configured =
    !!process.env.ADMIN_USERNAME && !!process.env.ADMIN_PASSWORD_HASH;
  return (
    <section className={s.login}>
      <div className={s.eyebrow}>THE CURATOR&apos;S CORNER</div>
      <h1>打理你的收藏馆</h1>
      <p>记录新收藏，为每一款桌游写下它的故事。</p>
      {configured ? (
        <LoginForm />
      ) : (
        <p className={s.notice} role="status">
          管理账号尚未配置。站主请先按项目 README 完成本地初始化，再来登录。
        </p>
      )}
    </section>
  );
}
