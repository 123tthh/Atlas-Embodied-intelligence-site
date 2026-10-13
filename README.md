# Embodied Atlas · 具身智能研究地图

[打开完整网站](https://embodied-atlas.xyl1122.chatgpt.site) · [项目功能与数据说明](docs/PROJECT_DETAILS.md) · [部署与维护](docs/DEPLOYMENT.md)

按技术、团队、时间与地点浏览具身智能和机器人研究，支持中文与英文。

## 主要功能

- 技术演化时间轴、可展开的分叉树，以及手机纵向阅读模式。
- 团队研究线、论文和模型索引、机构/实验室/研究者目录。
- 世界地图、区域与产业比较，来源证据与可分享的筛选链接。
- 本机收藏与导出；正式网站另有 ChatGPT 登录、云端书架及投稿审核。
- 正式网站每 7 天检索并核验新研究，保存新增条目和运行记录。

## GitHub 与线上网站

这个仓库保存可维护的完整应用源码与版本化基础目录。完整网站继续运行在 Sites 云端，数据库、登录与每周定时任务由线上环境提供。

源码版本：2026-10-13，来自已发布版本 v14。基础目录含 **354** 项研究和 **137** 条关系；线上已另行收录 **2** 项核验研究，截至本次导出共 **356** 项。线上数据库中的新增记录不会自动提交到 GitHub，仓库数据也不会仅因推送就自动改变线上网站。

当前每周任务：**每周二 10:00，Asia/Shanghai**，首次定时执行为 **2026-10-20**。该任务绑定现有线上站点；克隆或 fork 仓库不会复制定时任务、运行时密钥、云端书架或投稿记录。

## 本地开发

需要 Node.js **22.13+** 和 npm。

```sh
git clone https://github.com/123tthh/Atlas-Embodied-intelligence-site.git
cd Atlas-Embodied-intelligence-site
npm run install:ci
npm run build
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --file drizzle/0000_remarkable_franklin_storm.sql
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --file drizzle/0001_solid_korg.sql
npm run dev
```

开发地址默认为 `http://localhost:5173`。上述两条初始化 SQL 只在空白本地数据库上执行一次。先构建并应用迁移，再运行本地服务；开发环境的登录模拟不代表线上身份认证。首次运行依赖下载和构建需要网络。

本地完整生产预览：

```sh
npm run start -- --port 5174
```

## 验证

```sh
npx tsc --noEmit
node tests/domain.mjs
node tests/directory.mjs
node tests/geography.mjs
node tests/regions.mjs
node tests/research.mjs
node tests/relevance.mjs
node tests/graph.mjs
node tests/branches.mjs
npm run build
```

数据库和授权集成检查见 [部署与维护](docs/DEPLOYMENT.md)。这些测试仅用于本机测试数据库。

## 目录

| 路径 | 用途 |
| --- | --- |
| `app/` | 网站页面、响应式界面和服务端接口 |
| `lib/catalog.json` | 版本化研究目录与有来源的技术关系 |
| `lib/directory.json` | 机构、实验室、人物与代表成果 |
| `lib/team-reviews.json` | 团队准入及证据登记 |
| `lib/update-contract.ts` | 自动收录的数据与核验约束 |
| `db/`、`drizzle/` | 数据库结构与迁移 |
| `tests/` | 领域、目录、图谱和接口检查 |
| `.openai/hosting.json` | 现有 Sites 站点的发布绑定 |

## 来源与使用范围

这是有来源的代表性研究目录，不是完整文献库，也不是机构或个人排名。论文全文由原始来源提供；本站保存元数据、链接与核验说明。论文署名、人员当前任职和机构地图代表地点分别记录。

Natural Earth 底图为公共领域；第三方源码的许可保留在对应文件中。本次同步未为整个项目新增开源许可；公开仓库本身不等同于授予任意再分发许可。
