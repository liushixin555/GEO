# TDD 执行记录：rate-limit.middleware.test.ts

## 文件路径
- 源码：`apis/middleware/rate-limit.middleware.ts`
- 测试：`tests/apis/middleware/rate-limit.middleware.test.ts`

## 执行时间
2026-05-23

## 测试框架
Jest + @jest-environment node

## 测试结果
- **测试套件**: 1 passed
- **测试用例**: 19 passed, 0 failed
- **耗时**: ~4s

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

### 5. 边界情况 (3个)
- windowMs 为 0 时应正确传递
- max 为 0 时应正确传递（完全禁止请求）
- 极大的 max 值应正确传递

### 6. middleware/index.ts 重导出 (3个)
- rateLimitMiddleware 应通过 index.ts 正确导出
- index.ts 同时导出 authMiddleware 和 roleMiddleware
- index.ts 同时导出 antiCrawlMiddleware

## 测试策略
- 使用 `jest.doMock` 模拟 `express-rate-limit` 模块
- 通过拦截 `rateLimit()` 调用参数验证配置正确性
- 使用 `jest.resetModules()` 确保每个测试独立导入
- 覆盖了正常通过、限流拒绝、边界值和重导出等场景
