# TDD 执行报告：user.service.impl.ts

## 基本信息

| 项目 | 内容 |
|------|------|
| **测试文件** | `tests/apis/user.service.test.ts` |
| **实现文件** | `apis/service/impl/user.service.impl.ts` |
| **接口文件** | `apis/service/user.service.ts` |
| **实体文件** | `apis/entity/user.entity.ts` |
| **执行日期** | 2026-05-24 |
| **测试框架** | Jest + TypeScript |

## 接口概览

`IUserService` 包含 5 个方法：

1. `list(companyId, page, pageSize, search?, role?, status?)` — 分页查询用户
2. `getById(id, companyId)` — 按 ID 获取用户
3. `create(request)` — 创建用户
4. `update(id, companyId, request)` — 更新用户
5. `delete(id, companyId)` — 软删除用户

## 测试结果

```
Test Suites: 1 passed, 1 total
Tests:       44 passed, 44 total
Time:        4.88 s
```

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句 (Statements) | **100%** |
| 分支 (Branches) | **100%** |
| 函数 (Functions) | **100%** |
| 行 (Lines) | **100%** |

## 测试用例清单

### list() — 9 个基础用例 + 4 个边界用例

| # | 测试场景 | 覆盖分支 | 状态 |
|---|---------|---------|------|
| 1 | 应返回分页用户列表 | 基本流程 + mapUser | ✅ |
| 2 | 应正确计算分页偏移量（第2页） | skip 计算 | ✅ |
| 3 | 应支持 search 搜索（username 和 cnName） | search OR 条件 | ✅ |
| 4 | 应支持 role 过滤 | role 条件 | ✅ |
| 5 | 应支持 status 过滤 | status 条件 | ✅ |
| 6 | 应支持 companyId 过滤 | companyId 条件 | ✅ |
| 7 | 应支持多条件组合过滤 | 所有条件组合 | ✅ |
| 8 | companyId 为 null 时不添加 companyId 过滤 | companyId falsy | ✅ |
| 9 | 应返回空列表 | 空结果 | ✅ |
| 10 | companyId 为 0 时不添加 companyId 过滤 | companyId falsy（0） | ✅ |
| 11 | search 为空字符串时不添加 OR 条件 | search falsy（''） | ✅ |
| 12 | page=3, pageSize=5 时偏移量应为 10 | 非常规分页 | ✅ |
| 13 | 用户无 company 关联时 company_name 应为空字符串 | mapUser company=null | ✅ |

### getById() — 2 个基础用例 + 1 个边界用例

| # | 测试场景 | 覆盖分支 | 状态 |
|---|---------|---------|------|
| 1 | 应返回指定用户 | 正常流程 + mapUser | ✅ |
| 2 | 用户不存在时应抛出 NotFoundError | null 检查 | ✅ |
| 3 | 应正确映射 company_id 为 null | mapUser companyId=null | ✅ |

### create() — 5 个基础用例 + 2 个边界用例

| # | 测试场景 | 覆盖分支 | 状态 |
|---|---------|---------|------|
| 1 | 应成功创建用户 | 完整创建流程（含 company_id） | ✅ |
| 2 | 用户名已存在时应抛出 ConflictError | 重复用户名检查 | ✅ |
| 3 | 不传 company_id 时不应包含 companyId 字段 | company_id undefined | ✅ |
| 4 | company_id 为 null 时不应包含 companyId 字段 | company_id null | ✅ |
| 5 | 应正确哈希密码 | bcrypt.hash 调用 + salt=10 | ✅ |
| 6 | company_id 为 0 时不包含 companyId | company_id falsy（0） | ✅ |
| 7 | 创建 sysadmin 角色用户 | sysadmin 角色创建 | ✅ |

### update() — 11 个基础用例 + 5 个边界用例

| # | 测试场景 | 覆盖分支 | 状态 |
|---|---------|---------|------|
| 1 | 应成功更新用户 cn_name | cn_name 字段更新 | ✅ |
| 2 | 应成功更新用户 role | role 字段更新 | ✅ |
| 3 | 应成功更新用户 status | status 字段更新 | ✅ |
| 4 | 应成功更新用户密码 | password + bcrypt.hash | ✅ |
| 5 | 应同时更新多个字段 | 多字段组合 | ✅ |
| 6 | 用户不存在时应抛出 NotFoundError | null 检查 | ✅ |
| 7 | 禁止修改系统管理员角色 | sysadmin 角色保护 | ✅ |
| 8 | sysadmin 修改其他字段不报错 | sysadmin 非角色更新 | ✅ |
| 9 | role 为 undefined 时不更新 role 字段 | undefined 检查 | ✅ |
| 10 | 不传 password 时不更新密码 | 无密码更新 | ✅ |
| 11 | 空字符串 password 不更新密码 | falsy password（''） | ✅ |
| 12 | sysadmin 角色设为 sysadmin 应允许（同角色） | 同角色不触发保护 | ✅ |
| 13 | 仅更新密码字段 | 单字段 password | ✅ |
| 14 | status 为 false 时应正确更新 | status=false 显式传参 | ✅ |
| 15 | cn_name 为空字符串时应更新 | cn_name='' 显式传参 | ✅ |

### delete() — 3 个基础用例 + 3 个边界用例

| # | 测试场景 | 覆盖分支 | 状态 |
|---|---------|---------|------|
| 1 | 应成功软删除用户 | 正常软删除 + deletedAt | ✅ |
| 2 | 用户不存在时应抛出 NotFoundError | null 检查 | ✅ |
| 3 | 禁止删除系统管理员 | sysadmin 保护 | ✅ |
| 4 | 应成功删除 admin 角色用户 | admin 角色删除 | ✅ |
| 5 | 应成功删除 view 角色用户 | view 角色删除 | ✅ |
| 6 | 软删除应使用 update 而非 delete 方法 | 行为验证 | ✅ |

## 关键测试策略

1. **Mock 策略**：Mock Prisma 客户端（`getPrisma`）和 bcryptjs，完全隔离数据库依赖
2. **边界值测试**：`companyId=0`（falsy）、`search=''`（falsy）、`company_id=0`（falsy）
3. **角色权限测试**：sysadmin 角色保护（不可降级、不可删除、同角色允许修改）
4. **mapUser 映射测试**：验证 Prisma camelCase → API snake_case 的正确映射
5. **软删除验证**：确认使用 `update` + `deletedAt` 而非 `delete` 方法
6. **密码处理**：验证 bcrypt hash 调用、salt=10、空密码不触发 hash

## 构建检查

- **pnpm build**: 失败（已有问题：`company.schema.ts` 的 Zod `required_error` 不兼容）
- **pnpm lint**: 失败（已有问题：ESLint v9 配置迁移未完成）
- **测试**: **44/44 通过**，`user.service.impl.ts` 覆盖率 **100%**
