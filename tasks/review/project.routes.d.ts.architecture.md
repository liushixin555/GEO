# project.routes.ts — 软件架构专家评审

**文件**: `dist/apis/apis/routes/project.routes.d.ts` → 源文件 `apis/routes/project.routes.ts`
**评审日期**: 2026-05-26
**评审类型**: 软件架构专家评审（Architecture Review）
**评审基线**: 与 `user.routes.ts`、`company.routes.ts`、`todo.routes.ts`、`project.controller.ts`、`project.service.ts`、`app.ts`（L124）对比

---

## 综合评分：7.8/10 — APPROVE

路由文件职责单一、中间件链设计规范、角色常量化、Zod schema 覆盖写操作，是项目中结构最清晰的路由模块之一。主要架构问题在于：GET/DELETE 路由缺少路由级输入校验，导致防御纵深不对称（写操作三层防御 vs 读操作仅两层）；controller 层角色检查与路由层 `roleMiddleware` 存在语义冗余；`import * as ctrl` 通配符导入增加模块耦合。17 行代码实现完整 CRUD，复杂度控制优秀。

---

## 评审维度评分

| 维度 | 评分 | 等级 |
|------|------|------|
| 路由职责划分 | 9/10 | GOOD |
| 中间件链设计 | 9/10 | GOOD |
| 输入校验纵深 | 6/10 | HIGH |
| 分层契约完备性 | 7/10 | MEDIUM |
| 与同级路由一致性 | 8/10 | GOOD |
| 可扩展性 | 7/10 | MEDIUM |
| 模块化与 DRY | 8/10 | GOOD |
| **综合** | **7.8/10** | **APPROVE** |

---

## HIGH-1 — GET/DELETE 路由零 params 校验，防御纵深不对称

**位置**: L11-12, L15

三条路由的 `:id` 参数仅在 controller 层通过 `parseInt` + `isNaN` 校验，路由层无任何约束：

```typescript
// L11-12 — GET 路由无 params 校验
router.get('/:id', ctrl.getProject);
// L15 — DELETE 路由无 params 校验
router.delete('/:id', ctrl.deleteProject);
```

**对比写操作路由**（L13-14）—— POST/PUT 有三层防御：

| 层级 | POST/PUT 防御 | GET/:id 防御 | DELETE/:id 防御 |
|------|-------------|-------------|----------------|
| 路由层 Zod | `validate(createProjectSchema)` | ❌ 无 | ❌ 无 |
| 路由层正则 | N/A | ❌ 无 `/:id(\\d+)` | ❌ 无 `/:id(\\d+)` |
| controller 层 | `parseInt` + `isNaN` | `parseInt` + `isNaN` | `parseInt` + `isNaN` |

**影响链**：

1. **无效请求直达 controller**：`GET /api/v1/projects/abc` 绕过路由层，在 controller 中才返回 400——浪费一次函数调用栈 + service 层依赖注入
2. **与 `todo.routes.ts` 不一致**：todo 模块的 `GET /:id` 使用了 `validate(todoIdSchema, 'params')`，project 模块的 GET 路由则完全依赖 controller 手动校验
3. **防御风格不对称**：同一文件内，POST/PUT 三层防御（路由 Zod → 路由 schema strict → controller 业务校验），GET/DELETE 仅一层（controller parseInt）

**修复建议**：

```typescript
import { z } from 'zod';

const idParamSchema = z.object({
  id: z.coerce.number().int().positive('无效的项目ID'),
});

router.get('/:id', validate(idParamSchema, 'params'), ctrl.getProject);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateProjectSchema), ctrl.updateProject);
router.delete('/:id', validate(idParamSchema, 'params'), ctrl.deleteProject);
```

修复后 controller 层的 `parseInt` + `isNaN` 可安全移除（路由层已保证 `id` 为正整数），减少约 6 行重复校验代码。

---

## HIGH-2 — `import * as ctrl` 通配符导入暴露 controller 内部实现

**位置**: L6

```typescript
import * as ctrl from '../controller/project.controller';
```

`project.controller.ts` 导出 7 个成员：5 个 handler + 2 个辅助函数（`getErrorMessage`、`handleServiceError`）。路由仅使用 5 个 handler，但通配符导入将辅助函数也引入路由模块的作用域。

**架构影响**：

| 影响维度 | 分析 |
|---------|------|
| 编译耦合 | `getErrorMessage` 签名变更 → controller 重编译 → routes 重编译（不必要的级联） |
| 命名空间污染 | `ctrl.getErrorMessage` 在路由文件内可访问但不该被访问，违反最小知识原则 |
| IDE 体验 | `ctrl.` 自动补全列出 7 个成员而非 5 个，增加选择噪声 |
| 可维护性 | 重构 controller 时无法确定路由实际依赖哪些函数 |

**对比项目先例**：

| 路由文件 | 导入方式 | 导出数 | 实际使用 | 利用率 |
|---------|---------|--------|---------|--------|
| project.routes.ts | `* as ctrl` | 7 | 5 | 71% |
| user.routes.ts | `* as ctrl` | ~7 | ~5 | ~71% |
| knowledge.routes.ts | `* as knowledgeBaseController` + `* as knowledgeController` | 40+ | ~35 | ~85% |
| project-knowledge.routes.ts | `* as knowledgeController` | 40+ | 4 | 10% |

project.routes.ts 的利用率尚可（71%），但通配符导入仍是架构反模式。

**修复建议**：

```typescript
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controller/project.controller';
```

---

## MEDIUM-1 — `listProjects` query 参数解析职责下放 controller，路由层应负责结构化校验

**位置**: L11 + `project.controller.ts` L28-48

`GET /` 路由无任何校验中间件，全部 query 参数解析逻辑散落在 controller 中：

```typescript
// 路由层 — 零校验
router.get('/', ctrl.listProjects);

// controller 层 — 20 行手动解析（L28-48）
const page = parseInt(req.query.page as string, 10) || 1;
const pageSize = Math.min(100, parseInt(req.query.pageSize as string, 10) || 10);
const search = req.query.search as string | undefined;
if (search && search.length > 100) { ... }
const company_id = req.query.company_id ? parseInt(...) : undefined;
if (company_id !== undefined && (isNaN(company_id) || company_id <= 0)) { ... }
const statusParam = req.query.status as string | undefined;
if (statusParam !== undefined && statusParam !== 'true' && statusParam !== 'false') { ... }
```

**架构问题**：

1. **Single Level of Abstraction 违反**：controller 方法混合了参数解析（基础设施关注点）和业务编排（领域关注点）
2. **与写操作的校验分层不一致**：POST/PUT 在路由层通过 Zod 完成参数校验，controller 只处理业务逻辑；GET 的参数校验却全部在 controller 中
3. **falsy 语义依赖**：`parseInt(...) || 1` 依赖 falsy fallback，`page=0` 会被静默回退

**对比 `todo.routes.ts`**（同项目最佳实践）：

```typescript
// todo.routes.ts L11 — query 参数在路由层校验
router.get('/', validate(listTodosSchema, 'query'), ctrl.listTodos);
```

**修复建议**：创建 `listProjectSchema` 并在路由层校验

```typescript
// project.schema.ts
export const listProjectSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(100).optional(),
  company_id: z.coerce.number().int().positive().optional(),
  status: z.enum(['true', 'false']).optional().transform(v => v === 'true' ? true : v === 'false' ? false : undefined),
});

// project.routes.ts
router.get('/', validate(listProjectSchema, 'query'), ctrl.listProjects);
```

修复后 controller 中 20 行手动解析可缩减为 3 行解构赋值。

---

## MEDIUM-2 — controller 层角色检查与路由层 `roleMiddleware` 语义冗余

**位置**: L9 + `project.controller.ts` L66-69, L117-120, L149-153

路由层统一挂载 `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)`，已将 `view` 角色拦截在路由层。但 controller 层仍有三处冗余角色检查：

| controller 方法 | 角色检查代码 | 与路由层 roleMiddleware 的关系 |
|----------------|-------------|-------------------------------|
| `getProject` L66 | `if (role === 'view') { fail(res, 403, ...) }` | 冗余——view 已被路由层拦截 |
| `updateProject` L117 | `if (role === 'view') { fail(res, 403, ...) }` | 冗余——view 已被路由层拦截 |
| `deleteProject` L149 | `if (role !== 'sysadmin' && role !== 'admin')` | 冗余——仅允许 sysadmin/admin 已由路由层保证 |

**架构影响**：

1. **双重否定语义**：`deleteProject` 用否定式 `!==` 检查，`getProject`/`updateProject` 用肯定式 `===` 检查——逻辑等效但风格不一致
2. **维护隐患**：若新增角色（如 `editor`），需同步修改路由层 `roleMiddleware` + controller 层三处检查，任一遗漏导致权限漏洞
3. **违反 DRY**：角色策略在路由层声明后，不应在 controller 中重复

**对比**：`listProjects` 和 `createProject` **无** controller 层角色检查——正确信任路由层中间件。同一 controller 内三种风格并存（无检查 / `=== 'view'` / `!== 'sysadmin'`）。

**修复建议**：移除 controller 层全部冗余角色检查，统一信任路由层 `roleMiddleware`。若需要 defense-in-depth，应通过统一中间件或 decorator 实现，而非在每个 handler 中硬编码。

---

## MEDIUM-3 — 路由文件缺少模块级架构文档

**位置**: 文件顶部

17 行代码无任何注释，新开发者需要追溯 4 个文件才能理解完整架构：

| 需要追溯的信息 | 所在文件 | 行号 |
|--------------|---------|------|
| 挂载路径 `/api/v1/projects` | `app.ts` | L124 |
| 认证 + 角色策略 | 本文件 L9 | `authMiddleware` + `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)` |
| schema 定义 | `schema/project.schema.ts` | 全文 |
| controller 实现 | `controller/project.controller.ts` | 全文 |
| service 接口 | `service/project.service.ts` | 全文 |
| 角色常量定义 | `constants/roles.ts` | L4-8 |

**建议**：

```typescript
/**
 * 项目 CRUD 路由
 *
 * 挂载点: app.ts → app.use('/api/v1/projects', projectRoutes)
 * 权限:   sysadmin + admin（view 被路由层 roleMiddleware 拦截）
 * 校验:   POST/PUT 通过 Zod schema 校验 body，GET/DELETE 的 params 和 query 依赖 controller 层校验
 *
 * 路由表:
 *   GET    /           → listProjects    (query: page, pageSize, search, company_id, status)
 *   GET    /:id        → getProject
 *   POST   /           → createProject   (body: createProjectSchema)
 *   PUT    /:id        → updateProject   (body: updateProjectSchema)
 *   DELETE /:id        → deleteProject
 */
```

---

## LOW-1 — `.d.ts` 编译产物信息密度极低

**位置**: `dist/apis/apis/routes/project.routes.d.ts`

```typescript
import { Router } from 'express';
declare const router: Router;
export default router;
```

TypeScript 默认编译结果仅保留类型声明，路由注册信息（路径、HTTP 方法、中间件链、controller 绑定）全部丢失。前端开发者无法通过 `.d.ts` 了解可用端点，需查看源码或 Swagger 文档。

**当前判定**：编译产物正确，无需修改。此为 TypeScript + Express 的固有局限，可通过 OpenAPI/Swagger 弥补。

---

## LOW-2 — DELETE 路由无独立限流，与 article.routes.ts 不一致

**位置**: L15

```typescript
router.delete('/:id', ctrl.deleteProject);
```

**对比** `article.routes.ts` L18：

```typescript
router.delete('/:projectId/articles/:id', articleActionLimiter, ctrl.deleteArticle);
```

article 模块的 DELETE 和 review 操作使用了 `articleActionLimiter` 限流中间件，而 project 模块的 DELETE 无独立限流。当前项目级删除频率较低，风险有限，但随着项目数量增长，无限制的 DELETE 调用可能被滥用。

**建议**：评估为 DELETE 路由添加独立限流（或复用已有的 `articleActionLimiter`）。

---

## 积极实践（值得保持）

1. **`router.use` 统一中间件挂载** — L9 的 `router.use(authMiddleware, roleMiddleware(...))` 确保所有路由自动受保护，无遗漏风险。这是 Express 路由安全最佳实践
2. **角色常量化** — `ROLES.SYSADMIN` / `ROLES.ADMIN` 消除硬编码字符串的拼写错误风险
3. **`.strict()` schema** — `createProjectSchema` 和 `updateProjectSchema` 使用 `.strict()` 拒绝未知字段，防止参数注入
4. **简洁的 CRUD 路由表** — 5 条路由覆盖完整 CRUD，RESTful 语义清晰
5. **Barrel 导入** — `from '../middleware'` 而非直接引用文件路径，与项目约定一致
6. **职责单一** — 17 行代码仅做路由注册 + 中间件绑定 + 校验绑定，零业务逻辑
7. **四层分离** — Routes → Controller → Service → Prisma，每层职责边界明确

---

## 架构对比：同级 CRUD 路由文件

| 维度 | project.routes.ts | user.routes.ts | company.routes.ts | todo.routes.ts |
|------|-------------------|----------------|-------------------|----------------|
| 行数 | 17 | 17 | 16 | 21 |
| 路由数 | 5 | 5 | 5 | 11 |
| validate() | 2（POST/PUT body） | 3（POST body + GET query + GET params） | 3（POST/PUT body + PUT status） | 11（全面覆盖） |
| params 校验 | ❌ 无 | ❌ 无 | ❌ 无 | ✅ `validate(todoIdSchema, 'params')` |
| query 校验 | ❌ 无 | ✅ `validate(listUsersSchema, 'query')` | ❌ 无 | ✅ `validate(listTodosSchema, 'query')` |
| 中间件模式 | 无路径前缀 | 无路径前缀 | 无路径前缀 | 无路径前缀 |
| 导入方式 | `* as ctrl` | `* as ctrl` | `* as ctrl` | `* as ctrl` |
| 模块注释 | 无 | 无 | 无 | 无 |
| DELETE 限流 | ❌ 无 | ❌ 无 | ❌ 无 | ❌ 无 |

**关键发现**：`todo.routes.ts` 是项目中校验覆盖最完整的 CRUD 路由——11 条路由全部有 `validate()`，包括 params 和 query。project.routes.ts 的 `validate()` 覆盖率为 40%（2/5），低于 todo 的 100%。`user.routes.ts` 和 `company.routes.ts` 与 project 处于同一水平，说明"GET/DELETE 无 params 校验"是项目级技术债务。

---

## 架构改进路线图

### 第一阶段（HIGH 级，建议修复）

| # | 问题 | 修复方案 | 预估工作量 |
|---|------|---------|-----------|
| H-1 | GET/DELETE 无 params 校验 | 创建 `idParamSchema` + `validate(idParamSchema, 'params')` | 20min |
| H-2 | 通配符导入 | 改为 5 个具名导入 | 5min |

### 第二阶段（MEDIUM 级，建议改进）

| # | 问题 | 修复方案 | 预估工作量 |
|---|------|---------|-----------|
| M-1 | list query 参数解析下放 controller | 创建 `listProjectSchema` + 路由层 `validate(query)` | 30min |
| M-2 | controller 角色检查冗余 | 移除 controller 层 3 处角色检查 | 10min |
| M-3 | 缺少模块文档 | 添加 JSDoc 模块注释 | 10min |

### 第三阶段（长期观察）

| # | 问题 | 修复方案 |
|---|------|---------|
| L-1 | .d.ts 信息密度低 | 通过 Swagger/OpenAPI 弥补 |
| L-2 | DELETE 无限流 | 评估添加独立限流 |

---

## 修复后预期评分

修复 H-1 + H-2 + M-1 后预期综合评分：**9.0/10**

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 源文件 | apis/routes/project.routes.ts |
| 编译产物 | dist/apis/apis/routes/project.routes.d.ts |
| 源文件行数 | 17 |
| 路由数量 | 5（GET×2 + POST + PUT + DELETE） |
| 评审类型 | 软件架构专家评审 |
| 评审日期 | 2026-05-26 |
| 关联文件 | apis/app.ts（L124 挂载）、apis/controller/project.controller.ts、apis/service/project.service.ts、apis/schema/project.schema.ts、apis/middleware/index.ts、apis/constants/roles.ts |
| 对比文件 | apis/routes/user.routes.ts、apis/routes/company.routes.ts、apis/routes/todo.routes.ts、apis/routes/article.routes.ts |
| 关联评审 | [质量评审](project.routes.d.ts.quality.md) 8.2/10 APPROVE |
