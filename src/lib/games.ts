import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { HttpError } from "./http";
import type {
  Game,
  GameInput,
  GamePage,
  GameQuery,
} from "@/features/games/model";

type GameRow = Omit<Game, "bestPlayerCounts" | "tags"> & {
  bestPlayerCounts: string;
  tags: string;
};

function decodeGame(row: GameRow): Game {
  return {
    ...row,
    bestPlayerCounts: JSON.parse(row.bestPlayerCounts),
    tags: JSON.parse(row.tags),
  };
}

export function getGame(id: string): Game | undefined {
  const row = getDb().prepare("SELECT * FROM games WHERE id = ?").get(id) as
    GameRow | undefined;
  return row ? decodeGame(row) : undefined;
}

export function listGames({ q, players, page }: GameQuery): GamePage {
  const db = getDb();
  const args: (string | number)[] = [];
  const conditions: string[] = [];
  if (q) {
    conditions.push("instr(lower(name), lower(?)) > 0");
    args.push(q);
  }
  if (players !== undefined) {
    conditions.push("minPlayers <= ? AND maxPlayers >= ?");
    args.push(players, players);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM games ${where}`).get(...args) as {
      count: number;
    }
  ).count;
  const order =
    players === undefined
      ? ""
      : "EXISTS(SELECT 1 FROM json_each(bestPlayerCounts) WHERE value = ?) DESC,";
  const sortArgs = players === undefined ? [] : [players];
  const rows = db
    .prepare(
      `SELECT id,name,summary,coverKey,minPlayers,maxPlayers,bestPlayerCounts,durationMinutes,tags,'' AS description,createdAt,updatedAt
       FROM games ${where} ORDER BY ${order} createdAt DESC, id ASC LIMIT 24 OFFSET ?`,
    )
    .all(...args, ...sortArgs, (page - 1) * 24) as GameRow[];
  return {
    items: rows.map((row) => {
      const game = decodeGame(row);
      return players === undefined
        ? game
        : {
            ...game,
            match: game.bestPlayerCounts.includes(players)
              ? "best"
              : "supported",
          };
    }),
    total,
    page,
    pageSize: 24,
  };
}

export function saveGame(input: GameInput, coverKey: string, existing?: Game) {
  const now = new Date().toISOString();
  const game: Game = {
    ...input,
    id: existing?.id ?? randomUUID(),
    coverKey,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  const result = getDb()
    .prepare(
      existing
        ? `UPDATE games SET name=@name, summary=@summary, coverKey=@coverKey, minPlayers=@minPlayers, maxPlayers=@maxPlayers,
        bestPlayerCounts=@bestPlayerCounts, durationMinutes=@durationMinutes, tags=@tags, description=@description, updatedAt=@updatedAt WHERE id=@id`
        : `INSERT INTO games (id,name,summary,coverKey,minPlayers,maxPlayers,bestPlayerCounts,durationMinutes,tags,description,createdAt,updatedAt)
        VALUES (@id,@name,@summary,@coverKey,@minPlayers,@maxPlayers,@bestPlayerCounts,@durationMinutes,@tags,@description,@createdAt,@updatedAt)`,
    )
    .run({
      ...game,
      bestPlayerCounts: JSON.stringify(game.bestPlayerCounts),
      tags: JSON.stringify(game.tags),
    });
  if (!result.changes)
    throw new HttpError(
      404,
      "NOT_FOUND",
      "这款桌游已不在收藏中，请返回管理列表",
    );
  return game;
}
