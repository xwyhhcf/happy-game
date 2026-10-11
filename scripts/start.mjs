import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const root = process.cwd();
const standalone = path.join(root, ".next/standalone");
const server = path.join(standalone, "server.js");
if (!existsSync(server)) {
  console.error("尚无生产构建，请先执行 npm run build。");
  process.exit(1);
}
cpSync(path.join(root, ".next/static"), path.join(standalone, ".next/static"), {
  recursive: true,
});
if (existsSync("public"))
  cpSync("public", path.join(standalone, "public"), { recursive: true });
const child = spawn(process.execPath, [server], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATA_DIR: path.resolve(process.env.DATA_DIR || "./data"),
    HOSTNAME: process.env.HOSTNAME || "0.0.0.0",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error("生产服务启动失败：", error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
