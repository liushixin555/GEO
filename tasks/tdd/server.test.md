# server.ts TDD 测试报告

## 测试文件
`tests/apis/server.test.ts`

## 被测文件
`apis/server.ts`

## 测试日期
2026-05-24（更新）

## 测试结果
**13 个测试全部通过**

## 测试用例列表

### 服务器启动 (7 个)
1. ✅ 应在配置端口上调用 app.listen — 验证 `app.listen(PORT, callback)` 被正确调用
2. ✅ listen 回调中应输出端口和环境日志 — 验证 `[薄云商机倍增服务] Server running on port` 和 `Environment:` 日志
3. ✅ listen 回调中应调用 startArticleGenerationCron — 验证定时任务启动
4. ✅ Swagger 启用时 listen 回调中输出文档 URL — 验证 `Swagger docs:` 日志输出
5. ✅ Swagger 禁用时 listen 回调中不输出文档 URL — 验证条件分支
6. ✅ NODE_ENV 未设置时环境日志显示 development — 验证 `process.env.NODE_ENV || 'development'` 的 falsy 分支
7. ✅ NODE_ENV 设置为 production 时环境日志显示 production — 验证 `process.env.NODE_ENV || 'development'` 的 truthy 分支

### SIGINT 信号处理 (2 个)
8. ✅ 注册了 SIGINT 处理器 — 验证 `process.on('SIGINT', handler)` 被调用
9. ✅ SIGINT 回调应输出日志、停止 cron、关闭 Prisma、关闭服务器 — 验证完整的关闭流程

### SIGTERM 信号处理 (2 个)
10. ✅ 注册了 SIGTERM 处理器 — 验证 `process.on('SIGTERM', handler)` 被调用
11. ✅ SIGTERM 回调应输出日志、停止 cron、关闭 Prisma、关闭服务器 — 验证完整的关闭流程

### 默认导出 (1 个)
12. ✅ 应导出 app 作为默认导出 — 验证 `export default app`

### server.close 回调 (1 个)
13. ✅ server.close 回调应调用 process.exit(0) — 验证退出码正确

## 覆盖率分析

| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branch | 100% |
| Functions | 100% |
| Lines | 100% |

### 新增覆盖
- 第 10 行 `process.env.NODE_ENV || 'development'` 的两个分支均已覆盖：
  - `NODE_ENV` 未设置（undefined）→ 显示 `'development'`
  - `NODE_ENV` 设置为 `'production'` → 显示实际值

## 测试技术要点
- 使用 `jest.isolateModules` 隔离模块加载，确保每次测试使用全新的模块实例
- 通过拦截 `process.on` 捕获 SIGINT/SIGTERM 处理器，手动触发回调来测试关闭流程
- Mock `app.listen` 返回 mock server 对象，避免实际启动 HTTP 服务器
- 使用 `jest.spyOn(process, 'exit').mockImplementation()` 防止测试退出
- 通过动态修改 `process.env.NODE_ENV` 覆盖环境变量的两个分支
