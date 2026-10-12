# happy-game

面向手机端的个人桌游收藏站，由站主统一维护，朋友通过链接免登录浏览。

## 首期功能

- 收藏录入：维护已拥有桌游的封面、介绍、适合人数和预计时长。
- 艺术画廊：以桌游封面为核心展示收藏，并支持进入详情。
- 列表总览：查看全部收藏，按参与人数筛选适合的桌游。
- 按人数选游：输入参与人数，从已有收藏中筛选支持的桌游，最佳人数匹配优先。

## 当前状态

首期应用已实现并通过本地生产构建及自动化验证。采用 Next.js App Router、React、TypeScript、CSS Modules 和 SQLite，单实例运行，持久化保存资料与封面。首页现为 Apple-inspired 深色沉浸式横向艺术画布，封面支持左右滑动与按钮翻页；列表、详情和管理页统一使用克制的系统灰、圆角层级与蓝色强调色。具体版本已锁定在 `package-lock.json`。

完整的页面、数据模型、推荐规则、接口、部署与验收方案见 [概要设计](docs/overview-design.md)。首期的“组局”仅指按人数选游，不包含活动创建、邀请或报名。

2026-10-12 已在本机收藏库录入用户提供的 9 款桌游，连同原有卡坦岛共 10 款；资料与封面保存在被忽略的 `data/` 中，不随代码仓库分发。版本与估算时长说明见各桌游详情。

开发前阅读 [贡献指南](AGENTS.md) 和 [工作约定](CLAUDE.md)。

## 本地启动

环境要求：Node.js 22.12 以上，npm 10 以上。

```bash
npm ci
npm run setup
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。`setup` 交互设置管理账号和密码，密码输入不回显，仅将 scrypt 哈希写入 Git 忽略的 `.env.local`。也可执行 `npm run setup -- --generate` 自动生成密码并显示一次；已有配置不会被覆盖。

管理入口为 `/admin/login`。初次没有收藏，登录后录入第一款桌游即可。项目不会自动植入示例桌游或默认密码。

局域网手机预览时，使用电脑的局域网 IP 和 3000 端口；如果需要在手机维护资料，将 `.env.local` 的 `APP_ORIGIN` 改成手机实际访问的完整地址，并重启开发服务。公开浏览不要求登录。

通过 ngrok 分享本地 3000 端口时，先启动应用，再在另一个终端执行：

```bash
env -u http_proxy -u https_proxy -u all_proxy \
  -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY ngrok http 3000
```

该命令仅对本次 ngrok 进程禁用代理，避免因继承代理环境变量触发 `ERR_NGROK_9009`；其他命令仍使用原有代理。使用终端输出的 HTTPS 地址访问，按 `Ctrl+C` 关闭隧道。若通过该地址维护资料，将 `APP_ORIGIN` 改成该完整地址、`COOKIE_SECURE` 设为 `true`，然后重启应用；仅公开浏览无需修改配置。

同一公网地址只启动一个 ngrok 进程；出现 `ERR_NGROK_334` 时，先在原 ngrok 终端按 `Ctrl+C` 关闭已有隧道，再重试。

## 常用命令

| 命令                   | 用途                                        |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | 启动本地开发服务                            |
| `npm run setup`        | 首次设置本地管理员                          |
| `npm test`             | 校验规则、SQLite 推荐、认证、图片与备份测试 |
| `npm run lint`         | ESLint 静态检查                             |
| `npm run typecheck`    | TypeScript 类型检查                         |
| `npm run format:check` | Prettier 格式检查                           |
| `npm run build`        | 生成生产构建                                |
| `npm start`            | 启动已构建的生产服务                        |
| `npm run test:e2e`     | Playwright 手机尺寸的浏览器与接口测试       |
| `npm run backup`       | 创建数据库与封面的完整备份                  |

首次浏览器测试先执行 `npx playwright install chromium`，然后 `npm run build`、`npm run test:e2e`。测试自动启动独立的 3100 端口服务，使用系统临时目录和临时账号，完成后清理，不读取或修改实际收藏库；3100 端口需空闲。

## 配置与数据

| 环境变量              | 说明                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ |
| `DATA_DIR`            | 数据根目录，默认 `./data`，包含 SQLite 和 `uploads/`                                 |
| `APP_ORIGIN`          | 访问网站的完整来源，如 `https://games.example.com`；所有写入校验该来源，不带末尾斜杠 |
| `ADMIN_USERNAME`      | 管理账号                                                                             |
| `ADMIN_PASSWORD_HASH` | 初始化生成的 scrypt 密码哈希，不填写明文密码                                         |
| `COOKIE_SECURE`       | 本机 HTTP 使用 `false`，线上 HTTPS 必须使用 `true`                                   |
| `BACKUP_DIR`          | 备份输出目录，默认 `./backups`，可指定独立挂载目录                                   |

`.env.local`、`data/`、`backups/`、测试报告及本地记忆不进入版本控制。封面仅接受 JPEG、PNG、WebP，限制 5 MB 和 2000 万像素，重新编码为 WebP 并生成缩略图。所有收藏保存后立即公开，仅录入允许分享的内容与图片。

## 部署与备份

Docker 部署提供 `Dockerfile` 和 `compose.yaml`。使用独立的部署环境文件配置真实 `APP_ORIGIN`、管理员账号和密码哈希，然后执行：

```bash
docker compose --env-file "/path/to/deploy.env" up --build -d
```

容器以普通用户运行，资料保存在命名卷 `collection-data`。3000 端口仅绑定服务器回环地址，由服务器上的 HTTPS 反向代理对外提供服务；部署配置不会复制进镜像。只运行一个应用实例，避免无持久磁盘的平台或多个实例各自持有不同收藏。

本地使用 `npm run backup`；容器内可使用 `docker compose exec web node scripts/backup.mjs`。备份期间短暂锁住数据库写入，使用 SQLite 一致快照，并复制快照引用的原图与缩略图；读取仍可继续。失败副本带 `.partial` 后缀，不用于恢复。

建议每天及迁移前备份，至少保留最近 7 份并另存到独立存储。恢复时停止应用，将完整备份中的数据库和 `uploads/` 放入一个新的数据目录，修改 `DATA_DIR` 指向该目录后启动；不要在运行中覆盖数据库，也不要将旧 WAL 文件带入新目录。Docker 备份默认位于容器 `/app/backups`，需通过 `docker cp` 导出或配置独立备份挂载，不能只保留在容器内。

## 验证状态

2026-10-12 完成前端艺术重设计：参考 Apple iPhone / Vision Pro 的连续叙事、留白和横向画布节奏，首页画廊改为可横向滚动的深色舞台，增加左右浏览控件；导航、筛选、列表、详情、登录、管理表单及图标统一为 Apple-like 视觉语言。真实浏览器检查确认手机 viewport 无横向溢出，画布翻页可用。

2026-10-11 在 Node.js 22.22.3 / npm 10.9.8 的本机环境验证：

- `npm ci`、ESLint、TypeScript、Prettier 检查和生产构建通过，构建没有应用打包警告。
- 30 个单元测试通过，包括真实 SQLite 推荐、人数边界、资料校验、会话注销/过期、图片处理、初始化保护和完整备份恢复。
- 3 项 Playwright 浏览器流程通过，运行实际 standalone 生产服务，覆盖游客权限、管理员完整维护、跨来源拒绝、300 款收藏分页/搜索/人数推荐、返回位置，以及 320/390/430 像素宽度的画廊、列表和选游无横向溢出。
- 已回读手机与桌面截图，截图中的 300 款桌游均为隔离测试资料，不会出现在实际收藏中。
- Docker Compose 配置语法检查通过；本机 Docker daemon 未运行，未验证镜像构建与容器启动。

浏览器尺寸模拟不等同于实体手机、微信内置浏览器或线上访问验证；概要设计中的 LCP 目标仍需在实际部署和网络环境下测量。
