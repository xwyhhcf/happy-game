import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSession,
  recordLoginAttempt,
  requireAdmin,
  revokeSession,
  SESSION_COOKIE,
  SESSION_SECONDS,
  verifyPassword,
} from "@/lib/auth";
import { getDb } from "@/lib/db";
import { apiError, assertOrigin, HttpError, readBody } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH)
      throw new HttpError(
        503,
        "NOT_CONFIGURED",
        "管理账号尚未配置，请先完成站点初始化",
      );
    recordLoginAttempt();
    let input;
    try {
      input = JSON.parse((await readBody(request, 4096)).toString("utf8"));
    } catch (error) {
      if (error instanceof SyntaxError)
        throw new HttpError(400, "INVALID_INPUT", "登录信息格式无效");
      throw error;
    }
    if (
      !input ||
      typeof input.username !== "string" ||
      typeof input.password !== "string"
    )
      throw new HttpError(400, "INVALID_INPUT", "请填写账号和密码");
    const passwordValid = verifyPassword(
      input.password,
      process.env.ADMIN_PASSWORD_HASH,
    );
    if (input.username !== process.env.ADMIN_USERNAME || !passwordValid)
      throw new HttpError(
        401,
        "INVALID_CREDENTIALS",
        "账号或密码不正确，请重新输入",
      );
    const jar = await cookies();
    const previous = jar.get(SESSION_COOKIE)?.value;
    if (previous) revokeSession(previous);
    const token = createSession();
    getDb().prepare("DELETE FROM login_attempts WHERE bucket = 'admin'").run();
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.COOKIE_SECURE === "true" ||
        (process.env.NODE_ENV === "production" &&
          process.env.COOKIE_SECURE !== "false"),
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertOrigin(request);
    await requireAdmin();
    const token = (await cookies()).get(SESSION_COOKIE)!.value;
    revokeSession(token);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.COOKIE_SECURE === "true" ||
        (process.env.NODE_ENV === "production" &&
          process.env.COOKIE_SECURE !== "false"),
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return apiError(error);
  }
}
