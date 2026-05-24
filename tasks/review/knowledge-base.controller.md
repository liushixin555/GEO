# apis/controller/knowledge-base.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 + API 安全 + 输入验证 + 信息泄露 + 权限控制）
**文件路径**: `apis/controller/knowledge-base.controller.ts`
**代码行数**: 166 行（5 个导出函数 + 1 个辅助函数 + 1 个模块级常量）
**关联文件**: `apis/routes/knowledge.routes.ts`, `apis/schema/knowledge-base.schema.ts`, `apis/middleware/validate.ts`, `apis/service/impl/knowledge-base.service.impl.ts`, `apis/middleware/auth.middleware.ts`, `apis/entity/knowledge-base.entity.ts`
**安全评级**: ✅ MEDIUM-LOW（中低风险 — 核心安全机制到位，存在归属校验缺失与 Zod schema 遗漏字段等设计缺陷）

---

## 一、安全评价总览

从代码安全专家视角审视，`knowledge-base.controller.ts`（166 行版本）的整体安全态势为**中低风险**，较上一版（123 行）有**显著改善**。

### 已修复的安全问题（对比上一版评审）

| 编号 | 问题 | 修复方式 | 验证结果 |
|------|------|----------|----------|
| SEC-H-01 | `getById` 无数据级访问控制 | Service 层 `getById(id, userId, role)` 添加了与 `list` 一致的权限过滤 | ✅ 已修复 |
| SEC-H-02 | 输入验证严重不足 | 路由层引入 Zod schema `validate()` + Controller 层手动校验双重防御 | ✅ 已修复 |
| SEC-M-02 | `company_id`/`project_id` 无整数验证 | Zod `positiveInt` + `validateInteger()` 双重保障 | ✅ 已修复 |
| SEC-M-04 | `update` 批量赋值风险 | Controller 显式构造 `UpdateKnowledgeBaseRequest` + Zod schema 自动剥离未知字段 | ✅ 已修复 |
| SEC-L-01 | `description` 无长度限制 | Zod `max(2000)` + Controller 手动校验 | ✅ 已修复 |
| SEC-L-02 | `search` 无长度限制 | `rawSearch.slice(0, 100)` 截断 | ✅ 部分修复 |

### 安全防御架构（三层纵深防御）

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: 路由层 (knowledge.routes.ts)                          │
│  ├─ authMiddleware       → JWT 认证 ✅                          │
│  ├─ roleMiddleware        → sysadmin/admin 角色限制 ✅           │
│  └─ validate(ZodSchema)  → POST/PUT 请求体 Zod 校验 ✅          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: 控制器层 (knowledge-base.controller.ts)               │
│  ├─ req.user 存在性检查  → 401 未登录 ✅                        │
│  ├─ parseInt + isNaN      → ID 参数类型校验 ✅                   │
│  ├─ VALID_SCOPES 常量     → scope 枚举校验 ✅                    │
│  ├─ validateInteger()     → company_id/project_id 整数校验 ✅    │
│  ├─ name 类型/长度/空白    → 名称完整性校验 ✅                    │
│  └─ description 长度      → 描述长度校验 ✅                       │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: 服务层 (knowledge-base.service.impl.ts)               │
│  ├─ getById 数据级访问控制 → scope + companyId + projectId 过滤 ✅│
│  ├─ update/delete 所有权检查 → 非创建者不可操作 ✅               │
│  ├─ scope 业务逻辑验证     → company 必须选公司，project 必须选项目 ✅│
│  ├─ Prisma 参数化查询      → SQL 注入免疫 ✅                     │
│  └─ 软删除                 → deletedAt 而非物理删除 ✅            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、安全防御正面发现

| 防御措施 | 位置 | 评价 |
|----------|------|------|
| JWT 认证中间件 | `auth.middleware.ts` | ✅ 基于 jsonwebtoken 库，token 过期处理正确 |
| 角色授权 — sysadmin + admin | `knowledge.routes.ts:19` | ✅ 所有 5 个端点均限制为 sysadmin/admin 角色 |
| Zod schema 校验（POST/PUT） | `knowledge.routes.ts:22-23` + `knowledge-base.schema.ts` | ✅ 类型/长度/枚举全面校验，自动剥离未知字段 |
| Controller 手动校验（防御纵深） | 第 66-78、102-116 行 | ✅ 与 Zod 形成双重防御 |
| ID 参数验证 | 第 44、99、149 行 | ✅ `parseInt + isNaN` 一致执行 |
| Scope 验证 | 第 8、73-76、103-106 行 | ✅ `VALID_SCOPES` 常量 + `includes` 检查 |
| `validateInteger()` | 第 10-16 行 | ✅ 类型 + 整数 + 正数三重校验 |
| 数据级访问控制（getById） | Service 第 105-135 行 | ✅ 与 list 一致的 scope/company/project 过滤 |
| 所有权检查（update/delete） | Service 第 173-175、220-222 行 | ✅ 非 sysadmin 只能操作自己创建的 |
| `err: unknown` 类型安全 | 所有 5 个 catch 块 | ✅ 防止 `any` 类型逃逸 |
| catch-all 通用错误消息 | 第 37、56、92、141、162 行 | ✅ 未泄露 `err.message`，返回通用消息 |
| 分页参数夹紧 | 第 20-22 行 | ✅ `Math.max(1, ...)` / `Math.min(100, ...)` |
| 状态参数类型守卫 | 第 26 行 | ✅ `req.query.status === 'true'` 正确实现布尔解析 |
| 搜索长度限制 | 第 24 行 | ✅ `rawSearch.slice(0, 100)` 防止超长搜索 |
| name trim() | 第 84 行 | ✅ `name: name.trim()` 去除首尾空白 |
| Prisma 参数化查询 | Service 层 | ✅ 天然防止 SQL 注入 |
| 软删除 | Service 第 224 行 | ✅ 使用 `deletedAt` 而非物理删除 |
| 显式请求对象构造 | 第 119-126 行 | ✅ 防止批量赋值 |
| `req.user` 存在性检查 | 所有 5 个函数 | ✅ 统一 401 响应 |
| 无 console.log | 整个文件 | ✅ 生产代码无调试输出 |

---

## 三、安全漏洞详情（仍存在的问题）

### SEC-M-01: `company_id`/`project_id` 未验证归属关系 — admin 可关联任意公司/项目（OWASP A01）

**严重级别**: MEDIUM
**位置**: 第 77-78 行（createKnowledgeBase）、第 124-125 行（updateKnowledgeBase）
**OWASP 分类**: A01:2021 — Broken Access Control

```typescript
// createKnowledgeBase — 第 77-78 行
const validCompanyId = validateInteger(company_id, 'company_id');
const validProjectId = validateInteger(project_id, 'project_id');
// ❌ 仅验证了整数格式，未验证当前 admin 是否有权关联该公司/项目
```

**攻击场景**:

```bash
# admin-A（属于公司1）创建知识库时关联到公司2
curl -X POST http://target/api/knowledge-bases \
  -H "Authorization: Bearer <admin-A-token>" \
  -H "User-Agent: test-agent/1.0" \
  -H "Content-Type: application/json" \
  -d '{"name": "恶意知识库", "scope": "company", "company_id": 2}'
```

**影响分析**:
1. **数据完整性破坏**: 知识库可以关联到管理员无权访问的公司或项目
2. **信息混淆**: 其他公司的 admin 可能看到不属于他们的知识库
3. **权限提升路径**: 通过关联到其他公司的项目，可能间接获取该项目的知识库资源

**修复方案**: 在 Service 层添加归属关系验证：

```typescript
if (request.scope === 'company' && request.company_id) {
  if (role !== 'sysadmin') {
    const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user || user.companyId !== request.company_id) {
      throw new ForbiddenError('无权关联该公司');
    }
  }
}
```

---

### SEC-M-02: `updateKnowledgeBaseSchema` 遗漏 `status` 字段 — 状态更新静默失败

**严重级别**: MEDIUM
**位置**: `apis/schema/knowledge-base.schema.ts:27-33` + Controller 第 123 行
**OWASP 分类**: A04:2021 — Insecure Design

```typescript
// knowledge-base.schema.ts — update schema 缺少 status 字段
export const updateKnowledgeBaseSchema = z.object({
  name: name.optional(),
  description,
  scope: scope.optional(),
  company_id: positiveInt.optional(),
  project_id: positiveInt.optional(),
  // ❌ 缺少 status: z.boolean().optional()
});

// knowledge-base.controller.ts — 第 119-126 行
const updateRequest: UpdateKnowledgeBaseRequest = {
  name: req.body.name,
  description: req.body.description,
  scope: req.body.scope,
  status: req.body.status,     // ← Zod 已剥离 status，此处永远为 undefined
  company_id: validateInteger(req.body.company_id, 'company_id'),
  project_id: validateInteger(req.body.project_id, 'project_id'),
};
```

**根因分析**:
1. Zod `safeParse` 默认行为是**剥离未知字段**（非 `.strict()` 报错、非 `.passthrough()` 保留）
2. `validate()` 中间件（`validate.ts:22`）将 `req.body = result.data`，因此 `status` 被丢弃
3. Controller 构造 `updateRequest` 时 `status: req.body.status` 永远为 `undefined`
4. Service 层 `if (request.status !== undefined)` 永远为 false — **状态更新永远不会生效**

**影响范围**: 前端调用 `PUT /api/knowledge-bases/:id` 传入 `{ status: false }` 试图禁用知识库时，请求被 Zod 接受（不报错），但 `status` 字段被静默丢弃，知识库状态不变。前端无任何错误提示，用户误以为操作成功。

**修复方案**:

```typescript
// knowledge-base.schema.ts
export const updateKnowledgeBaseSchema = z.object({
  name: name.optional(),
  description,
  scope: scope.optional(),
  status: z.boolean().optional(),    // ← 添加 status 字段
  company_id: positiveInt.optional(),
  project_id: positiveInt.optional(),
});
```

---

### SEC-M-03: Service 层异常通过字符串精确匹配 — 脆弱的安全检测（OWASP A04）

**严重级别**: MEDIUM
**位置**: 第 33-39、52-58、88-94、133-143、156-163 行（所有 5 个 catch 块）
**OWASP 分类**: A04:2021 — Insecure Design

```typescript
} catch (err: unknown) {
  if (err instanceof Error && err.message === '知识库不存在') {     // ❌ 精确字符串匹配
    fail(res, 404, err.message);
  } else if (err instanceof Error && err.message === '只能修改自己创建的知识库') {
    fail(res, 403, err.message);
  } else if (err instanceof Error && (err.message === '公司公共知识库必须选择公司' || err.message === '项目私有知识库必须选择项目')) {
    fail(res, 400, err.message);
  } else {
    fail(res, 500, '更新知识库失败');    // ✓ catch-all 未泄露 err.message
  }
}
```

**安全影响**:
1. **维护风险**: Service 层修改错误消息（如改为 `"该知识库不存在"`）→ Controller 匹配失效 → 业务异常被当作 500 返回
2. **覆盖不完整**: `updateKnowledgeBase` 的 catch 块匹配 4 种不同错误消息，随业务增长容易遗漏
3. **设计脆弱**: 字符串匹配是隐式契约，缺乏编译时保障
4. **`err.message` 直接返回给前端**: 匹配成功时 `fail(res, 404, err.message)` 将 Service 层错误消息直接透传给客户端，如果 Service 层消息包含内部实现细节则会泄露

**修复方案**: 引入类型安全的异常体系：

```typescript
// apis/errors/index.ts
export class AppError extends Error {
  constructor(message: string, public statusCode: number, public code: string) {
    super(message);
  }
}
export class NotFoundError extends AppError {
  constructor(entity: string) { super(`${entity}不存在`, 404, 'NOT_FOUND'); }
}
export class ForbiddenError extends AppError {
  constructor(message: string) { super(message, 403, 'FORBIDDEN'); }
}

// Controller 统一错误处理
} catch (err: unknown) {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    fail(res, 500, '服务器内部错误');
  }
}
```

---

### SEC-L-01: `validateInteger()` 静默吞没无效输入 — `fieldName` 参数未使用

**严重级别**: LOW
**位置**: 第 10-16 行
**OWASP 分类**: A04:2021 — Insecure Design

```typescript
function validateInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return undefined;    // ❌ 静默返回 undefined，不报错
  }
  return value;
}
```

**影响分析**:
1. 当用户传入 `company_id: "abc"` 或 `company_id: -1` 时，函数返回 `undefined` 而非抛出错误
2. `fieldName` 参数声明了但从未使用，无法定位是哪个字段无效
3. 在 create 场景中，`scope=company` + 无效 `company_id` → Service 层会抛出 "公司公共知识库必须选择公司" → 间接防御生效
4. **但在 update 场景中**: 如果 `scope` 不变（仍为 "company"）且已有 `companyId`，无效的 `company_id` 被静默忽略，原值不变 → 用户以为更新成功但实际未更新

**缓解因素**: 路由层 Zod `positiveInt` 在 POST/PUT 请求中已提供第一层防御，Controller 层 `validateInteger()` 仅作为第二层防线。实际触发此问题的概率较低。

**修复建议**:

```typescript
function validateInteger(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new BadRequestError(`${fieldName} 必须为正整数`);
  }
  return value;
}
```

---

### SEC-L-02: `listKnowledgeBases` 中 `scope` 查询参数未校验

**严重级别**: LOW
**位置**: 第 25 行
**OWASP 分类**: A05:2021 — Security Misconfiguration

```typescript
const scope = req.query.scope as string | undefined;  // ❌ 未校验是否为合法 scope
```

与 `createKnowledgeBase`（第 73-76 行）和 `updateKnowledgeBase`（第 103-106 行）中使用 `VALID_SCOPES` 校验不同，`listKnowledgeBases` 的 `scope` 查询参数直接传入 Service 层。

**缓解因素**: Service 层执行 `where.scope = scope`，Prisma 对 enum 字段做精确匹配，无效值只会返回空结果集，不会造成安全漏洞。但违反了"验证一切输入"的原则。

**修复建议**:

```typescript
const rawScope = req.query.scope as string | undefined;
const scope = rawScope && VALID_SCOPES.includes(rawScope as any) ? rawScope : undefined;
```

---

### SEC-L-03: Controller 层手动校验与 Zod 校验冗余 — 维护负担

**严重级别**: LOW（代码质量/可维护性风险）
**位置**: 第 66-78、102-116 行
**OWASP 分类**: A04:2021 — Insecure Design

当前 POST/PUT 请求经过两层校验：
1. **路由层**: `validate(createKnowledgeBaseSchema)` / `validate(updateKnowledgeBaseSchema)` — Zod schema
2. **Controller 层**: 手动 `if (!name)` / `if (name.length > 200)` / `if (!VALID_SCOPES.includes(scope))` 等

两层校验形成了**防御纵深**，但也带来了维护负担：
- Zod schema 和 Controller 手动校验需要**同步维护**（如修改 name 最大长度需改两处）
- `VALID_SCOPES` 常量（Controller）与 `z.enum([...])`（Schema）是两份独立的 scope 定义

**建议**: 保留 Zod 作为唯一验证层（已有 `validate()` 中间件），Controller 层信任 Zod 已校验的数据。或者，将 `VALID_SCOPES` 统一到 schema 中导出使用。

---

### SEC-L-04: 搜索 `insensitive` 模式性能风险

**严重级别**: LOW（性能/可用性风险）
**位置**: Service 层 `knowledge-base.service.impl.ts:49`
**OWASP 分类**: A05:2021 — Security Misconfiguration

```typescript
where.OR = [
  { name: { contains: search, mode: 'insensitive' } },
  { description: { contains: search, mode: 'insensitive' } },
];
```

PostgreSQL 的 `insensitive` 模式使用 `ILIKE` 或 `LOWER()`，无法利用标准 B-tree 索引。当 `knowledge_base` 表数据量增大时，可能导致数据库负载过高，构成 DoS 攻击面。

**缓解因素**: `search` 已限制为 100 字符（Controller 第 24 行），降低了超长搜索串的风险。

---

## 四、攻击面总结

```
┌──────────────────────────────────────────────────────────────────┐
│                     攻击面分析图（166 行版本）                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  攻击者 (sysadmin / admin)                                       │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────────┐                                    │
│  │ Layer 1: 路由层           │                                    │
│  │ JWT Auth            ✅   │ ← 已防御                            │
│  │ Role: sysadmin/admin ✅  │ ← 已防御                            │
│  │ Rate Limit          ✅   │ ← 已防御                            │
│  │ Anti-Crawl          ✅   │ ← 已防御                            │
│  │ Zod Schema (POST/PUT) ✅ │ ← 已防御（新增）                     │
│  └──────────┬───────────────┘                                    │
│             ▼                                                    │
│  ┌──────────────────────────┐                                    │
│  │ Layer 2: 控制器层         │                                    │
│  │                          │                                    │
│  │ ✅ user 存在性检查       │                                    │
│  │ ✅ ID parseInt+isNaN     │                                    │
│  │ ✅ VALID_SCOPES 枚举     │                                    │
│  │ ✅ validateInteger()     │                                    │
│  │ ✅ name 类型+长度+trim   │                                    │
│  │ ✅ description 长度      │                                    │
│  │ ✅ search 截断 100       │                                    │
│  │ ✅ 分页参数夹紧          │                                    │
│  │ ✅ 显式请求对象构造      │                                    │
│  │                          │                                    │
│  │ ⚠️ validateInteger 静默  │ ← SEC-L-01: 无效输入被吞没          │
│  │ ⚠️ scope 查询参数未校验  │ ← SEC-L-02: list 的 scope 无校验   │
│  │ ⚠️ status 字段被 Zod 剥离│ ← SEC-M-02: 状态更新静默失败        │
│  └──────────┬───────────────┘                                    │
│             ▼                                                    │
│  ┌──────────────────────────┐                                    │
│  │ Layer 3: 服务层           │                                    │
│  │                          │                                    │
│  │ ✅ getById 数据级权限     │ ← SEC-H-01 已修复                   │
│  │ ✅ update/delete 所有权   │                                    │
│  │ ✅ scope 业务逻辑验证     │                                    │
│  │ ✅ 软删除                │                                    │
│  │                          │                                    │
│  │ ❌ 关联归属未验证         │ ← SEC-M-01: company_id/project_id  │
│  │ ⚠️ 字符串匹配异常检测    │ ← SEC-M-03: 脆弱的错误检测          │
│  └──────────┬───────────────┘                                    │
│             ▼                                                    │
│  ┌──────────────────────────┐                                    │
│  │ Prisma / Database        │                                    │
│  │                          │                                    │
│  │ ✅ 参数化查询            │ ← SQL 注入已防御                     │
│  │ ✅ 显式字段赋值          │ ← 批量赋值已防御                     │
│  └──────────────────────────┘                                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 五、修复优先级与工作量估算

### 第一阶段：紧急修复（0.5 天）

| 优先级 | 编号 | 问题 | 修复方案 | 工作量 |
|--------|------|------|----------|--------|
| P1 | SEC-M-02 | Zod schema 遗漏 status 字段 | 添加 `status: z.boolean().optional()` | 5min |
| P1 | SEC-M-01 | 关联归属未验证 | Service 层添加归属校验 | 2h |

### 第二阶段：短期改进（1 天）

| 优先级 | 编号 | 问题 | 修复方案 | 工作量 |
|--------|------|------|----------|--------|
| P2 | SEC-M-03 | 异常检测脆弱 | 引入 AppError 异常体系 | 3h |
| P2 | SEC-L-01 | validateInteger 静默吞没 | 改为抛出 BadRequestError | 15min |
| P2 | SEC-L-02 | scope 查询参数未校验 | 添加 VALID_SCOPES 校验 | 10min |

### 第三阶段：加固优化

| 优先级 | 编号 | 问题 | 修复方案 | 工作量 |
|--------|------|------|----------|--------|
| P3 | SEC-L-03 | 双重校验维护负担 | 统一到 Zod 或统一常量 | 1h |
| P3 | SEC-L-04 | insensitive 搜索性能 | 添加 pg_trgm 索引 | 1h |

---

## 六、与 OWASP Top 10 (2021) 映射

| OWASP 编号 | 分类 | 本文件涉及 | 具体问题 |
|------------|------|-----------|----------|
| A01 | 失效的访问控制 | ✅ | SEC-M-01: 关联归属未验证 |
| A02 | 加密机制失败 | — | 不涉及（JWT 认证在中间件层处理） |
| A03 | 注入 | — | ✅ 已防御（Zod + Prisma 双重防护） |
| A04 | 不安全的设计 | ✅ | SEC-M-02: Zod schema 遗漏字段; SEC-M-03: 字符串匹配异常; SEC-L-01: 静默吞没; SEC-L-03: 双重校验 |
| A05 | 安全配置错误 | ✅ | SEC-L-02: scope 查询参数未校验; SEC-L-04: insensitive 搜索 |
| A06 | 过期组件 | — | 不涉及（需依赖审计） |
| A07 | 身份认证失败 | — | 不涉及（中间件层处理） |
| A08 | 软件和数据完整性失败 | — | ✅ 已防御（Zod schema + 显式请求对象） |
| A09 | 安全日志和监控不足 | ✅ | catch-all 未记录详细错误日志 |
| A10 | 服务端请求伪造 | — | 不涉及 |

---

## 七、与上一版（123 行）安全对比

| 安全维度 | 上一版（123 行） | 当前版（166 行） | 变化 |
|----------|-----------------|-----------------|------|
| getById 数据级权限 | ❌ 无数据级过滤 | ✅ userId + role 过滤 | 🔼 显著改善 |
| 输入验证 | ❌ 仅 truthy 检查 | ✅ Zod + 手动双重校验 | 🔼 显著改善 |
| 整数类型验证 | ❌ company_id/project_id 无验证 | ✅ Zod positiveInt + validateInteger | 🔼 显著改善 |
| 批量赋值防护 | ❌ req.body 整体传入 update | ✅ 显式 UpdateKnowledgeBaseRequest | 🔼 显著改善 |
| description 长度 | ❌ 无限制 | ✅ max(2000) | 🔼 改善 |
| 搜索长度 | ❌ 无限制 | ✅ 截断 100 字符 | 🔼 改善 |
| status 字段 | ✅ 可正常更新 | ❌ Zod schema 遗漏，静默失败 | 🔽 新引入问题 |
| 关联归属验证 | ❌ 未验证 | ❌ 未验证 | ➡️ 未变 |
| 异常检测方式 | ❌ 字符串匹配 | ❌ 字符串匹配 | ➡️ 未变 |
| 整体安全评级 | ⚠️ MEDIUM（中风险） | ✅ MEDIUM-LOW（中低风险） | 🔼 提升 |

---

## 八、评审结论

**判定: ✅ MEDIUM-LOW — 安全态势显著改善，需修复 schema 遗漏与归属校验**

### 核心改善

1. **三层纵深防御已建立**: 路由层 Zod 校验 → Controller 手动校验 → Service 业务逻辑，形成了完整的安全防御链
2. **getById 数据级权限已修复**: 消除了 IDOR 漏洞，admin 无法再遍历查看任意知识库
3. **输入验证全面覆盖**: Zod schema 在路由层拦截了类型混淆、超长字符串、非法枚举等攻击向量
4. **批量赋值已防御**: 显式构造 `UpdateKnowledgeBaseRequest` + Zod 自动剥离未知字段

### 需要关注的问题

1. **SEC-M-02（P1）**: `updateKnowledgeBaseSchema` 遗漏 `status` 字段，导致知识库启用/禁用功能静默失败 — 这是当前最紧急的问题
2. **SEC-M-01（P1）**: `company_id`/`project_id` 归属关系未验证，admin 可关联任意公司/项目
3. **SEC-M-03（P2）**: 字符串精确匹配的错误检测方式仍为脆弱设计，建议统一引入 `AppError` 异常体系

### 安全评分

| 维度 | 上一版评分 | 当前版评分 | 说明 |
|------|-----------|-----------|------|
| 认证与授权 | 7/10 | 9/10 | getById 数据级权限已修复 |
| 输入验证 | 4/10 | 9/10 | Zod + 手动双重防御 |
| 错误处理 | 7/10 | 7/10 | 仍为字符串匹配，未变 |
| 数据保护 | 5/10 | 7/10 | 批量赋值已防御，归属校验缺失 |
| 代码质量 | 7/10 | 8/10 | 代码结构清晰，但双重校验冗余 |
| **综合评分** | **6.0/10** | **8.0/10** | **显著改善** |

---

*代码安全专家评审完成 — 2026-05-24*
