# 2026-07-03 引用检测模型调用修复

## 背景

- 发布链接、调度触发、`target_article_id` / `target_article_link_id` 和台账详情链路已通，但检测层只固定跑 `DeepSeek/Kimi`。
- DeepSeek 系统配置为根地址 `https://api.deepseek.com`，旧代码未自动补 `/chat/completions`，导致 HTTP 404。
- Kimi/Moonshot 当前没有系统 LLM 配置，因此 skipped 符合规则，但不应影响其他已启用模型检测。

## 变更

- `citation-collector.util.ts` 新增 `loadEnabledCitationModels()`，默认加载全部启用、未删除、配置完整且 API Key 可解密的 LLM 模型。
- 新增 `normalizeChatCompletionsUrl()`，把根地址或 `/v1` 规范为完整 `/chat/completions`，已有完整路径不重复追加。
- 自动检测使用 `${provider}:${modelName}` 作为 run / record 模型标识，支持按 provider、modelName 或组合标识筛选。
- `citation-detection.scheduler.ts` 不再硬编码 `DeepSeek/Kimi`，每条发布链接跑全部启用模型。
- 无可用模型时写 skipped run，保留文章和发布链接追踪字段。

## 验证

- `npx.cmd jest --config tests/apis/citation-collector.jest.config.cjs --runTestsByPath tests/apis/citation-collector.util.test.ts --runInBand` 通过。
- `npx.cmd jest --config tests/apis/citation-diagnosis-encoding.jest.config.cjs --runInBand` 通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit` 通过。
- `pnpm lint` 通过。
- `pnpm build` 已进入 Prisma generate，但被 Windows Prisma query engine DLL 文件锁阻断；需要停止占用当前项目 Prisma Client 的 Node 进程后重跑。
