import { describe, expect, it } from "vitest";
import { InputError, parseGame, parseQuery } from "@/features/games/model";

const valid = {
  name: "  一款桌游  ",
  summary: "测试简介",
  minPlayers: 2,
  maxPlayers: 6,
  bestPlayerCounts: "5，4, 5",
  durationMinutes: 45,
  tags: "合作，推理, 合作",
  description: "# 玩法",
};

describe("桌游录入校验", () => {
  it("规范化最佳人数、标签与名称", () => {
    expect(parseGame(valid)).toMatchObject({
      name: "一款桌游",
      bestPlayerCounts: [4, 5],
      tags: ["合作", "推理"],
    });
  });
  it("允许最佳人数未知和标签为空", () => {
    expect(
      parseGame({ ...valid, bestPlayerCounts: "", tags: "" }),
    ).toMatchObject({ bestPlayerCounts: [], tags: [] });
  });
  it.each([
    { minPlayers: 0 },
    { maxPlayers: 1 },
    { durationMinutes: 1.5 },
    { bestPlayerCounts: "7" },
    { name: "" },
    { summary: "" },
    { tags: "a".repeat(21) },
  ])("拒绝无效资料 %j", (patch) => {
    expect(() => parseGame({ ...valid, ...patch })).toThrow(InputError);
  });
});

describe("搜索与人数参数", () => {
  it.each(["0", "-1", "2.5", "NaN", "10001", "1e2", "Infinity"])(
    "拒绝非法人数 %s",
    (value) => {
      expect(() => parseQuery(new URLSearchParams({ players: value }))).toThrow(
        InputError,
      );
    },
  );
  it("支持无人数、明确人数与名称搜索", () => {
    expect(parseQuery(new URLSearchParams())).toEqual({
      q: "",
      players: undefined,
      page: 1,
    });
    expect(
      parseQuery(
        new URLSearchParams({ players: "5", q: "  推理  ", page: "2" }),
      ),
    ).toEqual({ q: "推理", players: 5, page: 2 });
  });
  it("拒绝异常页码和过长搜索内容", () => {
    expect(() => parseQuery(new URLSearchParams({ page: "0" }))).toThrow();
    expect(() =>
      parseQuery(new URLSearchParams({ q: "字".repeat(101) })),
    ).toThrow();
  });
});
