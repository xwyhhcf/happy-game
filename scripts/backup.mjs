import Database from "better-sqlite3";
import { existsSync, mkdirSync, copyFileSync, renameSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const dataDir = path.resolve(process.env.DATA_DIR || "./data");
const source = path.join(dataDir, "happy-game.sqlite");
if (!existsSync(source)) {
  console.error("尚未找到收藏数据库，请先启动应用完成初始化。");
  process.exit(1);
}
const backupDir = path.resolve(process.env.BACKUP_DIR || "./backups");
const name = `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`;
const staging = path.join(backupDir, `${name}.partial`);
const destination = path.join(backupDir, name);
mkdirSync(path.join(staging, "uploads"), { recursive: true });
const lock = new Database(source);
const db = new Database(source, { readonly: true });
let snapshot;
try {
  // 阻止资料修改，避免数据库快照完成后引用的封面被同时删除。
  lock.pragma("busy_timeout = 10000");
  lock.exec("BEGIN IMMEDIATE");
  await db.backup(path.join(staging, "happy-game.sqlite"));
  snapshot = new Database(path.join(staging, "happy-game.sqlite"), {
    readonly: true,
  });
  for (const { coverKey } of snapshot
    .prepare("SELECT coverKey FROM games")
    .all()) {
    if (!/^[a-f0-9-]{36}\.webp$/.test(coverKey))
      throw new Error("收藏封面标识异常");
    for (const key of [coverKey, coverKey.replace(".webp", "-thumb.webp")])
      copyFileSync(
        path.join(dataDir, "uploads", key),
        path.join(staging, "uploads", key),
      );
  }
  snapshot.close();
  snapshot = undefined;
  lock.exec("ROLLBACK");
  renameSync(staging, destination);
  console.log(
    `备份成功：${destination}。请另存到独立存储，至少保留最近 7 份。`,
  );
} catch (error) {
  console.error(
    `备份失败：${error instanceof Error ? error.message : "未知错误"}。未完成副本保留在 ${staging}，不可用于恢复。`,
  );
  process.exitCode = 1;
} finally {
  snapshot?.close();
  if (lock.inTransaction) lock.exec("ROLLBACK");
  db.close();
  lock.close();
}
