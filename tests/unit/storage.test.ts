import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import sharp from "sharp";
import { getDb } from "@/lib/db";
import { listGames, getGame, saveGame } from "@/lib/games";
import { parseGame } from "@/features/games/model";
import {
  createSession,
  recordLoginAttempt,
  revokeSession,
  sessionValid,
  verifyPassword,
} from "@/lib/auth";
import { readCover, removeCover, storeCover } from "@/lib/media";
import { assertOrigin, readBody } from "@/lib/http";

const directory = mkdtempSync(path.join(tmpdir(), "happy-game-unit-"));
vi.stubEnv("DATA_DIR", directory);
const db = getDb();
const basic = parseGame({
  name: "测试桌游",
  summary: "测试资料",
  minPlayers: 2,
  maxPlayers: 6,
  bestPlayerCounts: [4, 5],
  durationMinutes: 30,
});
beforeEach(() => {
  db.exec(
    "DELETE FROM games; DELETE FROM admin_sessions; DELETE FROM login_attempts;",
  );
});
afterAll(() => {
  db.close();
  vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});

describe("真实 SQLite 查询与推荐", () => {
  it("上下界包含在内，最佳人数优先，未知最佳人数仍匹配", () => {
    const best = saveGame(basic, `${randomUUID()}.webp`);
    const supported = saveGame(
      { ...basic, name: "常规匹配", bestPlayerCounts: [] },
      `${randomUUID()}.webp`,
    );
    saveGame(
      { ...basic, name: "不适合", maxPlayers: 4, bestPlayerCounts: [4] },
      `${randomUUID()}.webp`,
    );
    const results = listGames({ q: "", players: 5, page: 1 });
    expect(results.total).toBe(2);
    expect(results.items.map((g) => [g.id, g.match])).toEqual([
      [best.id, "best"],
      [supported.id, "supported"],
    ]);
    expect(listGames({ q: "", players: 2, page: 1 }).total).toBe(3);
    expect(listGames({ q: "", players: 6, page: 1 }).total).toBe(2);
    expect(listGames({ q: "", players: 7, page: 1 }).total).toBe(0);
  });
  it("分页、组合搜索与特殊字符均不改变查询结构", () => {
    for (let i = 0; i < 30; i++)
      saveGame({ ...basic, name: `桌游 ${i}` }, `${randomUUID()}.webp`);
    const first = listGames({ q: "桌游", players: 5, page: 1 });
    const second = listGames({ q: "桌游", players: 5, page: 2 });
    expect(first.total).toBe(30);
    expect(first.items).toHaveLength(24);
    expect(second.items).toHaveLength(6);
    expect(
      new Set([...first.items, ...second.items].map((g) => g.id)).size,
    ).toBe(30);
    expect(listGames({ q: "' OR 1=1 --", page: 1 }).total).toBe(0);
    expect(listGames({ q: "%", page: 1 }).total).toBe(0);
  });
  it("更新保持标识与录入时间，新连接可读取持久资料", () => {
    const game = saveGame(basic, `${randomUUID()}.webp`);
    const updated = saveGame({ ...basic, name: "新名字" }, game.coverKey, game);
    expect(updated.id).toBe(game.id);
    expect(updated.createdAt).toBe(game.createdAt);
    expect(getGame(game.id)?.name).toBe("新名字");
    const second = new Database(path.join(directory, "happy-game.sqlite"), {
      readonly: true,
    });
    expect(
      second.prepare("SELECT name FROM games WHERE id = ?").get(game.id),
    ).toEqual({ name: "新名字" });
    second.close();
  });
  it("已删除条目不会被旧编辑表单重新创建", () => {
    const game = saveGame(basic, `${randomUUID()}.webp`);
    db.prepare("DELETE FROM games WHERE id = ?").run(game.id);
    expect(() => saveGame(basic, game.coverKey, game)).toThrow("已不在收藏中");
    expect(getGame(game.id)).toBeUndefined();
  });
});

describe("认证与请求防护", () => {
  it("校验真实密码哈希，拒绝错误与畸形值", () => {
    const password = randomBytes(16).toString("hex");
    const salt = randomBytes(16).toString("hex");
    const encoded = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
    expect(verifyPassword(password, encoded)).toBe(true);
    expect(verifyPassword("wrong", encoded)).toBe(false);
    expect(verifyPassword(password, "bad:hash")).toBe(false);
  });
  it("仅保存令牌哈希，过期与注销后不可用", () => {
    const token = createSession();
    expect(sessionValid(token)).toBe(true);
    expect(sessionValid("invalid")).toBe(false);
    expect(
      db.prepare("SELECT tokenHash FROM admin_sessions").get(),
    ).not.toEqual({ tokenHash: token });
    revokeSession(token);
    expect(sessionValid(token)).toBe(false);
    const expired = createSession();
    db.prepare("UPDATE admin_sessions SET expiresAt = ?").run(Date.now() - 1);
    expect(sessionValid(expired)).toBe(false);
  });
  it("登录尝试超过窗口限额后拒绝，窗口过期可重试", () => {
    for (let i = 0; i < 20; i++) recordLoginAttempt();
    expect(recordLoginAttempt).toThrow("登录尝试过多");
    db.prepare("UPDATE login_attempts SET expiresAt = ?").run(Date.now() - 1);
    expect(recordLoginAttempt).not.toThrow();
  });
  it("拒绝跨站与无来源写请求", () => {
    vi.stubEnv("APP_ORIGIN", "https://collection.example");
    expect(() =>
      assertOrigin(
        new Request("https://collection.example/api", {
          headers: { Origin: "https://evil.example" },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertOrigin(new Request("https://collection.example/api")),
    ).toThrow();
    expect(() =>
      assertOrigin(
        new Request("https://collection.example/api", {
          headers: { Origin: "https://collection.example" },
        }),
      ),
    ).not.toThrow();
  });
  it("逐块限制实际请求体大小", async () => {
    await expect(
      readBody(
        new Request("http://localhost", { method: "POST", body: "12345" }),
        4,
      ),
    ).rejects.toThrow("提交内容过大");
  });
});

describe("封面与完整备份", () => {
  it("重新编码和缩略图可读，备份可恢复资料与图片", async () => {
    const source = await sharp({
      create: { width: 300, height: 400, channels: 3, background: "#244e3d" },
    })
      .png()
      .toBuffer();
    const key = await storeCover(
      new File([new Uint8Array(source)], "cover.png", { type: "image/png" }),
    );
    expect((await sharp(await readCover(key)).metadata()).format).toBe("webp");
    expect(await readCover(key.replace(".webp", "-thumb.webp"))).toBeTruthy();
    const game = saveGame(basic, key);
    const backupRoot = path.join(directory, "backups");
    const result = spawnSync(process.execPath, ["scripts/backup.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, DATA_DIR: directory, BACKUP_DIR: backupRoot },
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    const target = result.stdout.match(/备份成功：(.+?)。/)![1];
    const restored = new Database(path.join(target, "happy-game.sqlite"), {
      readonly: true,
    });
    expect(
      restored.prepare("SELECT name FROM games WHERE id = ?").get(game.id),
    ).toEqual({ name: basic.name });
    expect(readFileSync(path.join(target, "uploads", key))).toEqual(
      await readCover(key),
    );
    expect(restored.prepare("PRAGMA integrity_check").get()).toEqual({
      integrity_check: "ok",
    });
    restored.close();
    await removeCover(key);
    expect(await readCover(key)).toBeUndefined();
  });
  it("拒绝 SVG、伪造图片与路径穿越", async () => {
    await expect(
      storeCover(new File(["not an image"], "fake.png")),
    ).rejects.toThrow();
    await expect(
      storeCover(
        new File(
          ['<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>'],
          "cover.svg",
        ),
      ),
    ).rejects.toThrow("仅支持");
    expect(await readCover("../../.env.local")).toBeUndefined();
  });
});
