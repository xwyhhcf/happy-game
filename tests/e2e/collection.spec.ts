import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import sharp from "sharp";

test.describe.configure({ mode: "serial" });
const origin = "http://127.0.0.1:3100";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("管理账号").fill("test-admin");
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "进入收藏管理" }).click();
  await expect(
    page.getByRole("heading", { name: "我的收藏管理" }),
  ).toBeVisible();
}

test("访客可打开空画廊，管理页要求登录，非法参数和越权请求被拒绝", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "收藏，等待第一段故事" }),
  ).toBeVisible();
  await page.goto("/admin/games/new");
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(
    (
      await request.post("/api/games", {
        headers: { Origin: origin },
        multipart: {},
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.patch("/api/games/missing", {
        headers: { Origin: origin },
        multipart: {},
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.delete("/api/games/missing", {
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(401);
  expect((await request.get("/api/games?players=-1")).status()).toBe(400);
  expect((await request.get("/api/games/missing")).status()).toBe(404);
});

test("管理员在手机端录入、校验、编辑、查看与删除，注销后旧会话不可写入", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "＋ 录入桌游", exact: true }).click();
  const cover = await sharp({
    create: { width: 300, height: 400, channels: 3, background: "#526b56" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("桌游封面")
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: cover });
  await page.getByLabel("桌游名称").fill("我的第一款测试桌游");
  await page
    .getByLabel("一句话介绍")
    .fill("这是一款用于验证完整流程的测试收藏。");
  await page.getByLabel("最少人数").fill("2");
  await page.getByLabel("最多人数").fill("1");
  await page.getByLabel("预计单局时长").fill("45");
  await page.getByRole("button", { name: "加入收藏" }).click();
  await expect(page.getByText("最多人数不能小于最少人数")).toBeVisible();
  await expect(page.getByLabel("桌游名称")).toHaveValue("我的第一款测试桌游");
  await page.getByLabel("最多人数").fill("6");
  await page.getByLabel("最佳人数").fill("4, 5");
  await page.getByLabel("类型标签").fill("合作, 推理");
  await page
    .getByLabel("玩法介绍")
    .fill(
      "## 游戏目标\n一起完成挑战。\n<script>window.injected = true</script>\n[不安全链接](javascript:alert(1))",
    );
  await page.getByRole("button", { name: "加入收藏" }).click();
  await expect(page.getByRole("status")).toContainText("已保存");
  const article = page
    .locator("article")
    .filter({ hasText: "我的第一款测试桌游" });
  const detailHref = await article
    .getByRole("link", { name: "查看", exact: true })
    .getAttribute("href");
  const recordId = detailHref!.split("/").pop()!;
  await article.getByRole("link", { name: "编辑", exact: true }).click();
  await page.getByLabel("桌游名称").fill("修改后的测试桌游");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(
    page.getByRole("heading", { name: "修改后的测试桌游" }),
  ).toBeVisible();
  await page.goto(`/games/${recordId}`);
  await expect(page.getByRole("heading", { name: "游戏目标" })).toBeVisible();
  expect(await page.evaluate(() => "injected" in window)).toBe(false);
  expect(await page.locator('a[href^="javascript:"]').count()).toBe(0);
  await expect(
    page.getByRole("img", { name: "修改后的测试桌游封面" }),
  ).toBeVisible();
  const crossOrigin = await page.request.delete(`/api/games/${recordId}`, {
    headers: { Origin: "https://other.example" },
  });
  expect(crossOrigin.status()).toBe(403);
  await page.goto("/admin/games");
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("修改后的测试桌游");
  await page.getByRole("button", { name: "保留这款" }).click();
  expect((await page.request.get(`/api/games/${recordId}`)).status()).toBe(200);
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(
    page.getByRole("heading", { name: "从第一款桌游开始" }),
  ).toBeVisible();
  expect((await page.request.get(`/api/games/${recordId}`)).status()).toBe(404);
  const token = (await page.context().cookies()).find(
    (cookie) => cookie.name === "happy-game-session",
  )!.value;
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(
    (
      await page.request.post("/api/games", {
        headers: { Origin: origin, Cookie: `happy-game-session=${token}` },
        multipart: {},
      })
    ).status(),
  ).toBe(401);
});

test("300 款收藏的分页、人数推荐、手机布局与返回位置正常", async ({
  page,
  request,
}, info) => {
  const directory = process.env.E2E_DATA_DIR!;
  mkdirSync(path.join(directory, "uploads"), { recursive: true });
  const artwork = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="380"><rect width="300" height="380" rx="12" fill="#315442"/><circle cx="150" cy="150" r="78" fill="#e7d7ad"/><path d="M100 210L150 85L200 210Z" fill="#a26c45"/><text x="150" y="295" text-anchor="middle" fill="#e7d7ad" font-size="21" font-family="serif">TEST COLLECTION</text><text x="150" y="325" text-anchor="middle" fill="#e7d7ad" font-size="13">E2E FIXTURE</text></svg>',
  );
  const cover = await sharp(artwork).webp().toBuffer();
  const db = new Database(path.join(directory, "happy-game.sqlite"));
  const insert = db.prepare(
    "INSERT INTO games VALUES (@id,@name,@summary,@coverKey,@minPlayers,@maxPlayers,@bestPlayerCounts,@durationMinutes,@tags,@description,@createdAt,@updatedAt)",
  );
  db.transaction(() => {
    for (let i = 0; i < 300; i++) {
      const key = `${randomUUID()}.webp`;
      writeFileSync(path.join(directory, "uploads", key), cover);
      writeFileSync(
        path.join(directory, "uploads", key.replace(".webp", "-thumb.webp")),
        cover,
      );
      insert.run({
        id: randomUUID(),
        name: `测试收藏 ${String(i + 1).padStart(3, "0")}`,
        summary: "隔离环境中的测试资料，用于检查手机端展示与推荐。",
        coverKey: key,
        minPlayers: 2,
        maxPlayers: i % 3 === 0 ? 4 : 6,
        bestPlayerCounts: i % 3 === 1 ? "[5]" : "[]",
        durationMinutes: 45,
        tags: '["测试"]',
        description: "",
        createdAt: new Date(Date.now() - i * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  })();
  db.close();
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await expect(page.locator("article")).toHaveCount(24);
  await expect(page.getByText("300", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "加载更多桌游" }).click();
  await expect(page.locator("article")).toHaveCount(48);
  await page.getByRole("heading", { name: "测试收藏 030" }).click();
  await expect(
    page.getByRole("heading", { name: "测试收藏 030" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "返回收藏" }).click();
  await expect(page.locator("article")).toHaveCount(48);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await page.goto("/pick");
  await expect(
    page.getByRole("heading", { name: "人到齐了，玩哪一款？" }),
  ).toBeVisible();
  await page.getByLabel("今天几个人玩？").fill("5");
  await page.getByRole("button", { name: "寻找适合的桌游" }).click();
  await expect(page).toHaveURL(/players=5/);
  await expect(page.locator("article").first()).toContainText("最佳人数匹配");
  const results = await (await request.get("/api/games?players=5")).json();
  expect(results.total).toBe(200);
  expect(
    results.items.every(
      (game: { minPlayers: number; maxPlayers: number }) =>
        game.minPlayers <= 5 && game.maxPlayers >= 5,
    ),
  ).toBe(true);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const url of ["/", "/games", "/pick?players=5"]) {
      await page.goto(url);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("header")).toBeInViewport();
  await expect(page.locator("article")).toHaveCount(24);
  await page
    .locator("article img")
    .first()
    .evaluate((image) => (image as HTMLImageElement).decode());
  await page.screenshot({
    path: info.outputPath("gallery-mobile.png"),
    fullPage: false,
  });
  await page.getByRole("button", { name: "搜索与筛选" }).click();
  await page.getByLabel("寻找一款桌游").fill("测试收藏 001");
  await page.getByRole("button", { name: "查找", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "测试收藏 001" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.locator("header")).toBeInViewport();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("gallery-desktop.png"),
    fullPage: false,
  });
  await page.goto("/pick?players=999");
  await expect(
    page.getByRole("heading", { name: "暂无适合 999 人的桌游" }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});
