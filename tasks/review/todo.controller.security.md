# apis/controller/todo.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 + API 安全 + 输入验证 + 信息泄露 + 权限控制 + IDOR）
**文件路径**: `apis/controller/todo.controller.ts`
**代码行数**: 268 行
**关联文件**: `apis/service/impl/todo.service.impl.ts`, `apis/service/todo.service.ts`, `apis/entity/todo.entity.ts`, `apis/map/index.ts`, `apis/middleware/auth.middleware.ts`, `apis/app.ts:188-198`, `apis/utils/response.util.ts`
**安全评级**: 🟢 LOW（低风险 — 所有评审项均已修复，2026-05-26 确认）

---

## 一、安全评价总览

从代码安全专家视角审视，`todo.controller.ts` 的整体安全态势为**高风险**。路由层已通过 `authMiddleware + roleMiddleware('sysadmin', 'admin')` 限制所有 11 个端点仅 sysadmin 和 admin 角色可访问（见 `app.ts:188-198`），认证与授权边界在中间件层完成，Prisma ORM 天然防止 SQL 注入。以上是显著的正面发现。

但该文件仍存在以下安全隐患：

| OWASP 分类 | 安全风险 | 严重级别 | 状态 |
|------------|----------|----------|------|
| A01:2021 — 失效的访问控制 | getTodo/getTodoLogs 缺少资源所有权校验（IDOR） | **CRITICAL** | ✅ 已修复（2026-05-26 确认） |
| A01:2021 — 失效的访问控制 | getObjectOptions/getAssigneeCandidates 控制器直接绕过 Service 层权限逻辑 | HIGH | ✅ 已修复（2026-05-26 确认） |
| A03:2021 — 注入 | 全部端点缺少输入验证（Zod/Joi schema） | HIGH | ✅ 已修复（2026-05-26 确认，object_type/action/source/priority 已改为 z.enum()） |
| A05:2021 — 安全配置错误 | catch 块 `err.message` 可能泄露内部信息 | MEDIUM | ✅ 已修复（2026-05-26 确认） |
| A08:2021 — 软件和数据完整性 | req.body 整体传入 Service（批量赋值风险） | MEDIUM | ✅ 已修复（2026-05-26 确认，含 transfer 跨公司/跨项目校验） |
| A05:2021 — 安全配置错误 | catch 使用 `err: any`，类型安全缺失 | LOW | ✅ 已修复（2026-05-26 确认，改用 err: unknown） |
| A04:2021 — 不安全的设计 | 整数解析缺少边界检查（负数、零值、溢出） | LOW | ✅ 已修复（2026-05-26 确认，isNaN(id) \|\| id <= 0） |
| A04:2021 — 不安全的设计 | Service 异常通过字符串匹配检测（脆弱设计） | LOW | ✅ 已修复（2026-05-26 确认，改用 NotFoundError/BusinessError/ForbiddenError） |

---

## 二、安全漏洞详情

### SEC-C-01: IDOR 越权访问 — getTodo / getTodoLogs 缺少资源所有权校验

**严重级别**: CRITICAL
**位置**: `getTodo`（第 41-55 行）、`getTodoLogs`（第 146-160 行）
**OWASP 分类**: A01:2021 — Broken Access Control

```typescript
// getTodo — 第 41-55 行
export async function getTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的待办ID'); return; }

    const item = await todoService.getById(id);  // ❌ 仅按 ID 查询，无权限校验
    success(res, item);
  } catch (err: any) { ... }
}

// getTodoLogs — 第 146-160 行
export async function getTodoLogs(req: Request, res: Response): Promise<void> {
  try {
    const todoId = parseInt(req.params.id as string, 10);
    if (isNaN(todoId)) { fail(res, 400, '无效的待办ID'); return; }

    const logs = await todoService.getLogs(todoId);  // ❌ 仅按 ID 查询，无权限校验
    success(res, logs);
  } catch (err: any) { ... }
}
```

**攻击场景分析**:

1. **水平越权**: admin 用户 A（公司 X）知道用户 B（公司 Y）的待办 ID，直接请求 `GET /api/todos/123` 即可查看用户 B 的待办详情，包括 `company_name`、`assignee_name`、`created_by_name` 等敏感信息。
2. **操作日志泄露**: 通过 `GET /api/todos/123/logs` 可获取任意待办的操作历史，包括操作人姓名、操作类型等。
3. **Service 层同步问题**: `todoService.getById()` 和 `todoService.getLogs()` 均未接收 userId/role 参数，无法在 Service 层做二次权限校验。

**影响评估**:
- **攻击者**: 任意 admin 角色用户
- **攻击复杂度**: 低 — 仅需遍历 ID 即可
- **信息价值**: 跨公司的待办详情、操作日志、人员信息
- **CVSS 评分**: 7.1（High）

**修复方案**:

```typescript
export async function getTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的待办ID'); return; }

    const item = await todoService.getById(id, req.user!.userId, req.user!.role);
    success(res, item);
  } catch (err: unknown) {
    if (err instanceof ForbiddenError) {
      fail(res, 403, '无权访问该待办');
    } else if (err instanceof NotFoundError) {
      fail(res, 404, '待办不存在');
    } else {
      fail(res, 500, '获取待办详情失败');
    }
  }
}
```

Service 层增加权限校验：

```typescript
async getById(id: number, userId: number, role: string): Promise<Todo> {
  const item = await prisma.todo.findFirst({
    where: { id, deletedAt: null },
    include: { company: true, project: true, assignee: true, createdBy: true },
  });
  if (!item) throw new NotFoundError('待办不存在');

  // 非 sysadmin 只能查看自己公司的待办
  if (role !== 'sysadmin' && item.companyId !== userCompanyId) {
    throw new ForbiddenError('无权访问该待办');
  }

  return mapTodo(item);
}
```

---

### SEC-H-01: getObjectOptions / getAssigneeCandidates 控制器绕过 Service 层直接操作数据库

**严重级别**: HIGH
**位置**: `getObjectOptions`（第 162-218 行）、`getAssigneeCandidates`（第 220-268 行）
**OWASP 分类**: A01:2021 — Broken Access Control / A04:2021 — Insecure Design

```typescript
// getObjectOptions — 第 182-214 行
const prisma = getPrisma();  // ❌ 控制器直接使用 Prisma
const showDeleted = action === 'restore';
const where: any = { projectId };
// ... 直接操作 article / knowledgeKeyword 表

// getAssigneeCandidates — 第 234-262 行
const prisma = getPrisma();  // ❌ 控制器直接使用 Prisma
const project = await prisma.project.findUnique({ ... });
const users = await prisma.user.findMany({ ... });
```

**安全问题分析**:

1. **分层架构破坏**: 控制器层直接操作数据库，绕过了 Service 层的权限校验、事务管理和业务逻辑。如果 Service 层未来增加权限审计或缓存逻辑，这些端点不会被覆盖。
2. **重复权限校验**: 第 174-179 行和第 226-231 行分别手动检查项目访问权限，逻辑与 Service 层重复，容易出现不一致。
3. **`where: any` 类型**: 第 184 行 `const where: any = { projectId }` 和第 203 行 `const kwWhere: any` 完全放弃了类型安全。
4. **缺少 action 参数验证**: 第 166 行 `action` 参数未做枚举验证，恶意用户可传入任意值。

**修复方案**:

将数据库操作迁移到 Service 层：

```typescript
// 控制器层
export async function getObjectOptions(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.query.projectId as string);
    const objectType = req.query.objectType as string;
    const action = req.query.action as string;

    if (!projectId || !objectType) { fail(res, 400, '缺少必要参数'); return; }

    const items = await todoService.getObjectOptions({
      projectId, objectType, action,
      userId: req.user!.userId,
      role: req.user!.role,
    });
    success(res, items);
  } catch (err: unknown) { ... }
}
```

---

### SEC-H-02: 全部端点缺少输入验证（Zod Schema）

**严重级别**: HIGH
**位置**: 所有 11 个端点
**OWASP 分类**: A03:2021 — Injection

```typescript
// createTodo — 第 57-64 行
export async function createTodo(req: Request, res: Response): Promise<void> {
  try {
    const item = await todoService.create(req.body, req.user!.userId);  // ❌ req.body 未经验证直接传入
    res.status(201).json({ code: 0, message: '待办创建成功', data: item });
  } catch (_err: any) { ... }
}

// listTodos — 第 10-39 行
const page = parseInt(req.query.page as string) || 1;        // ❌ 无上限检查
const pageSize = parseInt(req.query.pageSize as string) || 10; // ❌ 无上限检查
const tab = (req.query.tab as string) || 'my_open';           // ❌ 未验证枚举值
const priority = req.query.priority as string | undefined;     // ❌ 未验证枚举值
const search = req.query.search as string | undefined;         // ❌ 未验证长度
```

**攻击场景分析**:

1. **DoS — 超大 pageSize**: 请求 `GET /api/todos?pageSize=999999` 可导致数据库返回海量数据，消耗内存和带宽。
2. **批量赋值（Mass Assignment）**: `createTodo` 将整个 `req.body` 传入 Service，攻击者可在 body 中注入 `status: 'closed'`、`companyId: 1` 等非预期字段。虽然 Prisma `create` 只取 `request.title` 等字段，但 `UpdateTodoRequest` 的可选字段可能被利用。
3. **非法 tab/priority 值**: 虽然Service 层 `switch` 有 `default` 分支，但恶意值仍会穿透到数据库查询。
4. **超长 search 字符串**: `search` 参数无长度限制，可能影响数据库性能。

**修复方案**:

使用 Zod 定义输入 Schema：

```typescript
import { z } from 'zod';

const listTodosSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  tab: z.enum(['my_open', 'my_closed', 'all_open', 'all_closed']).default('my_open'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  search: z.string().max(100).optional(),
});

const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  company_id: z.number().int().positive(),
  project_id: z.number().int().positive().optional().nullable(),
  object_type: z.enum(['article', 'keyword']),
  object_id: z.number().int().positive().optional().nullable(),
  action: z.enum(['publish', 'review', 'restore', 'delete']),
  source: z.enum(['manual', 'system']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  assignee_id: z.number().int().positive(),
  due_at: z.string().datetime().optional(),
});

export async function createTodo(req: Request, res: Response): Promise<void> {
  try {
    const validated = createTodoSchema.parse(req.body);
    const item = await todoService.create(validated, req.user!.userId);
    res.status(201).json({ code: 0, message: '待办创建成功', data: item });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      fail(res, 400, err.errors.map(e => e.message).join('; '));
    } else {
      fail(res, 500, '创建待办失败');
    }
  }
}
```

---

### SEC-M-01: catch 块 err.message 可能泄露内部信息

**严重级别**: MEDIUM
**位置**: `updateTodo`（第 77 行）、`closeTodo`（第 93 行）、`reopenTodo`（第 109 行）、`transferTodo`（第 125 行）、`rejectTodo`（第 141 行）、`getTodoLogs`（第 157 行）
**OWASP 分类**: A05:2021 — Security Misconfiguration

```typescript
} catch (err: any) {
  if (err.message === '待办不存在') {
    fail(res, 404, err.message);
  } else {
    fail(res, 400, err.message || '更新待办失败');  // ❌ Prisma/Node 错误可能暴露
  }
}
```

**攻击场景分析**:

当 Prisma 抛出非预期异常时（如数据库连接失败、约束冲突），`err.message` 会直接返回给客户端，可能包含：
- 数据库表名、字段名（约束错误）
- 连接信息（数据库不可用时）
- 内部堆栈片段

**影响评估**:
- 虽然大部分 catch 通过 `err.message === '待办不存在'` 匹配已知错误，但 `else` 分支中 `err.message` 直接传递
- Service 层 `throw new Error('...')` 的消息目前为中文业务描述，但 Prisma 错误不在控制范围内

**修复方案**:

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (message === '待办不存在') {
    fail(res, 404, message);
  } else {
    // 记录日志但不泄露给客户端
    logger.error('updateTodo failed', err);
    fail(res, 400, '更新待办失败');  // 使用固定消息，不暴露 err.message
  }
}
```

---

### SEC-M-02: 批量赋值（Mass Assignment）风险

**严重级别**: MEDIUM
**位置**: `createTodo`（第 59 行）、`updateTodo`（第 71 行）、`transferTodo`（第 119 行）
**OWASP 分类**: A08:2021 — Software and Data Integrity Failures

```typescript
// createTodo — 第 59 行
const item = await todoService.create(req.body, req.user!.userId);  // ❌ req.body 整体传入

// updateTodo — 第 71 行
const item = await todoService.update(id, req.body, req.user!.userId, req.user!.role);  // ❌ req.body 整体传入

// transferTodo — 第 119 行
const item = await todoService.transfer(id, req.body, req.user!.userId, req.user!.role);  // ❌ req.body 整体传入
```

**攻击场景分析**:

1. `createTodo`: Service 层的 `create` 方法从 `request` 中读取特定字段（`title`, `company_id`, `project_id` 等），不会直接受额外字段影响。但 `request.source as any` 和 `request.priority as any`（Service 第 110-111 行）的类型强转表明类型安全在 Service 层也被削弱。
2. `updateTodo`: Service 层使用 `request.title !== undefined` 等逐字段检查，如果攻击者在 body 中增加 `title: ''`、`priority: 'INVALID'` 等值，会绕过 Entity 类型检查直接写入数据库。
3. `transferTodo`: `TransferTodoRequest.assignee_id` 为 number 类型，但未验证目标用户是否与当前待办属于同一公司，跨公司转交成为可能。

**修复方案**:

与 SEC-H-02 合并，使用 Zod Schema 在 Controller 层严格验证输入，确保只有合法字段和值被传递到 Service 层。

---

### SEC-L-01: 整数解析缺少边界检查

**严重级别**: LOW
**位置**: `listTodos`（第 12-13 行）、`getTodo`（第 43 行）等所有 parseInt 处
**OWASP 分类**: A04:2021 — Insecure Design

```typescript
const page = parseInt(req.query.page as string) || 1;        // ❌ page=0 || page=-1 会变成 1，但未显式校验
const pageSize = parseInt(req.query.pageSize as string) || 10; // ❌ pageSize=999999 无上限
const id = parseInt(req.params.id as string, 10);              // ❌ id=0 或 id=-1 会通过 isNaN 检查
```

**攻击场景分析**:

- `pageSize=999999` 导致大量数据返回（DoS）
- `id=0` 或 `id=-1` 通过 `isNaN` 检查但永远不会匹配有效记录，增加不必要的数据库查询
- `page=-1` 被 `||` 运算符转为 1，但 `page=0` 也会被转为 1，行为隐含而非显式

**修复方案**:

```typescript
const id = parseInt(req.params.id as string, 10);
if (isNaN(id) || id <= 0) { fail(res, 400, '无效的待办ID'); return; }
```

---

### SEC-L-02: Service 异常通过字符串匹配检测

**严重级别**: LOW
**位置**: 全部 catch 块
**OWASP 分类**: A04:2021 — Insecure Design

```typescript
if (err.message === '待办不存在') {  // ❌ 硬编码中文字符串匹配
```

**问题分析**:

1. Service 层使用 `throw new Error('待办不存在')`，Controller 层通过 `err.message === '待办不存在'` 匹配。如果 Service 层修改了错误消息（如 '找不到该待办'），Controller 层无法捕获，异常会穿透到 `else` 分支返回错误信息。
2. 未来如果需要国际化（i18n），这种字符串耦合将成为严重问题。

**修复方案**:

使用自定义异常类替代字符串匹配：

```typescript
class NotFoundError extends Error {
  constructor(message: string) { super(message); this.name = 'NotFoundError'; }
}
class ForbiddenError extends Error {
  constructor(message: string) { super(message); this.name = 'ForbiddenError'; }
}
class BusinessError extends Error {
  constructor(message: string) { super(message); this.name = 'BusinessError'; }
}

// Controller 层
} catch (err: unknown) {
  if (err instanceof NotFoundError) {
    fail(res, 404, err.message);
  } else if (err instanceof ForbiddenError) {
    fail(res, 403, err.message);
  } else if (err instanceof BusinessError) {
    fail(res, 400, err.message);
  } else {
    logger.error('Unexpected error', err);
    fail(res, 500, '操作失败');
  }
}
```

---

## 三、Controller 层 Service 实例化方式审查

```typescript
// 第 7-8 行
const todoService = new TodoServiceImpl();
const projectService = new ProjectServiceImpl();
```

**安全评估**: LOW

- 模块级单例在 Express 单进程中是安全的（无并发问题）
- 但 `ProjectServiceImpl` 的实例化仅用于 `getObjectOptions` 和 `getAssigneeCandidates` 的权限校验（第 175、227 行），建议将权限校验逻辑统一到 Service 层

---

## 四、正面发现（安全优势）

| 安全措施 | 位置 | 说明 |
|----------|------|------|
| 认证中间件 | `app.ts:188-198` | 全部 11 个端点均使用 `authMiddleware` |
| 角色中间件 | `app.ts:188-198` | 限制为 sysadmin/admin 角色，view 角色无法访问 |
| SQL 注入防护 | 全局 | Prisma ORM 参数化查询，无原始 SQL |
| Tab 权限控制 | 第 19-22 行 | all_open/all_closed 限制 sysadmin 角色 |
| NaN 检查 | 全部 parseInt | 所有 parseInt 结果均进行 isNaN 检查 |
| 软删除过滤 | Service 层 | 所有查询均包含 `deletedAt: null` 条件 |
| 服务层权限校验 | Service 层 | update/close/reopen/transfer/reject 均校验 assigneeId 或 role |
| Prisma 参数化查询 | 全局 | 不使用字符串拼接构造 SQL |

---

## 五、修复优先级排序

| 优先级 | 漏洞编号 | 修复内容 | 工作量 |
|--------|----------|----------|--------|
| P0 | SEC-C-01 | getTodo/getTodoLogs 增加资源所有权校验（IDOR） | 中（需改 Service 接口 + Controller） |
| P1 | SEC-H-01 | getObjectOptions/getAssigneeCandidates 迁移至 Service 层 | 高（需新增 Service 方法） |
| P1 | SEC-H-02 | 添加 Zod Schema 输入验证 | 中（11 个端点） |
| P2 | SEC-M-01 | catch 块错误消息脱敏 | 低 |
| P2 | SEC-M-02 | 严格过滤 req.body 字段 | 与 SEC-H-02 合并 |
| P3 | SEC-L-01 | 整数解析边界检查 | 低 |
| P3 | SEC-L-02 | 自定义异常类替代字符串匹配 | 中（需改 Service 层） |

---

## 六、修复代码示例

### 完整的 createTodo 修复示例

```typescript
import { z } from 'zod';

const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  company_id: z.number().int().positive(),
  project_id: z.number().int().positive().optional().nullable(),
  object_type: z.enum(['article', 'keyword']),
  object_id: z.number().int().positive().optional().nullable(),
  action: z.enum(['publish', 'review', 'restore', 'delete']),
  source: z.enum(['manual', 'system']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional(),
  assignee_id: z.number().int().positive(),
  due_at: z.string().datetime().optional(),
});

export async function createTodo(req: Request, res: Response): Promise<void> {
  try {
    const validated = createTodoSchema.parse(req.body);
    const item = await todoService.create(validated, req.user!.userId);
    res.status(201).json({ code: 0, message: '待办创建成功', data: item });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      fail(res, 400, err.errors.map(e => e.message).join('; '));
    } else {
      logger.error('createTodo failed', err);
      fail(res, 500, '创建待办失败');
    }
  }
}
```

### 完整的 getTodo 修复示例（解决 IDOR）

```typescript
export async function getTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, '无效的待办ID'); return; }

    const item = await todoService.getById(id, req.user!.userId, req.user!.role, req.user!.companyId ?? null);
    success(res, item);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      fail(res, 404, err.message);
    } else if (err instanceof ForbiddenError) {
      fail(res, 403, err.message);
    } else {
      logger.error('getTodo failed', err);
      fail(res, 500, '获取待办详情失败');
    }
  }
}
```

---

## 七、总结

`todo.controller.ts` 的安全态势评级为 **HIGH（高风险）**。最严重的问题是 **SEC-C-01（IDOR 越权访问）**，admin 用户可通过遍历 ID 查看其他公司的待办详情和操作日志。其次是 **SEC-H-01（Service 层绕过）** 和 **SEC-H-02（输入验证缺失）**。

建议按优先级 P0 → P1 → P2 → P3 顺序修复，预计总工作量约 2-3 天。修复后安全评级预计可提升至 **LOW（低风险）**。
