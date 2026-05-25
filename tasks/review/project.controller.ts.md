# apis/controller/project.controller.ts — 软件架构专家评审报告

**评审日期**: 2026-05-25
**评审角色**: 软件架构专家（分层架构 · 职责边界 · 扩展性 · 可测试性 · 一致性 · 架构原则）
**文件路径**: `apis/controller/project.controller.ts`
**代码行数**: 177 行（5 个导出函数 + 2 个辅助函数 + 1 个模块级服务实例）
**关联路由**: `apis/routes/project.routes.ts`（5 条路由，均配置 `authMiddleware` + `roleMiddleware(SYSADMIN, ADMIN)` + Zod validate）
**关联服务**: `apis/service/project.service.ts`（接口 `IProjectService`）→ `apis/service/impl/project.service.impl.ts`（实现 `ProjectServiceImpl`）
**关联实体**: `apis/entity/project.entity.ts`（Project, CreateProjectRequest, UpdateProjectRequest）
**关联验证**: `apis/schema/project.schema.ts`（createProjectSchema, updateProjectSchema — Zod）
**关联映射**: `apis/map/index.ts` — `mapProject()`
**关联工具**: `apis/utils/response.util.ts`（success, fail, paginate, created）、`apis/errors.ts`（AppError 层次结构）

**基线对比**: 本评审基于 2026-05-25 当前版本（177 行），与 2026-05-24 旧版（292 行）架构评审对比，标注已修复项和剩余问题。

---

## 一、总体架构评估

| 架构维度 | 评分 | 较旧版变化 | 说明 |
|----------|------|-----------|------|
| 分层合规性 | 9/10 | +2 | 业务逻辑（company_id 覆盖、admin operator 检查）已下沉到 service 层，controller 回归 HTTP 适配器角色 |
| 职责单一性 | 8/10 | +3 | controller 仅做参数提取、基础校验、响应映射；遗留部分与 Zod 重复的长度校验 |
| 依赖管理 | 8/10 | +4 | 声明为 `IProjectService` 接口类型（第 7 行），但仍为模块级 `new` 实例化 |
| 一致性 | 9/10 | +4 | 全部使用 `success()`/`created()`/`paginate()`/`fail()` 工具函数；`parseInt` 统一使用 radix=10 |
| 可测试性 | 6/10 | +2 | `handleServiceError` + `getErrorMessage` 提取为辅助函数，但无 DI 机制 |
| 扩展性 | 7/10 | +2 | Zod schema 验证已引入路由层，controller 验证可进一步精简 |
| 授权架构 | 9/10 | +3 | view 角色拦截 + admin operator 检查均已在适当层级实施 |

**问题统计**: HIGH × 1 / MEDIUM × 3 / LOW × 3

**综合评分**: **8.0/10** — 相比旧版（5.7/10）显著提升，核心架构缺陷已修复。

---

## 二、已修复项确认（旧版评审问题对照）

| 旧版问题 | 级别 | 修复状态 | 当前代码位置 |
|----------|------|----------|-------------|
| C-1: 授权职责分散，controller 含 admin operator 检查 | CRITICAL | ✅ 已修复 | admin operator 检查已下沉到 service impl（getById 第 56-58 行、update 第 118-121 行、delete 第 187-189 行） |
| C-2: Controller 含 company_id 覆盖和不可更改业务规则 | CRITICAL | ✅ 已修复 | company_id 覆盖在 service impl create 第 68 行；不可更改在 service impl update 第 124-126 行 |
| H-1: 依赖倒置，`projectService` 无接口类型声明 | HIGH | ✅ 已修复 | 第 7 行 `const projectService: IProjectService = new ProjectServiceImpl()` |
| H-2: 基于字符串匹配的错误分派 | HIGH | ✅ 已修复 | 引入 `AppError` 层次结构 + `handleServiceError` 辅助函数（第 14-20 行） |
| H-4: 手动构造 201 响应 | HIGH | ✅ 已修复 | 第 117 行 `created(res, item, '创建项目成功')` |
| M-1: `err: any` 类型不安全 | MEDIUM | ✅ 已修复 | 全部改为 `err: unknown`，`getErrorMessage` 安全窄化（第 9-11 行） |
| M-2: `req.body` 整体传递 + 黑名单模式 | MEDIUM | ✅ 已修复 | 白名单提取（create 第 107-114 行、update 第 138-146 行） |
| M-3: Controller 与 Service 重复查询 | MEDIUM | ✅ 已修复 | controller 不再单独调用 `getById`，权限检查统一在 service 内 |
| L-3: pageSize 无上限 | LOW | ✅ 已修复 | 第 28 行 `Math.min(100, ...)` |

---

## 三、架构层面问题清单

### HIGH 级别

#### H-1: Zod Schema 与 Controller 校验规则冲突 — 验证边界不一致

**位置**: `apis/schema/project.schema.ts` vs controller 第 92-104 行

**问题代码**:

```typescript
// Zod schema (路由中间件层，先执行)
short_name: z.string().min(1).max(100, '项目简称不能超过100个字符')  // 允许 100 字符
description: z.string().max(2000, '项目描述不能超过2000个字符')       // 允许 2000 字符

// Controller 层 (后执行)
if (short_name.length > 50) {                                       // 只允许 50 字符
  fail(res, 400, '项目短名不能超过50个字符');
}
if (description && description.length > 500) {                      // 只允许 500 字符
  fail(res, 400, '项目描述不能超过500个字符');
}
```

**架构分析**:

请求验证分为两层：路由层的 Zod schema 中间件 + controller 层手写校验。两者存在长度限制冲突：

| 字段 | Zod schema | Controller | 数据库约束 | 实际生效值 |
|------|-----------|------------|-----------|-----------|
| short_name | 100 | 50 | 50 (Prisma schema) | 50 |
| full_name | 200 | 200 | 200 | 200 (一致) |
| description | 2000 | 500 | 500 (Prisma schema) | 500 |

**问题**:

1. **Zod 先通过再被 Controller 拒绝**: 用户提交 `short_name` 为 60 字符时，Zod 中间件放行（≤100），但 controller 返回 400（>50）。错误消息"项目短名不能超过50个字符"与 Zod 的"项目简称不能超过100个字符"矛盾，前端/用户困惑。
2. **验证职责不清**: Zod 的设计意图是作为统一验证入口（validate 中间件），但 controller 又重做了一遍部分校验。两套验证规则增加了维护成本——修改限制时必须同步两处。
3. **数据库约束为最终真相**: 实际字符限制由 Prisma schema 的 `@db.VarChar(50/200/500)` 决定，Zod 和 Controller 都应与之对齐。

**修复建议**:

统一以数据库约束为准，将 Zod schema 与 DB 约束对齐，移除 controller 中的重复校验：

```typescript
// apis/schema/project.schema.ts — 与 DB 约束对齐
export const createProjectSchema = z.object({
  short_name: z.string().min(1, '项目简称不能为空').max(50, '项目简称不能超过50个字符').trim(),
  full_name: z.string().min(1, '项目全称不能为空').max(200, '项目全称不能超过200个字符').trim(),
  description: z.string().max(500, '项目描述不能超过500个字符').trim().nullable().optional(),
  // ...
});

// controller 中移除重复的长度校验（第 92-104 行），Zod 已保证合规
```

---

### MEDIUM 级别

#### M-1: Controller 保留冗余校验 — 职责与 Zod 中间件重叠

**位置**: 第 30-33 行（search 长度）、第 35-38 行（company_id 正整数）、第 40-47 行（status 枚举）、第 92-104 行（字符串长度）

**分析**:

路由层已配置 Zod validate 中间件处理 POST/PUT 请求体（project.routes.ts 第 13-14 行）。Controller 中部分校验与 Zod 功能重叠：

| 校验项 | 所在层 | 是否冗余 |
|--------|--------|---------|
| `short_name`/`full_name` 长度 | Zod + Controller | 冗余（但限制不一致，见 H-1） |
| `description` 长度 | Zod + Controller | 冗余 |
| `search` 长度限制 (≤100) | Controller | 不冗余（query 参数无 Zod schema） |
| `company_id` 正整数 | Zod(body) + Controller(query) | query 侧不冗余 |
| `status` 参数枚举 | Controller | 不冗余（query 参数无 Zod schema） |
| `!short_name || !full_name` 存在性 | Zod + Controller | 冗余（Zod `.min(1)` 已保证） |
| `hasCompanyId` 条件检查 | Controller | 不冗余（涉及角色逻辑，Zod 将 company_id 设为 optional） |

**建议**: 将 query 参数验证也纳入 Zod schema（使用 `source: 'query'`），逐步将 controller 校验精简为仅保留角色相关的条件逻辑。

---

#### M-2: `listProjects` 的 `company_id` 查询参数使用 `parseInt` 无 radix

**位置**: 第 34 行

```typescript
const company_id = req.query.company_id ? parseInt(req.query.company_id as string, 10) : undefined;
```

**分析**:

当前代码已正确使用 `parseInt(x, 10)` + 正整数校验（第 35-38 行）。但 `page` 和 `pageSize` 的默认值处理存在微小隐患：

```typescript
const page = parseInt(req.query.page as string, 10) || 1;      // page=0 会被覆盖为 1
const pageSize = Math.min(100, parseInt(req.query.pageSize as string, 10) || 10);
```

使用 `||` 运算符时，`parseInt` 返回 `0` 或 `NaN` 都会回退到默认值。`page=0` 不合法所以 `|| 1` 合理；但更规范的做法是使用 `??` 并显式处理 `NaN`。

**严重程度**: 低。当前实现在实际使用中行为正确，仅存在语义精确性差异。

---

#### M-3: `createProject` 的 `hasCompanyId` 条件逻辑复杂度偏高

**位置**: 第 84-86 行

```typescript
const hasCompanyId = req.user.role === 'admin' ? !!req.user.companyId : !!req.body.company_id;
if (!short_name || !full_name || !hasCompanyId) {
  fail(res, 400, '项目短名、项目全名、所属公司不能为空');
}
```

**架构分析**:

1. **语义模糊**: `hasCompanyId` 的计算逻辑将角色判断与字段存在性检查耦合在一起，阅读者需要推理才能理解"admin 看 `req.user.companyId`，sysadmin 看 `req.body.company_id`"。
2. **错误消息不准确**: 对于 admin 用户，实际检查的是 `req.user.companyId` 而非请求体中的 `company_id`，但错误消息说"所属公司不能为空"，可能误导 admin 用户以为需要提交 company_id。
3. **与 Zod schema 矛盾**: Zod 将 `company_id` 定义为 `.optional()`（因为 admin 不需要提供），但 controller 又要求 sysadmin 必须提供。这个逻辑是正确的，但分散在两个地方增加了理解难度。

**修复建议**:

```typescript
// 更清晰的写法 — 分离角色逻辑
const effectiveCompanyId = req.user.role === 'admin'
  ? req.user.companyId
  : req.body.company_id;

if (!short_name || !full_name || !effectiveCompanyId) {
  fail(res, 400, '项目短名、项目全名、所属公司不能为空');
  return;
}

const data = { short_name, full_name, description, company_id: effectiveCompanyId, ... };
```

注：service impl 第 68 行已做 `effectiveCompanyId` 计算，controller 侧的计算存在重复。

---

### LOW 级别

#### L-1: 模块级服务实例化 — 无依赖注入容器

**位置**: 第 7 行

```typescript
const projectService: IProjectService = new ProjectServiceImpl();
```

**分析**:

已声明为 `IProjectService` 接口类型（较旧版改进），但仍在模块顶层实例化具体实现类。在当前单实例 Express 架构下不会造成问题，但影响单元测试的可替换性。

**影响**: 低。当前项目使用集成测试（实际 DB 连接），不依赖 mock 注入。如需引入单元测试，可通过 `jest.mock` 劫持模块。

---

#### L-2: `handleServiceError` 未覆盖 `listProjects`

**位置**: 第 51-53 行 vs 第 14-20 行

```typescript
// listProjects 的 catch — 未使用 handleServiceError
catch (err: unknown) {
  fail(res, 500, getErrorMessage(err, '获取项目列表失败'));
}

// 其他函数 — 使用 handleServiceError
catch (err: unknown) {
  handleServiceError(res, err, '获取项目详情失败');
}
```

**分析**:

`listProjects` 的 service 层 `list()` 方法不抛出 `AppError`（仅做数据过滤），所以 controller 使用 `getErrorMessage` 直接返回 500 是合理的。但为保持一致性，可统一使用 `handleServiceError`——如果未来 service 层的 `list` 方法可能抛出 `AppError`（如数据库连接异常包装），`handleServiceError` 能正确分派。

---

#### L-3: `deleteProject` 的角色检查与路由中间件冗余

**位置**: 第 165-168 行

```typescript
// Controller 层
if (role !== 'sysadmin' && role !== 'admin') {
  fail(res, 403, '无权删除项目');
  return;
}
```

对比路由层：
```typescript
// project.routes.ts 第 9 行
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));
```

**分析**:

路由层 `roleMiddleware(SYSADMIN, ADMIN)` 已确保只有 sysadmin 和 admin 角色能到达 controller。controller 的角色检查属于防御性编程，增加了一层安全保障，但造成代码冗余。

**建议**: 保留。防御性编程在关键操作（删除）上是合理的，且成本低。

---

## 四、函数逐项架构评审

### 4.1 `listProjects`（第 22-54 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 仅做参数提取 + 基础校验 + 响应格式化 |
| 参数验证 | ✅ | page/pageSize/company_id/status 均有校验，pageSize 有上限 |
| 搜索安全 | ✅ | search 限制 ≤100 字符 |
| 响应一致性 | ✅ | 使用 `paginate()` 标准响应 |
| 错误处理 | ⚠️ | 未使用 `handleServiceError`（不影响正确性，仅一致性） |

### 4.2 `getProject`（第 56-76 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 纯 HTTP 适配器，业务逻辑在 service 层 |
| 参数验证 | ✅ | ID 使用 `parseInt(x, 10)` + NaN 检查 |
| 授权架构 | ✅ | view 角色拦截（第 65-68 行）+ admin operator 检查在 service |
| 错误处理 | ✅ | `handleServiceError` 统一分派 AppError |

### 4.3 `createProject`（第 78-121 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 白名单提取字段，业务规则（company_id 覆盖）在 service |
| 参数验证 | ⚠️ | 与 Zod schema 重复且有冲突（short_name 50 vs 100） |
| 不可变性 | ✅ | 构造独立 `data` 对象（第 107-114 行），不修改 `req.body` |
| 响应构造 | ✅ | 使用 `created()` 工具函数 |
| 角色逻辑 | ⚠️ | `hasCompanyId` 条件复杂（见 M-3） |

### 4.4 `updateProject`（第 123-154 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 白名单提取字段（第 138-146 行），业务规则在 service |
| 授权架构 | ✅ | view 角色拦截 + admin operator 检查在 service |
| 不可变性 | ✅ | 不修改 `req.body`，构造独立 `updateData` 对象 |
| 并发安全 | ✅ | controller 不再做先读后写，TOCTOU 已消除 |

### 4.5 `deleteProject`（第 156-176 行）

| 架构检查项 | 状态 | 说明 |
|-----------|------|------|
| 职责边界 | ✅ | 纯授权检查 + 委托 service |
| 授权架构 | ✅ | 双层防御（路由 + controller 角色检查 + service operator 检查） |
| 错误处理 | ✅ | `handleServiceError` 统一分派 |
| 防御性编程 | ✅ | 角色检查虽与路由中间件冗余但合理 |

---

## 五、辅助函数评审

### 5.1 `getErrorMessage`（第 9-11 行）

```typescript
function getErrorMessage(err: unknown, defaultMessage: string): string {
  return err instanceof Error ? (err.message || defaultMessage) : defaultMessage;
}
```

**评价**: ✅ 类型安全的错误消息提取，`unknown` 类型窄化正确，`||` 确保空字符串时回退。

### 5.2 `handleServiceError`（第 14-20 行）

```typescript
function handleServiceError(res: Response, err: unknown, defaultMessage: string): void {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    fail(res, 500, getErrorMessage(err, defaultMessage));
  }
}
```

**评价**: ✅ 统一的 service 错误映射器，基于 `AppError` 类型分派而非字符串匹配。`AppError` 的 `statusCode` 属性（400/403/404/409）直接映射 HTTP 状态码，消除了旧版的隐式契约问题。

---

## 六、与旧版（292 行）的架构对比

| 架构指标 | 旧版 (292 行) | 当前版 (177 行) | 变化 |
|----------|-------------|---------------|------|
| 代码行数 | 292 | 177 | -39% — 削减了业务逻辑代码 |
| controller 层业务逻辑 | company_id 覆盖 + 不可更改 + operator 检查 | 仅角色条件 + 白名单提取 | 大幅减少 |
| 授权位置 | controller 层 `if (role === 'admin')` 分支 | service 层统一处理 | ✅ 正确下沉 |
| 错误分派 | `err.message === '项目不存在'` 字符串匹配 | `instanceof AppError` 类型匹配 | ✅ 类型安全 |
| 响应构造 | 手动 `res.status(201).json(...)` | `created()` 工具函数 | ✅ 统一 |
| 请求体处理 | `delete req.body.company_id` + 整体传递 | 白名单构造独立对象 | ✅ 不可变 |
| 重复查询 | controller `getById` + service `findFirst` | controller 无查询，service 内原子化 | ✅ 消除 |
| Zod 验证 | 无 | 路由层 `validate(schema)` 中间件 | ✅ 新增 |
| view 角色拦截 | 缺失 | 每个写操作都有检查 | ✅ 修复 |

---

## 七、修复优先级建议

### P1（尽快修复 — 一致性）

1. **H-1**: 将 Zod schema 的 `short_name` 限制从 100 改为 50，`description` 从 2000 改为 500，与数据库约束和 controller 保持一致
2. **M-3**: 简化 `createProject` 的 `hasCompanyId` 逻辑，使用 `effectiveCompanyId` 变量统一处理

### P2（计划修复 — 精简）

3. **M-1**: Zod schema 校验对齐后，移除 controller 中重复的字符串长度校验（第 92-104 行），保留仅 Zod 未覆盖的 query 参数校验
4. **L-2**: `listProjects` 的 catch 统一使用 `handleServiceError`

### P3（可选改进）

5. **L-1**: 如需引入单元测试，考虑工厂函数或 DI 容器管理服务实例
6. 为 query 参数创建 Zod schema（`source: 'query'`），进一步减少 controller 中的手写校验

---

## 八、总结

`project.controller.ts` 经过重构后，架构质量从 5.7 分提升至 **8.0 分**。核心改进包括：

1. **职责回归**: controller 从"业务逻辑执行者"回归为"HTTP 适配器"。`company_id` 覆盖规则、不可更改约束、admin operator 归属检查全部下沉到 service 层，符合分层架构的职责边界原则。

2. **错误处理体系化**: 引入 `AppError` 层次结构 + `handleServiceError` 统一映射器，消除了旧版的字符串匹配反模式。service 层抛出 `NotFoundError(404)`/`BusinessError(400)`/`ForbiddenError(403)`，controller 通过 `instanceof` 安全分派。

3. **防御性设计完善**: 白名单提取请求字段（不修改 `req.body`）、`req.user` 非空检查、view 角色铁律执行、pageSize 上限约束、search 长度限制、Zod schema 路由层验证。

4. **一致性改善**: 全部使用响应工具函数（`success`/`created`/`paginate`/`fail`），`parseInt` 统一 radix=10，`err: unknown` 统一类型安全。

剩余的主要关注点是 **Zod schema 与 Controller 校验规则的长度限制不一致**（H-1），属于配置对齐问题，修复成本低。整体代码已达到良好架构水平。
