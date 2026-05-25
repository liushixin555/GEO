# auth.controller.ts 安全评审修复 — 2026-05-25

## 变更摘要
根据安全评审报告 `tasks/review/auth.controller.ts.security.md`，修复 auth.controller.ts 及相关文件中的安全问题。

## 修复项（9/10 已完成，L-2 待架构重构）

### 已在之前修复的问题（验证通过）
- H-1: loginLimiter 独立限速已存在（rate-limit.middleware.ts）
- H-2: token-blacklist.util.ts + revokeToken 已实现
- M-1: login catch 块使用固定错误消息
- M-2: verify 使用 req.user + getLatestUserState()
- M-3: getContext 已有 parseInt + isNaN 检查
- L-1: getCompanyDetail view 角色 403 拦截

### 本次修复的问题
- **H-3**: 移除 login 函数中与 Zod Schema 重复的手动验证（typeof/长度检查），信任 Zod 中间件
- **M-4**: getAccessibleProjects 和 getContext 添加 Array.isArray 检查，防止 HTTP Parameter Pollution
- **L-3**: 移除 saveSelection 中多余的 parseInt 调用，Zod 已将 body 转换为正确类型

### 附带修复
- auth.schema.ts: 将 `.trim()` 移至 `.min(1)` 之前，修复空白字符串绕过问题

## 变更文件
- `apis/controller/auth.controller.ts` — 移除冗余验证、添加 Array.isArray 检查
- `apis/schema/auth.schema.ts` — loginSchema `.trim()` 顺序调整
- `tests/apis/auth.controller.test.ts` — 移除已删除分支的测试、添加 M-4 新测试
- `tasks/review/auth.controller.ts.security.md` — 更新修复状态

## 测试结果
- auth.controller.test.ts: 201 用例全部通过
- build:api: 通过
- lint: 通过

## 安全评级变化
- 修复前: B（问题统计 HIGH×3 MEDIUM×4 LOW×3）
- 修复后: A-（仅剩 L-2 模块级单例待架构重构）
