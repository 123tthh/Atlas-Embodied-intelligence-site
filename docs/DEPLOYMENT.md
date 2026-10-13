# 部署与维护

日常补录、增量验证和发布重试请遵循 [更新流程](UPDATE_WORKFLOW.md)。发布清单与进度由 `npm run release:plan`、`release:check` 和 `release:status` 管理。

## 地址与功能

- GitHub Pages：https://123tthh.github.io/Atlas-Embodied-intelligence-site/
- 云端应用：https://embodied-atlas.xyl1122.chatgpt.site
- 公开联系邮箱：khanhlinh3450l@gmail.com

静态主页独立提供图谱、目录、地图、检索、本机收藏和导出。页面资源从同站加载；开启匿名统计时，会向既有云端站点发送随机浏览器标识和事件编号，无需登录。留言的公开 POST 接口在现有云端运行，访客不需要登录；可选 ChatGPT 登录用于云端书架、结构化投稿与维护者管理。

## GitHub Pages

仓库 Settings → Pages → Source 选择 **GitHub Actions**。`.github/workflows/pages.yml` 在 `main` 更新时构建并发布 `dist-pages/`，也可手动运行工作流。

```sh
npm run install:ci
npm run build:pages
npm run preview:pages
```

默认项目路径为 `/Atlas-Embodied-intelligence-site/`。若换成个人根站或其他项目，在构建前设置 `PAGES_BASE_PATH`，必须以 `/` 开始和结束。前端路由使用查询参数，论文详情分享与刷新保留项目路径。

工作流只上传生成的静态网页，不上传整个源码目录、运行时密钥或数据库。客户端采用系统字体、内联图标与本地地图数据，不依赖外部字体或脚本 CDN。

## 数据同步

云端研究任务在每周二北京时间 10:00 搜索并核验新研究。Pages 工作流计划于周二北京时间 11:35（UTC 03:35）读取公开的 `/api/catalog` 和 `/api/updates`，再发布资料副本。GitHub 定时触发可能延后；不要求本地电脑在线。

- `lib/catalog.json` / `lib/directory.json` 是版本化基础目录。
- `lib/pages-extra-research.json` 与 `lib/pages-update-log.json` 保存一次已核验的公开副本，供首次发布、离线开发和源代码发布备用。
- `scripts/prepare-pages.mjs --refresh` 尝试拉取公开资料，失败时保留仓库副本并明确输出提示；刷新合并时，同 ID 的论文与同一关系优先使用当前源码，防止旧云端版本覆盖新修改。
- `--require-refresh` 用于定时工作流：同步失败就终止发布，现有网页保持可用，不把旧副本显示成新抓取。
- 生成的 `public/data/` 和 `dist-pages/` 不提交源码；定时抓取仅进入发布构建产物，不自动改写仓库数据文件。
- 同步只访问公开目录和公开更新记录，不读取留言、邮箱、书架或未审核投稿。

GitHub Pages 发布和 Sites 服务端发布互相独立。修改后端时，需要先通过 Sites 支持的源码同步、打包和发布流程更新云端，再发布依赖新接口的 Pages。

## 留言箱

`POST /api/messages` 接受 JSON：`requestId`（UUID）、`email`、`message`（5–4000 字），可附空的 `website` 蜜罐字段。不需要账号、密码或 ChatGPT Cookie。

接口接受现有网站同源请求，以及来自 `https://123tthh.github.io` 的跨域 POST；预检明确允许 POST 与 Content-Type，不允许携带跨域身份 Cookie。表单使用 `credentials: omit`。提交响应只返回回执 ID，不返回任何历史留言。

留言保存在独立的 `messages` 表中，包含联系方式、建议、来源、状态和时间。数据库保存哈希化的防刷标识，不保留原始网络地址。相同提交 ID 和正文可安全重试；修改正文后重用 ID 会被拒绝。每个每日防刷标识最多 8 条留言，写入与限额检查在同一条数据库语句中完成。

`GET /api/messages` 和 `PATCH /api/messages` 只允许已有维护者身份读取和处理。通过云端网站的「留言与投稿」进入管理区，可查看最近 200 条留言、标为已处理或重新打开。回复按钮只打开邮件应用，不自动发送邮件；留言也不会自动转发到公开联系邮箱。

留言与邮箱不会进入研究目录、Pages 数据副本或公开导出。请勿将整张留言表导出到公开仓库。

## Sites 运行时与本地接口测试

`.openai/hosting.json` 保留现有站点身份。运行时配置：

| 配置 | 用途 |
| --- | --- |
| `DB` | 托管 D1 数据库绑定 |
| `ADMIN_EMAILS` | 既有维护者账户邮箱，逗号分隔 |
| `ATLAS_UPDATE_TOKEN` | 服务端研究更新认证；亦用于哈希化防刷标识 |

不将密钥写进源码。公开联系邮箱不是管理员身份配置，不会因为填写该邮箱就获得维护权限。`.env*`、`.dev.vars*`、`.wrangler/` 和本地运行状态均被忽略。

先构建：

```sh
npm run build
```

只在空白本地数据库上按顺序执行初始 SQL；已有数据库只执行尚未应用的迁移。所有命令均为 `--local`：

```sh
npx wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_remarkable_franklin_storm.sql
npx wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0001_solid_korg.sql
npx wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0002_sharp_ezekiel.sql
```

启动测试预览：

```sh
npm run start -- --port 4173 --var ADMIN_EMAILS:qa-admin@sites.test --var ATLAS_UPDATE_TOKEN:local-integration-fixture
# 在另一终端中运行
python3 tests/messages.py
python3 tests/updates.py
```

原有收藏与结构化投稿检查使用 5174 端口，见 `tests/api.py`。测试账户和令牌只是本机夹具，不能替代线上认证。不要把集成测试地址改为线上网站。

## 独立部署与网络

当前认证信任 Sites 网关注入的身份头。迁移到其他平台时必须替换可信认证层，不能将公开请求中自带的身份头直接视为登录。D1 数据、留言服务和定时任务也需要迁移；仅复制静态网页不复制后端。

不将「无需登录」描述为「所有地区保证免 VPN」。GitHub Pages、留言服务与外链的连通性由所在网络决定。若需要国内稳定直连，应准备国内可达的静态托管、独立留言接口与适用域名；页面构建支持替换托管路径，后端允许来源也须同步调整。


## 访问统计（仅维护者）

维护者登录云端站点后，在「数据与更新」顶部查看累计独立访客、浏览次数、近 7 / 30 / 90 天去重访客和每日趋势，可分别查看 Sites、GitHub Pages 或两站合计。普通访客无法读取 `/api/analytics`，统计不导出到静态 Pages、公开目录或仓库。既有站点所有者服务凭据可用于私密读回验证。

`POST /api/visits` 接受随机 UUID `visitorId` 和幂等 `eventId`；访问来源由允许的 Origin 推断。服务器使用秘密 HMAC 保存匿名标识，不保存原始 UUID、IP、邮箱、用户身份、搜索词或完整访问 URL。浏览器本地保存随机标识；不跨域识别同一个人，因此两站合计存在跨站重复。同一浏览器切换主要栏目或刷新增加浏览次数，不增加累计独立访客；期间访客在所选天数中重新去重，不能把每天人数相加。

统计从功能启用后的首条有效访问开始；既往流量无法补算。已知机器人和 DNT / GPC 信号被过滤，客户端还排除已登录维护者及选择退出统计的浏览器。「数据与更新」下方可关闭本浏览器统计。浏览器拦截、清除存储、无痕模式和设备变化会影响估计，不能把独立浏览器当成精确真人数。

数据库以原子批次更新累计及每日计数，重复或并发重发同一事件只计一次；每天每个浏览器最多接收 500 次浏览。幂等事件保留 7 天，每日记录保留 400 天，匿名累计访客计数持续保留。轮换用于 HMAC 的服务端秘密会让后续浏览器标识重新计算，应在维护时说明对累计去重的影响。

新增迁移 `0003_purple_mephisto.sql` 仅创建统计表与索引，不修改现有投稿、收藏或研究数据。发布前在本地应用这条迁移，使用 `tests/analytics.py` 检查权限、日期口径、跨站来源、幂等与并发计数；不能向线上发送合成访问来测试。


## GitHub 维护者登录

云端 `/login` 提供 GitHub 与现有 ChatGPT 登录。GitHub 维护者绑定固定账号 ID `184354549`（当前用户名 `123tthh`），不通过用户名或邮箱推断权限。其他 GitHub 账号会被拒绝，其他 ChatGPT 用户只能使用个人功能。网站登录不会授予仓库写权限。

在 `123tthh` 的 GitHub 设置中注册 OAuth App：名称 `Embodied Atlas`，Homepage `https://embodied-atlas.xyl1122.chatgpt.site`，Authorization callback URL `https://embodied-atlas.xyl1122.chatgpt.site/api/auth/callback/github`。关闭 Device Flow。只请求 `read:user`，不申请邮箱或仓库权限。

Sites 运行时密钥：`AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`、至少 32 字符的随机 `AUTH_SECRET`。全部由服务器读取，不能放入源码、前端变量或构建产物；设置后重新部署。缺少配置时入口显示配置中，API 返回 503。

认证使用 Auth.js，开启 state、PKCE 和 CSRF 检查。生产会话 cookie 为 `__Host-atlas.session-token`，Secure、HttpOnly、SameSite=Lax，8 小时过期。GitHub access token 不写入会话，管理接口每次验证加密会话及固定账号 ID，写接口校验同源请求。退出 GitHub 后同时退出当前 ChatGPT 网站会话。两种登录方式使用独立个人收藏 ID，不按邮箱自动合并。

验证：`tests/github-auth.mjs` 检查 OAuth/CSRF/PKCE、回调失败、会话签名/过期/身份边界；本地接口集成验证私密收件箱与管理权限。真实 GitHub 登录需要部署密钥后由维护者授权，模拟回调不能替代该验收。
