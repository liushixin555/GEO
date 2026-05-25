# publishing-platform.controller.test — TDD 第四轮执行报告

## 测试文件
`tests/apis/publishing-platform.controller.test.ts`

## 被测文件
`apis/controller/publishing-platform.controller.ts`

## 测试结果
- **总测试数量**: 143 个（Round 1: 55 + Round 2: 45 + Round 3: 11 + Round 4: 32）
- **通过**: 143 个
- **失败**: 0 个
- **执行时间**: ~18s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| publishing-platform.controller.ts | **100%** | **100%** | **100%** | **100%** |

Round 3 覆盖率: 95.08% Stmts / 97.43% Branch / 100% Funcs / 95% Lines
未覆盖行: 27-29（syncLock 冲突 409 路径）

Round 4 覆盖率: **100% 四维全覆盖**

## Round 4 新增测试用例清单（32 个）

### sync 并发冲突 (409) — 4 个测试（直接调用 controller 函数）
1. 并发 sync 请求时返回 409（syncLock 冲突路径覆盖）
2. 冲突时记录 warn 日志 `publishing-platform.sync.conflict`
3. 冲突日志包含 operator role 和 ip
4. 冲突解除后允许后续同步

### qp() 数组参数补全覆盖 — 4 个测试
5. taxonomy 为数组时取第一个值
6. sortOrder 为数组时取第一个值
7. page 为数组时默认为 1（typeof array !== 'string' → NaN → default）
8. pageSize 为数组时默认为 10

### list 错误日志非Error类型 — 4 个测试
9. listAll 抛出字符串时日志记录 String(err)
10. paginated list 抛出字符串时日志记录 String(err)
11. listAll 抛出普通对象时日志记录 `[object Object]`
12. paginated list 抛出 null 时日志记录 `"null"`

### page/pageSize 边界值补充 — 4 个测试
13. 极大 page 值（999999）正常传递
14. pageSize=101 被限制为 100
15. pageSize=200 被限制为 100
16. pageSize=100 最大边界正常通过

### search + taxonomy 组合边界 — 4 个测试
17. search 和 taxonomy 同时超长时先验证 search
18. search 超长但 taxonomy 合法时拒绝
19. taxonomy 超长但 search 合法时拒绝
20. search 和 taxonomy 同时达到最大边界时通过

### sortBy 排序字段边界 — 6 个测试
21. 拒绝 SQL 注入模式 sortBy
22. 拒绝带空格的 sortBy
23. 拒绝 mixed case sortOrder（Asc）
24. 拒绝数字字符串 sortBy
25. 拒绝数字字符串 sortOrder
26. 空字符串 sortBy 绕过验证（falsy 行为确认）

### sync lock 异常类型释放保证 — 3 个测试
27. TypeError 后锁释放，后续同步正常
28. null thrown 后锁释放，后续同步正常
29. undefined thrown 后锁释放，后续同步正常

### 全量返回（deprecated）边界 — 3 个测试
30. admin 角色无分页参数时走 listAll 路径
31. listAll 返回 success 响应（code=0, message=操作成功）
32. 空 search 参数（trim 后为空）走 listAll 路径

## 关键技术点

### syncLock 409 并发测试方案
- 直接调用 `syncPublishingPlatforms` 函数（绕过 HTTP 层）
- 使用 `setImmediate()` 让出事件循环确保锁被获取
- 使用 `resolveFirst!()` 在验证后解除挂起的 Promise
- 避免了 supertest HTTP 层导致的测试挂起问题

### qp() 函数覆盖策略
- Express 中重复 query param 会变为数组（如 `?search=a&search=b`）
- `qp()` 函数处理 `string | string[] | undefined` 三种类型
- page/pageSize 使用 `typeof x === 'string'` 检查，数组时降级为默认值
- Round 4 补全了 taxonomy 和 sortOrder 的数组场景

## 验证命令
```bash
npx jest --config jest.config.ts --no-cache --testPathPattern="tests/apis/publishing-platform.controller" --coverage --collectCoverageFrom="apis/controller/publishing-platform.controller.ts"
```
