# apis/controller/todo.controller.ts — 软件质量专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件质量专家（代码安全 + 架构质量 + 输入验证 + 错误处理 + API 设计）
**文件路径**: `apis/controller/todo.controller.ts`
**代码行数**: 269 行
**关联文件**: `apis/service/todo.service.ts`, `apis/service/impl/todo.service.impl.ts`, `apis/service/impl/project.service.impl.ts`, `apis/entity/todo.entity.ts`, `apis/utils/response.util.ts`, `apis/map/index.ts`, `apis/app.ts`
**严重级别**: HIGH(5) / MEDIUM(5) / LOW(3)

---

## 一、质量评价总览

待办管理控制器包含 10 个 HTTP 端点处理函数，覆盖待办 CRUD + 状态流转（关闭/重新打开/转交/驳回）+ 操作日志 + 辅助查询（操作对象选项/责任人候选）。路由层已通过 `roleMiddleware('sysadmin', 'admin')` 限制所有端点仅系统管理员和运营者可访问，认证与授权边界在中间件层完成。

从软件质量视角审视，该文件存在 **分层架构违规（Controller 直接操作 Prisma）、输入验证薄弱、错误处理脆弱、响应格式不一致** 四类核心问题。相较于项目内其他 Controller（如 `company.controller.ts`），本文件因 `getObjectOptions` 和 `getAssigneeCandidates` 两个函数直接在 Controller 层操作 Prisma 而严重违反分层架构原则，是最大的结构性问题。

| 质量维度 | 评分 | 说明 |
|----------|------|------|
| API 设计 | 6/10 | RESTful 路径基本合理，但 createTodo 响应格式不一致，action 端点混用 POST 语义 |
| 输入验证 | 4/10 | 仅做 parseInt+isNaN 和 truthy 检查，page/pageSize 无边界验证，tab 无白名单，req.body 直接透传 |
| 错误处理 | 5/10 | 字符串匹配检测业务异常，err.message 可能泄露内部信息（部分端点已用通用消息兜底） |
| 分层架构 | 4/10 | getObjectOptions 和 getAssigneeCandidates 直接操作 Prisma，严重违反 Controller→Service→Repository 分层 |
| 安全防护 | 7/10 | 路由层 roleMiddleware 限制 sysadmin/admin，tab 权限二次校验，Prisma 防注入 |
| 可维护性 | 5/10 | 重复的权限检查和错误处理模式，Controller 层包含数据访问逻辑 |

---

## 二、问题清单

### HIGH-1: createTodo 响应格式与项目规范不一致

**位置**: 第 59-60 行

```typescript
// createTodo — 手动构造 201 响应
res.status(201).json({ code: 0, message: '待办创建成功', data: item });

// 其他所有端点 — 使用 success() 工具函数
success(res, item, '更新待办成功');
```

**问题分析**:

项目 `response.util.ts` 已提供 `created()` 工具函数：

```typescript
export function created<T>(res: Response, data: T, message = '创建成功') {
  return res.status(201).json({ code: 0, message, data });
}
```

但 `createTodo` 仍手动构造 201 响应，存在两个风险：

1. **结构漂移**: 若未来 `created()` 的响应结构变更，此处不会同步更新
2. **一致性缺失**: 同一 Controller 内两种响应构造方式并存

**修复建议**:

```typescript
import { success, fail, created, paginate } from '../utils';
// ...
const item = await todoService.create(req.body, req.user!.userId);
created(res, item, '待办创建成功');
```

---

### HIGH-2: getObjectOptions 和 getAssigneeCandidates 在 Controller 层直接操作 Prisma — 严重违反分层架构

**位置**: 第 162-268 行（`getObjectOptions` 和 `getAssigneeCandidates` 两个完整函数）

```typescript
export async function getObjectOptions(req: Request, res: Response): Promise<void> {
  // ...
  const prisma = getPrisma();  // ❌ Controller 直接获取 Prisma 实例
  const items = await prisma.article.findMany({ ... });  // ❌ Controller 直接执行数据库查询
  // ...
}

export async function getAssigneeCandidates(req: Request, res: Response): Promise<void> {
  // ...
  const prisma = getPrisma();  // ❌ Controller 直接获取 Prisma 实例
  const project = await prisma.project.findUnique({ ... });  // ❌ 直接查询
  const users = await prisma.user.findMany({ ... });  // ❌ 直接查询
  // ...
}
```

**问题分析**:

项目采用三层架构：`Controller → Service (interface) → ServiceImpl (Prisma)`。其余 8 个端点均遵循此架构，唯独 `getObjectOptions` 和 `getAssigneeCandidates` 绕过 Service 层直接操作数据库。这导致：

1. **架构一致性破坏**: 同一 Controller 内两种数据访问模式并存，违反"单一入口"原则
2. **可测试性降低**: Controller 单元测试必须 mock `getPrisma()` 而非 mock Service 接口
3. **职责混乱**: Controller 承担了本应由 Service 层处理的数据组装和映射逻辑
4. **重复代码**: `getAssigneeCandidates` 中先通过 `projectService.getById()` 检查权限，再通过 `prisma.project.findUnique()` 重新查询项目 — 对同一张表做了两次查询

**影响范围**: 2 个端点，约 100 行代码。

**修复建议**: 将数据访问逻辑下沉到 Service 层：

```typescript
// apis/service/todo.service.ts — 新增接口方法
getObjectOptions(projectId: number, objectType: string, action: string): Promise<{id: number; name: string}[]>;
getAssigneeCandidates(projectId: number): Promise<{id: number; username: string; cn_name: string; role: string}[]>;

// apis/controller/todo.controller.ts — 精简为
export async function getObjectOptions(req: Request, res: Response): Promise<void> {
  // ...验证 + 权限检查...
  const items = await todoService.getObjectOptions(projectId, objectType, action);
  success(res, items);
}
```

---

### HIGH-3: catch 使用 `err: any` 且 err.message 直接暴露给客户端

**位置**: 第 48-54 行、第 73-79 行、第 83-94 行、第 98-111 行、第 114-128 行、第 130-144 行、第 146-160 行

```typescript
} catch (err: any) {
  if (err.message === '待办不存在') {
    fail(res, 404, err.message);
  } else {
    fail(res, 400, err.message || '更新待办失败');  // ❌ err.message 可能泄露数据库信息
  }
}
```

**问题分析**:

与 `company.controller.ts` 的 HIGH-2 同源。Service 层使用 Prisma ORM，当数据库操作失败时，Prisma 抛出的错误消息可能包含表名、字段名、约束名等内部信息。

本文件的特殊情况：
- `listTodos`（第 36-38 行）和 `createTodo`（第 61-63 行）的 catch 已使用 `_err` 且返回通用消息 — 处理正确
- 其余 6 个端点通过 `err.message === '待办不存在'` 精确匹配，将不匹配的 err.message 直接返回客户端 — 存在泄露风险
- `getTodoLogs`（第 153-159 行）的 500 分支也直接返回 `err.message`，更危险

**修复建议**: 统一改为 `unknown` 类型 + `instanceof Error` 窄化：

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (message === '待办不存在') {
    fail(res, 404, message);
  } else if (err instanceof Error && isPrismaError(err)) {
    fail(res, 500, '操作失败');  // Prisma 错误统一返回通用消息
  } else {
    fail(res, 400, message || '操作失败');
  }
}
```

---

### HIGH-4: createTodo 将 req.body 直接传入 Service — 缺少输入验证

**位置**: 第 59 行

```typescript
const item = await todoService.create(req.body, req.user!.userId);  // ❌ req.body 未经校验
```

**问题分析**:

`createTodo` 函数没有任何输入验证，直接将 `req.body` 传入 Service 层。对比 `CreateTodoRequest` 接口定义：

| 字段 | 类型 | 验证缺失 |
|------|------|----------|
| title | string (必填) | 未检查存在性、类型、长度 |
| company_id | number (必填) | 未检查存在性、类型、是否为正整数 |
| project_id | number \| null | 未检查类型 |
| object_type | string (必填) | 未检查存在性、类型、是否在允许值范围内 |
| object_id | number \| null | 未检查类型 |
| action | string (必填) | 未检查存在性、类型、是否在允许值范围内 |
| source | string | 未检查类型、是否在允许值范围内 |
| priority | string | 未检查类型、是否在 P1-P4 范围内 |
| assignee_id | number (必填) | 未检查存在性、类型、是否为正整数 |
| due_at | string | 未检查格式是否为合法日期 |

Service 层的 `create` 方法同样未做验证，直接将 `request.title`、`request.company_id` 等传给 Prisma，依赖 Prisma 的隐式类型检查。

同样，`updateTodo`（第 69 行）和 `transferTodo`（第 119 行）也将 `req.body` 直接传入 Service，但 UpdateTodoRequest 字段均为可选，风险略低。

**修复建议**: 引入 Zod schema 验证：

```typescript
import { z } from 'zod';

const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  company_id: z.number().int().positive(),
  project_id: z.number().int().positive().nullable().optional(),
  object_type: z.enum(['article', 'keyword']),
  object_id: z.number().int().positive().nullable().optional(),
  action: z.enum(['publish', 'update', 'delete', 'restore']),
  source: z.enum(['manual', 'system']).optional(),
  priority: z.enum(['P1', 'P2', 'P3', 'P4']).optional(),
  assignee_id: z.number().int().positive(),
  due_at: z.string().datetime().optional(),
});
```

---

### HIGH-5: Service 层异常通过字符串精确匹配检测 — 脆弱的错误识别模式

**位置**: 第 49 行、第 74 行、第 89 行、第 105 行、第 122 行、第 138 行、第 154 行

```typescript
if (err.message === '待办不存在') {  // ❌ 字符串精确匹配，出现在 7 个 catch 块中
  fail(res, 404, err.message);
}
```

**问题分析**:

Controller 通过 `err.message === '待办不存在'` 精确匹配来识别 Service 层抛出的业务异常。这种模式在 `todo.service.impl.ts` 中出现了 7 次 `throw new Error('待办不存在')`：

1. **脆弱性**: 若 Service 层修改错误消息（如改为"该待办不存在"），Controller 的匹配将失效，业务异常被当作 400/500 返回
2. **不可扩展**: Service 层抛出的其他业务异常（如"已关闭的待办不能修改"、"只有处理中的待办可以关闭"等）在 Controller 的 catch 块中被当作 400 返回，虽然语义上可接受，但无法精确区分
3. **违反分层隔离**: Controller 依赖 Service 层的具体错误消息文本，形成隐式契约

**修复建议**: 引入统一的业务异常基类：

```typescript
// apis/entity/errors.ts
export class NotFoundError extends Error {
  constructor(entity: string) { super(`${entity}不存在`); this.name = 'NotFoundError'; }
}
export class BusinessError extends Error {
  constructor(message: string) { super(message); this.name = 'BusinessError'; }
}

// todo.controller.ts
} catch (err: unknown) {
  if (err instanceof NotFoundError) {
    fail(res, 404, err.message);
  } else if (err instanceof BusinessError) {
    fail(res, 400, err.message);
  } else {
    fail(res, 500, '操作失败');
  }
}
```

这样可将 7 个 catch 块中的字符串匹配全部替换为类型安全检查。

---

### MEDIUM-1: listTodos 的 page/pageSize 缺少边界验证

**位置**: 第 12-13 行

```typescript
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
```

**问题分析**:

1. **负数**: `page=-1` 被解析为 -1，传入 Service 的 `skip = (page - 1) * pageSize`，负数 skip 导致 Prisma 行为不可预测
2. **零**: `page=0` 为 falsy，`|| 1` 会回退到 1 — 但 `pageSize=0` 同样为 falsy 回退到 10
3. **极大值**: `page=999999` 可导致查询超时或内存溢出
4. **非数字字符串**: `page=abc` 解析为 NaN，`|| 1` 回退到 1 — 处理正确
5. **浮点数**: `page=1.5` 被 parseInt 截断为 1 — 处理基本可接受

**修复建议**:

```typescript
let page = parseInt(req.query.page as string) || 1;
let pageSize = parseInt(req.query.pageSize as string) || 10;
if (page < 1) page = 1;
if (pageSize < 1) pageSize = 10;
if (pageSize > 100) pageSize = 100;  // 防止一次查询过多数据
```

---

### MEDIUM-2: listTodos 的 tab 参数未做白名单验证

**位置**: 第 14 行

```typescript
const tab = (req.query.tab as string) || 'my_open';
```

**问题分析**:

`tab` 参数直接传入 Service 层的 `switch(tab)` 语句。虽然 Service 的 `default` 分支将其回退到 `my_open` 行为，但：

1. 非预期值（如 `tab=hack`）不会返回错误提示，而是静默降级 — 客户端难以调试
2. 新增 tab 类型时无法在 Controller 层拦截无效值

**修复建议**:

```typescript
const VALID_TABS = ['my_open', 'my_closed', 'all_open', 'all_closed'] as const;
type TodoTab = typeof VALID_TABS[number];

const tab: TodoTab = VALID_TABS.includes(req.query.tab as TodoTab)
  ? (req.query.tab as TodoTab)
  : 'my_open';
```

---

### MEDIUM-3: getAssigneeCandidates 重复查询同一项目

**位置**: 第 226-232 行 vs 第 236-239 行

```typescript
// 第一次查询 — 权限检查
const project = await projectService.getById(projectId, req.user!.userId, req.user!.role);
if (!project.operator_ids.includes(req.user!.userId)) { ... }

// 第二次查询 — 获取运营者列表
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: { operators: { select: { userId: true } } },
});
```

**问题分析**:

同一个请求内对 `project` 表做了两次查询：一次通过 `projectService.getById()` 检查权限，一次通过 `prisma.project.findUnique()` 获取运营者列表。这是 HIGH-2（分层架构违规）的直接后果。若将数据访问下沉到 Service 层，两次查询可合并为一次。

**修复建议**: 将整个逻辑移入 `todoService.getAssigneeCandidates(projectId, userId, role)`，Service 层内部一次查询同时完成权限检查和数据获取。

---

### MEDIUM-4: getObjectOptions 和 getAssigneeCandidates 的 parseInt 缺少基数参数

**位置**: 第 163 行、第 222 行

```typescript
const projectId = parseInt(req.query.projectId as string);  // ❌ 缺少基数 10
```

对比其他端点：

```typescript
const id = parseInt(req.params.id as string, 10);  // ✓ 明确基数
```

**问题分析**:

`parseInt` 不指定基数时，以 `0x` 开头的字符串会被解析为十六进制。虽然在 projectId 场景下极不可能出现十六进制输入，但与文件内其他 parseInt 调用不一致。

**修复建议**:

```typescript
const projectId = parseInt(req.query.projectId as string, 10);
```

---

### MEDIUM-5: updateTodo 和 transferTodo 将 req.body 整体传入 Service — 批量赋值风险

**位置**: 第 69 行、第 119 行

```typescript
const item = await todoService.update(id, req.body, req.user!.userId, req.user!.role);
const item = await todoService.transfer(id, req.body, req.user!.userId, req.user!.role);
```

**问题分析**:

虽然 Service 层通过显式字段赋值避免了实际的批量赋值漏洞（`data.title = request.title`），但将整个 `req.body` 传入 Service 接口是一个不良实践：

1. **隐式依赖**: Controller 不清楚 Service 实际使用了哪些字段
2. **接口模糊**: 传入的是未经构造的 `req.body`，而非明确的 DTO 对象

**修复建议**: 在 Controller 层显式构造请求对象：

```typescript
const updateRequest: UpdateTodoRequest = {
  title: req.body.title,
  object_type: req.body.object_type,
  object_id: req.body.object_id,
  action: req.body.action,
  priority: req.body.priority,
  due_at: req.body.due_at,
};
const item = await todoService.update(id, updateRequest, req.user!.userId, req.user!.role);
```

---

### LOW-1: 错误消息魔法字符串分散在多处

**位置**: 全文 10 个函数

```typescript
fail(res, 400, '无效的待办ID');     // 出现 7 次
fail(res, 403, '无权访问全部待办');   // 出现 1 次
fail(res, 403, '无权访问该项目');     // 出现 2 次
```

**建议**: 提取为常量：

```typescript
const MSG_INVALID_ID = '无效的待办ID';
const MSG_NO_ACCESS_ALL = '无权访问全部待办';
const MSG_NO_ACCESS_PROJECT = '无权访问该项目';
```

---

### LOW-2: `parseInt(req.params.id as string, 10)` 中 `as string` 冗余

**位置**: 第 43 行、第 68 行、第 83 行、第 99 行、第 115 行、第 131 行、第 148 行

```typescript
const id = parseInt(req.params.id as string, 10);  // as string 冗余
```

**问题分析**: `req.params.id` 类型已为 `string`（Express 类型定义），`as string` 断言冗余。

**修复建议**: 简化为 `parseInt(req.params.id, 10)`。

---

### LOW-3: `req.user!` 非空断言在全文使用 — 依赖中间件调用顺序

**位置**: 第 19 行、第 30 行、第 31 行、第 59 行等（共 16 处）

```typescript
req.user!.role      // ❌ 如果路由未配置 authMiddleware，运行时崩溃
req.user!.userId
req.user!.companyId
```

**问题分析**:

所有端点在路由层已配置 `authMiddleware`，`req.user` 在到达 Controller 时一定存在。`!` 非空断言在当前路由配置下安全，但存在隐式依赖：若未来有人删除路由层的 `authMiddleware`，所有端点将运行时崩溃。

这是项目级模式，与其他 Controller 一致，不单独要求修改，但建议项目级引入 `AuthenticatedRequest` 类型替代 `Request`：

```typescript
interface AuthenticatedRequest extends Request {
  user: { userId: number; role: string; companyId?: number };
}
```

---

## 三、正面发现（做得好的方面）

1. **路由层授权完备**: 所有 11 个端点在 `app.ts` 中均配置了 `authMiddleware + roleMiddleware('sysadmin', 'admin')`，授权在正确的架构层完成
2. **tab 权限二次校验**: `listTodos` 中对 `all_open`/`all_closed` tab 再次验证 sysadmin 角色，实现了深度防御
3. **项目访问权限校验**: `getObjectOptions` 和 `getAssigneeCandidates` 均验证用户是否有权访问指定项目
4. **ID 解析与验证**: `parseInt` + `isNaN` 的模式在每个使用 path param 的端点中一致执行
5. **分页支持**: `listTodos` 正确实现了分页，使用 `paginate()` 工具函数返回统一格式
6. **错误兜底**: `listTodos` 和 `createTodo` 的 catch 块使用 `_err` 变量名且返回通用消息 — 良好的安全实践
7. **Prisma 参数化查询**: Service 层使用 Prisma ORM，天然防止 SQL 注入
8. **文件规模合理**: 269 行，函数平均 15-27 行，可读性良好
9. **非空参数检查**: `getObjectOptions` 对 `projectId` 和 `objectType` 做了必要参数检查
10. **去重逻辑**: `getAssigneeCandidates` 使用 `Set` 对用户 ID 去重，避免 sysadmin 重复出现

---

## 四、修复优先级路线图

### 第一阶段：立即修复（半天工作量）

| 优先级 | 编号 | 问题 | 修复方案 |
|--------|------|------|----------|
| P1 | H-1 | createTodo 响应格式不一致 | 使用已有的 `created()` 工具函数 |
| P1 | H-3 | err.message 泄露内部信息 | 500 错误统一返回通用消息，使用 `unknown` 类型 |
| P1 | L-2 | `as string` 冗余 | 批量移除冗余断言 |

### 第二阶段：短期改进（1-2 天）

| 优先级 | 编号 | 问题 | 修复方案 |
|--------|------|------|----------|
| P2 | H-2 | Controller 直接操作 Prisma | 将数据访问逻辑下沉到 Service 层 |
| P2 | H-4 | createTodo 缺少输入验证 | 引入 Zod schema 验证 |
| P2 | H-5 | 字符串匹配异常检测 | 引入 NotFoundError/BusinessError 异常基类 |
| P2 | M-1 | page/pageSize 无边界验证 | 添加范围限制 |
| P2 | M-2 | tab 无白名单验证 | 添加白名单检查 |

### 第三阶段：中长期优化

| 优先级 | 编号 | 问题 | 修复方案 |
|--------|------|------|----------|
| P3 | M-3 | getAssigneeCandidates 重复查询 | 合并 Service 层查询 |
| P3 | M-4 | parseInt 缺少基数参数 | 统一添加 `10` |
| P3 | M-5 | req.body 整体传入 | Controller 显式构造 DTO |
| P3 | L-1 | 魔法字符串 | 提取消息常量 |
| P3 | L-3 | req.user! 非空断言 | 引入 AuthenticatedRequest 类型 |

---

## 五、与项目其他 Controller 的对比

| 质量特征 | todo.controller | company.controller | auth.controller | 评价 |
|----------|----------------|-------------------|-----------------|------|
| 模块级单例 | `new TodoServiceImpl()` | 同 | 同 | 一致 |
| try-catch 模式 | 10/10 端点 | 5/5 端点 | 6/8 端点 | todo 更一致 |
| 响应工具函数 | 9/10 用 success/paginate | 4/5 | 全用 success() | todo 有1处手动构造 |
| 错误信息泄露 | err.message 6处直接返回 | err.message 5处 | err.message 6处 | 一致 — 都是问题 |
| Controller 直接操作 Prisma | 2/10 端点 | 0/5 | 0/8 | **todo 独有问题** |
| 输入验证 | parseInt+isNaN + truthy | truthy + isArray | truthy | todo 略好 |
| 分层架构 | 8/10 遵循 | 5/5 遵循 | 8/8 遵循 | **todo 违反** |

**结论**: todo.controller.ts 的核心 CRUD 端点（8/10）质量与项目其他 Controller 相当，但 `getObjectOptions` 和 `getAssigneeCandidates` 两个辅助查询端点严重违反分层架构，拉低了整体评分。

---

## 六、评审结论

**判定: ⚠️ 有条件通过 — 无阻塞性安全问题，但存在显著架构违规需治理**

核心问题集中在三个方面：

1. **分层架构违规（H-2）** — `getObjectOptions` 和 `getAssigneeCandidates` 在 Controller 层直接操作 Prisma，绕过 Service 层。这是所有 Controller 中独有的架构问题，应优先修复以保持代码库的一致性
2. **输入验证薄弱（H-4）** — `createTodo` 无任何输入验证，依赖 Service 和 Prisma 的隐式防御
3. **错误处理脆弱（H-3, H-5）** — `err.message` 泄露 + 字符串精确匹配异常检测

**建议**:
- 短期: 修复 H-1（使用 `created()` 工具函数）和 H-3（错误消息脱敏 + `unknown` 类型），成本低且收益明确
- 中期: 将 `getObjectOptions` 和 `getAssigneeCandidates` 的数据访问逻辑下沉到 Service 层（H-2）
- 长期: 引入 Zod schema 验证 + NotFoundError 异常基类，作为项目级技术债务统一治理

---

*软件质量专家评审完成 — 2026-05-24*

---

## 修复记录（2026-05-24）

根据软件质量专家、软件架构专家、代码安全专家、Committer 四方评审意见，已完成以下修复：

### P0 修复（安全 + 一致性）

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| SEC-C-01 | IDOR 越权 — getTodo/getTodoLogs 缺少资源所有权校验 | `getById` 和 `getLogs` 新增 `userId/role/companyId` 参数，Service 层增加 `companyId` 校验，非 sysadmin 只能查看本公司待办 |
| H-1 | createTodo 响应格式不一致 | 使用 `created()` 工具函数替代手动构造 201 响应 |
| H-3 | catch 使用 `err: any` 且 err.message 泄露 | 统一改为 `err: unknown`，引入 `handleError` 统一处理函数，未知错误返回通用消息 |
| H-5/SEC-L-02 | 字符串匹配异常检测 | 创建 `apis/errors.ts`（NotFoundError/BusinessError/ForbiddenError），Service 层全面替换 `throw new Error(...)` |
| SEC-M-01 | catch 块 err.message 泄露 | `handleError` 函数统一处理，Prisma/未知错误返回通用消息 |

### P1 修复（架构 + 验证）

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| C-1 | Controller 直接操作 Prisma | `getObjectOptions` 和 `getAssigneeCandidates` 数据访问逻辑下沉到 `TodoServiceImpl`，Controller 仅做 HTTP 适配 |
| M-1 | ITodoService 接口不完整 | 新增 `getObjectOptions` 和 `getAssigneeCandidates` 接口方法 |
| H-4/SEC-H-02 | 输入验证缺失 | 创建 `apis/schema/todo.schema.ts`（Zod schema），所有端点添加 Zod 验证 |
| M-1 | page/pageSize 无边界 | Zod schema 限制 `page >= 1`、`1 <= pageSize <= 100` |
| M-2 | tab 无白名单 | Zod schema 限制为 `my_open/my_closed/all_open/all_closed` 枚举 |
| H-4 | getAssigneeCandidates 重复查询 | 合并为 Service 层单次查询 |

### P2 修复（代码质量）

| 编号 | 问题 | 修复方案 |
|------|------|----------|
| SEC-L-01 | ID 边界检查 | `isNaN(id) \|\| id <= 0` 双重校验 |
| M-3 | req.body 整体传入 | Controller 层显式构造 DTO 对象 |
| M-4 | parseInt 缺少基数 | 统一使用 `parseInt(value as string, 10)` |
| L-1 | 错误消息魔法字符串 | 提取到 `handleError` 统一处理 |
| H-1(arch) | 依赖倒置违反 | `const todoService: ITodoService = new TodoServiceImpl()` |
| SEC-C-01(续) | reject 非管理员错误码 | `ForbiddenError` 返回 403（原为 400） |

### 新增文件

| 文件 | 说明 |
|------|------|
| `apis/errors.ts` | NotFoundError / BusinessError / ForbiddenError 异常类 |
| `apis/schema/todo.schema.ts` | Zod 验证 schema（listTodos/createTodo/updateTodo/transferTodo/objectOptions/assigneeCandidates） |

### 修改文件

| 文件 | 变更说明 |
|------|----------|
| `apis/controller/todo.controller.ts` | 全面重写：统一错误处理、Zod 验证、DTO 构造、接口类型依赖、IDOR 修复、分层架构修复 |
| `apis/service/todo.service.ts` | 接口扩展：getById/getLogs 增加 auth 参数，新增 getObjectOptions/getAssigneeCandidates |
| `apis/service/impl/todo.service.impl.ts` | 实现扩展：自定义异常、IDOR 校验、新增两个方法、消除重复查询 |
| `tests/apis/todo.controller.test.ts` | 更新 reject 状态码(400→403)、getTodoLogs 错误消息、objectType 验证 |
| `tests/apis/todo.service.test.ts` | 更新 getById/getLogs 签名、新增 IDOR 测试 |

### 测试结果

- Todo 相关测试：164 个全部通过
- 构建：前后端构建成功

*修复完成 — 2026-05-24*
