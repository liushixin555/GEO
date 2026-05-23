# TDD 执行报告：apis/utils/db.util.ts

## 文件信息
- **源文件**: `apis/utils/db.util.ts`
- **测试文件**: `tests/apis/utils/db.util.test.ts`
- **执行日期**: 2026-05-24

## 源文件功能
- `getPrisma()`: 获取 PrismaClient 单例实例，首次调用时创建，根据 NODE_ENV 配置日志级别
- `closePrisma()`: 断开 PrismaClient 连接并重置为 null

## 测试用例设计（11个）

### getPrisma（6个）
1. 首次调用创建新 PrismaClient 实例
2. 后续调用返回同一实例（单例模式）
3. NODE_ENV=development 时配置 query/error/warn 日志
4. NODE_ENV=production 时配置 error 日志
5. NODE_ENV 未设置时默认 error 日志
6. NODE_ENV=test 等非 development 值时配置 error 日志

### closePrisma（4个）
7. prisma 存在时调用 $disconnect 并重置
8. prisma 为 null 时不抛异常，不调用 disconnect
9. 关闭后重新创建实例（构造函数再次调用）
10. 关闭+重新打开后仍然保持单例

### 交互（1个）
11. 支持多次 open/close 循环

## 测试结果

```
PASS api tests/apis/utils/db.util.test.ts
  ✓ should create a new PrismaClient instance on first call
  ✓ should return the same instance on subsequent calls (singleton)
  ✓ should pass development log config when NODE_ENV=development
  ✓ should pass production log config when NODE_ENV=production
  ✓ should pass production log config when NODE_ENV is not set
  ✓ should pass production log config for non-development NODE_ENV
  ✓ should disconnect and reset prisma to null when prisma exists
  ✓ should not throw when prisma is null
  ✓ should allow creating a new instance after closePrisma
  ✓ should create the same singleton again after close+reopen
  ✓ should support multiple open/close cycles

Tests: 11 passed, 11 total
```

## 覆盖率

| File | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| db.util.ts | 100% | 100% | 100% | 100% |

## 测试策略
- Mock `@prisma/client` 的 PrismaClient 构造函数
- 使用 `jest.resetModules()` 重置模块级 `prisma` 变量，确保每个测试独立
- 通过 `mockClear()` 确保调用计数准确
- 覆盖了所有分支：development vs 非 development 的日志配置、prisma null vs 非null 的断开逻辑
