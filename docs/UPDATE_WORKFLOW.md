# 更新与发布流程

按改动范围完成一次验证、一次构建，并保存每个发布步骤的结果。网络中断后从未完成的步骤继续。

## 三类更新

| 改动 | 写入位置 | 验证与发布 |
| --- | --- | --- |
| 每周新增论文、模型、数据集 | 既有 `/api/updates` 接口 | 原始来源核验、幂等写入、读回；无需重建云端应用 |
| 人物、任职、论文纠错、团队审定 | 版本化目录 | 目录和关系测试；发布两个网站 |
| 页面交互、后端与存储 | 应用源码 | 按影响运行测试；交互变更做针对性浏览器检查，后端变更做本地接口测试 |

已有每周任务和 Pages 定时同步保持原样。研究关系由论文作者数据生成，补录作者后不另行维护一份人物连线表。

## 生成发布清单

打开现有 Sites 源码时保留其返回的提交号。通过 GitHub 连接读取 `main` 的提交和 tree SHA，完成本次编辑后运行：

```sh
npm run release:plan -- --base <打开源码时的提交> --github-head <GitHub当前main提交> --github-tree <GitHub当前tree>
npm run release:check
npm run release:status
```

省略 GitHub 参数可只做本地检查。`--base` 默认是本地 `HEAD`；发布途中已产生新提交时，应继续使用原始基线，避免漏掉尚未同步到另一站点的更改。

清单自动记录新增、修改和删除的路径、Git 内容摘要、必要检查以及浏览器/接口复核提示。所有请求材料和进度保存在被 Git 忽略的 `.release-state/` 中。它们不进入源码、静态站或网站部署包，不包含发布凭据。

检查按改动选择：更新人物网络逻辑时检查人物网络和目录；更新公开资料同步时检查数据合并与网络失败处理；共享目录、基础代码、依赖、CI 或未知改动运行完整检查。成功检查只在源码内容和运行环境相同的情况下复用，失败结果不会缓存。完整复核使用：

```sh
npm run release:check -- --all --no-cache
```

## 构建与上传

Sites 仍使用官方源码同步、构建和打包流程。`release:status` 返回 `reuseWorkerBuild`：

- 为 `false`：在源码 helper 的命令列表中先执行既有 `build-site.mjs`，成功后执行 `node scripts/release.mjs stamp-build --input <status返回的buildInput>`。
- 为 `true`：构建输入和产物内容均未改变；网络重试可省略已完成的构建命令。
- 本地源码或产物改变会使复用失效。必须重新生成计划；不能用旧构建发布新代码。

GitHub 树请求默认控制在 **120,000 UTF-8 字节**以内。较小文件合并提交，较大文件先创建 Git blob，树中仅引用其 SHA。清单直接包含连接器所需请求，不需要重新拼装整份目录或把大段源码写进对话。

发布到 GitHub 前，核对远程基线中的待改文件仍符合清单的 `previousSha`。创建 tree 后读取完整递归树，并校验：

```sh
npm run release:verify-tree -- --file <忽略目录内的远程tree.json>
```

全部文件与本地摘要一致后，创建一个提交，再用 `expected_sha` 更新 `main`，保持 `force: false`。Pages 的正式构建由 CI 执行一次。仅文档变更不会触发网站重新构建；手动触发和每周刷新仍可使用。

## 记录进度与恢复

```sh
npm run release:receipt -- --stage blob --sha <已确认上传的blob摘要>
npm run release:receipt -- --stage sitesVersion --id <已保存版本ID> --status saved
npm run release:receipt -- --stage sitesDeployment --id <部署ID> --status succeeded
npm run release:receipt -- --stage githubPages --id <工作流runID> --status succeeded --sha <发布提交>
npm run release:status
```

凭据永不写入这些记录。记录实际工具结果，不能把“已开始”记成“已成功”。重新规划但代码不变时保留进度；GitHub 基线改变时清除旧 tree/commit/发布回执，已经上传的不可变 blob 可继续使用。

| 失败位置 | 恢复动作 |
| --- | --- |
| 资料抓取 | 网络、429、5xx 最多尝试两次；权限错误和格式错误直接报告 |
| 源码 push 或部署包上传 | 核对版本状态，复用未改变的构建和同一归档，重试该步骤 |
| 已保存版本的部署 | 继续查询原部署；失败原因修复后使用已保存版本 |
| GitHub blob/tree 上传 | 使用清单和已完成摘要，仅补传未成功项目 |
| GitHub 更新分支出现冲突 | 读取新 head，合并并重新规划，禁止强推覆盖 |
| Pages 工作流失败 | 查看失败步骤；源码未变时重跑失败任务，无需重发云端站点 |

## 静态数据的一致性

Pages 刷新将云端公开增量与当前源码合并。对于同一个论文 ID，以源码中的作者、日期、摘要和依据为准；云端落后一个版本不会覆盖刚完成的修正，新加入的源码记录也不会丢失。相同关系的证据同样优先使用源码版本。

抓取使用每次 8 秒的请求上限和一次短暂退避重试。源码发布遇到刷新失败保留已核验副本并给出提示；每周定时刷新依然要求成功取得新资料，否则停止发布，避免把旧数据标成新抓取。
