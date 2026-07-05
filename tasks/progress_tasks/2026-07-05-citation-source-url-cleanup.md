# 2026-07-05 引用检测来源 URL 清洗补强

## 背景

手动触发真实检测后，豆包返回的部分来源 URL 带有 markdown 换行标记或中文智能引号，例如 `https://www.mckinsey.com\n-`、`https://www.hejun.com”`。这类来源不会误命中，但会污染台账展示和后续追踪。

## 变更

- `cleanUrl()` 入库前截断 `\r` / `\n` / `\\r` / `\\n` 之后的 markdown 列表尾巴。
- 清理中英文智能引号、中文标点、尾随句点等 URL 后缀噪音。
- 增加 collector 单元测试，覆盖 markdown 列表尾巴和中文右引号。

## 验证

- `npx.cmd jest --config tests/apis/citation-collector.jest.config.cjs --runTestsByPath tests/apis/citation-collector.util.test.ts --no-cache`
- 真实豆包单模型复检成功，最新 records 已写入干净 URL。
- `npm.cmd run lint`
- `npx.cmd tsc -p tsconfig.api.json --noEmit`
- `npx.cmd tsc -p tsconfig.page.json --noEmit`
