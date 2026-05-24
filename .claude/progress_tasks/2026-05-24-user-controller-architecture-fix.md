# 2026-05-24 user.controller.ts 架构评审修复（ARCH-MAJOR-1 + ARCH-MINOR-4）

## 变更摘要
- 修复 ARCH-MAJOR-1: 引入服务工厂模式 `createUserService()` 替代硬编码单例 `new UserServiceImpl()`
- 修复 ARCH-MINOR-4: 重构 `IUserService` 接口为 Options 模式，消除 `companyId: null` 硬编码
- 新增 `UserListOptions` 接口，`getById`/`update`/`delete` 移除未使用的 `companyId` 参数

## 修改文件
- `apis/service/user.service.ts` — 接口重构为 Options 模式（`UserListOptions` + 精简方法签名）
- `apis/service/impl/user.service.impl.ts` — 实现适配新接口，移除未使用的 companyId 参数
- `apis/service/index.ts` — 添加 `createUserService()` 工厂函数 + 导出 `UserListOptions`
- `apis/controller/user.controller.ts` — 使用工厂函数创建服务实例 + Options 模式调用
- `tests/apis/user.service.test.ts` — 适配新接口签名（所有测试用例更新）

## 架构改进
- **依赖反转**: Controller 通过 `createUserService()` 工厂获取服务实例，不再直接导入具体实现类
- **Options 模式**: `list(page, pageSize, options?)` 替代 `list(companyId, page, pageSize, search?, role?, status?)`
- **参数精简**: `getById(id)` / `update(id, request)` / `delete(id)` 移除从未使用的 `companyId` 参数

## 覆盖率
- user.service.impl.ts: 100% Stmts / 100% Branch / 100% Funcs / 100% Lines
- user.controller.ts: 96.22% Stmts / 90.9% Branch / 85.71% Funcs / 97.82% Lines
- 213 tests, 3 suites, 全部通过

## 评审报告状态对照
| 编号 | 问题 | 状态 |
|------|------|------|
| ARCH-MAJOR-1 | 硬编码单例 | ✅ 已修复（工厂模式） |
| ARCH-MAJOR-2 | 字符串匹配异常 | ✅ 之前已修复 |
| ARCH-MAJOR-3 | 验证策略不对称 | ✅ 之前已修复（Zod Schema） |
| ARCH-MINOR-1 | created() 未使用 | ✅ 之前已修复 |
| ARCH-MINOR-2 | Swagger 0% | ✅ 之前已修复 |
| ARCH-MINOR-3 | catch err: any | ✅ 之前已修复 |
| ARCH-MINOR-4 | companyId null | ✅ 已修复（Options 模式） |
