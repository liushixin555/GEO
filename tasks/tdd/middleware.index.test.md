# TDD 执行报告：middleware 模块汇总

**日期**: 2026-05-24
**范围**: `apis/middleware/index.ts` 及其所有导出模块

## 模块结构

```
apis/middleware/
├── index.ts              — 重导出入口
├── auth.middleware.ts     — JWT 认证 + 角色权限
├── rate-limit.middleware.ts — 请求限流
└── anti-crawl.middleware.ts — 反爬虫
```

## 总体测试结果

| 指标 | 数值 |
|------|------|
| 测试套件 | 3 passed |
| 测试用例 | 93 passed, 0 failed |
| 耗时 | ~12s |

## 覆盖率总览

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| index.ts | 100% | 100% | 100% | 100% |
| auth.middleware.ts | 100% | 100% | 100% | 100% |
| rate-limit.middleware.ts | 100% | 100% | 100% | 100% |
| anti-crawl.middleware.ts | 97.77% | 95% | 100% | 100% |
| **总体** | **98.7%** | **96%** | **100%** | **100%** |

## 各模块测试详情

### auth.middleware.test.ts — 35 个测试

| 分类 | 测试数 | 覆盖范围 |
|------|--------|---------|
| 无 authorization header | 2 | 缺失、空字符串 |
| 格式错误 header | 3 | Basic、Bearer无空格、Token格式 |
| 无效 token | 4 | 完全无效、过期、错误密钥、空token |
| 有效 token | 3 | 完整payload、companyId=null、无companyId |
| req.user 不存在 | 2 | 未设置、undefined |
| 角色不匹配 | 3 | 非允许角色、view只允许admin、空列表 |
| 角色匹配 | 4 | 单角色、多角色之一、sysadmin、view |
| 安全边界 | 7 | 小写bearer、大写BEARER、篡改token、companyId=0、额外字段、空格header、undefined |
| 工厂函数特性 | 3 | 返回函数、独立实例、引用匹配 |
| 集成流程 | 3 | 有效+匹配→通过、有效+不匹配→403、无效→401 |
| AuthPayload集成 | 1 | 全字段验证 |

### rate-limit.middleware.test.ts — 21 个测试

| 分类 | 测试数 | 覆盖范围 |
|------|--------|---------|
| 导入和初始化 | 2 | 导入、类型检查 |
| 调用参数验证 | 5 | windowMs、max、消息、standardHeaders、legacyHeaders |
| 中间件行为 | 3 | 正常通过、限流429、多次请求 |
| 配置集成 | 3 | 环境变量windowMs、max、默认值 |
| 边界情况 | 5 | 最小值1、非法值0报错、极大值 |
| index.ts重导出 | 3 | rateLimitMiddleware、auth/role、antiCrawl |

### anti-crawl.middleware.test.ts — 37 个测试

| 分类 | 测试数 | 覆盖范围 |
|------|--------|---------|
| 正常请求 | 4 | 合法UA、ip、remoteAddress、unknown |
| IP 封锁检查 | 1 | 被封锁IP返回403 |
| 封锁过期解除 | 1 | 到期自动解除 |
| 请求计数与窗口 | 3 | 累计计数、独立IP计数、窗口重置 |
| User-Agent 检查 | 5 | 无UA、短UA、边界10/9、合法UA |
| 超阈值封锁 | 2 | 201次封锁、计数清除 |
| 边界与复合场景 | 6 | 连续403、IP隔离、恰好200次、计数准确、过期清除、阈值判断 |
| evictOldest策略 | 2 | requestCounts/blockedIPs MAX_ENTRIES驱逐 |
| 清理定时器 | 3 | 过期计数清理、过期封锁清理、未过期保留 |
| IP解析边界 | 3 | 空字符串、undefined、unknown计数封锁 |
| UA边界补充 | 3 | 空字符串、undefined、全空格 |
| 封锁持续时间 | 1 | 恰好10分钟（599999ms/600000ms） |
| 连续封锁解封 | 2 | 重封、多IP同时 |
| 封锁后计数清除 | 1 | 解封后计数从1开始 |

## 未覆盖分析

**anti-crawl.middleware.ts line 14**（95% Branch）:
- 清理定时器 `setInterval` 回调中 `if (now - record.lastReset > WINDOW_MS)` 的一个分支
- 原因：`setInterval` 回调在覆盖率工具中难以完全追踪
- 影响度：低（定时器逻辑已有 3 个专项测试验证行为正确性）
- 该行 Lines 覆盖率为 100%，仅 Branch 未完全覆盖

## 技术亮点

1. **模块隔离**：所有测试使用 `jest.resetModules()` + `require()` 确保模块状态独立
2. **时间模拟**：anti-crawl 使用 `jest.spyOn(Date, 'now')` 和 `jest.useFakeTimers()` 测试时间相关逻辑
3. **IP getter 模拟**：anti-crawl 使用 `Object.defineProperty` 创建可配置的 `req.ip` getter
4. **配置验证**：rate-limit 测试验证了 config 的 min 值约束（windowMs 和 max 均 ≥1）
5. **JWT 完整性**：auth 测试覆盖了 token 生成、验证、过期、篡改等全生命周期
