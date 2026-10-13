# 0.99 RC · 2026-10-13

## 研究者合作关系网

- 新增朱少廷（Shaoting Zhu）与 Hiking in the Wild（CoRL 2026），补入 OMG 及其与李忆唐的共同署名记录，关联 MARS Lab 和论文署名机构。
- 人物关系网从已收录个人作者构建，支持中心人物、1–3 层合作圈、两人最短路径、年份与合著篇数筛选；每条连线可查看共同论文。
- 支持节点和画布拖动、缩放、姓名检索、中英文、分享与带论文依据的关系导出。团队署名排除，缩写和冲突姓名保持分离；未建档的完整姓名匹配带有明确说明。
- 路径在完整筛选数据上计算，画布上限不截断寻路。当前记录不等同于私人相识或全球完整学术网络。

## 李忆唐与人形控制代表作

- 新增李忆唐（Yitang Li），区分斯坦福博士生身份、清华本科经历与 2025 年 CMU LeCAR 实习。
- 加入 BFM-Zero（ICLR 2026）与 Hold My Beer / SoFTA（CoRL 2025），关联人物、论文索引、团队成果与运动控制图谱；论文归属依原始论文登记。

## Echo in the Steps 与人物目录

- 加入 arXiv:2609.28960 / Echo in the Steps，按官方项目标注 CoRL 2026、清华大学归属和代码即将发布状态；同步论文索引、成果目录与运动控制图谱。
- 新增李旻儒（Ming-Ju Lee），补全李一鸣代表论文与中英文检索；保留并更新厘清智能独立公司条目及创始人关系。
- 论文检索支持 arXiv 编号、会议名称与已登记的作者中文名；修复 GitHub Pages 人物卡片代表研究的链接路径。

## 上下分区与图谱浏览

- 时间图谱与分叉树的工具栏增加可拖动分界线。向上拖动缩小上方区域、增高图谱，向下拖动反向调整；支持键盘、双击恢复和一键收起上栏。
- 图谱增加上下浏览按钮与垂直位置滑杆；浏览页面增加向上/向下翻页和顶部/底部按钮。
- 全图总览随分区高度自动调整；修复长图谱总览后缩小操作反而跳大的问题。

## 图谱交互更新 · 2026-10-13

- 时间画布限制在已有记录的范围，禁止拖出最早年份之前的大块空白；年份跳转同时定位当年的论文。
- 保留时间图谱，新增可切换分叉树：方向 → 有记录的年份 → 论文 → 研究关联。点击节点展开或收起，较大分支按需分批展开。
- 分类连线与论文证据关系分开呈现；关联保留原始方向、比较属性和依据入口，循环关系不会反复生成祖先节点。
- 分叉树支持拖动、缩放、重置、筛选、论文详情与通过页面链接恢复展开状态。
- 新增 8 项分叉布局及画布边界检查；原有 14 项图谱检查通过。


## 已交付

暖白色研究工作台，配合衬线标题、细线分隔和克制的陶土色强调；可缩放、拖动的时间图谱；论文详情抽屉；论文索引与最多三篇对比；研究团队目录；技术关键词检索及中文别名；年份、方向和关系筛选；关系证据弹窗；可分享深链接与筛选视图；本机收藏及 JSON 导入导出；登录后的云端收藏；社区投稿、去重、审核、撤回；arXiv 实时检索与元数据补全；Scholar 及九个会议的检索入口。

当前资料：359 项精选研究，137 条研究关系；包含作者主页、项目与原始论文链接。技术关系与编辑对比显式区分。

## 验证结果

- TypeScript 检查通过，生产构建成功。
- 11 项领域与目录检查通过。
- 29 项本机生产接口检查通过，包括两账户收藏隔离、未审核投稿隐藏、非维护者审核拒绝、批准后收录、重复投稿和 404。
- 浏览器实测：中文技术检索、论文详情、关系依据、双论文对比、收藏刷新后保留、分享后筛选恢复、登录维护者入口、投稿表单、手机图谱与详情布局。
- arXiv 实时请求成功返回 Diffusion Policy 元数据。
- 本地模拟器偶尔在提前拒绝的请求后返回“运行器重启”传输错误；测试仅对此明确错误重试一次，不重试应用返回的失败。

## 预发布范围

精选资料覆盖 2016–2026 年，检索截至 2026-10-13，并非完整或实时目录。Scholar 与会议结果由外部检索提供。未进行大规模负载测试。线上真实登录与多账户体验仍需要真实用户试用反馈。

## Weekly research updates and phone graph reading — 2026-10-13

- A cloud-callable authenticated updater adds source-checked papers, models, datasets and reports to D1. New records appear in the catalog, technical graphs and research list without a website deployment. Curated records, technical edges and team approvals remain under separate evidence review.
- Persistent run history records the search window, checked sources, additions, duplicate skips and failures. Atomic writes and request identifiers make retries safe. Public visitors cannot write through this endpoint.
- The deployed `/api/updates/instructions` endpoint contains revisioned instructions, source scope, supported credential acquisition, authorization, request format and readback/retry behavior for the linked cloud task. The server-only `ATLAS_UPDATE_TOKEN` runtime secret is provisioned through Sites; no credential is stored in source or the schedule prompt.
- Phone graph views now use expandable vertical topics/years and readable paper cards. Filters collapse, relation evidence remains accessible, and details open as a bottom panel with keyboard focus handling. The desktop graph and optional free canvas remain available.
- Validation: TypeScript and production build pass; 22 existing graph/branch checks and 15 local updater integration checks pass. Responsive browser checks cover branch expansion, paper details and filter controls.

## GitHub Pages and open community inbox — 2026-10-13

- Added a standalone static frontend for the repository's GitHub Pages URL. Research browsing, maps, local bookmarks and data exports load from same-site assets without ChatGPT sign-in or external font/script CDNs.
- Added a private community inbox accepting visitor email and suggestions without registration. Maintainers can read and process messages after signing in; private messages are excluded from public research exports.
- Added bounded payloads, explicit cross-origin submission rules, atomic daily limits and idempotent retries. An unconfirmed network request preserves the draft and offers an email fallback.
- Retained optional ChatGPT sign-in for cloud bookmarks, structured research submissions and maintenance.
- Added a Pages release workflow and weekly public-catalog refresh, repository documentation, public contact details and the MIT license. Network reachability remains dependent on the hosting domains and visitor's network.
