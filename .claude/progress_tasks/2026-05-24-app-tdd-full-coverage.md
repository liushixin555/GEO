# 2026-05-24 app.ts 测试用例补全 — 100% 行/分支覆盖

## 变更内容

补全 `tests/apis/app.test.ts` 测试用例，覆盖 `apis/app.ts` 中此前未测试的两个代码分支。

## 新增测试（10 cases）

### AppError 处理分支（7 cases）
使用 `jest.isolateModules` 模块隔离，mock auth.routes 抛出 AppError 子类，直接测试全局错误处理器的 `instanceof AppError` 分支（line 128-129）：
- AppError (422) / NotFoundError (404) / BusinessError (400) / UnauthorizedError (401) / ForbiddenError (403) / ConflictError (409)
- 认证用户错误日志包含 userId 和 userRole

### Swagger 启用场景（3 cases）
使用 `jest.isolateModules` 设置 `SWAGGER_ENABLED=true`，覆盖 Swagger 路由注册分支（line 94-97）：
- swagger UI 路由注册（非 404）
- swagger JSON 端点注册
- WWW-Authenticate header 验证

## 覆盖率提升

| 指标 | 之前 | 之后 |
|------|------|------|
| Statements | 90.41% | 98.63% |
| Branches | 84.61% | 100% |
| Lines | 91.66% | 100% |
| 测试数量 | 215 | 225 |

## 关键技术

- **`jest.isolateModules`**: 在不修改源码的前提下，mock 路由模块和环境变量，测试此前不可达的代码分支
- 覆盖了 AppError 全部 6 个子类的错误处理路径
