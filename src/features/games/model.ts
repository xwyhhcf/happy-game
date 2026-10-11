export type GameInput = {
  name: string;
  summary: string;
  minPlayers: number;
  maxPlayers: number;
  bestPlayerCounts: number[];
  durationMinutes: number;
  tags: string[];
  description: string;
};

export type Game = GameInput & {
  id: string;
  coverKey: string;
  createdAt: string;
  updatedAt: string;
  match?: "best" | "supported";
};

export type GameQuery = { q: string; players?: number; page: number };
export type GamePage = {
  items: Game[];
  total: number;
  page: number;
  pageSize: number;
};

export class InputError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

export function parseGame(input: Record<string, unknown>): GameInput {
  const fields: Record<string, string> = {};
  const name = String(input.name ?? "").trim();
  const summary = String(input.summary ?? "").trim();
  const description = String(input.description ?? "").trim();
  const minPlayers = Number(input.minPlayers);
  const maxPlayers = Number(input.maxPlayers);
  const durationMinutes = Number(input.durationMinutes);
  if (!name || name.length > 100) fields.name = "名称请填写 1～100 个字";
  if (!summary || summary.length > 500)
    fields.summary = "简介请填写 1～500 个字";
  if (description.length > 20000)
    fields.description = "玩法介绍不能超过 20000 个字";
  for (const [key, value, label] of [
    ["minPlayers", minPlayers, "最少人数"],
    ["maxPlayers", maxPlayers, "最多人数"],
    ["durationMinutes", durationMinutes, "游戏时长"],
  ] as const) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 10000)
      fields[key] = `${label}请填写 1～10000 的整数`;
  }
  if (maxPlayers < minPlayers) fields.maxPlayers = "最多人数不能小于最少人数";
  const bestRaw = Array.isArray(input.bestPlayerCounts)
    ? input.bestPlayerCounts
    : String(input.bestPlayerCounts ?? "")
        .split(/[,，、\s]+/)
        .filter(Boolean);
  const bestPlayerCounts = [...new Set(bestRaw.map(Number))].sort(
    (a, b) => a - b,
  );
  if (
    bestPlayerCounts.length > 100 ||
    bestPlayerCounts.some(
      (n) => !Number.isSafeInteger(n) || n < minPlayers || n > maxPlayers,
    )
  )
    fields.bestPlayerCounts = "最佳人数必须是支持范围内的整数，多个用逗号分隔";
  const tagsRaw = Array.isArray(input.tags)
    ? input.tags
    : String(input.tags ?? "").split(/[,，、]+/);
  const tags = [
    ...new Set(tagsRaw.map((t) => String(t).trim()).filter(Boolean)),
  ];
  if (tags.length > 10 || tags.some((t) => t.length > 20))
    fields.tags = "最多 10 个标签，每个不超过 20 个字";
  if (Object.keys(fields).length)
    throw new InputError("请检查填写内容", fields);
  return {
    name,
    summary,
    minPlayers,
    maxPlayers,
    bestPlayerCounts,
    durationMinutes,
    tags,
    description,
  };
}

export function parseQuery(params: URLSearchParams): GameQuery {
  const q = (params.get("q") ?? "").trim();
  const rawPlayers = params.get("players") ?? "";
  const rawPage = params.get("page") ?? "1";
  if (q.length > 100) throw new InputError("搜索内容不能超过 100 个字");
  if (
    rawPlayers &&
    (!/^\d+$/.test(rawPlayers) ||
      Number(rawPlayers) < 1 ||
      Number(rawPlayers) > 10000)
  )
    throw new InputError("人数请填写 1～10000 的整数");
  if (!/^\d+$/.test(rawPage) || Number(rawPage) < 1 || Number(rawPage) > 10000)
    throw new InputError("页码无效");
  return {
    q,
    players: rawPlayers ? Number(rawPlayers) : undefined,
    page: Number(rawPage),
  };
}
