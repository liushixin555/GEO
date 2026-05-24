# server.ts TDD 测试报告

## 测试文件
`tests/apis/server.test.ts`

## 被测文件
`apis/server.ts`

## 测试日期
2026-05-24（更新）

## 测试结果
**23 个测试全部通过**

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branch | 100% |
| Functions | 100% |
| Lines | 100% |

## 测试用例列表

### 服务器启动（9 个）
1. ✅ 应在配置端口上调用 app.listen — 验证 `app.listen(PORT, callback)` 被正确调用，PORT 来自 `config.server.port`
2. ✅ listen 回调中应输出端口日志 — 验证 `[薄云商机倍增服务] Server running on port {PORT}` 日志
3. ✅ listen 回调中应输出环境日志 — 验证 `[薄云商机倍增服务] Environment:` 日志
4. ✅ listen 回调中应调用 startArticleGenerationCron — 验证定时任务在 listen 回调中启动
5. ✅ Swagger 启用时 listen 回调中输出 API 文档 URL — 验证 `[薄云商机倍增服务] API docs: http://localhost:{PORT}/api-docs` 日志
6. ✅ Swagger 禁用时 listen 回调中不输出 API 文档 URL — 验证 `if (config.swagger.enabled)` 的 false 分支
7. ✅ NODE_ENV 未设置时环境日志显示 development — 验证 `process.env.NODE_ENV || 'development'` 的 falsy 分支（undefined）
8. ✅ NODE_ENV 设置为 production 时环境日志显示 production — 验证 truthy 分支
9. ✅ NODE_ENV 为空字符串时环境日志显示 development — 验证 `||` 对空字符串（falsy）的兜底行为

### SEC-APP-07: 请求超时安全设置（4 个）
10. ✅ server.timeout 应设置为 30000ms — 验证 30s 空闲连接超时
11. ✅ server.headersTimeout 应设置为 35000ms — 验证 35s headers 超时
12. ✅ server.requestTimeout 应设置为 30000ms — 验证 30s 请求总超时
13. ✅ headersTimeout 应大于 server.timeout — 验证安全约束（防止底层 socket 先于应用层超时）

### SIGINT 信号处理（4 个）
14. ✅ 注册了 SIGINT 处理器 — 验证 `process.on('SIGINT', handler)` 被调用
15. ✅ SIGINT 回调应输出日志、停止 cron、关闭 Prisma、关闭服务器、退出进程 — 验证完整关闭流程的所有步骤
16. ✅ SIGINT 关闭流程应按正确顺序执行 — 使用 `invocationCallOrder` 验证：日志 → 停止 cron → 关闭 Prisma → 关闭服务器
17. ✅ SIGINT 当 closePrisma 抛出异常时不应关闭服务器和退出进程 — 验证 `await closePrisma()` 异常时后续步骤被跳过

### SIGTERM 信号处理（4 个）
18. ✅ 注册了 SIGTERM 处理器 — 验证 `process.on('SIGTERM', handler)` 被调用
19. ✅ SIGTERM 回调应输出日志、停止 cron、关闭 Prisma、关闭服务器、退出进程 — 验证完整关闭流程
20. ✅ SIGTERM 关闭流程应按正确顺序执行 — 使用 `invocationCallOrder` 验证执行顺序
21. ✅ SIGTERM 当 closePrisma 抛出异常时不应关闭服务器和退出进程 — 验证异常传播

### 默认导出（1 个）
22. ✅ 应导出 app 作为默认导出 — 验证 `export default app`

### server.close 回调（1 个）
23. ✅ server.close 回调应调用 process.exit(0) — 验证退出码正确

## 修复记录
- 修复 Swagger 日志断言 bug：原测试期望 `'Swagger docs'` 但源码输出 `'API docs'`，已更正

## 新增覆盖（相比上一版本）
- **SEC-APP-07 超时设置**：server.timeout / headersTimeout / requestTimeout 的赋值验证 + headersTimeout > timeout 安全约束
- **关闭顺序验证**：使用 `mock.invocationCallOrder` 跨 mock 对象验证执行顺序
- **异常路径**：closePrisma 抛出异常时 server.close 和 process.exit 不被调用的行为
- **空字符串 NODE_ENV**：`process.env.NODE_ENV || 'development'` 对空字符串的兜底

## 测试技术要点
- 使用 `jest.isolateModules` 隔离模块加载，确保每次测试使用全新的模块实例
- 通过拦截 `process.on` 捕获 SIGINT/SIGTERM 处理器，手动触发回调来测试关闭流程
- Mock `app.listen` 返回携带 timeout 属性的 mock server 对象，验证 SEC-APP-07 安全设置
- 使用 `jest.spyOn(process, 'exit').mockImplementation()` 防止测试退出
- 通过 `mock.invocationCallOrder` 实现跨 mock 对象的调用顺序验证
- 使用 `mockRejectedValueOnce` 测试 closePrisma 异常路径
