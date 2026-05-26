# auth.controller.ts 安全评审验证 — 2026-05-26

## 任务描述
根据 `tasks/review/auth.controller.ts.security.md` 安全评审报告，验证 auth.controller.ts 的所有安全修复。

## 验证结果：9/10 项已修复确认，1 项待架构重构

### 已验证的修复项

| 编号 | 级别 | 问题 | 验证状态 |
|------|------|------|----------|
| H-1 | HIGH | 登录暴力破解防护 | ✅ loginLimiter + account-lockout.util.ts |
| H-2 | HIGH | JWT Token 吊销机制 | ✅ revokeToken + token-blacklist.util.ts |
| H-3 | HIGH | 双层验证冗余 | ✅ Controller 层已移除手动验证 |
| M-1 | MEDIUM | Error.message 泄露 | ✅ 固定消息"用户名或密码错误" |
| M-2 | MEDIUM | verify 重复验证 | ✅ 使用 req.user + getLatestUserState |
| M-3 | MEDIUM | getContext 输入验证 | ✅ parseInt + isNaN + > 0 |
| M-4 | MEDIUM | Array.isArray 防护 | ✅ getAccessibleProjects + getContext |
| L-1 | LOW | view 角色权限 | ✅ getCompanyDetail 403 拦截 |
| L-3 | LOW | parseInt 冗余 | ✅ saveSelection 直接使用 req.body |

### 待架构重构

| 编号 | 级别 | 问题 | 状态 |
|------|------|------|------|
| L-2 | LOW | 模块级 Service 实例 | 已用 createAuthService() 工厂，但仍是模块级调用 |

## 变更文件
- `tasks/review/auth.controller.ts.security.md` — 从 git 历史恢复评审文件
- `tasks/dev001.登录功能.md` — 追加安全评审验证记录

## 验证命令
- `pnpm build` — 通过
- `pnpm lint` — 通过
