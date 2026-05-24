# 2026-05-24 auth.controller.ts 评审问题修复

## 修复概要

基于 tasks/review/auth.controller.ts.quality.md 评审报告的修复（第二轮）。

## 第一轮修复（已完成）

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| H-1 | verify 端点冗余 JWT 验证 | 新增 `getLatestUserState` 方法，信任 authMiddleware |
| NEW-2 | login err.message 泄露 | 统一返回 '用户名或密码错误' |
| H-2 | saveSelection 字符串匹配 | 新增 `PermissionDeniedError`，用 instanceof 替代 |
| NEW-3 | getContext company_id 无校验 | parseInt + isNaN + >0 校验 |
| C-1 | DIP 类型声明 | authService 添加 IAuthService 接口类型 |
| L-1 | view 角色查看公司用户 | getCompanyDetail 添加 view 角色拦截 |

## 第二轮修复（本次）

| 编号 | 级别 | 问题 | 修复方案 |
|------|------|------|----------|
| H-1 | HIGH | logout 无 token 失效化 | 新增内存 token 黑名单，logout 时撤销 token，middleware 检查黑名单 |
| M-2 | MEDIUM | logout 中 `_req` 命名不一致 | 改为 `req`（现在需要读取 headers） |
| M-5 | MEDIUM | 8 个端点缺少结构化日志 | 新增 `logger.util.ts`，login/logout/verify/saveSelection/getCompanyDetail 添加日志 |
| L-1 | LOW | middleware 中魔法数字 `substring(7)` | 提取 `BEARER_PREFIX` 常量，使用 `slice(BEARER_PREFIX.length)` |
| L-3 | LOW | getCompanyDetail 中 companyId null 处理 | 显式检查 `user.companyId == null` |

## 新增文件

- `apis/utils/token-blacklist.util.ts` — 内存 token 黑名单（Map + TTL + 定时清理）
- `apis/utils/logger.util.ts` — 结构化 JSON 日志工具

## 变更文件

- `apis/controller/auth.controller.ts` — H-1/M-2/M-5/L-3 修复
- `apis/middleware/auth.middleware.ts` — 黑名单检查 + L-1 魔法数字
- `tests/apis/auth.controller.test.ts` — 新增 logout token 撤销测试 + beforeEach 清黑名单
- `tests/apis/middleware/auth.middleware.test.ts` — 新增黑名单拦截/放行测试

## 测试结果

- auth.controller.test.ts: 126 passed
- auth.middleware.test.ts: 37 passed
- TypeScript 编译: passed
- 全量测试: 4898/4925 passed（27 失败均为 rate-limit 已有问题，与本次无关）
