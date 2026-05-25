# system-config.controller Committer 评审修复

**日期**: 2026-05-26
**关联评审**: `tasks/review/system-config.controller.committer.md`

## 修复概要

评审报告中的所有 P0-P2 修复项已在先前迭代中完成，本次任务验证并补全测试盲区。

## 已验证修复项

| 优先级 | 问题 | 修复方案 | 状态 |
|--------|------|----------|------|
| P0 | GET 密码明文泄露 | `maskSensitiveValue` + `sanitizeConfigItems` | ✅ |
| P1 | 错误消息泄露 key 名称 | 改为 '包含不允许修改的配置项' | ✅ |
| P1 | catch `any` → `unknown` | `catch (err: unknown)` | ✅ |
| P1 | 审计日志缺失 | `logger.info/error` 记录变更操作 | ✅ |
| P1 | 脱敏测试缺失 | 多个 masking 测试用例 | ✅ |
| P2 | Zod 验证 | `schema/system-config.schema.ts` + 路由中间件 | ✅ |
| P2 | 白名单硬编码 | 外置至 `constants/system-config.ts` | ✅ |
| P2 | 传完整 body | Zod schema 在路由层拦截 | ✅ |

## 本次新增测试（3 个）

1. `应拒绝 config_value 超过10000字符` — 超长值边界
2. `应拒绝 configs 数组超过50条` — 超长数组边界
3. `应接受恰好50条配置` — 边界值上限验证

## 测试结果

- 4 个测试套件，492 个测试用例，全部通过
- build + lint + test 均通过

## 关联文件

- `apis/controller/system-config.controller.ts`
- `apis/constants/system-config.ts`
- `apis/schema/system-config.schema.ts`
- `apis/routes/system-config.routes.ts`
- `tests/apis/system-config.controller.test.ts`
- `tests/apis/system-config.schema.test.ts`
- `tests/apis/system-config.service.test.ts`
