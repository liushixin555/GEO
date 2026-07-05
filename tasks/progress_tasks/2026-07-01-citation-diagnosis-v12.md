# 2026-07-01 引用检测台账与自动检测 V1.2 收口

## 范围

- 本次只做文档、任务记录、长期规则和验收收口。
- 不实现核心业务功能。
- 不修改 `.agents/`。
- 不运行 seed。
- 不运行 `pnpm test`。
- 不推送。

## 已记录结果

### 引用检测台账

- 台账列表应面向非技术人员展示发布链接、引用模型和命中次数。
- 详情抽屉通过 `GET /api/v1/citation-diagnosis/ledger/:articleId/details` 展示检测问题、AI 回答、引用来源和命中片段。
- 详情不可用或暂无数据时展示“暂无检测详情”，不能阻塞列表、搜索、导出和手动复检。

### 自动检测

- `apis/scheduler/citation-detection.scheduler.ts` 异步扫描 `published_article_links`。
- 默认每 30 分钟触发，每轮最多处理 5 条发布链接。
- 每条发布链接最多 2 个问题、2 个模型。
- `ai_citation_detection_runs.target_article_link_id` 用于 articleLink 级 24 小时防重复。
- 平台 `skipped` 表示缺模型配置或 API Key，不算系统失败；单条链接失败不影响其他链接。

### 来源解析与 prompt

- run-auto 问题必须模拟真实用户咨询。
- 自动检测 prompt 不直接提供我方已发布 URL，不诱导模型引用我方链接。
- 引用命中只能通过 URL 标准化匹配。
- source 解析保留 `rawSource`、`citationSnippet`、`answerSnippet`、`sourceIndex` 供台账详情和后续追溯。

### 文章生成 prompt 按 skill 拆分

- `apis/utils/article-prompt-builder.util.ts` 承担 prompt 组装。
- `apis/service/impl/llm.service.impl.ts` 保留模型调用、EvidenceCard retrieval、debug 写入、重写和修复流程。
- Builder 返回 `systemPrompt` / `userPrompt` / `requiredReferenceFiles` / `promptWarnings` / `skillDirs` / `evidencePromptSection` / `evidenceStats`。
- EvidenceCard 检索不能迁入 builder，builder 只负责组装 prompt。

### EvidenceCard 稳定性

- 文章生成调度器写入 `generate_failed` 前必须回读文章状态、版本、ArticleVersion 和带版本 debug。
- 生成结果已提交时不得被后续连接异常覆盖为失败。
- 风险词 warning 只供人工审核，不阻塞生成或 EvidenceCard 注入。

## 更新文件

- `version-plans/V1.2-引用检测台账与自动检测.md`
- `tasks/progress_tasks/2026-07-01-citation-diagnosis-v12.md`
- `tasks/db.数据模型变更汇总.md`
- `tasks/fix.Bug修复汇总.md`
- `.Codex/rules.md`
- `.Codex/architecture.md`
- `.Codex/frontend.md`
- `AGENTS.md`

## 验收

- `npm.cmd run lint`
- `npx.cmd tsc -p tsconfig.api.json --noEmit`

## 遗留事项

- 自动检测需要用真实发布链接观察 1-2 轮，确认 24 小时防重复和 skipped/error 保存行为。
- `extractSources` 需要持续跟进新模型返回结构。
- 台账详情接口建议补 skipped/error、无记录、无发布链接场景的回归覆盖。
- prompt builder 的 comparison / guide / faq / brand / case 专属规则仍待补齐。
- EvidenceCard 仍需完成 30 条材料、20 条 verified、3-5 篇文章重生成的人工验收闭环。
