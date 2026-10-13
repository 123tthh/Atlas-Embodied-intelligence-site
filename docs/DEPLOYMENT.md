# 部署与维护

## 当前部署

正式网站：https://embodied-atlas.xyl1122.chatgpt.site

应用使用 React / Vinext 与 Cloudflare Worker / D1。GitHub 保存源码，现有 Sites 环境运行完整网站。`.openai/hosting.json` 保留当前站点身份；只有站点所有者可通过支持的 Sites 发布流程更新该站点。将代码推送到本仓库不会自动触发 Sites 发布。

## 更新应用或基础目录

1. 修改界面、代码或 `lib/` 下的版本化目录，保留出处与核验日期。
2. 运行 README 中的检查和构建。
3. 站点所有者通过 Sites 的源码同步、打包、版本保存和发布流程部署。
4. 数据库迁移随 Sites 发布应用；不能提交本地数据库代替迁移。

GitHub 和 Sites 是两个源码位置，当前未设置双向自动同步。后续修改需要明确同步到双方，避免互相覆盖。

## 每周研究更新

正式站点的云端任务每周二北京时间 10:00 执行。任务读取 `/api/updates/instructions`，检索原始论文、会议、项目及官方材料，提交带来源核验说明的研究条目；写入数据库后即可出现在公共目录，无需重发网站。

- 自动收录可以增加论文、模型、数据集或基准。
- 自动收录不能猜测团队归属、荣誉或技术继承关系。
- 原始请求、去重结果、搜索范围与失败情况保存在运行记录中。
- `lib/catalog.json` 是基础目录；线上新增条目保存在数据库，未配置自动回写本仓库。
- 定时任务属于现有 Sites 站点，不是 GitHub Actions 工作流。

## 运行时配置

| 配置 | 用途 |
| --- | --- |
| `DB` | Sites 提供的 D1 数据库绑定 |
| `ADMIN_EMAILS` | 可审核社区投稿的维护者，逗号分隔 |
| `ATLAS_UPDATE_TOKEN` | 自动更新接口的服务端认证密钥 |

密钥通过托管环境设置，不进入源码、工作流或公共网页。`.env*`、`.dev.vars*`、`.wrangler/` 和本地运行状态均已忽略。仓库不含登录令牌、运行密钥或用户数据库。

## 本机接口检查

先构建、应用本地迁移。社区投稿与收藏接口测试使用 5174 端口：

```sh
npm run start -- --port 5174 --var ADMIN_EMAILS:qa-admin@sites.test
# 在另一个终端执行
python3 tests/api.py
```

自动更新接口测试使用另一个本地预览端口：

```sh
npm run start -- --port 4173 --var ATLAS_UPDATE_TOKEN:local-integration-fixture
# 在另一个终端执行
python3 tests/updates.py
```

上述邮箱和令牌仅为本地测试夹具，不是线上账户或密钥。测试会创建并清理本机测试记录；不要改为线上地址运行。

## GitHub Pages 与独立迁移

[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) 提供静态托管，不能直接运行本项目的 Worker、D1 数据库和登录服务。直接将当前构建目录发布到 Pages 不能获得完整网站。

如果后续增加 Pages 镜像，需要静态构建与项目子路径适配，并为云端收藏、投稿、实时搜索和更新记录明确安排服务入口。若整体迁移到其他平台，则还需要替换认证、数据库绑定和定时任务，并迁移数据。当前仓库同步不改变现有正式网站。

当前认证读取 Sites 网关提供的受信任身份请求头。独立部署不能直接信任公开请求携带的同名头；必须先接入可信认证网关。不能把本地模拟身份当作线上登录。
