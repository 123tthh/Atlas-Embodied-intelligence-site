# Embodied Atlas · 具身智能研究地图

**[打开 GitHub Pages 主页](https://123tthh.github.io/Atlas-Embodied-intelligence-site/)** · [云端版本与可选登录](https://embodied-atlas.xyl1122.chatgpt.site) · [免登录留言](https://123tthh.github.io/Atlas-Embodied-intelligence-site/?view=proposals&lang=zh)

A bilingual research atlas for embodied intelligence and robotics. Explore papers, models, teams, researchers, technical relationships and locations — no sign-in required for browsing or community suggestions.

按技术、团队、时间和地点探索具身智能与机器人研究。浏览、搜索、本机收藏和社区留言无需注册或密码，支持中文与英文。

## 可以做什么

- **技术图谱**：时间轴、可展开的分叉树、关系依据与手机纵向阅读模式。
- **研究目录**：论文、模型、数据集和基准；机构、实验室与研究者的已核验资料。
- **世界地图**：研究地点、区域比较与带来源的资料导出。
- **社区留言箱**：填写联系邮箱与建议即可提交，仅维护者能查看；重复重试不会重复入箱。
- **可选 ChatGPT 登录**：云端书架、结构化论文投稿、投稿审核与维护者留言管理。

截至 2026-10-13：GitHub Pages 的数据副本包含 **356** 项研究、**137** 条关系；其中基础目录 354 项，另有 2 项云端核验研究。资料为代表性收录，不是完整文献库或机构排名。

## 两个网址如何配合

| 功能 | GitHub Pages | 云端版本 |
| --- | --- | --- |
| 图谱、目录、世界地图、本机收藏 | 无需登录，资料和资源随站点提供 | 无需登录 |
| 留言箱 | 无需账号；提交时连接公开留言接口 | 无需账号 |
| ChatGPT 登录、云端书架与结构化投稿 | 提供可选的云端入口 | 支持 |
| 每周研究更新 | 从公开目录同步后发布静态副本 | 云端任务检索、核验并写入数据库 |
| 维护者查看留言 | 从云端入口登录 | 仅维护者可见 |

GitHub Pages 的初始页面、字体、图标、地图和目录均不依赖 ChatGPT、Google Fonts 或外部 CDN。仅在主动提交留言、选择云端登录或打开论文原站时访问相应服务。

**网络范围说明：**免登录不等于保证任何地区都能直连。`github.io`、云端留言接口、Gmail 和论文外链的可用性取决于当地网络；本项目无法保证大陆所有运营商均无需 VPN。如果需要国内稳定访问，需要另行部署国内可达的前端与留言服务，必要时使用已备案域名。留言提交失败会保留内容并提供邮件备用入口，不会显示虚假的发送成功。

## 联系与社区建议

公开联系邮箱：**khanhlinh3450l@gmail.com**。

优先使用网页的「社区贡献」留言箱。访客邮箱只用于联系与回复，不公开展示，不创建账户，不加入研究目录或导出数据。留言保存到云端后台，**不会自动发送到联系邮箱**；维护者可登录云端网站，在「留言与投稿」中查看。邮件备用入口会打开访客自己的邮件应用，由访客完成发送。

资料补充请尽量附原始论文、官方项目或机构主页。留言不会未经审核直接变成公开研究记录。

## 自动更新与发布

维护和发布采用可恢复的增量流程：自动生成文件清单、复用相同源码的成功验证、校验双站内容，并从失败步骤继续。命令和恢复方法见 [更新流程](docs/UPDATE_WORKFLOW.md)。

- 云端研究任务：每周二 **10:00（Asia/Shanghai）**，首次定时运行 **2026-10-20**；电脑关机后仍可运行。
- GitHub Pages 工作流：推送到 `main` 时发布；另在每周二 **11:35（Asia/Shanghai）** 拉取公开目录和运行记录并重新发布。GitHub 定时任务可能延后运行。
- 定时同步失败时工作流失败并保留已有网页，不用旧资料冒充新资料；手动源码发布可以使用仓库内已核验的副本。
- 自动同步只读取公开研究和公开更新记录，**不读取或发布留言、邮箱、收藏或未审核投稿**。
- Pages 发布与 Sites 云端发布分别执行。推送 GitHub 不会自动修改 Sites 的服务端代码或数据库。

## 访问统计与全球人物关系网

云端站点与 GitHub Pages 都记录匿名独立访客数和浏览次数。**统计仅维护者可见**：登录云端站点的「数据与更新」，按站点和近 7／30／90 天查看趋势。Pages 的同一页面提供维护者登录入口。独立访客按浏览器估算，跨设备、清除存储和跨域名访问可能重复计数；统计启用前的访问无法补算。访客可关闭本浏览器统计，浏览器隐私信号也会被遵循。

人物关系网包含全球已收录作者，不按国籍筛选。首页提供 Sergey Levine、Chelsea Finn、Marco Hutter、Dieter Fox、Pieter Abbeel、Jemin Hwangbo、Danijar Hafner 与朱少廷等研究圈入口，也可搜索任意已登记姓名。每条关系由共同署名论文产生，支持展开合作圈、两人之间的最短合著路径与原始论文回查；不把合著推断为导师关系或私人相识。

本次按原始 arXiv 记录补全 RoboNet、Diffusion Policy、UMI、Octo、OpenVLA、ACT、RVT 和 BridgeData V2 的作者名单。其余目录仍可能有部分作者名单；没有连线不等于现实中没有合作。

## 本地运行

需要 Node.js **22.13+** 和 npm。

```sh
git clone https://github.com/123tthh/Atlas-Embodied-intelligence-site.git
cd Atlas-Embodied-intelligence-site
npm run install:ci
npm run dev:pages
```

打开终端显示的本地地址，并保留 `/Atlas-Embodied-intelligence-site/` 路径。

构建与预览静态网页：

```sh
npm run build:pages
npm run preview:pages
```

完整云端应用的本地数据库、接口测试和发布流程见 [部署与维护](docs/DEPLOYMENT.md)。本地开发的模拟身份不代表线上认证。

## 数据与代码

| 路径 | 用途 |
| --- | --- |
| `app/ui/` | 共用的图谱、目录、地图与留言界面 |
| `static-site/`、`vite.pages.config.ts` | GitHub Pages 独立前端入口与构建 |
| `lib/catalog.json`、`lib/directory.json` | 版本化基础研究与机构人物目录 |
| `lib/team-reviews.json` | 团队准入及原始证据 |
| `lib/pages-extra-research.json` | 已核验的云端新增研究副本 |
| `app/api/messages/` | 免登录留言、维护者读取与处理接口 |
| `db/`、`drizzle/` | 数据库结构和迁移 |
| `.github/workflows/pages.yml` | Pages 构建、公开数据同步与部署 |
| `tests/` | 目录、图谱、留言与授权行为检查 |

## 许可证与来源

原创应用代码采用 **[MIT License](LICENSE)**。第三方代码、依赖与底图保留其自身许可；Natural Earth 底图为公共领域。论文、模型、外部网站及其内容的权利归原作者，本项目的 MIT 许可不重新授权这些外部资料。来源链接与核验说明应保留。

更多数据口径见 [项目功能与数据说明](docs/PROJECT_DETAILS.md)。
