import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const globalDb = globalThis as unknown as {
  happyGameDbs?: Map<string, Database.Database>;
};

export function getDb() {
  // 数据卷仅在运行时读取，不能让构建器把本地收藏或配置打进镜像。
  const directory = path.resolve(
    /* turbopackIgnore: true */ process.env.DATA_DIR || "./data",
  );
  globalDb.happyGameDbs ??= new Map();
  const existing = globalDb.happyGameDbs.get(directory);
  if (existing) return existing;
  mkdirSync(directory, { recursive: true });
  const db = new Database(path.join(directory, "happy-game.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.exec("CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY)");
  const migrationDir = path.join(process.cwd(), "db/migrations");
  for (const name of readdirSync(migrationDir)
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (!db.prepare("SELECT name FROM migrations WHERE name = ?").get(name)) {
      db.transaction(() => {
        db.exec(readFileSync(path.join(migrationDir, name), "utf8"));
        db.prepare("INSERT INTO migrations(name) VALUES (?)").run(name);
      })();
    }
  }
  globalDb.happyGameDbs.set(directory, db);
  return db;
}
