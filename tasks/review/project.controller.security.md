# apis/controller/project.controller.ts — 代码安全专家评审报告（v2 重审）

**评审日期**: 2026-05-25
**评审角色**: 代码安全专家（OWASP Top 10 · 注入攻击 · 权限绕过 · 输入验证 · 信息泄露 · CSRF · SSRF · 加密安全）
**文件路径**: `apis/controller/project.controller.ts`
**代码行数**: 177 行（5 个导出函数 + 2 个辅助函数 + 1 个模块级服务实例）
**对比版本**: v1 评审 2026-05-24（292 行，问题 CRITICAL×2 / HIGH×3 / MEDIUM×4 / LOW×3）
**关联路由**: `apis/routes/project.routes.ts` — 5 条路由，`authMiddleware` + `roleMiddleware(sysadmin, admin)` 守卫；POST/PUT 增加 `validate()` Zod schema 中间件
**关联服务**: `apis/service/project.service.ts`（接口 `IProjectService`）→ `apis/service/impl/project.service.impl.ts`（实现 `ProjectServiceImpl`）
**关联 Schema**: `apis/schema/project.schema.ts`（`createProjectSchema`, `updateProjectSchema`）→ `apis/middleware/validate.ts`（Zod safeParse）
**关联中间件**: `apis/middleware/auth.middleware.ts`（JWT 认证 + 角色鉴权）
**关联错误**: `apis/errors.ts`（`AppError` 层次：NotFoundError/BusinessError/ForbiddenError/ConflictError/UnauthorizedError）
**关联工具**: `apis/utils/response.util.ts`（success, fail, paginate, created）

---

## 一、安全总体评估

### 1.1 与 v1 评审对比

| 安全维度 | v1 评分 | v2 评分 | 变化 | 说明 |
|----------|---------|---------|------|------|
| 认证与授权 | 7/10 | **9/10** | +2 | `req.user` 空值守卫全面覆盖；deleteProject 显式角色白名单；view 角色拦截 |
| 输入验证 | 5/10 | **8/10** | +3 | 引入 Zod schema + validate 中间件；search/status/company_id 验证完善 |
| 注入防护 | 7/10 | **8/10** | +1 | pageSize 有上限；company_id NaN/正数校验；仍缺 page 下限 |
| 信息泄露 | 5/10 | **7/10** | +2 | `handleServiceError` 区分 AppError/未知错误；`getErrorMessage` 提取已知消息 |
| CSRF 防护 | 3/10 | **3/10** | 0 | 无变化，仍依赖 Bearer Token |
| 错误安全 | 4/10 | **7/10** | +3 | 统一错误处理函数 `handleServiceError`；`listProjects` 是唯一遗漏 |
| 请求速率限制 | 8/10 | **8/10** | 0 | 无变化 |
| 数据完整性 | 6/10 | **8/10** | +2 | service 层 company_id 不可变校验 + operator 归属校验 |

### 1.2 当前版本问题统计

| 严重度 | 数量 | 编号 |
|--------|------|------|
| CRITICAL | 0 | — |
| HIGH | 2 | H-1, H-2 |
| MEDIUM | 3 | M-1, M-2, M-3 |
| LOW | 3 | L-1, L-2, L-3 |

**综合评分: 7.8/10**（v1: 5.7/10，提升 +2.1 分）

### 1.3 v1 已修复问题追踪

| v1 编号 | 描述 | 状态 | 修复方式 |
|---------|------|------|----------|
| C-1 | TOCTOU 竞态 | ✅ 已缓解 | 授权检查下沉至 service 层（`getById`/`update`/`delete` 内部完成 operator 校验） |
| C-2 | deleteProject 隐式授权 | ✅ 已修复 | 显式 `role !== 'sysadmin' && role !== 'admin'` 白名单 + view 拦截 |
| H-1 | err.message 信息泄露 | ✅ 已修复 | `handleServiceError` 区分 `AppError`（返回业务消息）vs 未知错误（返回默认消息） |
| H-2 | parseInt 无边界检查 | ⚠️ 部分修复 | pageSize 有 `Math.min(100,...)`；company_id 有 NaN/正数校验；page 仍无下限（H-2 新） |
| H-3 | create 缺少输入验证 | ✅ 已修复 | Zod schema + validate 中间件 |
| M-1 | req.user! 非空断言 | ✅ 已修复 | 全部 handler 开头 `if (!req.user)` 守卫 |
| M-2 | delete req.body 反模式 | ✅ 已修复 | 白名单解构提取 `updateData` |
| M-3 | companyId 覆盖隐患 | ✅ 已修复 | `hasCompanyId` 检查 + service 层 `effectiveCompanyId` 覆盖 |
| M-4 | status 布尔值解析 | ✅ 已修复 | 严格 `'true'`/`'false'` 白名单 |
| L-1 | 手动构造 201 响应 | ✅ 已修复 | 使用 `created()` 工具函数 |
| L-2 | 模块顶层实例化 | 未修复 | 低优先级，需 DI 框架 |
| L-3 | Swagger 文档不足 | 未修复 | 低优先级 |

---

## 二、安全问题清单

### HIGH 级别

#### H-1: `listProjects` 的 catch 块未使用 `handleServiceError` — AppError 被吞为 500

**位置**: `listProjects` 第 51-53 行

**问题描述**:

```typescript
// listProjects — 第 51-53 行
catch (err: unknown) {
  fail(res, 500, getErrorMessage(err, '获取项目列表失败'));  // ← 不区分 AppError
}
```

其余四个 handler（`getProject`、`createProject`、`updateProject`、`deleteProject`）均使用 `handleServiceError`，能正确将 `AppError` 子类映射到对应 HTTP 状态码（404/403/400 等）。唯独 `listProjects` 仍使用原始 `getErrorMessage`，导致 service 层抛出的 `ForbiddenError(403)` 或 `BusinessError(400)` 被降级为 `500 Internal Server Error`。

**攻击场景**:

1. Admin 用户请求不属于自己公司的项目列表 → service 层根据 `role === 'admin'` 构造过滤条件
2. 如果 service 未来增加显式权限校验并抛出 `ForbiddenError`，客户端收到 500 而非 403
3. 前端无法根据状态码正确引导用户，反而可能触发错误监控告警

**OWASP 映射**: A04:2021 – Insecure Design

**修复建议**:

```typescript
} catch (err: unknown) {
  handleServiceError(res, err, '获取项目列表失败');
}
```

一行改动，与其他 handler 保持一致。

---

#### H-2: `page` 参数接受负值 — 负偏移导致意外查询

**位置**: `listProjects` 第 27 行

**问题描述**:

```typescript
const page = parseInt(req.query.page as string, 10) || 1;
```

`parseInt("-1", 10)` 返回 `-1`，而 `-1 || 1` 的结果是 `-1`（因为 `-1` 是 truthy）。`page=-1` 传入 service 层后，`(page - 1) * pageSize = (-2) * 10 = -20`，Prisma 的 `skip: -20` 在 PostgreSQL 中会生成 `OFFSET -20`，这会导致 SQL 错误或被截断为 0（取决于数据库版本）。

类似地，`page=-999` 也会通过。

**攻击场景**:

```
GET /api/v1/projects?page=-1&pageSize=10
```

Prisma 生成的 SQL：`SELECT ... OFFSET -20 LIMIT 10`，PostgreSQL 将抛出 `ERROR: OFFSET must not be negative`，这个错误会泄露到 `getErrorMessage` 返回客户端（H-1 的信息泄露叠加效应）。

**OWASP 映射**: A03:2021 – Injection（参数注入）

**修复建议**:

```typescript
const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
```

---

### MEDIUM 级别

#### M-1: Controller 层与 Zod Schema 验证阈值不一致 — short_name 50 vs 100

**位置**: `createProject` 第 92-95 行 vs `apis/schema/project.schema.ts` 第 4 行

**问题描述**:

Controller 手动检查：
```typescript
if (short_name.length > 50) {
  fail(res, 400, '项目短名不能超过50个字符');
```

Zod schema 定义：
```typescript
short_name: z.string().min(1).max(100, '项目简称不能超过100个字符').trim(),
```

Zod 中间件先执行（`validate(createProjectSchema)`），允许 51-100 字符的值通过。然后 controller 手动检查拒绝 > 50 的值。两者上限不一致，验证逻辑分裂在两层。

**安全影响**: 非直接安全风险，但验证逻辑不一致导致维护困惑——修改时容易遗漏其中一层。

**OWASP 映射**: A04:2021 – Insecure Design

**修复建议**:

统一到一个验证层。推荐方案：**移除 controller 层的字符串长度检查**，完全依赖 Zod schema。同时在 Zod 中统一限制为 50：

```typescript
// schema/project.schema.ts
short_name: z.string().min(1).max(50, '项目简称不能超过50个字符').trim(),
```

```typescript
// controller — 移除第 92-104 行的手动长度检查
```

---

#### M-2: `view` 角色检查为死代码 — 路由中间件已拦截

**位置**: `getProject` 第 64-68 行、`updateProject` 第 131-135 行

**问题描述**:

```typescript
// getProject — 第 64-68 行
if (role === 'view') {
  fail(res, 403, '无权查看该项目');
  return;
}
```

路由配置 `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)` 已经限制只有 sysadmin 和 admin 角色可以到达这些 handler。`view` 角色在中间件层就被拒绝（403），永远不会执行到这段代码。

**安全影响**: 代码冗余不影响安全性，但违反 YAGNI 原则。若未来路由中间件放宽角色白名单，这些检查可作为纵深防御。

**修复建议**: 保留作为纵深防御（defense-in-depth），但添加注释说明这是冗余保护：

```typescript
// Defense-in-depth: route middleware already blocks view, this is a safety net
if (role === 'view') {
```

---

#### M-3: `getErrorMessage` 对未知 Error 仍可能泄露内部信息

**位置**: 第 9-11 行（`getErrorMessage` 函数定义）

**问题描述**:

```typescript
function getErrorMessage(err: unknown, defaultMessage: string): string {
  return err instanceof Error ? (err.message || defaultMessage) : defaultMessage;
}
```

`handleServiceError` 对 `AppError` 子类返回业务消息（正确），但对非 AppError 的 Error 实例（如 Prisma 内部错误、TypeError、RangeError 等），仍通过 `err.message` 暴露给客户端。

**攻击场景**:

Prisma 连接异常时 `err.message` 可能为：
```
Can't reach database server at `postgres:5432`. Please make sure your database server is running at `postgres:5432`
```
攻击者可利用此信息发现数据库服务器地址。

**OWASP 映射**: A05:2021 – Security Misconfiguration

**修复建议**:

```typescript
function getErrorMessage(err: unknown, defaultMessage: string): string {
  if (err instanceof AppError) return err.message;
  // 非 AppError 的 Error — 生产环境不暴露内部消息
  return defaultMessage;
}
```

这样 `handleServiceError` 中的 `instanceof AppError` 分支和 `getErrorMessage` 中的 `instanceof AppError` 判断一致，未知 Error 始终返回默认消息。

---

### LOW 级别

#### L-1: `createProject` 对 admin 用户仍传递 body 中的 `company_id`

**位置**: `createProject` 第 107-114 行

**问题描述**:

```typescript
const data = {
  // ...
  company_id: req.body.company_id,  // ← admin 用户的 body company_id 被传递
};
const item = await projectService.create(data, req.user.role, req.user.companyId ?? undefined);
```

对于 admin 用户，service 层会使用 `companyId` 覆盖 `company_id`（`effectiveCompanyId = role === 'admin' ? companyId! : request.company_id`），但 controller 层仍然传递了 `req.body.company_id`。虽然结果正确，但意图不明确——阅读 controller 代码时无法确定 admin 用户的 `company_id` 是否来自 body。

**安全影响**: 无直接风险（service 层正确覆盖），但降低代码可审计性。

**修复建议**:

```typescript
const data = {
  short_name,
  full_name,
  description,
  company_id: req.user.role === 'admin' ? undefined : req.body.company_id,
  operator_ids: req.body.operator_ids,
  viewer_ids: req.body.viewer_ids,
};
```

---

#### L-2: 模块顶层 `new ProjectServiceImpl()` — DI 违反

**位置**: 第 7 行

**问题描述**:

```typescript
const projectService: IProjectService = new ProjectServiceImpl();
```

模块加载时立即创建服务实例，无法替换为 mock 实现进行安全审计测试。此项与 v1 的 L-2 相同，属于长期改进项。

---

#### L-3: `deleteProject` 的角色白名单与路由中间件冗余

**位置**: `deleteProject` 第 165-168 行

**问题描述**:

```typescript
if (role !== 'sysadmin' && role !== 'admin') {
  fail(res, 403, '无权删除项目');
  return;
}
```

路由中间件 `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)` 已限制只有这两个角色可达。此检查与中间件完全冗余。

**安全影响**: 作为纵深防御是合理的，但应在代码注释中说明意图。

---

## 三、攻击面分析

### 3.1 攻击面矩阵

| 端点 | 认证 | 授权 | 输入验证 | 输出过滤 | 并发安全 |
|------|------|------|----------|----------|----------|
| GET /api/v1/projects | JWT + roleMiddleware | ✅ | ✅ Zod(controller) + pageSize 上限 | ✅ | N/A |
| GET /api/v1/projects/:id | JWT + roleMiddleware | ✅ service 层 operator 校验 | ✅ parseInt + NaN 检查 | ✅ | N/A |
| POST /api/v1/projects | JWT + roleMiddleware | ✅ admin company 覆盖 | ✅ Zod schema + validate | ✅ | N/A |
| PUT /api/v1/projects/:id | JWT + roleMiddleware | ✅ service 层 operator 校验 | ✅ Zod schema + validate | ✅ | ⚠️ 非事务 |
| DELETE /api/v1/projects/:id | JWT + roleMiddleware | ✅ 显式白名单 | ✅ parseInt + NaN 检查 | ✅ | ⚠️ 非事务 |

### 3.2 安全威胁模型（v2 更新）

```
┌─────────────────────────────────────────────────────────────────┐
│                          攻击者                                  │
└──────────────┬───────────────────────────────────┬──────────────┘
               │                                   │
     ┌─────────▼─────────┐               ┌─────────▼─────────┐
     │  合法 sysadmin     │               │  合法 admin         │
     │  (越权尝试)        │               │  (跨公司操作尝试)   │
     └─────────┬─────────┘               └─────────┬─────────┘
               │                                   │
     ┌─────────▼───────────────────────────────────▼──────────┐
     │  路由层: authMiddleware → roleMiddleware(sysadmin,admin)│
     │  ✅ JWT 验证 + 角色白名单                               │
     │  ✅ POST/PUT: validate(ZodSchema) 中间件               │
     └─────────────────────────┬──────────────────────────────┘
                               │
     ┌─────────────────────────▼──────────────────────────────┐
     │  Controller 层                                          │
     │  ✅ req.user 空值守卫                                   │
     │  ✅ handleServiceError(AppError 分离)                   │
     │  ✅ 白名单字段提取 (update)                              │
     │  ✅ created() 统一响应                                  │
     │  ⚠️ listProjects catch 未用 handleServiceError (H-1)   │
     │  ⚠️ page 负值通过 (H-2)                                │
     │  ⚠️ short_name 阈值与 Zod 不一致 (M-1)                 │
     └─────────────────────────┬──────────────────────────────┘
                               │
     ┌─────────────────────────▼──────────────────────────────┐
     │  Service 层 (Prisma ORM)                                │
     │  ✅ 参数化查询 — SQL 注入风险极低                        │
     │  ✅ operator 归属校验 (admin 隔离)                      │
     │  ✅ company_id 不可变校验                               │
     │  ⚠️ 非 $transaction 操作 — TOCTOU 理论风险             │
     └─────────────────────────────────────────────────────────┘
```

---

## 四、OWASP Top 10 (2021) 映射

| OWASP 编号 | 类别 | 涉及问题 | 严重度 |
|------------|------|----------|--------|
| A01:2021 | Broken Access Control | v1 C-1/C-2 已修复；纵深防御冗余检查 (M-2, L-3) | 已缓解 |
| A03:2021 | Injection | page 负值注入 (H-2) | HIGH |
| A04:2021 | Insecure Design | listProjects 错误处理不一致 (H-1)；验证阈值不一致 (M-1) | HIGH |
| A05:2021 | Security Misconfiguration | getErrorMessage 内部信息泄露 (M-3) | MEDIUM |

---

## 五、修复优先级排序

| 优先级 | 问题编号 | 修复工作量 | 风险描述 |
|--------|----------|-----------|----------|
| **P0** | H-1 | 极小（1行） | listProjects 的 AppError 被降级为 500，影响前端错误处理和监控 |
| **P0** | H-2 | 极小（1行） | page 负值导致 SQL 错误泄露 |
| **P1** | M-1 | 小（统一阈值） | 验证逻辑分裂，维护风险 |
| **P1** | M-3 | 小（1行） | 非业务 Error 的 message 泄露 |
| **P2** | M-2 | 无（保留） | 死代码作为纵深防御保留 |
| **P2** | L-1 | 小 | admin company_id 意图不明确 |
| **P3** | L-2 | 大 | DI 重构 |
| **P3** | L-3 | 无（保留） | 冗余检查作为纵深防御 |

---

## 六、安全加固建议

### 6.1 立即修复（30 分钟内）

1. **统一错误处理** — `listProjects` catch 改用 `handleServiceError`（H-1）
2. **page 下限保护** — `Math.max(1, parseInt(...))`  （H-2）
3. **`getErrorMessage` 不泄露非业务消息** — 只对 AppError 返回 err.message（M-3）

### 6.2 短期统一（1 天）

4. **统一验证层** — 移除 controller 手动长度检查，完全依赖 Zod schema；同步 Zod 阈值（M-1）
5. **显式 admin company_id 传递** — controller 层不传递 body 中的 company_id（L-1）

### 6.3 长期改进（迭代）

6. **CSRF 防护** — 虽然使用 Bearer Token，但建议添加 `SameSite=Strict` Cookie 或 Double Submit Cookie 作为纵深防御
7. **依赖注入** — 使用工厂模式或 DI 容器管理 service 实例（L-2）
8. **审计日志** — 记录所有数据变更操作的执行者、时间、变更内容
9. **自动化安全测试** — CI 中集成 OWASP ZAP 或 SAST 工具

---

## 七、v1→v2 改进总结

### 7.1 已消除的安全风险

| 风险 | v1 描述 | v2 状态 |
|------|---------|---------|
| TOCTOU 竞态 | controller 层 get+check+update 非原子 | ✅ 授权下沉 service 层，controller 不再直接操作数据 |
| 隐式授权删除 | 非 admin 角色直接跳过检查 | ✅ 显式白名单 `sysadmin` + `admin` |
| err.message 泄露 | 全部 handler 直传 err.message | ✅ `handleServiceError` 区分 AppError |
| 无 schema 验证 | create/update 仅手动 if 判断 | ✅ Zod schema + validate 中间件 |
| req.user! 断言 | 非空断言绕过认证异常 | ✅ 全面 `if (!req.user)` 守卫 |
| delete req.body | 直接修改请求对象 | ✅ 白名单解构提取 |
| 手动 201 构造 | 不使用统一工具函数 | ✅ 使用 `created()` |
| status 布尔注入 | 非标准值被静默转为 false | ✅ 严格 true/false 白名单 |

### 7.2 新发现的问题

| 问题 | 原因 | 严重度 |
|------|------|--------|
| listProjects catch 不一致 | 重构遗漏，未同步使用 handleServiceError | HIGH |
| page 负值 | v1 部分修复 pageSize 但遗漏 page 下限 | HIGH |
| Zod/Controller 阈值冲突 | 引入 Zod 后未清理 controller 层重复验证 | MEDIUM |
| getErrorMessage 泄露 | 改进不彻底，仍对非 AppError Error 返回 message | MEDIUM |

---

## 八、综合结论

**代码安全评分: 7.8/10**

当前版本的 `project.controller.ts` 相比 v1（5.7/10）有显著安全改进：

**亮点**：
- 引入 Zod schema + validate 中间件，建立系统化输入验证层
- 统一 `handleServiceError` 错误处理模式（AppError 感知）
- 全面 `req.user` 空值守卫，消除非空断言风险
- 白名单字段提取替代 `delete req.body`，消除请求体修改反模式
- service 层授权检查 + company_id 不可变校验，纵深防御体系成型

**待改进**：
- H-1/H-2 均为 1 行修复，建议立即处理
- M-1/M-3 为验证逻辑统一问题，短期可完成
- 整体安全水平已达到项目内 controller 的最佳实践水准

**对比其他 Controller**：project.controller 的安全模式（Zod + handleServiceError + 空值守卫 + 白名单提取）应作为其他 controller 的标准模板推广。
