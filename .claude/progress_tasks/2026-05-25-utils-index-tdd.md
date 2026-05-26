# 2026-05-25 utils/index.ts TDD 补全

## 变更内容
为 `apis/utils/index.ts` 导出的 6 个工具函数补全 TDD 测试用例

## 文件变更
- `tests/apis/utils/db.util.test.ts` — 新增 1 用例（NODE_ENV 空字符串）
- `tests/apis/utils/response.util.test.ts` — 新增 12 用例（多数据类型/边界码/零值负值）
- `tasks/tdd/utils-index.tdd.md` — TDD 执行报告

## 覆盖率
- db.util.ts: 100% Stmts/Branch/Funcs/Lines
- response.util.ts: 100% Stmts/Branch/Funcs/Lines
- 总用例: 58 passed
