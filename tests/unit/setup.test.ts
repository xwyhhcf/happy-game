import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

describe("初始化脚本", () => {
  it("仅保存哈希，拒绝覆盖已有配置", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "happy-game-setup-"));
    try {
      const password = randomBytes(16).toString("hex");
      const args = [path.resolve("scripts/setup.mjs")];
      const env = {
        ...process.env,
        ADMIN_USERNAME: "test-admin",
        ADMIN_PASSWORD: password,
      };
      const first = spawnSync(process.execPath, args, {
        cwd: directory,
        env,
        encoding: "utf8",
      });
      expect(first.status, first.stderr).toBe(0);
      const config = readFileSync(path.join(directory, ".env.local"), "utf8");
      expect(config).toContain("ADMIN_PASSWORD_HASH=scrypt:");
      expect(config).not.toContain(password);
      const second = spawnSync(process.execPath, args, {
        cwd: directory,
        env,
        encoding: "utf8",
      });
      expect(second.status).toBe(1);
      expect(readFileSync(path.join(directory, ".env.local"), "utf8")).toBe(
        config,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
