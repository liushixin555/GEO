# TDD 执行记录：rate-limit.middleware.test.ts

## 文件路径
- 源码：`apis/middleware/rate-limit.middleware.ts`
- 测试：`tests/apis/middleware/rate-limit.middleware.test.ts`

## 执行时间
2026-05-24（更新）

## 测试框架
Jest + @jest-environment node

## 测试结果
- **测试套件**: 1 passed
- **测试用例**: 61 passed, 0 failed
- **耗时**: ~6s

## 覆盖率
| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branch | 100% |
| Functions | 100% |
| Lines | 100% |

## 测试用例清单

### 1. 导入和初始化 (2个)
- 应成功导入 rateLimitMiddleware
- rateLimitMiddleware 应为可调用函数

### 2. express-rate-limit 调用参数 (5个)
- 应使用正确的 windowMs 配置
- 应使用正确的 max 配置
- 应设置正确的错误消息 (`{ code: 429, message: '请求过于频繁，请稍后再试' }`)
- 应启用 standardHeaders
- 应禁用 legacyHeaders

### 3. 中间件行为 (3个)
- 正常请求应调用 next()
- 模拟限流时返回 429 状态码
- 连续多次正常请求应全部通过

### 4. 配置集成 (3个)
- 使用环境变量中的 windowMs 值
- 使用环境变量中的 max 值
- 默认配置值（无环境变量时 windowMs=60000, max=100）

### 5. 边界情况 (5个)
- windowMs 为最小值 1 时应正确传递
- windowMs 为 0 时应抛出配置错误
- max 为最小值 1 时应正确传递
- max 为 0 时应抛出配置错误
- 极大的 max 值应正确传递

### 6. 配置验证异常值 (9个)
- RATE_LIMIT_WINDOW_MS 为非数字字符串时应抛出错误
- RATE_LIMIT_MAX 为非数字字符串时应抛出错误
- RATE_LIMIT_WINDOW_MS 为负数时应抛出错误
- RATE_LIMIT_MAX 为负数时应抛出错误
- RATE_LIMIT_WINDOW_MS 为浮点数字符串时应抛出错误
- RATE_LIMIT_MAX 为浮点数字符串时应抛出错误
- 极大的 windowMs 值应正确传递
- RATE_LIMIT_WINDOW_MS 为空字符串时应使用默认值
- RATE_LIMIT_MAX 为空字符串时应使用默认值

### 7. 中间件签名和类型 (3个)
- rateLimitMiddleware 接受三个参数 (req, res, next)
- 多次调用同一中间件实例不会创建新实例
- 中间件可在不同 req 对象上复用

### 8. rateLimit 选项完整性 (2个)
- 所有传入 rateLimit() 的选项均存在且类型正确
- message 包含 code 和 message 两个字段

### 9. middleware/index.ts 重导出 (3个)
- rateLimitMiddleware 应通过 index.ts 正确导出
- index.ts 同时导出 authMiddleware 和 roleMiddleware
- index.ts 同时导出 antiCrawlMiddleware

### 10. skip 回调函数 (7个) ✨ 新增
- GET /api/v1/auth/verify 应返回 true（跳过限流）
- POST /api/v1/auth/verify 应返回 false（不跳过）
- GET /api/v1/other 应返回 false（不跳过）
- POST /api/v1/articles 应返回 false（不跳过）
- DELETE /api/v1/auth/verify 应返回 false（method 不匹配）
- PUT /api/v1/auth/verify 应返回 false（method 不匹配）
- GET /auth/verify 应返回 false（路径前缀不匹配）

### 11. articleActionLimiter 导入和初始化 (2个) ✨ 新增
- 应成功导入 articleActionLimiter
- articleActionLimiter 和 rateLimitMiddleware 应为不同实例

### 12. articleActionLimiter rateLimit 调用参数 (8个) ✨ 新增
- 应使用 windowMs=60000（1分钟）
- NODE_ENV=test 时 max 应为 5000
- NODE_ENV=production 时 max 应为 20
- 应设置正确的错误消息
- 应启用 standardHeaders
- 应禁用 legacyHeaders
- 不应包含 skip 选项（所有操作均限流）
- 所有选项 key 集合完整

### 13. articleActionLimiter 中间件行为 (4个) ✨ 新增
- 正常请求应调用 next()
- 模拟限流时返回 429 状态码
- 连续多次正常请求应全部通过
- 中间件可在不同 req 对象上复用

### 14. articleActionLimiter 重导出 (2个) ✨ 新增
- articleActionLimiter 应通过 middleware/index.ts 正确导出
- index.ts 同时导出 rateLimitMiddleware 和 articleActionLimiter

### 15. 两个限流器独立性 (3个) ✨ 新增
- rateLimit() 被调用两次（分别为两个限流器）
- 两个限流器使用不同的 message
- rateLimitMiddleware 有 skip，articleActionLimiter 没有

## 更新历史
- v1（初始）：19个测试
- v2：21个测试 — 修复边界值测试
- v3：35个测试 — 新增14个配置验证/签名/完整性测试
- v4（本轮）：61个测试 — 新增26个测试用例，覆盖率从 83.33% 提升至 **100%**

### 本轮新增测试说明
1. **skip 回调函数** (7个)：全面覆盖 `skip` 函数的 method+path 组合，验证 GET /api/v1/auth/verify 唯一豁免路径、其他 method/path 均不跳过
2. **articleActionLimiter 全量测试** (16个)：覆盖导入初始化、rateLimit()调用参数（windowMs/max/NODE_ENV分支/message/headers/skip缺失/选项完整性）、中间件行为（正常通过/限流拒绝/连续请求/多req复用）、重导出验证
3. **两个限流器独立性** (3个)：验证 rateLimit() 被调用两次、message 不同、skip 选项有无差异

## 测试策略
- 使用 `jest.doMock` 模拟 `express-rate-limit` 模块
- 通过拦截 `rateLimit()` 调用参数验证配置正确性
- 使用 `jest.resetModules()` 确保每个测试独立导入
- 覆盖了正常通过、限流拒绝、边界值、配置验证、skip回调、articleActionLimiter和重导出等场景
- 通过捕获 rateLimit() mock.calls[0] 和 mock.calls[1] 分别验证两个限流器的独立配置
