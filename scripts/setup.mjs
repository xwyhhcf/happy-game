import { randomBytes, scryptSync } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { createInterface, emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";

if (existsSync(".env.local")) {
  console.error(
    ".env.local 已存在，未覆盖。修改配置请编辑该文件，收藏数据不受影响。",
  );
  process.exit(1);
}

let username = process.env.ADMIN_USERNAME || "admin";
let password = process.env.ADMIN_PASSWORD;
const generate = process.argv.includes("--generate");
if (generate) password = randomBytes(18).toString("base64url");
else if (!password && stdin.isTTY) {
  const rl = createInterface({ input: stdin, output: stdout });
  username = await new Promise((resolve) =>
    rl.question("管理账号（默认 admin）：", (value) =>
      resolve(value.trim() || "admin"),
    ),
  );
  rl.close();
  stdout.write("设置密码（至少 12 位，输入不回显）：");
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  password = await new Promise((resolve) => {
    let value = "";
    const onKey = (text, key) => {
      if (key?.ctrl && key.name === "c") process.exit(130);
      if (key?.name === "return" || key?.name === "enter") {
        stdin.off("keypress", onKey);
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write("\n");
        resolve(value);
      } else if (key?.name === "backspace") value = value.slice(0, -1);
      else if (text && !key?.ctrl && !key?.meta) value += text;
    };
    stdin.on("keypress", onKey);
  });
}

if (
  !password ||
  password.length < 12 ||
  password.length > 256 ||
  !/^[\w.@-]{1,100}$/.test(username)
) {
  console.error(
    "账号使用英文字母、数字或 . @ - _，密码需要 12～256 位。交互执行 npm run setup，或使用 npm run setup -- --generate 自动生成密码。",
  );
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
writeFileSync(
  ".env.local",
  `DATA_DIR=./data\nAPP_ORIGIN=http://localhost:3000\nCOOKIE_SECURE=false\nADMIN_USERNAME=${username}\nADMIN_PASSWORD_HASH=${hash}\n`,
  { mode: 0o600, flag: "wx" },
);
console.log(
  `已创建本地配置，管理账号：${username}。启动 npm run dev 后访问 /admin/login。`,
);
if (generate) console.log(`请保存本次生成的密码（只显示一次）：${password}`);
