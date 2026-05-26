# project.routes.d.ts Committer 评审

**文件**: `dist/apis/apis/routes/project.routes.d.ts` → 源文件 `apis/routes/project.routes.ts`
**评审类型**: 代码 Committer 审核（Committer Review）
**评审日期**: 2026-05-26
**Committer**: AI Code Reviewer
**最终裁决**: **CONDITIONAL APPROVE** — 2 项 CRITICAL 阻断需修复，4 项 HIGH 建议修复

---

## 综合评分：7.0/10

17 行路由文件实现完整 CRUD，中间件链设计规范，Zod schema 覆盖写操作，测试 80+ 用例覆盖率高。主要阻断项：GET/DELETE `:id` 零路由级校验导致防御纵深断裂（C-1），`AuthPayload.role` 为 `string` 类型导致角色校验基于松散匹配（C-2）。修复 2 项 CRITICAL 后可达 9.0/10。

---

## 审核范围

| 项目 | 说明 |
|------|------|
| 源文件 | `apis/routes/project.routes.ts`（17 行） |
| 编译产物 | `dist/apis/apis/routes/project.routes.d.ts`（4 行） |
| 关联文件 | `project.controller.ts`、`project.schema.ts`、`auth.middleware.ts`、`validate.ts`、`roles.ts` |
| 测试文件 | `tests/apis/project.controller.test.ts`（4244 行，80+ 用例） |
| 挂载位置 | `app.ts` L124 → `/api/v1/projects` |
| 已有评审 | 质量 8.2/10、架构 7.8/10、安全 7.2/10 |

---

## CRITICAL（阻断合并）

### C-1: GET/DELETE `:id` 参数零路由级校验——防御纵深断裂

**位置**: `project.routes.ts` L11-12, L15

```typescript
router.get('/:id', ctrl.getProject);           // ❌ 无 validate()
router.put('/:id', validate(updateProjectSchema), ctrl.updateProject); // ✅ body 校验
router.delete('/:id', ctrl.deleteProject);      // ❌ 无 validate()
```

**阻断理由**:

1. **`parseInt` 截断行为**: `parseInt('1;malicious')` → `1`，service 层收到"合法" ID，可能返回非预期数据。这不是理论风险——测试文件 L2275-2286 已验证 `GET /1.5` 通过 `parseInt` 截断为 `1` 并成功返回数据（test: "should treat decimal id as truncated integer"）
2. **防御纵深不对称**: POST/PUT 三层防御（路由 Zod → controller parseInt → service 校验），GET/DELETE 仅一层（controller parseInt）
3. **与项目先例矛盾**: `todo.routes.ts` 11 条路由全部使用 `validate()`，覆盖率达 100%；project 模块仅 40%（2/5）
4. **已有现成解决方案**: `validate.ts` 已支持 `source: 'params'`，只需创建 `idParamSchema` 即可

**验证**:

```typescript
// validate.ts L4 — 已支持 params 校验
type ValidationSource = 'body' | 'query' | 'params';

// roles.ts — Role 类型已定义
export type Role = (typeof ROLES)[keyof typeof ROLES];
```

**修复方案**（预估 20min）:

```typescript
// project.schema.ts — 新增
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('无效的项目ID'),
});

// project.routes.ts — 修改三处
router.get('/:id', validate(idParamSchema, 'params'), ctrl.getProject);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateProjectSchema), ctrl.updateProject);
router.delete('/:id', validate(idParamSchema, 'params'), ctrl.deleteProject);
```

**三份评审一致认定**: 质量 H-2、架构 HIGH-1、安全 S1 均标记此问题。**必须修复后合并。**

---

### C-2: `AuthPayload.role` 类型为 `string`，角色校验基于松散字符串匹配

**位置**: `auth.middleware.ts` L11 + `project.controller.ts` L66, L117, L150

```typescript
// auth.middleware.ts
export interface AuthPayload {
  role: string;  // 应为 Role 类型
}

// controller — 硬编码字符串
if (role === 'view') { ... }                          // L66, L117
if (role !== 'sysadmin' && role !== 'admin') { ... }  // L150
```

**阻断理由**:

1. **类型系统未提供编译期保护**: `Role` 类型已在 `roles.ts` L10 定义（`'sysadmin' | 'admin' | 'view'`），但 `AuthPayload` 未使用，导致 JWT payload 中 `role` 可为任意字符串
2. **controller 三种角色检查风格并存**:
   - `getProject`/`updateProject`: `=== 'view'`（肯定式，使用字符串字面量）
   - `deleteProject`: `!== 'sysadmin' && !== 'admin'`（否定式，使用字符串字面量）
   - `listProjects`/`createProject`: 无角色检查（信任路由层）
3. **新增角色时的权限空洞**: 若未来新增 `editor` 角色并修改 `roleMiddleware` 白名单，需同步修改 controller 层 `deleteProject` L150 的否定式检查，否则 editor 可 list/get/create/update 但被 delete 拒绝——行为不一致
4. **ROLES 常量已存在但未在 controller 使用**: `ROLES.VIEW`/`ROLES.SYSADMIN`/`ROLES.ADMIN` 已定义，controller 却硬编码字符串

**修复方案**（预估 30min）:

```typescript
// 方案一：AuthPayload.role 收紧（需同步修改 JWT 签发逻辑）
import { Role } from '../constants/roles';
export interface AuthPayload {
  role: Role;  // 编译期保护
}

// 方案二：controller 使用 ROLES 常量（最小改动）
if (role === ROLES.VIEW) { ... }
```

**三份评审一致认定**: 质量 L-1、架构 MEDIUM-2、安全 S2 均标记此问题。**必须修复后合并。**

---

## HIGH（强烈建议修复）

### H-1: `import * as ctrl` 通配符导入

**位置**: `project.routes.ts` L6

```typescript
import * as ctrl from '../controller/project.controller';
```

Controller 导出 7 个成员（5 handler + `getErrorMessage` + `handleServiceError`），路由仅使用 5 个。利用率 71%。

**影响**: 编译耦合、命名空间污染、IDE 自动补全噪声。

**修复**（5min）:

```typescript
import { listProjects, getProject, createProject, updateProject, deleteProject } from '../controller/project.controller';
```

**三份评审一致标记**: 质量 H-1、架构 HIGH-2、安全 S6。

---

### H-2: `listProjects` query 参数零路由级校验

**位置**: `project.routes.ts` L11 + `project.controller.ts` L28-48

路由层零校验，controller 手动解析 20 行 query 参数。`page` 无上界保护（OFFSET DoS），`search` 长度校验硬编码在 controller，`status` 枚举校验手动实现。

**影响**: 校验逻辑与业务逻辑混合在 controller 中；`page=999999999` 触发慢查询。

**修复**（30min）: 创建 `listProjectSchema` 并在路由层 `validate(listProjectSchema, 'query')`。

---

### H-3: controller 层角色检查与 `roleMiddleware` 冗余

**位置**: `project.controller.ts` L66-69, L117-120, L149-153

三处 controller 角色检查与路由层 `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)` 语义完全重叠。`listProjects`/`createProject` 无检查（正确），同文件三种风格并存。

**影响**: 角色模型变更时需同步修改 4 处（路由层 + controller 3 处），任一遗漏产生权限漏洞。

**修复**（10min）: 移除 controller 层 3 处冗余角色检查，统一信任路由层。修复 C-2 后 controller 不再有角色检查代码。

---

### H-4: DELETE 路由无独立限流

**位置**: `project.routes.ts` L15

对比 `article.routes.ts` 使用 `articleActionLimiter`（15min/30次），project 模块 DELETE 无独立限流。

**影响**: 已认证 admin 可在 15 分钟窗口内发起 100 次 DELETE（全局限流约束）。

**修复**（10min）: 添加 `projectActionLimiter`。

---

## MEDIUM（建议改进）

### M-1: 缺少模块级 JSDoc

**位置**: 文件顶部

17 行代码无注释，新开发者需追溯 4 个文件理解完整架构。

**三份评审一致标记**: 质量 M-4、架构 MEDIUM-3。

---

### M-2: `company_id` 在 `createProjectSchema` 中为 optional

**位置**: `project.schema.ts` L7

Schema 允许 `company_id` 缺失，依赖 controller L86 补充检查。若 controller 检查被移除，sysadmin 可创建"孤儿项目"。

**当前被 controller 阻断**: 风险有限。

---

## LOW（可接受）

### L-1: `.d.ts` 编译产物信息密度极低

4 行声明丢失全部路由元数据。TypeScript + Express 固有局限，通过 Swagger 弥补。

### L-2: `search` 长度校验位置不当

硬编码在 controller L31-34 而非 schema。随 H-2 一起修复。

---

## 积极实践（确认项）

| # | 实践 | 评价 |
|---|------|------|
| P1 | `router.use(authMiddleware, roleMiddleware(...))` 无路径前缀 | 所有路由自动受保护，新增路由零遗漏 |
| P2 | 角色常量化 `ROLES.SYSADMIN`/`ROLES.ADMIN` | 消除拼写错误风险 |
| P3 | Zod `.strict()` schema | 拒绝未知字段，防 OWASP API3:2023 |
| P4 | 软删除 + `$transaction` | 防止 TOCTOU 竞态 |
| P5 | JWT 黑名单 | 支持登出撤销 token |
| P6 | 测试覆盖 80+ 用例 | 覆盖认证、授权、输入校验、错误处理、边界值、角色隔离 |
| P7 | 四层分离 Routes → Controller → Service → Prisma | 职责边界明确 |

---

## 测试评估

| 维度 | 评估 |
|------|------|
| 测试文件 | `tests/apis/project.controller.test.ts`（4244 行） |
| 测试用例数 | 80+ |
| 认证测试 | 每个端点均有 401 测试（路由层 + controller 直测） |
| 授权测试 | sysadmin/admin/view 三角色全覆盖，含 defense-in-depth |
| 输入校验 | 无效 ID、超长字符串、NaN、负数、零值、小数截断 |
| 错误处理 | DB 错误、non-Error thrown、AppError 子类映射 |
| 分页边界 | page=0、pageSize=0、pageSize=9999 上限 |
| **缺失** | `page` 大值 OFFSET 慢查询测试、DELETE 高频限流测试 |

---

## 修复优先级汇总

| 优先级 | 编号 | 问题 | 修复方案 | 预估工时 | 阻断？ |
|--------|------|------|---------|---------|--------|
| CRITICAL | C-1 | `:id` 零 params 校验 | `idParamSchema` + `validate('params')` | 20min | **是** |
| CRITICAL | C-2 | `role` 为 string + 硬编码 | `AuthPayload.role: Role` + `ROLES` 常量 | 30min | **是** |
| HIGH | H-1 | 通配符导入 | 5 个具名导入 | 5min | 否 |
| HIGH | H-2 | query 零路由级校验 | `listProjectSchema` + `validate('query')` | 30min | 否 |
| HIGH | H-3 | controller 角色检查冗余 | 移除 3 处冗余检查 | 10min | 否 |
| HIGH | H-4 | DELETE 无独立限流 | `projectActionLimiter` | 10min | 否 |
| MEDIUM | M-1 | 缺模块文档 | JSDoc 注释 | 5min | 否 |
| MEDIUM | M-2 | `company_id` optional | schema 改必填 | 5min | 否 |

**总预估修复工时**: ~2h（含测试补充）

---

## 与已有评审交叉验证

| 发现 | 质量评审 | 架构评审 | 安全评审 | Committer 评审 | 一致性 |
|------|---------|---------|---------|---------------|--------|
| `:id` 零 params 校验 | H-2 | HIGH-1 | S1-HIGH | C-1 CRITICAL | 4/4 一致 |
| `role` 类型松散 | L-1 | MEDIUM-2 | S2-HIGH | C-2 CRITICAL | 4/4 一致 |
| 通配符导入 | H-1 | HIGH-2 | S6-LOW | H-1 HIGH | 4/4 一致 |
| query 零校验 | M-1 | MEDIUM-1 | S3-MEDIUM | H-2 HIGH | 4/4 一致 |
| 角色检查冗余 | L-1 | MEDIUM-2 | S5-MEDIUM | H-3 HIGH | 4/4 一致 |
| DELETE 无限流 | — | LOW-2 | S4-MEDIUM | H-4 HIGH | 3/3 一致 |
| 缺模块文档 | M-4 | MEDIUM-3 | — | M-1 MEDIUM | 3/3 一致 |
| `.d.ts` 信息密度 | L-2 | LOW-1 | S7-LOW | L-1 LOW | 4/4 一致 |

**四份评审 100% 一致**，无分歧项。Committer 评审仅提升了部分问题的严重等级（`:id` → CRITICAL、`role` → CRITICAL），基于以下判断：
- `:id` 截断行为已有测试证据（`GET /1.5` → 200 OK），非理论风险
- `role` 类型松散影响全局认证模型，非单一模块问题

---

## 修复后预期评分

修复 C-1 + C-2 后: **9.0/10 APPROVE**
修复全部 CRITICAL + HIGH 后: **9.5/10 APPROVE**

---

## 最终裁决

```
┌─────────────────────────────────────────────────────┐
│  CONDITIONAL APPROVE — 条件性批准合并                    │
│                                                     │
│  合并条件:                                            │
│  1. 修复 C-1: 创建 idParamSchema + validate('params') │
│  2. 修复 C-2: AuthPayload.role 收紧为 Role 类型        │
│                                                     │
│  非阻断项可在后续 PR 中修复:                             │
│  H-1 ~ H-4、M-1 ~ M-2                                │
│                                                     │
│  预估修复工时: ~50min（仅 CRITICAL）                    │
│  预估总工时: ~2h（含 HIGH/MEDIUM）                      │
└─────────────────────────────────────────────────────┘
```

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 源文件 | `apis/routes/project.routes.ts` |
| 编译产物 | `dist/apis/apis/routes/project.routes.d.ts` |
| 源文件行数 | 17 |
| 路由数量 | 5（GET×2 + POST + PUT + DELETE） |
| 评审类型 | 代码 Committer 审核 |
| 评审日期 | 2026-05-26 |
| 关联评审 | [质量评审](project.routes.d.ts.quality.md) 8.2/10 APPROVE、[架构评审](project.routes.d.ts.architecture.md) 7.8/10 APPROVE、[安全评审](project.routes.d.ts.security.md) 7.2/10 APPROVE |
| 关联文件 | `auth.middleware.ts`、`validate.ts`、`project.schema.ts`、`project.controller.ts`、`constants/roles.ts` |
| 对比文件 | `user.routes.ts`、`company.routes.ts`、`todo.routes.ts`、`article.routes.ts` |
