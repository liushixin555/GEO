# 2026-05-24 auth.controller.ts 评审问题修复

## 修复概要

基于 tasks/review/ 下 5 份评审报告（架构、安全、质量、Committer v1/v2）的综合修复。

## 修复清单

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| H-1 | verify 端点冗余 JWT 验证 | 新增 `getLatestUserState` 方法，信任 authMiddleware |
| NEW-2 | login err.message 泄露 | 统一返回 '用户名或密码错误' |
| H-2 | saveSelection 字符串匹配 | 新增 `PermissionDeniedError`，用 instanceof 替代 |
| NEW-3 | getContext company_id 无校验 | parseInt + isNaN + >0 校验 |
| C-1 | DIP 类型声明 | authService 添加 IAuthService 接口类型 |
| L-1 | view 角色查看公司用户 | getCompanyDetail 添加 view 角色拦截 |

## 变更文件

- `apis/entity/user.entity.ts` — 新增 PermissionDeniedError
- `apis/entity/index.ts` — 导出 PermissionDeniedError
- `apis/service/auth.service.ts` — 新增 getLatestUserState 接口
- `apis/service/impl/auth.service.impl.ts` — 实现 getLatestUserState + PermissionDeniedError
- `apis/controller/auth.controller.ts` — 6 项修复
- `tests/apis/auth.controller.test.ts` — 106 个测试全部更新

## 测试结果

- auth.controller.test.ts: 106 passed
- 后端全量测试: passed
- TypeScript 编译: passed (仅 swagger-autogen-ast 类型声明已有问题)
- Lint: passed
