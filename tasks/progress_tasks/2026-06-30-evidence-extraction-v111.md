# 2026-06-30 EvidenceCard V1.1.1 Extraction Quality 文档交接

## 目标

补齐 V1.1.1 的文档、验收清单和交接记录，让后续开发者和运营同学知道抽取质量如何判断、真实材料准备好后如何跑第一批验证，以及哪些边界不能突破。

## 本次完成

- 新增 `version-plans/V1.1.1-Evidence-Extraction-Quality.md`，记录 V1.1.1 版本定位、质量规则、fallback 要求、来源边界、验收清单和交接事项。
- 更新 `tasks/dev015.AI知识库.md`，补充 EvidenceCard V1.1.1 质量收口章节。
- 更新 `.Codex/rules.md`，记录 V1.1.1 抽取规则和验收闭环。
- 更新 `.Codex/architecture.md`，记录抽取链路、fallback 与正式文章生成链路的解耦关系。
- 更新 `.Codex/frontend.md`，记录 V1.1.1 前端验收入口、预览字段和审核跳转要求。

## 关键规则

- LLM 抽取只是候选生成，不是事实确认，也不能代替人工审核。
- deterministic fallback 必须保留，用于 LLM 配置缺失、调用失败、超时或输出不可解析时的稳定兜底。
- `save=false` 只返回候选预览，绝不写 EvidenceCard，也不影响正式文章生成 retrieval。
- `save=true` 只能保存为 `draft`，不能直接生成 `verified`。
- portrait 抽取只读取画像 `title/content`，保存 `sourceType=portrait`、`sourceId=画像ID`、`sourceQuality=portrait`。
- image 抽取只读取图片 `title/description/imageUrl`，保存 `sourceType=image`、`sourceId=图片ID`、`sourceUrl=imageUrl`、`sourceQuality=image`，候选 `evidenceType` 优先为 `image_description`。
- portrait/image 读取源材料前必须按知识库 scope 校验当前用户权限，view 角色无权限。
- 真实材料验收仍按 30 条原始材料 -> 20 条 `verified` EvidenceCard -> 3-5 篇文章重生成执行。

## 验收建议

- 接口验收需覆盖 LLM 正常、LLM 非 JSON、LLM 空结果、LLM 返回 `verified`、LLM 不可用走 fallback。
- 数据验收需确认 `save=false` 调用前后 EvidenceCard 数量不变。
- 数据验收需确认 `save=true` 保存结果全部为 `draft`。
- 前端验收需确认 UI 不提供“抽取后直接 verified”的快捷路径。
- 文章验收需确认正式 retrieval 只检索 `verified`，并检查 `evidencePromptPreview`、`evidenceStats`、ArticleEvidenceCard `evidenceSnapshot`。

## 未完成与后续

- 本会话不做核心业务代码，因此未补接口测试或前端自动化测试。
- 真实材料尚需运营准备，未形成文章质量改善结论。
- 主会话最终整合时需确认是否把 V1.1.1 规则同步到 AGENTS.md。

## 验证记录

- 未修改 `.agents/`。
- 未执行 `pnpm test`。
- 未提交。
- 未推送。
- 文档会话未跑构建。

## 2026-06-30 最终整合验收记录

### 已完成核对

- 已阅读 A-后端LLM抽取、B-候选预览体验、C-画像图片抽取入口、D-文档验收交接会话完成总结。
- 多会话重叠文件核对：
  - `apis/service/impl/evidence-card.service.impl.ts` 由 A 增强 LLM/fallback 和 portrait/image source 读取，C 仅依赖该接口，没有覆盖后端核心逻辑。
  - `pages/knowledge/EvidenceCardDetail.tsx` 由 B 收口 manual-text 候选工作台，C 未覆盖该文件逻辑。
  - `pages/knowledge/KnowledgeBaseDetail.tsx`、`PortraitDetail.tsx`、`ImageDetail.tsx` 由 C 增加 portrait/image 抽取入口。
  - D 仅更新文档和记忆，不改核心业务代码。
- 已确认本轮最终整合没有修改 `.agents/`，没有提交，没有推送，没有执行 `pnpm test`。

### 构建与 lint

- `npm.cmd run build:api`：通过。
- `npm.cmd run build:page`：通过。
- `npm.cmd run lint`：通过。

### API / 浏览器验收状态

- API 服务可启动并监听 `8080`，但本机 PostgreSQL `localhost:5432` 不可达。
- 已发现 Windows 服务 `postgresql-x64-17` 存在但为 `Stopped`；尝试启动失败，系统返回无法打开该服务。
- 因数据库不可用，以下真实写库验收未完成：
  - manual + `save=false`
  - manual + `save=true`
  - 空泛营销文本
  - 缺 `text` 返回 400
  - portrait + `sourceId`
  - image + `sourceId`
  - 保存后 draft 列表可见
  - 审核 verified 后正式文章生成 retrieval 可检索
- 浏览器验收依赖登录、抽取和 draft 列表接口，同样因数据库不可用未完成。
- 本轮未创建成功任何 EvidenceCard 测试草稿，因此无 EvidenceCard 测试数据需要清理；API 验收脚本在进入写库前即失败。

### 真实材料质量验收

- 真实运营材料质量验收仍未开始。
- 尚未完成 `30 条原始材料 -> 20 条 verified EvidenceCard -> 3-5 篇文章重生成` 的闭环。
- 因真实材料与文章重生成未跑完，本轮不能给出文章质量改善结论。
