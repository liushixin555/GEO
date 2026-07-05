# 2026-07-01 文章生成状态稳定性修复

## 背景

EvidenceCard 自测中观察到：个别文章已经写入正文、ArticleVersion、ArticleGenerationDebug 和 ArticleEvidenceCard 后，调度器仍因后续 `Connection error` 进入外层异常分支，并把文章状态覆盖为 `generate_failed`。

## 根因

`apis/scheduler/article-generation.scheduler.ts` 的单篇文章异常处理逻辑在捕获任何异常后直接更新 `status = generate_failed`，没有回读确认成功事务是否已经提交。对于数据库连接抖动、事务提交后客户端收到连接异常等场景，成功生成结果可能已经落库，但状态会被外层 catch 误覆盖。

## 修复内容

- 在调度器中新增 `hasCommittedGenerationResult()`。
- 外层 catch 标记失败前，回读文章当前状态、版本号、最新 ArticleVersion、带 `articleVersionId` 的 ArticleGenerationDebug。
- 如果检测到文章已经离开 `generating`，或版本/内容/debug 显示生成结果已提交，则跳过 `generate_failed` 覆盖，并计入成功处理。
- 保留真正失败时标记 `generate_failed` 的原有行为。
- 在 LLM 生成 debug warnings 中新增基础风险词扫描，命中后写入 `RISK_TERMS_FOUND:...`，不阻塞文章生成。

## 风险词 warning 规则

扫描最终清洗后的正文 `cleanedOutput`，命中以下词时写入 warning：

- `唯一`
- `保证`
- `确保`
- `承诺`
- `绝对`
- `最佳`
- `第一`
- `No.1`
- `100%` / `百分之百`
- `行业领先`

该规则只做人工审核提示，不改变 `qualityPassed`，不改变 EvidenceCard V1/V1.1 检索、注入、保存规则。

## 验收

- `npx.cmd tsc -p tsconfig.api.json --noEmit`：通过
- `npm.cmd run lint`：通过
