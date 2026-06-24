# 2026-06-24 文章生成表格后处理修复

## 问题

直接在生文提示词中追加表格硬规则，会强化模型的“规则检查/合规确认”倾向，导致模型可能输出文章完成报告，而不是文章正文。

## 修复

- 不再向生文提示词追加表格硬规则。
- 在 `apis/service/impl/llm.service.impl.ts` 中保留纯文本后处理：
  - 只处理明显的 Markdown 表格。
  - 修复表头列数与分隔行列数不一致。
  - 展开被模型挤在同一行的表格。
  - 普通包含 `|` 的段落不处理。
- 保留此前已验证的 skill 读取、英文过程句清理、图片可控逻辑。

## 验证

- `node scripts/with-local-env.cjs npx tsc -p tsconfig.api.json --noEmit` 通过。
- `npm.cmd run lint` 通过。
- 3 列表头配 4 列分隔符：后处理可修复。
- 4 列表头配 5 列分隔符：后处理可修复。
- 普通 `DSTE | IPD | LTC` 段落不处理。
- 修复后的表格可被 `markdownToPublishHtml` 转换为 HTML table。
