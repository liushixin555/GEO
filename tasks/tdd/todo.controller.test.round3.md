# TDD 执行报告：Todo Controller 第三轮补全

## 执行时间
2026-05-25（第三轮补全 — service 层全覆盖）

## 测试结果
- 测试套件：1 passed
- 测试用例：150 passed（新增 15 个）
- 覆盖率：

| 文件 | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| todo.controller.ts | 100% | 100% | 100% | 100% |
| todo.service.impl.ts | 100% | 100% | 100% | 100% |

## 覆盖率变化
| 指标 | 第二轮 | 第三轮 |
|------|--------|--------|
| todo.service.impl.ts Stmts | 92.99% | **100%** |
| todo.service.impl.ts Branch | 82.66% | **100%** |
| todo.service.impl.ts Funcs | 100% | **100%** |
| todo.service.impl.ts Lines | 96.32% | **100%** |

## 新增测试用例（15个）

### list() default 分支 + companyId 过滤（5个）
1. `list: default tab falls back to my_open behavior (lines 39-40)` — tab 不在枚举值时走 default 分支
2. `list: all_open + non-sysadmin + companyId sets companyId filter (lines 44-45)` — admin 访问 all_open 且有 companyId 时设置过滤
3. `list: all_closed + non-sysadmin + companyId sets companyId filter (lines 44-45)` — admin 访问 all_closed 且有 companyId 时设置过滤
4. `list: all_open + non-sysadmin + null companyId does not set companyId filter` — companyId 为 null 时不设置过滤
5. `list: all_open/all_closed + sysadmin does not set companyId filter` — sysadmin 不受 companyId 过滤

### update() 全字段覆盖（2个）
6. `update: should update all optional fields when provided (lines 152-156)` — 提供 object_type, object_id, action, priority, due_at 时正确映射
7. `update: should set dueAt to null when due_at is empty string` — due_at 为空字符串时设为 null

### reject() fallback 覆盖（1个）
8. `reject: falls back to createdById when no sysadmin user exists (line 305)` — 系统来源待办且无 sysadmin 用户时回退到 createdById

### getObjectOptions() keyword 覆盖（2个）
9. `getObjectOptions: unknown objectType returns empty array (line 393)` — 未知 objectType 返回空数组
10. `getObjectOptions: keyword without action uses deletedAt null filter (line 383)` — keyword 无 action 时使用 deletedAt: null
11. `getObjectOptions: keyword with restore action uses deletedAt not-null filter (line 383)` — keyword restore 时使用 deletedAt: { not: null }

### getAssigneeCandidates() 去重覆盖（3个）
12. `getAssigneeCandidates: no duplicates covers seen.has false branch (line 427)` — 无重复用户时正常返回
13. `getAssigneeCandidates: DB returns duplicate user rows triggers dedup (line 427)` — 数据库返回重复用户行时触发去重
14. `getAssigneeCandidates: filters duplicates when user appears in both operators and sysadmin list` — operator 和 sysadmin 列表出现同一用户时去重

## 关键发现
1. **Lines 39-40 (list default 分支)**：Zod schema 限制了 tab 为 enum 值，controller 层不会传入非法 tab。但 service 层 default 分支是安全网，通过直接实例化 TodoServiceImpl 传入非法 tab 值覆盖。
2. **Lines 44-45 (companyId 过滤)**：controller 层已拦截非 sysadmin 访问 all_open/all_closed，但 service 层仍有防御逻辑。直接测试 service 方法覆盖。
3. **Lines 152-156 (update 可选字段)**：controller 层测试只提供了 title 更新，未覆盖 object_type/object_id/action/priority/due_at 字段。通过 service 直接测试补充。
4. **Line 305 (reject fallback)**：当系统来源待办被驳回但无 sysadmin 用户存在时，`sysadmin?.id` 为 null，回退到 `existing.createdById`。
5. **Line 393 (未知 objectType)**：Zod schema 限制 objectType 为 article/keyword，但 service 层有兜底返回 `[]`。直接测试 service 覆盖。
6. **Line 427 (去重)**：需要模拟数据库返回包含重复 id 的用户数组，使 `seen.has(u.id)` 返回 true 触发过滤。

## 测试策略
- 第二轮之前的 controller 测试通过 HTTP 请求（supertest）测试，覆盖了所有 controller 代码路径
- 第三轮新增的 15 个用例直接实例化 `TodoServiceImpl`，绕过 Zod 验证和 controller 层保护，覆盖 service 层的防御性代码分支
- 这种分层测试策略确保了 controller 和 service 层均达到四维 100% 覆盖率
