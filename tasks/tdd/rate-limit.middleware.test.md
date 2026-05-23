# TDD 执行记录：rate-limit.middleware.test.ts

## 文件路径
- 源码：`apis/middleware/rate-limit.middleware.ts`
- 测试：`tests/apis/middleware/rate-limit.middleware.test.ts`
- 类型声明：`dist/apis/apis/middleware/rate-limit.middleware.d.ts`

## 执行时间
2026-05-24（更新）

## 测试框架
Jest + @jest-environment node

## 测试结果
- **测试套件**: 1 passed
- **测试用例**: 35 passed, 0 failed
- **耗时**: ~5s

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

### 6. 配置验证异常值 (9个) ✨ 新增
- RATE_LIMIT_WINDOW_MS 为非数字字符串时应抛出错误
- RATE_LIMIT_MAX 为非数字字符串时应抛出错误
- RATE_LIMIT_WINDOW_MS 为负数时应抛出错误
- RATE_LIMIT_MAX 为负数时应抛出错误
- RATE_LIMIT_WINDOW_MS 为浮点数字符串时应取整
- RATE_LIMIT_MAX 为浮点数字符串时应取整
- 极大的 windowMs 值应正确传递
- RATE_LIMIT_WINDOW_MS 为空字符串时应使用默认值
- RATE_LIMIT_MAX 为空字符串时应使用默认值

### 7. 中间件签名和类型 (3个) ✨ 新增
- rateLimitMiddleware 接受三个参数 (req, res, next)
- 多次调用同一中间件实例不会创建新实例
- 中间件可在不同 req 对象上复用

### 8. rateLimit 选项完整性 (2个) ✨ 新增
- 所有传入 rateLimit() 的选项均存在且类型正确
- message 包含 code 和 message 两个字段

### 9. middleware/index.ts 重导出 (3个)
- rateLimitMiddleware 应通过 index.ts 正确导出
- index.ts 同时导出 authMiddleware 和 roleMiddleware
- index.ts 同时导出 antiCrawlMiddleware

## 更新历史
- v1（初始）：19个测试
- v2（上轮）：21个测试 — 修复边界值测试（windowMs/max=0 抛错验证）
- v3（本轮）：35个测试 — 新增14个测试用例

### 本轮新增测试说明
1. **配置验证异常值** (9个)：验证 config 的 `safeParseInt` 函数对非法输入的处理，包括非数字字符串、负数、浮点数、空字符串、极大值等场景
2. **中间件签名和类型** (3个)：验证中间件函数签名、单例行为、以及在不同请求对象上的复用能力
3. **rateLimit 选项完整性** (2个)：验证所有传入 rateLimit() 的选项 key 集合完整，以及 message 结构正确

## 测试策略
- 使用 `jest.doMock` 模拟 `express-rate-limit` 模块
- 通过拦截 `rateLimit()` 调用参数验证配置正确性
- 使用 `jest.resetModules()` 确保每个测试独立导入
- 覆盖了正常通过、限流拒绝、边界值、配置验证和重导出等场景
- 新增配置异常值测试覆盖了 `safeParseInt` 的 NaN/负数/浮点/空字符串/极大值分支
