# project.routes.d.ts 代码安全专家评审

**评审文件**: `apis/routes/project.routes.ts`（编译产物 `dist/apis/apis/routes/project.routes.d.ts`）
**评审类型**: 安全评审（Security Review）
**评审日期**: 2026-05-26
**综合评分**: 7.2/10 — APPROVE

---

## 评审范围

路由文件 `project.routes.ts`（17行）定义了 5 条 CRUD 路由，挂载于 `app.ts` L124（`/api/v1/projects`）。评审覆盖认证链、授权模型、输入校验纵深、参数注入风险、限流策略、信息泄露风险，并对照 `auth.middleware.ts`、`validate.ts`、`project.schema.ts`、`project.controller.ts` 及同级路由文件进行横向比对。

---

## 安全架构分析

### 认证链

```
请求 → helmet → cors → anti-crawl → rate-limit → authMiddleware(JWT验证+黑名单) → roleMiddleware(SYSADMIN|ADMIN) → 路由handler
```

- **全局中间件**（`app.ts`）: helmet + cors + anti-crawl + rate-limit 提供四层基础防护
- **路由级中间件**（L9）: `router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN))` 确保所有 5 条路由均受保护
- **view 角色阻断**: `roleMiddleware` 仅允许 sysadmin/admin，view 角色在路由层被拦截，不进入 controller

### 授权矩阵

| 路由 | HTTP 方法 | sysadmin | admin | view | 路由层保护 | controller 层保护 |
|------|-----------|----------|-------|------|-----------|-----------------|
| `/` | GET | ✅ | ✅（本公司） | ❌ 403 | roleMiddleware | service 层公司边界 |
| `/:id` | GET | ✅ | ✅（operator） | ❌ 403 | roleMiddleware | controller + service 双重检查 |
| `/` | POST | ✅ | ✅（本公司） | ❌ 403 | roleMiddleware | service 层 company_id 归属 |
| `/:id` | PUT | ✅ | ✅（operator） | ❌ 403 | roleMiddleware | controller + service 双重检查 |
| `/:id` | DELETE | ✅ | ✅（operator） | ❌ 403 | roleMiddleware | controller 角色检查 + service |

---

## 安全发现

### S1-HIGH: GET/DELETE 路由的 `:id` 参数零路由级校验——参数注入风险

**位置**: `project.routes.ts` L11-12, L15

```typescript
router.get('/:id', ctrl.getProject);          // 无 validate()
router.put('/:id', validate(updateProjectSchema), ctrl.updateProject);  // 仅校验 body
router.delete('/:id', ctrl.deleteProject);     // 无 validate()
```

**问题**: 三条路由的 `:id` 路径参数未在路由层做任何校验。Express 路由的 `:id` 匹配任意非 `/` 字符串，攻击者可注入：

| 攻击载荷 | 绕过效果 | 抵达层级 |
|---------|---------|---------|
| `GET /api/v1/projects/abc` | `parseInt('abc')` → `NaN` → controller 返回 400 | controller 层 |
| `GET /api/v1/projects/0` | `parseInt('0')` → `0` → controller 返回 400 | controller 层 |
| `GET /api/v1/projects/-1` | `parseInt('-1')` → `-1` → controller 返回 400 | controller 层 |
| `GET /api/v1/projects/1;DROP%20TABLE` | `parseInt('1')` → `1`（分号后截断） | service 层 |
| `GET /api/v1/projects/1e10` | `parseInt('1e10')` → `1`（科学计数法截断） | service 层 |

**影响分析**:

1. **无效请求直达 controller**: 恶意 ID 绕过路由层，在 controller `parseInt` + `isNaN` 处才被拦截，浪费一轮完整的函数调用栈（auth → role → route handler → parseInt → fail response）
2. **防御纵深不对称**: POST/PUT 有三层防御（路由层 Zod body → controller parseInt → service 业务校验），而 GET/DELETE 仅一层（controller parseInt）。Prisma ORM 参数化查询阻止了 SQL 注入，但字符串截断行为（`parseInt('1;malicious')` → `1`）意味着 service 层接收到的是"合法" ID，可能返回非预期数据
3. **与 `todo.routes.ts` 不一致**: todo 模块的 GET/DELETE 路由使用 `validate(todoIdSchema, 'params')` 校验路径参数，project 模块完全缺失

**修复建议**:

```typescript
import { z } from 'zod';

const idParamSchema = z.object({
  id: z.coerce.number().int().positive('无效的项目ID'),
});

router.get('/:id', validate(idParamSchema, 'params'), ctrl.getProject);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateProjectSchema), ctrl.updateProject);
router.delete('/:id', validate(idParamSchema, 'params'), ctrl.deleteProject);
```

修复后，无效 ID 在路由层即被拦截，不进入 controller，且消除了 `parseInt` 截断风险。

---

### S2-HIGH: `AuthPayload.role` 类型为 `string`，角色校验基于松散字符串匹配

**位置**: `auth.middleware.ts` L11 + `project.routes.ts` L9 + `project.controller.ts` L69, L118, L150

```typescript
// auth.middleware.ts — role 类型为 string
export interface AuthPayload {
  role: string;  // 非 Role 类型
}

// roleMiddleware — includes() 字符串匹配
if (!allowedRoles.includes(req.user.role)) { ... }

// controller — 硬编码字符串比较
if (role === 'view') { ... }              // L69
if (role !== 'sysadmin' && role !== 'admin') { ... }  // L150
```

**问题**:

1. **JWT payload 的 `role` 字段为 `string` 类型**: JWT 签发时若 payload 中 `role` 为任意字符串（如 `"superadmin"`、`""` 或 `"Admin"`），`roleMiddleware` 的 `includes()` 会正确拦截（因为不匹配 `'sysadmin'`/`'admin'`），但 controller 层使用 `===` 硬编码比较，若新增角色未同步更新 controller 代码，将产生授权空洞
2. **controller 层角色检查使用硬编码字符串**: `role === 'view'`（L69）、`role !== 'sysadmin' && role !== 'admin'`（L150）未使用 `ROLES` 常量，存在拼写错误风险
3. **双重否定语义不一致**: `getProject`/`updateProject` 用肯定式 `=== 'view'`，`deleteProject` 用否定式 `!== 'sysadmin' && !== 'admin'`，逻辑等效但维护风险不同——新增 `editor` 角色时，前者自动放行，后者自动拒绝

**攻击场景**: 若未来新增 `editor` 角色（未添加到 `roleMiddleware` 白名单），但 controller 层的 `deleteProject` L150 使用否定式检查，editor 虽被路由层拦截，但若有人修改 `roleMiddleware` 参数时遗漏，controller 层的 `!== 'sysadmin' && !== 'admin'` 会正确拦截——这种不一致反而提供了纵深防御，但依赖隐式行为不可靠。

**影响**: 当前配置下不可直接利用（`roleMiddleware` 正确限制了角色），但类型松散 + 硬编码字符串 + 风格不一致的组合在角色模型变更时会产生维护性安全风险。

**修复建议**: 统一使用 `ROLES` 常量，或将 `AuthPayload.role` 类型收紧为 `Role`:

```typescript
// 方案一：类型收紧（需同步修改 JWT 签发逻辑）
export interface AuthPayload {
  role: Role;  // 'sysadmin' | 'admin' | 'view'
}

// 方案二：controller 使用常量
if (role === ROLES.VIEW) { fail(res, 403, ...); }
```

---

### S3-MEDIUM: `listProjects` query 参数零路由级校验——ReDoS/DoS 风险

**位置**: `project.routes.ts` L11 + `project.controller.ts` L28-48

```typescript
// 路由层 — 零校验
router.get('/', ctrl.listProjects);

// controller 层 — 手动解析 20 行
const page = parseInt(req.query.page as string, 10) || 1;
const pageSize = Math.min(100, parseInt(req.query.pageSize as string, 10) || 10);
const search = req.query.search as string | undefined;
if (search && search.length > 100) { ... }
```

**问题**:

1. **`page` 无上界保护**: `parseInt(req.query.page) || 1` 无最大值约束。攻击者发送 `page=999999999` 触发 `OFFSET 9999999990` 的慢查询，可能耗尽数据库连接池
2. **`search` 长度校验在 controller 而非路由层**: controller L31-34 手动检查 `search.length > 100`，但 100 字符限制是硬编码魔法数字，且与 schema 声明式校验风格不一致
3. **`pageSize` 上界硬编码**: `Math.min(100, ...)` 在 controller 中硬编码，若需要调整需改 controller 而非配置
4. **`status` 参数枚举校验位置不当**: controller L39-44 手动校验 `status === 'true' || status === 'false'`，而非使用 Zod `enum`

**对比**: `user.routes.ts` L11 使用 `validate(listUsersSchema, 'query')` 在路由层完成全部 query 校验；`todo.routes.ts` 同样。project 模块是少数几个 query 参数校验下放 controller 的路由文件。

**攻击向量**:

```bash
# OFFSET 慢查询 DoS
GET /api/v1/projects?page=999999999&pageSize=100

# 超长 search 字符串（controller 有 100 字符限制，但到达 controller 前无拦截）
GET /api/v1/projects?search=$(python3 -c "print('A'*1000000)")
```

**修复建议**: 创建 `listProjectSchema` 并在路由层校验（见架构评审 M-1 修复方案），同时为 `page` 添加上界 `max(10000)`。

---

### S4-MEDIUM: DELETE 路由无独立限流，高频删除可被滥用

**位置**: `project.routes.ts` L15

```typescript
router.delete('/:id', ctrl.deleteProject);
```

**问题**: 项目全局 `rateLimitMiddleware`（`app.ts` L81）对所有路由统一限流（默认窗口 15min/100次），DELETE 操作无独立限流。对比 `article.routes.ts` L18:

```typescript
router.delete('/:projectId/articles/:id', articleActionLimiter, ctrl.deleteArticle);
```

article 模块对 DELETE 和 review 操作使用 `articleActionLimiter`（窗口 15min/30次），而 project 模块的 DELETE 无额外限制。

**影响**: 已认证的 admin 用户可在 15 分钟窗口内发起 100 次 DELETE 请求（受全局限流约束），但考虑到 project 软删除（`deletedAt`）使用 `$transaction` 事务保护，高频删除可能产生事务堆积。

**风险等级**: 当前低——项目数量有限且操作频率低。但随着项目增长，建议添加独立限流。

**修复建议**:

```typescript
import { rateLimit } from 'express-rate-limit';

const projectActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { code: 429, message: '操作过于频繁，请稍后再试' },
});

router.delete('/:id', projectActionLimiter, ctrl.deleteProject);
```

---

### S5-MEDIUM: controller 层角色检查与路由层 `roleMiddleware` 冗余——维护性安全风险

**位置**: `project.controller.ts` L66-69, L117-120, L149-153

```typescript
// getProject L69 — 冗余（view 已被 roleMiddleware 拦截）
if (role === 'view') { fail(res, 403, '无权查看该项目'); return; }

// updateProject L118 — 冗余
if (role === 'view') { fail(res, 403, '查看者无权操作该项目'); return; }

// deleteProject L150 — 冗余（仅 sysadmin/admin 已由 roleMiddleware 保证）
if (role !== 'sysadmin' && role !== 'admin') { fail(res, 403, '无权删除项目'); return; }
```

**问题**: 三处 controller 层角色检查与路由层 `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)` 语义完全重叠。这不是安全漏洞（多一层防御），而是维护性风险：

1. **角色模型变更不一致**: 若新增 `editor` 角色并修改 `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN, ROLES.EDITOR)`，需同步修改 controller 层 `deleteProject` L150 的否定式检查，否则 editor 可 list/get/create/update 但被 delete 拒绝
2. **风格不一致**: `listProjects` 和 `createProject` **无** controller 层角色检查（正确信任路由层），但 `getProject`/`updateProject`/`deleteProject` 有冗余检查。同文件三种风格并存降低可审计性

**修复建议**: 移除 controller 层冗余角色检查，统一信任路由层 `roleMiddleware`。若需要 defense-in-depth，应通过统一装饰器或中间件实现。

---

### S6-LOW: `import * as ctrl` 通配符导入暴露 controller 内部辅助函数

**位置**: `project.routes.ts` L6

```typescript
import * as ctrl from '../controller/project.controller';
```

**问题**: controller 导出 7 个成员（5 handler + `getErrorMessage` + `handleServiceError`），路由仅使用 5 个 handler。通配符导入将 `getErrorMessage` 和 `handleServiceError` 引入路由模块作用域。

**安全影响**: 运行时无直接风险——Express 路由仅绑定 `ctrl.getProject` 等函数名，辅助函数不会被注册为路由 handler。但增加了审计面——安全审计时需确认所有导入成员未被意外使用。对比 `project-knowledge.routes.ts` 的 `import *` 导入了 `_resetServices` 测试专用函数，风险更高。

**修复建议**: 改为具名导入，减少暴露面。

---

### S7-LOW: `.d.ts` 编译产物丢失路由安全元数据

**位置**: `dist/apis/apis/routes/project.routes.d.ts`

```typescript
import { Router } from 'express';
declare const router: Router;
export default router;
```

**问题**: TypeScript 默认编译仅保留类型声明，路由注册信息（路径、HTTP 方法、中间件链、角色要求、schema 校验）全部丢失。前端开发者或 API 消费者无法通过 `.d.ts` 了解安全要求（如需要 JWT、仅限 sysadmin/admin）。

**影响**: 不构成运行时安全风险，但降低安全策略的可审计性和可发现性。

**修复建议**: 当前阶段通过 Swagger/OpenAPI 弥补。长期可考虑 `tsoa` 等工具生成带安全元数据的类型定义。

---

### S8-LOW: `createProjectSchema` 的 `company_id` 为 optional，sysadmin 可创建无归属项目

**位置**: `project.schema.ts` L7

```typescript
company_id: z.number({ error: '公司ID不能为空' }).int().positive('公司ID必须为正整数').optional(),
```

**问题**: `createProjectSchema` 的 `company_id` 为 `optional()`。虽然 controller L88 对 sysadmin 强制要求 `company_id`（`if (!effectiveCompanyId)`），但 schema 层允许 `company_id` 缺失，导致校验通过后依赖 controller 补充检查。

**影响**: 若 controller L88 的检查被意外移除，sysadmin 可创建 `company_id` 为 `undefined` 的"孤儿项目"。当前被 controller 阻断，风险有限。

**修复建议**: 考虑将 `company_id` 在 schema 中设为必填，sysadmin 的场景由 controller 显式注入。

---

### S9-INFO: 软删除事务保护——防 TOCTOU 竞态

**位置**: `project.controller.ts` → service 层

`updateProject` 和 `deleteProject` 在 service 层使用 `$transaction` 事务保护，防止 Time-of-check to time-of-use 竞态攻击（如：两个 admin 同时删除同一项目，或删除的同时更新）。这是良好的安全实践。

---

### S10-INFO: Zod schema 使用 `.strict()` 拒绝未知字段

**位置**: `project.schema.ts` L11, L20

```typescript
}).strict();
```

`createProjectSchema` 和 `updateProjectSchema` 均使用 `.strict()`，拒绝请求体中包含未知字段。防止参数注入攻击（如传入 `is_admin: true` 等非预期字段）。这是 OWASP API3:2023（Property Injection）的正确防御。

---

### S11-INFO: `router.use` 无路径前缀挂载确保无遗漏

**位置**: `project.routes.ts` L9

```typescript
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));
```

`router.use()` 无路径参数，确保所有子路由（包括未来新增的路由）自动受 auth + role 保护。对比 `project-knowledge.routes.ts` 的 `router.use('/:projectId/knowledge', ...)` 有路径前缀限制，本文件的写法更安全——新增路由不会被遗漏保护。

---

## 评审汇总

| 编号 | 等级 | 发现 | 状态 |
|------|------|------|------|
| S1 | HIGH | GET/DELETE `:id` 零路由级校验，参数截断 + 纵深不对称 | 需修复 |
| S2 | HIGH | `AuthPayload.role` 为 string，controller 硬编码角色字符串 | 建议修复 |
| S3 | MEDIUM | list query 零路由级校验，page 无上界（OFFSET DoS） | 需修复 |
| S4 | MEDIUM | DELETE 无独立限流，高频操作可滥用 | 建议修复 |
| S5 | MEDIUM | controller 角色检查冗余，维护性安全风险 | 建议修复 |
| S6 | LOW | `import *` 通配符暴露内部辅助函数 | 建议修复 |
| S7 | LOW | `.d.ts` 丢失安全元数据 | 可接受 |
| S8 | LOW | `company_id` optional 允许 sysadmin 创建孤儿项目（被 controller 阻断） | 可接受 |
| S9 | INFO | 软删除事务防 TOCTOU 竞态（确认项） | 良好 |
| S10 | INFO | Zod `.strict()` 拒绝未知字段防参数注入（确认项） | 良好 |
| S11 | INFO | `router.use` 无路径前缀确保全覆盖（确认项） | 良好 |

---

## 安全纵深评估

```
                     GET /    GET /:id   POST /    PUT /:id  DELETE /:id
                     ─────   ─────────  ──────   ─────────  ──────────
全局 helmet            ✅       ✅        ✅        ✅         ✅
全局 cors              ✅       ✅        ✅        ✅         ✅
全局 anti-crawl        ✅       ✅        ✅        ✅         ✅
全局 rate-limit        ✅       ✅        ✅        ✅         ✅
路由 authMiddleware    ✅       ✅        ✅        ✅         ✅
路由 roleMiddleware    ✅       ✅        ✅        ✅         ✅
路由 Zod validate      ❌       ❌     body✅    body✅       ❌
controller parseInt    N/A    ✅ id      N/A     ✅ id      ✅ id
controller 角色检查     ❌      ✅ view    ❌      ✅ view    ✅ 双重
service 业务校验       ✅      ✅ op      ✅       ✅ op      ✅ op
─────────────────────────────────────────────────────────────────────
防御层数               6       7         7        8          7
```

**关键差距**: GET/DELETE 缺少路由级 Zod params 校验，是防御链中唯一的空白。

---

## 积极安全实践

1. **`router.use(authMiddleware, roleMiddleware(...))` 无路径前缀** — 所有路由自动受保护，新增路由零遗漏风险
2. **角色常量化 `ROLES.SYSADMIN`/`ROLES.ADMIN`** — 消除硬编码字符串拼写错误风险
3. **Zod `.strict()` schema** — 拒绝未知字段，防止 OWASP API3:2023 Property Injection
4. **JWT 黑名单** — `token-blacklist.util.ts` 支持登出时撤销 token
5. **软删除 + 事务** — `$transaction` 防止 TOCTOU 竞态，`deletedAt` 支持数据恢复
6. **JWT 2小时过期** — 限制 token 有效窗口，降低 token 泄露影响
7. **anti-crawl User-Agent 检查** — 阻止无 UA 的自动化工具

---

## 修复优先级

| 优先级 | 编号 | 修复方案 | 预估工时 |
|--------|------|---------|---------|
| HIGH | S1 | 创建 `idParamSchema` + `validate(idParamSchema, 'params')` | 20min |
| HIGH | S2 | `AuthPayload.role` 收紧为 `Role` 类型 + controller 使用 `ROLES` 常量 | 30min |
| MEDIUM | S3 | 创建 `listProjectSchema` + `validate(listProjectSchema, 'query')` | 30min |
| MEDIUM | S4 | 为 DELETE 添加 `projectActionLimiter` | 10min |
| MEDIUM | S5 | 移除 controller 层 3 处冗余角色检查 | 10min |
| LOW | S6 | 改为 5 个具名导入 | 5min |

---

## 修复后预期评分

修复 S1 + S3（路由级 Zod 校验覆盖全部 5 条路由）后预期可达 **9.0/10**。

---

## 与已有评审的关系

| 已有评审 | 评分 | 重叠项 |
|----------|------|--------|
| [架构评审](project.routes.d.ts.architecture.md) | 7.8/10 APPROVE | H-1（params 校验）与 S1 重叠；H-2（通配符导入）与 S6 重叠；M-2（角色冗余）与 S5 重叠 |
| [质量评审](project.routes.d.ts.quality.md) | 8.2/10 APPROVE | H-2（`:id` 缺校验）与 S1 重叠；H-1（通配符导入）与 S6 重叠 |
| **本次安全评审** | **7.2/10** | **新增 S2（role 类型安全）、S3（page DoS）、S4（DELETE 限流）、S8（company_id optional）安全视角发现** |

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 源文件 | `apis/routes/project.routes.ts` |
| 编译产物 | `dist/apis/apis/routes/project.routes.d.ts` |
| 源文件行数 | 17 |
| 路由数量 | 5（GET×2 + POST + PUT + DELETE） |
| 认证模式 | JWT Bearer + 黑名单 |
| 授权模式 | roleMiddleware(SYSADMIN, ADMIN) |
| 评审类型 | 代码安全专家评审 |
| 评审日期 | 2026-05-26 |
| 关联文件 | `apis/middleware/auth.middleware.ts`、`apis/middleware/validate.ts`、`apis/schema/project.schema.ts`、`apis/controller/project.controller.ts`、`apis/constants/roles.ts` |
| 对比文件 | `apis/routes/user.routes.ts`、`apis/routes/company.routes.ts`、`apis/routes/todo.routes.ts`、`apis/routes/article.routes.ts` |
