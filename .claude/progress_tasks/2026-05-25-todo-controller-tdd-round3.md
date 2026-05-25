# 2026-05-25 todo.controller + todo.service.impl TDD 第3轮

## 变更
- `tests/apis/todo.controller.test.ts` — 新增15个测试用例（135→150个）
- `tasks/tdd/todo.controller.test.round3.md` — 新增TDD执行报告

## 覆盖率
- todo.controller.ts: Stmts/Branch/Funcs/Lines 全部 100%
- todo.service.impl.ts: Stmts/Branch/Funcs/Lines 全部 100%（从 92.99% 提升到 100%）

## 关键变更
- 补充 list() default 分支、companyId 过滤、update() 全字段、reject() fallback、getObjectOptions() 未知类型、getAssigneeCandidates() 去重等 15 个 service 层直接测试用例
