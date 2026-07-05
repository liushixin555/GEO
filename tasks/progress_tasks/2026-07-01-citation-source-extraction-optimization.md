# 2026-07-01 AI 引用来源抓取与问题生成优化

## 范围

- 仅优化后端 run-auto 的问题生成、平台名称、AI 来源解析和失败可解释性。
- 不修改前端、不修改自动调度、不运行 seed、不运行 `pnpm test`、不推送。

## 变更

- 平台枚举保持为 `DeepSeek`、`豆包`、`元宝`、`千问`、`Kimi`，系统 LLM 配置和本机兜底配置按这些平台名解析。
- 默认问题改为更像真实用户咨询的选型、能力对比、管理升级问题。
- 自动检测 prompt 不再直接向模型提供我方已发布 URL，避免诱导或强迫模型引用特定链接。
- `extractSources` 支持从嵌套返回中提取带 URL 的 source/citation/reference/search result 对象，并保留 `raw_source`、`citation_snippet`、`answer_snippet`、`source_index`。
- 仅 URL 能进入匹配流程，没有 URL 的标题或来源名不会被当作命中。
- 缺少模型配置或 API Key 返回 `skipped`；单模型 API 报错返回 `error`，不阻断同一批次其他模型继续检测。

## 验证

- `npm.cmd run lint`
- `npx.cmd tsc -p tsconfig.api.json --noEmit`
