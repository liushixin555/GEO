# apis/controller/todo.controller.ts — 代码安全专家评审报告（第二轮）

**评审日期**: 2026-05-25
**评审角色**: 代码安全专家（OWASP Top 10 + API 安全 + 输入验证 + 信息泄露 + 权限控制 + IDOR）
**文件路径**: `apis/controller/todo.controller.ts`
**代码行数**: 214 行（前轮 269 行）
**关联文件**: `apis/service/impl/todo.service.impl.ts`, `apis/service/todo.service.ts`, `apis/schema/todo.schema.ts`, `apis/errors.ts`, `apis/routes/todo.routes.ts`, `apis/utils/response.util.ts`
**安全评级**: 🟡 MEDIUM（中风险 — 前轮 CRITICAL/HIGH 全修复，残留 Schema 验证不严 + 多端点缺少公司边界校验）

---

## 一、前轮修复验证

| 前轮编号 | 问题 | 修复状态 | 验证 |
|----------|------|----------|------|
| SEC-C-01 | IDOR 越权 — getTodo/getTodoLogs 缺资源所有权校验 | ✅ 已修复 | `getById`/`getLogs` 均传入 `userId/role/companyId`，Service 层增加 companyId 校验（impl:92-94, impl:340-342） |
| SEC-H-01 | getObjectOptions/getAssigneeCandidates 绕过 Service 层 | ✅ 已修复 | 数据访问已下沉到 `todoService.getObjectOptions()` / `todoService.getAssigneeCandidates()`，Controller 仅做 HTTP 适配（ctrl:192-197, ctrl:209） |
| SEC-H-02 | 全部端点缺少 Zod Schema 验证 | ✅ 已修复 | 路由层 `validate()` 中间件 + Controller 内 `.parse()` 双重验证（schema/todo.schema.ts 全部 6 个 Schema） |
| SEC-M-01 | catch 块 err.message 泄露 | ✅ 已修复 | 统一 `handleError()` 函数，Prisma/未知错误返回通用消息（ctrl:22-34） |
| SEC-M-02 | 批量赋值风险 | ✅ 已修复 | Controller 层显式构造 DTO 对象（ctrl:84-95, ctrl:109-116, ctrl:154） |
| SEC-L-01 | ID 边界检查缺失 | ✅ 已修复 | `isNaN(id) \|\| id <= 0` 双重校验（ctrl:72, ctrl:106, ctrl:127, ctrl:139, ctrl:151, ctrl:165, ctrl:176） |
| SEC-L-02 | 字符串匹配异常检测 | ✅ 已修复 | 使用 `NotFoundError`/`BusinessError`/`ForbiddenError` 自定义异常类 + `instanceof` 分发（ctrl:8, ctrl:22-34） |

**前轮修复评价**: 前 7 个安全问题全部修复到位，代码安全态势从 🔴 HIGH 显著提升。以下为本轮新发现的安全残留问题。

---

## 二、安全评价总览

当前代码已具备完整的安全基础设施：路由层 `authMiddleware + roleMiddleware('sysadmin', 'admin')` + Zod Schema 验证 + 自定义异常类 + IDOR 校验。但仍存在以下安全隐患：

| OWASP 分类 | 安全风险 | 严重级别 | 状态 |
|------------|----------|----------|------|
| A01:2021 — 失效的访问控制 | createTodo 缺少 company_id 归属校验 | **HIGH** | ❌ 未修复 |
| A01:2021 — 失效的访问控制 | updateTodo/closeTodo/reopenTodo/transferTodo 缺少公司边界校验 | **HIGH** | ❌ 未修复 |
| A03:2021 — 注入 | createTodoSchema 中 object_type/action/source/priority 使用 `z.string()` 而非枚举 | **MEDIUM** | ❌ 未修复 |
| A03:2021 — 注入 | createTodoSchema 中 due_at 为 `z.string().optional()` 未验证日期格式 | **LOW** | ❌ 未修复 |
| A04:2021 — 不安全的设计 | transferTodo 目标用户无跨公司校验 | **MEDIUM** | ❌ 未修复 |
| A05:2021 — 安全配置错误 | Service 层 `source as any` / `priority as any` 类型强转削弱类型安全 | **LOW** | ⚠️ 防御不足 |

---

## 三、安全漏洞详情

### SEC-H-01: createTodo 缺少 company_id 归属校验 — 跨公司创建待办

**严重级别**: HIGH
**位置**: `todo.controller.ts:81-101` → `todo.service.impl.ts:99-134`
**OWASP 分类**: A01:2021 — Broken Access Control

```typescript
// todo.controller.ts:81-101
export async function createTodo(req: Request, res: Response): Promise<void> {
  try {
    const validated = createTodoSchema.parse(req.body);
    const request = {
      title: validated.title,
      company_id: validated.company_id,       // ❌ 未校验 req.user 是否属于此 company
      project_id: validated.project_id ?? null, // ❌ 未校验 project 是否属于此 company
      // ...
      assignee_id: validated.assignee_id,      // ❌ 未校验 assignee 是否属于此 company
    };
    const item = await todoService.create(request, req.user!.userId);
    created(res, item, '待办创建成功');
  }
}
```

**攻击场景分析**:

1. **跨公司创建**: admin 用户 A（公司 X, companyId=1）请求 `POST /api/v1/todos`，body 中设置 `company_id: 2`（公司 Y），即可在公司 Y 下创建待办。
2. **跨公司指派**: 同一请求中设置 `assignee_id` 为公司 Y 的用户 ID，将待办指派给其他公司的人。
3. **关联伪造**: 设置 `project_id` 为其他公司的项目 ID，建立虚假关联。

**影响评估**:
- **攻击者**: 任意 admin 角色用户
- **攻击复杂度**: 低 — 仅需知道目标 company_id 即可
- **CVSS 评分**: 6.5（Medium-High）

**修复方案**:

```typescript
export async function createTodo(req: Request, res: Response): Promise<void> {
  try {
    const validated = createTodoSchema.parse(req.body);

    // 校验 company_id 归属
    if (req.user!.role !== 'sysadmin' && req.user!.companyId !== validated.company_id) {
      fail(res, 403, '无权为该公司创建待办');
      return;
    }

    // 校验 project 归属（如果指定了 project_id）
    if (validated.project_id) {
      await ensureProjectAccess(validated.project_id, req.user!);
    }

    const request = { /* ... */ };
    const item = await todoService.create(request, req.user!.userId);
    created(res, item, '待办创建成功');
  } catch (err: unknown) {
    handleError(res, err, '创建待办失败');
  }
}
```

Service 层也应增加 assignee 的跨公司校验：

```typescript
// todo.service.impl.ts — create 方法内
const assignee = await prisma.user.findFirst({
  where: { id: request.assignee_id, companyId: request.company_id, deletedAt: null },
});
if (!assignee) throw new BusinessError('责任人不属于指定公司');
```

---

### SEC-H-02: updateTodo/closeTodo/reopenTodo/transferTodo 缺少公司边界校验

**严重级别**: HIGH
**位置**:
- `todo.controller.ts:103-122` (updateTodo)
- `todo.controller.ts:124-134` (closeTodo)
- `todo.controller.ts:136-146` (reopenTodo)
- `todo.controller.ts:148-160` (transferTodo)
- Service 层: `todo.service.impl.ts:136-170` (update), `172-205` (close), `207-240` (reopen), `242-279` (transfer)
**OWASP 分类**: A01:2021 — Broken Access Control

```typescript
// todo.service.impl.ts:136-170 — update 方法
async update(id: number, request: UpdateTodoRequest, userId: number, role: string): Promise<Todo> {
  const existing = await prisma.todo.findFirst({ where: { id, deletedAt: null } });
  if (!existing) throw new NotFoundError('待办');
  if (existing.status === 'closed') throw new BusinessError('已关闭的待办不能修改');
  if (role !== 'sysadmin' && existing.assigneeId !== userId) {
    throw new BusinessError('只能修改自己负责的待办');
  }
  // ❌ 缺少: if (role !== 'sysadmin' && existing.companyId !== companyId) throw new ForbiddenError(...)
  // ...
}
```

**攻击场景分析**:

当前 `getById` 和 `getLogs` 已有公司边界校验（`companyId !== companyId → 403`），但 `update`/`close`/`reopen`/`transfer` 四个**写操作**均未校验公司边界：

1. **updateTodo**: 如果 admin 用户 A（公司 X）恰好是公司 Y 某待办的 assignee（通过 transfer 或初始分配），A 可以修改该待办的标题、优先级等字段。
2. **closeTodo/reopenTodo**: 同理，A 可以关闭/重新打开跨公司待办。
3. **transferTodo**: A 可以将待办转交给任意用户（参见 SEC-M-01）。

虽然从业务流程看，非本公司的 admin 不太可能成为待办的 assignee，但这是一个纵深防御缺口——如果上游存在任何绕过（如 SEC-H-01 中的跨公司创建），下游操作将不受公司边界约束。

**影响评估**:
- **攻击复杂度**: 中 — 需要先通过某种方式成为跨公司待办的 assignee
- **CVSS 评分**: 5.8（Medium）

**修复方案**:

Controller 层传入 `companyId`：

```typescript
// todo.controller.ts
const item = await todoService.update(id, request, req.user!.userId, req.user!.role, req.user!.companyId ?? null);
```

Service 层增加公司边界校验：

```typescript
// todo.service.impl.ts — update/close/reopen/transfer 共用
if (role !== 'sysadmin' && existing.companyId !== companyId) {
  throw new ForbiddenError('无权操作该待办');
}
```

---

### SEC-M-01: transferTodo 目标用户无跨公司校验

**严重级别**: MEDIUM
**位置**: `todo.service.impl.ts:242-279`
**OWASP 分类**: A01:2021 — Broken Access Control

```typescript
// todo.service.impl.ts:255-256
const targetUser = await prisma.user.findFirst({
  where: { id: request.assignee_id, deletedAt: null }
  // ❌ 缺少: companyId: existing.companyId
});
if (!targetUser) throw new BusinessError('目标用户不存在');
```

**攻击场景分析**:

当前 `transfer` 方法仅检查目标用户是否存在，未校验目标用户是否与待办属于同一公司。sysadmin 可以将待办转交给任意公司的用户（这是合理的），但非 sysadmin 的 admin 理论上也可以——尽管他们首先需要是待办的 assignee（已校验）。

对于 sysadmin，跨公司转交是合理的业务需求。但对 admin，应限制在同公司内转交。

**修复方案**:

```typescript
if (role !== 'sysadmin') {
  const targetUser = await prisma.user.findFirst({
    where: { id: request.assignee_id, companyId: existing.companyId, deletedAt: null },
  });
  if (!targetUser) throw new BusinessError('目标用户不存在或不属于同一公司');
} else {
  const targetUser = await prisma.user.findFirst({
    where: { id: request.assignee_id, deletedAt: null },
  });
  if (!targetUser) throw new BusinessError('目标用户不存在');
}
```

---

### SEC-M-02: createTodoSchema 中 object_type/action/source/priority 使用 `z.string()` 而非枚举

**严重级别**: MEDIUM
**位置**: `apis/schema/todo.schema.ts:11-22`
**OWASP 分类**: A03:2021 — Injection

```typescript
// apis/schema/todo.schema.ts
export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  company_id: z.number().int().positive(),
  project_id: z.number().int().positive().optional().nullable(),
  object_type: z.string().min(1),        // ❌ 应为 z.enum(['article', 'keyword'])
  object_id: z.number().int().positive().optional().nullable(),
  action: z.string().min(1),             // ❌ 应为枚举
  source: z.string().optional(),          // ❌ 应为 z.enum(['manual', 'system'])
  priority: z.string().optional(),        // ❌ 应为 z.enum(['P0', 'P1', 'P2', 'P3'])
  assignee_id: z.number().int().positive(),
  due_at: z.string().optional(),          // ❌ 应验证日期格式
});
```

**对比同文件 objectOptionsSchema（已正确使用枚举）**:

```typescript
export const objectOptionsSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  objectType: z.enum(['article', 'keyword']),  // ✅ 正确使用枚举
  action: z.string().optional(),
});
```

**攻击场景分析**:

1. `object_type`: 可传入 `'article'`, `'keyword'` 之外的任意字符串（如 `'user'`, `'admin'`），Service 层的 `getObjectOptions` 内用 `if (objectType === 'article')` 和 `if (objectType === 'keyword')` 做分支，不匹配时静默返回空数组——虽然不会触发错误，但会在数据库中存储无意义的 object_type 值。
2. `action`: 任意字符串直接存入数据库，Service 层无校验。
3. `source`: Service 层用 `(request.source as any) || 'manual'` 强转，无效值被静默接受。
4. `priority`: Service 层用 `(request.priority as any) || 'P2'` 强转，无效值被静默接受。

**影响评估**:
- **直接风险**: 数据完整性受损（无意义的枚举值存入数据库）
- **间接风险**: 如果 Service 层未来基于 `object_type`/`action` 做更复杂的分支（如动态查询不同表），不受约束的字符串可能导致意外行为
- **CVSS 评分**: 4.2（Low-Medium）

**修复方案**:

```typescript
export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  company_id: z.number().int().positive(),
  project_id: z.number().int().positive().optional().nullable(),
  object_type: z.enum(['article', 'keyword']),
  object_id: z.number().int().positive().optional().nullable(),
  action: z.string().min(1).max(50),       // 如有明确枚举值，改用 z.enum
  source: z.enum(['manual', 'system']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  assignee_id: z.number().int().positive(),
  due_at: z.string().datetime({ offset: true }).optional().or(z.string().min(1).max(30).optional()),
});
```

---

### SEC-L-01: createTodoSchema 中 due_at 为 `z.string().optional()` 未验证日期格式

**严重级别**: LOW
**位置**: `apis/schema/todo.schema.ts:21`
**OWASP 分类**: A03:2021 — Injection

```typescript
due_at: z.string().optional(),  // ❌ 任意字符串，如 "abc" 或 10KB 字符串均可通过
```

**问题分析**:

Service 层直接 `new Date(request.due_at)` 构造日期：
```typescript
// todo.service.impl.ts:115
...(request.due_at ? { dueAt: new Date(request.due_at) } : {}),
```

- 无效日期字符串（如 `"abc"`）会被 `new Date()` 解析为 `Invalid Date`，Prisma 写入时可能报错或存储为无效值
- 超长字符串可通过 Zod 验证（`z.string()` 无长度限制），理论上可传入极大字符串

**修复方案**:

```typescript
due_at: z.string().datetime({ offset: true }).optional(),
// 或更宽松:
due_at: z.string().min(1).max(30).optional(),
```

---

### SEC-L-02: Service 层 `source as any` / `priority as any` 类型强转削弱类型安全

**严重级别**: LOW
**位置**: `todo.service.impl.ts:110-111`
**OWASP 分类**: A05:2021 — Security Misconfiguration

```typescript
source: (request.source as any) || 'manual',   // ❌ as any 绕过类型检查
priority: (request.priority as any) || 'P2',   // ❌ as any 绕过类型检查
```

**问题分析**:

`as any` 完全绕过 TypeScript 类型检查，使得 Prisma 的类型安全保障失效。如果 Schema 修复为 `z.enum()`（SEC-M-02），此处可同步去掉 `as any`：

```typescript
source: request.source || 'manual',
priority: request.priority || 'P2',
```

---

## 四、正面发现（安全优势）

| 安全措施 | 位置 | 说明 |
|----------|------|------|
| 认证中间件 | `todo.routes.ts:9` | 全部 11 个端点 `authMiddleware + roleMiddleware` |
| Zod Schema 验证 | `todo.schema.ts` + `todo.routes.ts` | 6 个 Schema 覆盖全部端点，路由层 `validate()` + Controller 层 `.parse()` 双重验证 |
| IDOR 校验 | `ctrl:74`, `ctrl:179` | `getById`/`getLogs` 传入 `userId/role/companyId`，Service 层校验公司归属 |
| 自定义异常类 | `ctrl:22-34` | `NotFoundError`/`BusinessError`/`ForbiddenError` + `instanceof` 分发，避免字符串匹配 |
| 统一错误处理 | `ctrl:22-34` | `handleError()` 统一处理，Prisma/未知错误返回通用消息，防信息泄露 |
| 显式 DTO 构造 | `ctrl:84-95`, `ctrl:109-116`, `ctrl:154` | Controller 层显式构造请求对象，防批量赋值 |
| ID 边界校验 | `ctrl:72,106,127,139,151,165,176` | `isNaN(id) \|\| id <= 0` 双重校验 |
| Tab 权限二次校验 | `ctrl:47-50` | `all_open`/`all_closed` 限制 sysadmin 角色，深度防御 |
| 项目访问校验 | `ctrl:37-40`, `ctrl:190`, `ctrl:207` | `ensureProjectAccess()` 复用，非 sysadmin 通过 Service 层校验 |
| SQL 注入防护 | Service 层 | Prisma ORM 参数化查询，无原始 SQL |
| 分层架构 | 全局 | Controller → Service(interface) → ServiceImpl(Prisma) 三层分离 |
| 接口依赖倒置 | `ctrl:18-19` | `ITodoService` 接口类型声明，降低耦合 |
| view 角色拦截 | `todo.routes.ts:9` | `roleMiddleware('sysadmin', 'admin')` 确保 view 无法访问 |

---

## 五、修复优先级排序

| 优先级 | 漏洞编号 | 修复内容 | 工作量 |
|--------|----------|----------|--------|
| P0 | SEC-H-01 | createTodo 增加 company_id/project_id/assignee_id 归属校验 | 中 |
| P0 | SEC-H-02 | update/close/reopen/transfer 增加公司边界校验 | 中（需改 Service 接口签名） |
| P1 | SEC-M-01 | transfer 限制非 sysadmin 同公司转交 | 低 |
| P1 | SEC-M-02 | createTodoSchema 中 object_type/action/source/priority 改用枚举 | 低 |
| P2 | SEC-L-01 | due_at 添加日期格式验证 | 低 |
| P2 | SEC-L-02 | Service 层消除 `as any` 类型强转 | 低（依赖 SEC-M-02） |

---

## 六、安全评分

| 维度 | 前轮评分 | 本轮评分 | 变化 | 说明 |
|------|----------|----------|------|------|
| 认证与授权 | 6/10 | 8/10 | +2 | roleMiddleware + authMiddleware + IDOR 修复 |
| 输入验证 | 3/10 | 7/10 | +4 | Zod Schema 全覆盖，但枚举验证不完整 |
| 错误处理 | 5/10 | 9/10 | +4 | 统一 handleError + 自定义异常类 |
| 权限控制 | 5/10 | 6/10 | +1 | IDOR 已修复，但写操作缺公司边界 |
| 数据安全 | 7/10 | 8/10 | +1 | DTO 显式构造 + Prisma 参数化 |
| **综合** | **4.8/10** | **7.2/10** | **+2.4** | 前轮 CRITICAL/HIGH 全修复，残留问题可短期解决 |

---

## 七、总结

前轮评审发现的 7 个安全问题（1 CRITICAL + 2 HIGH + 2 MEDIUM + 2 LOW）已全部修复到位，代码安全态势从 🔴 HIGH 提升至 🟡 MEDIUM。本轮新发现 2 个 HIGH + 2 MEDIUM + 2 LOW，主要集中在：

1. **createTodo 缺少归属校验（SEC-H-01）** — admin 可跨公司创建待办并指派给其他公司用户
2. **写操作缺公司边界（SEC-H-02）** — update/close/reopen/transfer 四个端点未校验 companyId
3. **Schema 枚举不严格（SEC-M-02）** — object_type/action/source/priority 使用 `z.string()` 而非枚举

建议按 P0 → P1 → P2 顺序修复，预计工作量 1-2 天。修复后安全评级可提升至 🟢 LOW。

---

*代码安全专家评审完成 — 2026-05-25（第二轮）*
