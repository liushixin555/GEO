# user.controller.ts 安全评审报告

**文件**: `apis/controller/user.controller.ts`
**关联文件**: `apis/routes/user.routes.ts`, `apis/schema/user.schema.ts`, `apis/service/impl/user.service.impl.ts`, `apis/map/index.ts`
**评审日期**: 2026-05-26
**评审类型**: 安全评审

## 评审范围

| 维度 | 覆盖范围 |
|------|---------|
| 认证/授权 | JWT校验、角色守卫 |
| 输入验证 | Zod schema、参数校验 |
| 注入防护 | SQL注入、XSS |
| 敏感数据泄露 | 密码哈希、API响应过滤 |
| 业务逻辑安全 | 角色篡改、sysadmin保护 |
| 类型安全 | any类型使用 |
| 错误处理 | 信息泄露、异常捕获 |

## 评审发现

### CRITICAL — 无

### HIGH

| # | 问题 | 文件:行号 | 描述 | 修复方案 |
|---|------|-----------|------|---------|
| H1 | `/:id` 路由缺少参数验证 | `user.routes.ts:12` | `GET/PUT/DELETE /:id` 未使用 validate 中间件，id参数未通过 Zod schema 验证，虽然controller有parseInt+isNaN检查，但不符合统一验证模式 | 添加 `idParamSchema` 路由级参数校验 |
| H2 | `mapUser` 使用 `any` 类型 | `map/index.ts:34` | `mapUser(prismaUser: any): any` 完全丧失类型安全，可能导致字段遗漏或类型不匹配 | 使用 Prisma User 类型替代 any |
| H3 | 已删除用户可被查询到 | `user.service.impl.ts:39-43` | `getById` 使用 `findFirst({ where: { id } })` 未过滤 `deletedAt`，软删除的用户仍可被获取 | 添加 `deletedAt: null` 过滤条件 |
| H4 | `create` 未检查已软删除用户的唯一性冲突 | `user.service.impl.ts:49-50` | `findUnique` 会匹配到软删除用户（username唯一索引），导致无法创建同名新用户 | 改为 `findFirst` 添加 `deletedAt: null` 过滤 |

### MEDIUM

| # | 问题 | 文件:行号 | 描述 | 修复方案 |
|---|------|-----------|------|---------|
| M1 | `update` 和 `delete` 未过滤软删除用户 | `user.service.impl.ts:68,91` | `findFirst({ where: { id } })` 未过滤已删除用户，允许修改/删除已软删除的记录 | 添加 `deletedAt: null` 过滤 |
| M2 | `list` 查询未过滤软删除用户 | `user.service.impl.ts:13` | `where` 对象未包含 `deletedAt: null`，已删除用户会出现在列表中 | 添加 `deletedAt: null` 到 where 条件 |
| M3 | `company_id` 缺少关联存在性校验 | `user.service.impl.ts:59` | 创建用户时 `company_id` 未校验对应公司是否存在，可能产生孤儿记录 | 在 create 前校验 company 存在性 |
| M4 | 更新密码时未清除用户会话 | `user.service.impl.ts:79` | 管理员修改用户密码后，该用户已发放的 JWT token 仍然有效 | 考虑添加 token 失效机制 |
| M5 | controller 中 `handleError` 的 ZodError 分支冗余 | `user.controller.ts:10-11` | 验证中间件已在路由层拦截 ZodError，controller 中此分支永远不会执行 | 移除冗余的 ZodError 处理分支 |

### LOW

| # | 问题 | 文件:行号 | 描述 | 修复方案 |
|---|------|-----------|------|---------|
| L1 | service impl 中 `where: any` 类型不安全 | `user.service.impl.ts:13` | Prisma where 条件使用 any，丧失类型检查 | 使用 Prisma UserWhereInput 类型 |
| L2 | `update` 中 data 使用 any | `user.service.impl.ts:75` | update data 对象使用 any | 使用 Prisma UserUpdateInput 类型 |

## 修复计划

### 阶段1: 路由级参数校验 (H1)
1. 在 `user.schema.ts` 添加 `idParamSchema`
2. 在 `user.routes.ts` 的 `/:id` 路由添加 validate 中间件

### 阶段2: 软删除过滤 (H3, H4, M1, M2)
1. `getById` 添加 `deletedAt: null`
2. `list` 添加 `deletedAt: null` 默认条件
3. `create` 的唯一性检查过滤软删除用户
4. `update` 和 `delete` 添加 `deletedAt: null`

### 阶段3: 类型安全 (H2, L1, L2)
1. `mapUser` 使用 Prisma User 类型
2. service 中 where/data 使用 Prisma 类型

### 阶段4: 代码清理 (M5)
1. 移除 controller 中冗余的 ZodError 处理

## 评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 认证/授权 | 9/10 | JWT+角色守卫完善 |
| 输入验证 | 7/10 | body/query 有 Zod，params 缺失 |
| 注入防护 | 9/10 | Prisma ORM 天然防注入 |
| 数据保护 | 6/10 | 软删除未过滤，any 类型 |
| 业务逻辑 | 7/10 | sysadmin保护有，company校验缺 |
| 错误处理 | 8/10 | 统一错误处理，少量冗余 |

**综合评分**: 7.5/10 CONDITIONAL APPROVE
**修复 HIGH 后预期**: 9.0/10
