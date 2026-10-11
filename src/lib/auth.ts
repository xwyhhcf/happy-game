import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { HttpError } from "./http";

export const SESSION_COOKIE = "happy-game-session";
export const SESSION_SECONDS = 7 * 24 * 60 * 60;

export function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, hash] = encoded.split(":");
  if (
    algorithm !== "scrypt" ||
    !/^[a-f0-9]{32}$/.test(salt ?? "") ||
    !/^[a-f0-9]{128}$/.test(hash ?? "") ||
    password.length > 256
  )
    return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}

export function createSession() {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const db = getDb();
  db.prepare("DELETE FROM admin_sessions WHERE expiresAt <= ?").run(now);
  db.prepare("INSERT INTO admin_sessions VALUES (?, ?, ?)").run(
    createHash("sha256").update(token).digest("hex"),
    now,
    now + SESSION_SECONDS * 1000,
  );
  return token;
}

export function sessionValid(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return !!getDb()
    .prepare(
      "SELECT tokenHash FROM admin_sessions WHERE tokenHash = ? AND expiresAt > ?",
    )
    .get(createHash("sha256").update(token).digest("hex"), Date.now());
}

export function revokeSession(token: string) {
  getDb()
    .prepare("DELETE FROM admin_sessions WHERE tokenHash = ?")
    .run(createHash("sha256").update(token).digest("hex"));
}

export async function requireAdmin(page = false) {
  const valid = sessionValid((await cookies()).get(SESSION_COOKIE)?.value);
  if (!valid) {
    if (page) redirect("/admin/login");
    throw new HttpError(401, "UNAUTHORIZED", "登录已失效，请重新登录");
  }
}

export function recordLoginAttempt() {
  const db = getDb();
  const now = Date.now();
  db.prepare("DELETE FROM login_attempts WHERE expiresAt <= ?").run(now);
  const result = db
    .prepare(
      `INSERT INTO login_attempts (bucket, attempts, expiresAt) VALUES ('admin',1,?)
    ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts`,
    )
    .get(now + 15 * 60 * 1000) as { attempts: number };
  if (result.attempts > 20)
    throw new HttpError(
      429,
      "TOO_MANY_ATTEMPTS",
      "登录尝试过多，请 15 分钟后重试",
    );
}
