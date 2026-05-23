# TDD 执行报告：anti-crawl.middleware.ts

## 源文件
`apis/middleware/anti-crawl.middleware.ts`

## 测试文件
`tests/apis/middleware/anti-crawl.middleware.test.ts`

## 测试结果

**37 个测试，全部通过**

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | 97.77% |
| Branch | 95% |
| Functions | 100% |
| Lines | 100% |

未覆盖分支：line 14 的 `if (now - record.lastReset > WINDOW_MS)` 在清理定时器中的 false 分支（Map 迭代中删除元素的边界情况）

## 测试分类

### 1. 正常请求（4个测试）
- 合法 User-Agent 请求调用 next()
- 使用 req.ip 作为标识
- req.ip 不存在时使用 socket.remoteAddress
- ip 和 remoteAddress 都不存在时使用 "unknown"

### 2. IP 封锁检查（1个测试）
- 被封锁的 IP 返回 403

### 3. 封锁过期自动解除（1个测试）
- 封锁到期后自动解除并允许请求通过

### 4. 请求计数与窗口重置（3个测试）
- 同一 IP 多次请求累计计数直到阈值
- 不同 IP 独立计数
- 窗口过期后计数重置

### 5. User-Agent 检查（5个测试）
- 没有 User-Agent 返回 403
- User-Agent 长度小于 10 返回 403
- User-Agent 长度等于 10 通过
- User-Agent 长度为 9 返回 403
- 合法的 User-Agent 通过

### 6. 超过阈值触发封锁（2个测试）
- 201 次请求后封锁 IP 返回 403
- 封锁后清除该 IP 的请求计数

### 7. 边界条件与复合场景（6个测试）
- 被封锁 IP 的后续请求在封锁期内都返回 403
- 一个 IP 被封锁不影响其他 IP
- 恰好 200 次请求不触发封锁（第 201 次才触发）
- 窗口内请求计数准确
- 封锁到期后过期记录被清除
- count > THRESHOLD 才封锁

### 8. evictOldest 驱逐策略（2个测试）✨ 新增
- requestCounts 超过 MAX_ENTRIES(10,000) 时驱逐最旧条目
- blockedIPs 超过 MAX_ENTRIES(10,000) 时驱逐最旧条目

### 9. 清理定时器（3个测试）✨ 新增
- 定时器应清理过期的请求计数记录（jest.useFakeTimers + advanceTimersByTime）
- 定时器应清理过期的封锁记录
- 定时器不应清理未过期的请求计数（验证 false 分支）

### 10. IP 解析边界条件（3个测试）✨ 新增
- req.ip 为空字符串时回退到 socket.remoteAddress
- req.socket.remoteAddress 为 undefined 时使用 "unknown"
- 使用 "unknown" IP 的请求也正确计数和封锁

### 11. User-Agent 边界条件补充（3个测试）✨ 新增
- User-Agent 为空字符串时返回 403
- User-Agent 为 undefined（header 不存在）时返回 403
- User-Agent 为全空格但长度>=10 时通过

### 12. 封锁持续时间验证（1个测试）✨ 新增
- 封锁应在恰好 10 分钟（599,999ms 仍封锁，600,000ms 解封）

### 13. 连续封锁与解封（2个测试）✨ 新增
- IP 被封锁、解封后再次超限应再次被封锁
- 多个 IP 同时被封锁和同时解封

### 14. 封锁后请求计数清除（1个测试）✨ 新增
- IP 被封锁后 requestCounts 中该 IP 的记录应被删除

## 技术要点

- 使用 `jest.resetModules()` + `require()` 在每个测试前重置模块内部状态（`Map` 集合）
- 使用 `jest.spyOn(Date, 'now')` 模拟时间流逝，测试封锁过期和窗口重置
- 使用 `Object.defineProperty` 创建可配置的 `ip` getter 来绕过 Express `Request.ip` 的只读限制
- 使用 `jest.useFakeTimers()` + `jest.advanceTimersByTime()` 测试 setInterval 清理定时器回调
- 常量覆盖：SUSPICIOUS_THRESHOLD=200, WINDOW_MS=60000, BLOCK_DURATION_MS=600000, MAX_ENTRIES=10_000
- evictOldest 测试通过创建 10,001 个不同 IP 触发 MAX_ENTRIES 驱逐机制
