# apis/controller/project.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 · 注入攻击 · 权限绕过 · 输入验证 · 信息泄露 · CSRF · SSRF · 加密安全）
**文件路径**: `apis/controller/project.controller.ts`
**代码行数**: 292 行（5 个导出函数 + 1 个模块级服务实例）
**关联路由**: `apis/app.ts` 第 145-149 行，共 5 条路由绑定，均配置 `roleMiddleware('sysadmin', 'admin')`
**关联服务**: `apis/service/project.service.ts`（接口 `IProjectService`）→ `apis/service/impl/project.service.impl.ts`（实现 `ProjectServiceImpl`）
**关联中间件**: `apis/middleware/auth.middleware.ts`（JWT 认证 + 角色鉴权）
**关联工具**: `apis/utils/response.util.ts`（success, fail, paginate, created）

---

## 一、安全总体评估

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 认证与授权 | 7/10 | JWT + 双层 RBAC 基本完善，但存在 TOCTOU 竞态和权限检查遗漏 |
| 输入验证 | 5/10 | 缺乏系统化的 schema 验证，依赖手动 if 判断，易遗漏 |
| 注入防护 | 7/10 | 使用 Prisma ORM 参数化查询，SQL 注入风险低，但类型转换存在隐患 |
| 信息泄露 | 5/10 | 错误消息暴露内部异常信息（err.message 直传），生产环境风险 |
| CSRF 防护 | 3/10 | 无 CSRF Token 验证，依赖 Bearer Token 部分 mitigate |
| 错误安全 | 4/10 | catch-all 模式泄露内部错误消息，未区分开发/生产环境 |
| 请求速率限制 | 8/10 | 路由层已配置全局 rate-limit 中间件，但无细粒度端点限制 |
| 数据完整性 | 6/10 | company_id 不可变验证存在，但 TOCTOU 竞态可绕过 |

**问题统计**: CRITICAL × 2 / HIGH × 3 / MEDIUM × 4 / LOW × 3

---

## 二、安全问题清单

### CRITICAL 级别

#### C-1: 授权检查存在 TOCTOU（Time-of-Check-Time-of-Use）竞态条件

**位置**: `getProject` 第 81-88 行、`updateProject` 第 215-228 行、`deleteProject` 第 274-279 行

**问题描述**:

授权检查分为两步：先 `getById()` 获取数据，再检查 `operator_ids.includes(userId)`。两次操作之间存在时间窗口，攻击者可利用并发请求绕过检查。

**攻击场景**:

```
时刻 T1: Admin A 调用 updateProject(id=1)，getById() 返回 operator_ids=[1,2]
时刻 T2: Admin A 同时发起另一个请求调用 updateProject(id=1, operator_ids=[3])
时刻 T3: 两个请求都通过了 operator_ids.includes(userId) 检查
时刻 T4: 后执行的请求覆盖了先执行的结果，数据不一致
```

**OWASP 映射**: A01:2021 – Broken Access Control

**风险等级**: CRITICAL — 可导致未授权数据修改

**修复建议**:

在 service 层使用事务（Prisma `$transaction`）将授权检查与数据操作合并为原子操作：

```typescript
// service/impl/project.service.impl.ts
async update(id: number, request: UpdateProjectRequest, userId?: number, role?: string): Promise<Project> {
  return await getPrisma().$transaction(async (tx) => {
    const existing = await tx.project.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new Error('项目不存在');

    // 在事务内完成授权检查
    if (role === 'admin') {
      const isOperator = await tx.projectOperator.findFirst({
        where: { projectId: id, userId, deletedAt: null }
      });
      if (!isOperator) throw new Error('无权操作该项目');
    }

    // ... 执行更新操作
  });
}
```

---

#### C-2: `deleteProject` 的授权检查可被绕过 — 非 admin 角色无权限验证

**位置**: `deleteProject` 第 266-291 行

**问题描述**:

```typescript
export async function deleteProject(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的项目ID'); return; }

    const { userId, role } = req.user!;

    // Admin can only delete projects where they are an operator
    if (role === 'admin') {                              // ← 只检查 admin
      const existing = await projectService.getById(id, userId, role);
      if (!existing.operator_ids.includes(userId)) {
        fail(res, 403, '无权操作该项目');
        return;
      }
    }
    // ← sysadmin 角色直接跳过，无任何额外验证
    await projectService.delete(id, userId, role);
    success(res, null, '删除项目成功');
```

虽然路由层 `roleMiddleware('sysadmin', 'admin')` 限制了只有这两个角色可以访问，但 `view` 角色如果未来被添加到路由中间件白名单，将完全绕过所有权限检查。更重要的是，**当前代码的授权模型是隐式的**——任何非 admin 角色都有完全的删除权限，这违反了最小权限原则。

**攻击场景**:

如果路由配置修改为 `roleMiddleware('sysadmin', 'admin', 'view')`（假设未来需求变更），view 角色用户可以删除任意项目。

**OWASP 映射**: A01:2021 – Broken Access Control

**修复建议**:

采用白名单模式，显式声明允许删除的角色：

```typescript
// 只允许 sysadmin 和项目的 operator(admin) 删除
if (role === 'admin') {
  const existing = await projectService.getById(id, userId, role);
  if (!existing.operator_ids.includes(userId)) {
    fail(res, 403, '无权操作该项目');
    return;
  }
} else if (role !== 'sysadmin') {
  // 显式拒绝非预期角色
  fail(res, 403, '无权删除项目');
  return;
}
```

---

### HIGH 级别

#### H-1: 错误消息泄露内部异常信息 — 信息泄露

**位置**: 所有 handler 的 catch 块（第 51-53、91-97、156-162、235-243、284-289 行）

**问题描述**:

```typescript
catch (err: any) {
  fail(res, 500, err.message || '获取项目列表失败');  // ← err.message 直接返回客户端
}
```

`err.message` 可能包含：
- 数据库连接字符串
- Prisma 内部错误详情（表名、列名）
- 堆栈跟踪片段
- 文件路径

**攻击场景**:

如果数据库连接异常，`err.message` 可能为：
```
Can't reach database server at `db.example.com:5432`
```
攻击者可利用此信息进行网络侦察。

**OWASP 映射**: A04:2021 – Insecure Design / A05:2021 – Security Misconfiguration

**修复建议**:

```typescript
import { isKnownError } from '../utils/error';

catch (err: unknown) {
  const message = err instanceof Error && isKnownError(err.message)
    ? err.message
    : '获取项目列表失败';
  // 生产环境记录完整错误日志
  if (process.env.NODE_ENV === 'production') {
    console.error('[ProjectController]', err);
  }
  fail(res, 500, message);
}
```

其中 `isKnownError` 维护已知业务错误的白名单：

```typescript
// utils/error.ts
const KNOWN_ERRORS = new Set([
  '项目不存在',
  '运营者不属于指定公司',
  '查看者不属于指定公司',
]);

export function isKnownError(message: string): boolean {
  return KNOWN_ERRORS.has(message);
}
```

---

#### H-2: `parseInt` 类型转换未做边界检查 — 整数溢出/注入

**位置**: `listProjects` 第 42-45 行、`getProject` 第 78 行、`updateProject` 第 212 行、`deleteProject` 第 268 行

**问题描述**:

```typescript
const page = parseInt(req.query.page as string) || 1;       // ← 无边界验证
const pageSize = parseInt(req.query.pageSize as string) || 10; // ← 可传入极大值
const company_id = req.query.company_id ? parseInt(req.query.company_id as string) : undefined;
```

攻击向量：
1. `pageSize=999999999` — 可导致数据库查询耗尽内存（DoS）
2. `page=-1` — 负数 offset 可导致意外行为
3. `company_id=NaN` — `parseInt("abc")` 返回 `NaN`，`NaN ? parseInt(NaN) : undefined` 不会触发，但如果传入 `"abc"` 则 `req.query.company_id` 为 truthy，`parseInt("abc")` 返回 `NaN`，`NaN` 传入 Prisma 可能导致异常

**攻击场景**:

```
GET /api/projects?pageSize=999999999&page=1
```
可能导致数据库返回数百万条记录，耗尽服务器内存。

**OWASP 映射**: A05:2021 – Security Misconfiguration / A03:2021 – Injection

**修复建议**:

```typescript
const page = Math.max(1, Math.min(parseInt(req.query.page as string) || 1, 10000));
const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
const parsedCompanyId = parseInt(req.query.company_id as string);
const company_id = isNaN(parsedCompanyId) ? undefined : parsedCompanyId;
```

---

#### H-3: `createProject` 缺少输入长度/格式验证 — 批量注入攻击

**位置**: `createProject` 第 141-163 行

**问题描述**:

```typescript
const { short_name, full_name, company_id } = req.body;
if (!short_name || !full_name || !company_id) {
  fail(res, 400, '项目短名、项目全名、所属公司不能为空');
  return;
}
```

验证仅检查字段存在性，未验证：
- 字符串长度限制（可传入数 MB 的字符串）
- 数组元素数量限制（`operator_ids` 可传入数千个 ID）
- `company_id` 的数值范围
- `description` 字段内容（可包含 XSS payload）

**攻击场景**:

```json
{
  "short_name": "<script>alert('xss')</script>",
  "full_name": "A".repeat(10000000),
  "company_id": 1,
  "operator_ids": [1, 2, 3, /* ... 10000 个 ID */]
}
```

**OWASP 映射**: A03:2021 – Injection

**修复建议**:

使用 Zod schema 验证：

```typescript
import { z } from 'zod';

const createProjectSchema = z.object({
  short_name: z.string().min(1).max(50).regex(/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/),
  full_name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  company_id: z.number().int().positive(),
  operator_ids: z.array(z.number().int().positive()).max(50).optional(),
  viewer_ids: z.array(z.number().int().positive()).max(50).optional(),
});

export async function createProject(req: Request, res: Response): Promise<void> {
  try {
    const validated = createProjectSchema.parse(req.body);
    // 使用 validated 而非 req.body
```

---

### MEDIUM 级别

#### M-1: `req.user!` 非空断言可能绕过认证 — 运行时异常风险

**位置**: `listProjects` 第 48 行、`getProject` 第 81 行、`updateProject` 第 215 行、`deleteProject` 第 271 行

**问题描述**:

```typescript
const { userId, role } = req.user!;  // ← 非空断言，假设 authMiddleware 已执行
```

虽然路由层已配置 `authMiddleware`，但如果未来有人重构路由顺序或移除中间件，`req.user` 将为 `undefined`，非空断言会导致 `TypeError: Cannot destructure property 'userId' of undefined`，这个错误会被 catch 捕获并返回 500，而不是更合适的 401。

**OWASP 映射**: A04:2021 – Insecure Design

**修复建议**:

```typescript
if (!req.user) {
  fail(res, 401, '未登录，请先登录');
  return;
}
const { userId, role } = req.user;
```

---

#### M-2: `updateProject` 中 `delete req.body.company_id` 修改请求体 — 反模式

**位置**: `updateProject` 第 231 行

**问题描述**:

```typescript
delete req.body.company_id;  // ← 直接修改请求对象
const item = await projectService.update(id, req.body, userId, role);
```

直接修改 `req.body` 是一个反模式：
1. 任何在 `delete` 之前读取了 `req.body` 引用的代码仍能看到原始值
2. 如果有请求日志中间件在 handler 之后记录原始请求体，已被篡改
3. Express 的 body-parser 在某些配置下会缓存原始对象

**OWASP 映射**: A04:2021 – Insecure Design

**修复建议**:

```typescript
const { company_id: _, ...updateData } = req.body;
const item = await projectService.update(id, updateData, userId, role);
```

---

#### M-3: `createProject` 中 admin 用户的 company_id 覆盖存在安全隐患

**位置**: `createProject` 第 149-152 行

**问题描述**:

```typescript
if (req.user?.role === 'admin') {
  req.body.company_id = req.user.companyId;  // ← 直接覆盖请求体
}
```

潜在问题：
1. `req.user.companyId` 可能为 `undefined` 或 `null`（AuthPayload 中 `companyId` 是可选的），这会导致创建的项目 `company_id` 为 null
2. 直接修改 `req.body` 而非使用新的数据对象

**攻击场景**:

如果 JWT payload 中缺少 `companyId` 字段（JWT 被手动构造或旧版本 token），将创建 `company_id = null` 的项目。

**OWASP 映射**: A01:2021 – Broken Access Control

**修复建议**:

```typescript
if (req.user?.role === 'admin') {
  if (!req.user.companyId) {
    fail(res, 400, '当前用户未关联公司');
    return;
  }
  const sanitized = { ...req.body, company_id: req.user.companyId };
  const item = await projectService.create(sanitized);
  // ...
}
```

---

#### M-4: `status` 参数解析不严谨 — 布尔值注入

**位置**: `listProjects` 第 46 行

**问题描述**:

```typescript
const status = req.query.status === undefined ? undefined : req.query.status === 'true';
```

任何非 `'true'` 的值都会被解析为 `false`：
- `?status=false` → `false` ✓
- `?status=true` → `true` ✓
- `?status=yes` → `false` ✗ (应拒绝)
- `?status=1` → `false` ✗ (应拒绝)

**OWASP 映射**: A03:2021 – Injection（低危）

**修复建议**:

```typescript
const statusParam = req.query.status as string | undefined;
let status: boolean | undefined;
if (statusParam !== undefined) {
  if (statusParam !== 'true' && statusParam !== 'false') {
    fail(res, 400, 'status 参数必须为 true 或 false');
    return;
  }
  status = statusParam === 'true';
}
```

---

### LOW 级别

#### L-1: 响应格式不一致 — `createProject` 手动构造 201 响应

**位置**: `createProject` 第 155 行

**问题描述**:

```typescript
res.status(201).json({ code: 0, message: '创建项目成功', data: item });
```

其他 handler 使用 `success()` / `fail()` / `paginate()` 工具函数，但此处手动构造响应。项目已提供 `created()` 工具函数但未使用，导致响应格式可能不一致。

**安全影响**: 无直接安全风险，但降低代码一致性，增加维护成本。

---

#### L-2: 模块顶层 `new ProjectServiceImpl()` — 依赖倒置违反影响可测试性和安全性

**位置**: 第 5 行

**问题描述**:

```typescript
const projectService = new ProjectServiceImpl();
```

模块加载时立即创建服务实例，无法在测试中替换为 mock 实现。在安全测试场景下，无法注入安全审计层或请求日志记录器。

---

#### L-3: Swagger 文档中 `company_id` 参数类型为 `integer` 但未说明范围

**位置**: 第 29-32 行（list）、第 127-130 行（create）

**问题描述**:

Swagger 注解仅声明 `type: integer`，未标注最小值和最大值限制，可能误导 API 消费者传入任意大的数值。

---

## 三、攻击面分析

### 3.1 攻击面矩阵

| 端点 | 认证 | 授权 | 输入验证 | 输出过滤 | 并发安全 |
|------|------|------|----------|----------|----------|
| GET /api/projects | JWT | roleMiddleware | pageSize 无上限 | ✓ | N/A |
| GET /api/projects/:id | JWT | admin+operator | parseInt NaN 检查 | ✓ | N/A |
| POST /api/projects | JWT | admin company 覆盖 | 仅非空检查 | ✓ | N/A |
| PUT /api/projects/:id | JWT | admin+operator | parseInt NaN 检查 | ✓ | TOCTOU |
| DELETE /api/projects/:id | JWT | admin+operator | parseInt NaN 检查 | ✓ | TOCTOU |

### 3.2 安全威胁模型

```
┌─────────────────────────────────────────────────────────────┐
│                        攻击者                               │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
     ┌─────▼─────┐                    ┌───────▼───────┐
     │  合法用户   │                    │  合法 admin    │
     │ (admin/    │                    │  (越权尝试)    │
     │  sysadmin) │                    │               │
     └─────┬─────┘                    └───────┬───────┘
           │                                  │
     ┌─────▼──────────────────────────────────▼───────┐
     │            路由层 roleMiddleware                 │
     │       (sysadmin + admin 白名单)                 │
     └───────────────────┬────────────────────────────┘
                         │
     ┌───────────────────▼────────────────────────────┐
     │            Controller 层                        │
     │  ┌─ listProjects:  pageSize DoS 风险           │
     │  ├─ getProject:    err.message 信息泄露          │
     │  ├─ createProject: 缺少 schema 验证             │
     │  ├─ updateProject: TOCTOU 竞态条件              │
     │  └─ deleteProject: 隐式授权模型                  │
     └───────────────────┬────────────────────────────┘
                         │
     ┌───────────────────▼────────────────────────────┐
     │            Service 层 (Prisma ORM)              │
     │  参数化查询 — SQL 注入风险低                      │
     │  但缺乏事务级授权检查                             │
     └────────────────────────────────────────────────┘
```

---

## 四、OWASP Top 10 (2021) 映射

| OWASP 编号 | 类别 | 涉及问题 | 严重度 |
|------------|------|----------|--------|
| A01:2021 | Broken Access Control | C-1 (TOCTOU), C-2 (隐式授权), M-3 (companyId 覆盖) | CRITICAL |
| A03:2021 | Injection | H-2 (parseInt 注入), H-3 (输入长度攻击) | HIGH |
| A04:2021 | Insecure Design | M-1 (非空断言), M-2 (请求体修改) | MEDIUM |
| A05:2021 | Security Misconfiguration | H-1 (信息泄露), H-2 (边界检查) | HIGH |
| A07:2021 | Identification and Authentication Failures | M-1 (req.user! 空值) | MEDIUM |

---

## 五、修复优先级排序

| 优先级 | 问题编号 | 修复工作量 | 风险描述 |
|--------|----------|-----------|----------|
| **P0** | C-1 | 中 | TOCTOU 竞态导致未授权数据修改 |
| **P0** | C-2 | 小 | 隐式授权模型导致未来扩展风险 |
| **P1** | H-1 | 小 | 内部错误信息泄露辅助攻击者侦察 |
| **P1** | H-2 | 小 | pageSize 无限制导致 DoS 攻击 |
| **P1** | H-3 | 中 | 缺少输入验证导致注入和 DoS |
| **P2** | M-1 | 小 | 非空断言绕过认证异常处理 |
| **P2** | M-2 | 小 | 请求体修改反模式 |
| **P2** | M-3 | 小 | companyId 可能为 null |
| **P2** | M-4 | 小 | 布尔值解析不严谨 |
| **P3** | L-1 | 小 | 响应格式不一致 |
| **P3** | L-2 | 大 | 依赖注入重构 |
| **P3** | L-3 | 小 | Swagger 文档补充 |

---

## 六、安全加固建议（综合）

### 6.1 短期修复（1-2 天）

1. **引入 Zod schema 验证** — 为所有端点添加请求体验证
2. **添加参数边界检查** — page/pageSize/company_id 添加上下限
3. **错误消息白名单** — 只返回已知业务错误消息，未知错误统一返回通用消息
4. **显式授权检查** — deleteProject 添加 else-if 白名单

### 6.2 中期加固（1 周）

5. **事务级授权** — 将授权检查移入 Prisma 事务内，消除 TOCTOU
6. **req.user 空值守卫** — 每个 handler 开头添加 null check
7. **请求体不可变** — 使用解构赋值替代直接修改 req.body

### 6.3 长期改进（迭代）

8. **依赖注入** — 使用 DI 容器或工厂模式管理 service 实例
9. **审计日志** — 记录所有数据变更操作的执行者、时间、变更内容
10. **自动化安全测试** — 在 CI 中集成 OWASP ZAP 或类似工具

---

## 七、与其他 Controller 安全性对比

| 安全维度 | project.controller | publishing-platform.controller | llm-model.controller |
|----------|-------------------|-------------------------------|---------------------|
| 输入验证 | 手动 if 判断 | 手动 if 判断 | 手动 if 判断 |
| 错误处理 | err.message 直传 | err.message 直传 | 已修复（白名单） |
| 授权粒度 | admin+operator 双层 | admin company 检查 | 仅 roleMiddleware |
| TOCTOU 防护 | 无 | 无 | 无 |
| CSRF 防护 | 无 | 无 | 无 |
| 参数边界检查 | 无 | 无 | 部分有 |

**结论**: project.controller 的安全水平与项目内其他 controller 基本一致，均缺乏系统化的输入验证和错误处理。建议项目层面统一引入验证中间件，而非逐个 controller 修补。
