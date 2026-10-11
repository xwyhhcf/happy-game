import { defineConfig } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.E2E_DATA_DIR ??= mkdtempSync(
  path.join(tmpdir(), "happy-game-e2e-"),
);
process.env.E2E_PASSWORD ??= randomBytes(18).toString("base64url");
const salt = randomBytes(16).toString("hex");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "mobile-chromium", use: { browserName: "chromium" } }],
  globalTeardown: "./tests/e2e/cleanup.ts",
  webServer: {
    command: "npm start",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      PORT: "3100",
      HOSTNAME: "127.0.0.1",
      DATA_DIR: process.env.E2E_DATA_DIR,
      APP_ORIGIN: "http://127.0.0.1:3100",
      ADMIN_USERNAME: "test-admin",
      ADMIN_PASSWORD_HASH: `scrypt:${salt}:${scryptSync(process.env.E2E_PASSWORD, salt, 64).toString("hex")}`,
      COOKIE_SECURE: "false",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
