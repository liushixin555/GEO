# apis/controller/knowledge-base.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 + API 安全 + 输入验证 + 信息泄露 + 权限控制）
**文件路径**: `apis/controller/knowledge-base.controller.ts`
**代码行数**: 123 行
**关联文件**: `apis/service/impl/knowledge-base.service.impl.ts`, `apis/utils/response.util.ts`, `apis/middleware/auth.middleware.ts`, `apis/app.ts`, `prisma/schema.prisma`
**安全评级**: ⚠️ MEDIUM（中风险 — 存在访问控制不一致与输入验证缺失，但无远程可利用的 CRITICAL 漏洞）

---

## 一、安全评价总览

从代码安全专家视角审视，`knowledge-base.controller.ts` 的整体安全态势为**中风险**。路由层已通过 `authMiddleware + roleMiddleware('sysadmin', 'admin')` 限制所有 5 个端点仅系统管理员和公司管理员可访问（见 `app.ts:178-182`），Prisma ORM 天然防止 SQL 注入。相比同项目的 `company.controller.ts`，本文件在错误处理上有明显改进：使用 `err: unknown` 而非 `err: any`，且 catch-all 返回通用消息而非 `err.message`。

但该文件仍存在以下安全隐患：

| OWASP 分类 | 安全风险 | 严重级别 | 状态 |
|------------|----------|----------|------|
| A01:2021 — 失效的访问控制 | `getById` 无数据级访问控制，admin 可查看任意知识库 | HIGH | ❌ 未修复 |
| A03:2021 — 注入 | 输入验证薄弱，缺少类型/格式/长度校验 | HIGH | ❌ 未修复 |
| A01:2021 — 失效的访问控制 | `company_id`/`project_id` 未验证归属关系，admin 可关联任意公司/项目 | MEDIUM | ❌ 未修复 |
| A08:2021 — 软件和数据完整性 | 解构后 `company_id`/`project_id` 未做整数验证 | MEDIUM | ❌ 未修复 |
| A04:2021 — 不安全的设计 | Service 异常通过字符串匹配检测（脆弱设计） | MEDIUM | ⚠️ 设计缺陷 |
| A05:2021 — 安全配置错误 | `description` 字段无长度限制，可存储超长文本 | LOW | ⚠️ 防御不足 |

---

## 二、安全漏洞详情

### SEC-H-01: `getById` 缺少数据级访问控制 — admin 可查看任意知识库（OWASP A01）

**严重级别**: HIGH
**位置**: 第 32-46 行（`getKnowledgeBase` 函数）
**OWASP 分类**: A01:2021 — Broken Access Control

```typescript
export async function getKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的知识库ID'); return; }

    const item = await knowledgeBaseService.getById(id);  // ❌ 无数据级权限检查
    success(res, item);
  } catch (err: unknown) { ... }
}
```

**攻击场景分析**:

`listKnowledgeBases` 在 Service 层实现了精细的数据级访问控制（`knowledge-base.service.impl.ts:62-88`）：
- admin 只能查看：`scope=platform` + 本公司 `scope=company` + 本项目 `scope=project`
- 但 `getKnowledgeBase` 完全跳过了这些过滤，直接按 ID 查询

```bash
# admin 用户遍历所有知识库 ID，获取不应看到的数据
for i in $(seq 1 100); do
  curl -s http://target/api/knowledge-bases/$i \
    -H "Authorization: Bearer <admin-token>" \
    -H "User-Agent: test-agent/1.0"
done
```

**影响评估**:
- **攻击者**: admin 角色用户（比 sysadmin 更多的用户群体）
- **攻击复杂度**: 低 — 简单的 ID 遍历
- **信息价值**: 其他公司的知识库详情（名称、描述、关联公司/项目信息）
- **与 list 的矛盾**: list 接口精心限制了可见范围，但 detail 接口完全绕过，形成安全策略不一致

**修复方案**:

在 Service 层 `getById` 方法中添加与 `list` 一致的访问控制逻辑：

```typescript
async getById(id: number, userId?: number, role?: string): Promise<KnowledgeBase> {
  const prisma = getPrisma();
  const item = await prisma.knowledgeBase.findFirst({
    where: { id },
    include: BASE_INCLUDE,
  });
  if (!item) throw new Error('知识库不存在');

  // 非系统管理员需要检查数据级访问权限
  if (role !== 'sysadmin' && userId) {
    if (item.scope === 'platform') {
      // platform 知识库所有人可查看（但需 status=true）
      // 注意：list 中 platform 知识库要求 status=true，getById 也应一致
    } else if (item.scope === 'company') {
      const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
      if (!user || user.companyId !== item.companyId) {
        throw new Error('知识库不存在');  // 返回 404 而非 403，避免信息泄露
      }
    } else if (item.scope === 'project') {
      const operator = await prisma.projectOperator.findFirst({
        where: { userId, projectId: item.projectId, deletedAt: null },
      });
      if (!operator) {
        throw new Error('知识库不存在');
      }
    }
  }

  return mapKnowledgeBase(item);
}
```

Controller 层也需要传递 `userId` 和 `role`：

```typescript
export async function getKnowledgeBase(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的知识库ID'); return; }

    const user = req.user;
    if (!user) { fail(res, 401, '未登录'); return; }
    const { userId, role } = user;
    const item = await knowledgeBaseService.getById(id, userId, role);
    success(res, item);
  } catch (err: unknown) { ... }
}
```

---

### SEC-H-02: 输入验证严重不足 — 缺少类型/格式/长度校验（OWASP A03）

**严重级别**: HIGH
**位置**: 第 48-71 行（createKnowledgeBase）、第 74-101 行（updateKnowledgeBase）
**OWASP 分类**: A03:2021 — Injection

```typescript
// createKnowledgeBase — 第 50-55 行
const { name, description, scope, company_id, project_id } = req.body;
if (!name) { fail(res, 400, '知识库名称不能为空'); return; }  // ❌ 仅 truthy 检查
if (!scope || !VALID_SCOPES.includes(scope)) { ... }           // ✓ scope 验证正确

// updateKnowledgeBase — 第 79-83 行
const { scope } = req.body;
if (scope !== undefined && !VALID_SCOPES.includes(scope)) { ... }  // ✓ scope 验证正确
```

**攻击向量分析**:

| 攻击向量 | 输入值 | 绕过验证 | 后果 |
|----------|--------|----------|------|
| 类型混淆 | `name: [1,2,3]` | truthy 检查通过 | Prisma 运行时错误 → 可能泄露数据库信息 |
| 超长字符串 | `name: "A".repeat(10000)` | 无长度限制 | Prisma 错误或数据库异常 |
| XSS 注入 | `name: "<script>alert(1)</script>"` | 无格式校验 | 存储型 XSS（若前端未转义） |
| description 注入 | `description: "A".repeat(100000)` | 完全无验证 | 超大文本写入数据库 |
| company_id 类型 | `company_id: "abc"` | 未验证整数类型 | Prisma 类型错误 |
| project_id 负数 | `project_id: -1` | 未验证范围 | Prisma RecordNotFound → 信息泄露 |

**PoC — 类型混淆攻击**:

```bash
# 发送数组作为 name
curl -X POST http://target/api/knowledge-bases \
  -H "Authorization: Bearer <admin-token>" \
  -H "User-Agent: test-agent/1.0" \
  -H "Content-Type: application/json" \
  -d '{"name": [1,2,3], "scope": "platform"}'

# Prisma 可能返回：Expected String, got [1,2,3] for field 'name' on model 'KnowledgeBase'
```

**PoC — 超长描述攻击**:

```bash
# 发送超大 description 测试存储限制
curl -X POST http://target/api/knowledge-bases \
  -H "Authorization: Bearer <admin-token>" \
  -H "User-Agent: test-agent/1.0" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"test\", \"scope\": \"platform\", \"description\": \"$(python3 -c 'print(\"A\"*100000)')\"}"
```

**修复方案**: 使用 Zod 进行严格的 schema 验证：

```typescript
import { z } from 'zod';

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1, '知识库名称不能为空').max(200, '知识库名称不能超过200个字符'),
  description: z.string().max(2000, '描述不能超过2000个字符').optional(),
  scope: z.enum(['platform', 'company', 'project']),
  company_id: z.number().int().positive().optional(),
  project_id: z.number().int().positive().optional(),
}).strict();

const updateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  scope: z.enum(['platform', 'company', 'project']).optional(),
  status: z.boolean().optional(),
  company_id: z.number().int().positive().optional(),
  project_id: z.number().int().positive().optional(),
}).strict();

// 在 Controller 中使用
const parsed = createKnowledgeBaseSchema.safeParse(req.body);
if (!parsed.success) {
  fail(res, 400, parsed.error.issues.map(i => i.message).join('; '));
  return;
}
```

---

### SEC-M-01: `company_id`/`project_id` 未验证归属关系 — admin 可关联任意公司/项目（OWASP A01）

**严重级别**: MEDIUM
**位置**: 第 48-71 行（createKnowledgeBase）、第 74-101 行（updateKnowledgeBase）
**OWASP 分类**: A01:2021 — Broken Access Control

```typescript
// createKnowledgeBase
const { name, description, scope, company_id, project_id } = req.body;
// ...
const item = await knowledgeBaseService.create(
  { name, description, scope, company_id, project_id },  // ❌ company_id/project_id 未验证归属
  userId
);
```

**攻击场景**:

```bash
# admin-A（属于公司1）创建知识库时关联到公司2
curl -X POST http://target/api/knowledge-bases \
  -H "Authorization: Bearer <admin-A-token>" \
  -H "User-Agent: test-agent/1.0" \
  -H "Content-Type: application/json" \
  -d '{"name": "恶意知识库", "scope": "company", "company_id": 2}'

# admin-A 甚至可以关联到不存在的项目
curl -X POST http://target/api/knowledge-bases \
  -H "Authorization: Bearer <admin-A-token>" \
  -H "User-Agent: test-agent/1.0" \
  -H "Content-Type: application/json" \
  -d '{"name": "恶意知识库", "scope": "project", "project_id": 9999}'
```

**影响分析**:
1. **数据完整性破坏**: 知识库可以关联到管理员无权访问的公司或项目
2. **信息混淆**: 其他公司的 admin 可能看到不属于他们的知识库
3. **权限提升路径**: 通过关联到其他公司的项目，可能间接获取该项目的知识库资源

**修复方案**: 在 Service 层添加归属关系验证：

```typescript
// create 方法中
if (request.scope === 'company' && request.company_id) {
  if (role !== 'sysadmin') {
    const user = await tx.user.findFirst({ where: { id: userId } });
    if (!user || user.companyId !== request.company_id) {
      throw new Error('无权关联该公司');
    }
  }
}

if (request.scope === 'project' && request.project_id) {
  if (role !== 'sysadmin') {
    const operator = await tx.projectOperator.findFirst({
      where: { userId, projectId: request.project_id, deletedAt: null },
    });
    if (!operator) {
      throw new Error('无权关联该项目');
    }
  }
}
```

---

### SEC-M-02: `company_id`/`project_id` 缺少整数类型验证（OWASP A08）

**严重级别**: MEDIUM
**位置**: 第 50 行（createKnowledgeBase）
**OWASP 分类**: A08:2021 — Software and Data Integrity Failures

```typescript
const { name, description, scope, company_id, project_id } = req.body;
// company_id 和 project_id 从 req.body 直接解构，类型为 any
// Service 层直接使用：companyId: request.company_id
```

与 `id` 参数（第 34、76、105 行）使用 `parseInt + isNaN` 严格验证不同，`company_id` 和 `project_id` 完全没有类型验证。

**攻击 PoC**:

```bash
# 发送非整数 company_id
curl -X POST http://target/api/knowledge-bases \
  -H "Authorization: Bearer <admin-token>" \
  -H "User-Agent: test-agent/1.0" \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "scope": "company", "company_id": "not-a-number"}'
```

**修复方案**: 在 Zod schema 中约束为 `z.number().int().positive()`，见 SEC-H-02 修复方案。

---

### SEC-M-03: Service 层异常通过字符串匹配 — 脆弱的安全检测（OWASP A04）

**严重级别**: MEDIUM
**位置**: 第 23-29、39-45、65-70、90-100、113-121 行（所有 5 个 catch 块）
**OWASP 分类**: A04:2021 — Insecure Design

```typescript
} catch (err: unknown) {
  if (err instanceof Error && err.message === '知识库不存在') {  // ❌ 脆弱的字符串精确匹配
    fail(res, 404, err.message);
  } else if (err instanceof Error && err.message === '只能修改自己创建的知识库') {
    fail(res, 403, err.message);
  } else {
    fail(res, 500, '更新知识库失败');  // ✓ 至少未泄露 err.message
  }
}
```

**安全影响**:

1. **维护风险**: 如果 Service 层修改错误消息（如改为 `"该知识库不存在"`），Controller 的匹配失效，业务异常被当作 500 返回
2. **覆盖不完整**: `updateKnowledgeBase` 的 catch 块需要匹配 4 种不同的错误消息，随着业务逻辑增长容易遗漏
3. **设计脆弱**: 字符串匹配是一种隐式契约，缺乏编译时保障

**相比 company.controller.ts 的改进**:
- ✓ 使用 `err: unknown` 而非 `err: any`
- ✓ catch-all 返回通用消息而非 `err.message`
- ✓ 使用 `instanceof Error` 进行类型窄化

**修复方案**: 引入类型安全的异常体系（与 company.controller.security.md 的 SEC-M-04 一致）：

```typescript
// apis/errors/index.ts
export class NotFoundError extends AppError {
  constructor(entity: string) {
    super(`${entity}不存在`, 404, 'NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403, 'FORBIDDEN');
  }
}

// Controller 统一错误处理
} catch (err: unknown) {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    logger.error('[KnowledgeBaseController] 未预期错误', err);
    fail(res, 500, '服务器内部错误');
  }
}
```

---

### SEC-M-04: `updateKnowledgeBase` 通过 `req.body` 整体传入 Service — 批量赋值风险

**严重级别**: MEDIUM
**位置**: 第 88 行
**OWASP 分类**: A08:2021 — Software and Data Integrity Failures

```typescript
const item = await knowledgeBaseService.update(id, req.body, userId, role);  // ❌ req.body 整体传入
```

与 `createKnowledgeBase`（第 60-62 行）显式解构不同，`updateKnowledgeBase` 直接将 `req.body` 传入 Service 层。

**攻击 PoC**:

```bash
# 注入额外字段
curl -X PUT http://target/api/knowledge-bases/1 \
  -H "Authorization: Bearer <admin-token>" \
  -H "User-Agent: test-agent/1.0" \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "createdBy": 999, "id": 0}'
```

**缓解因素**: Service 层通过显式字段检查 `if (request.name !== undefined)` 模式（第 156-182 行），仅更新已知字段，当前不存在实际的批量赋值漏洞。但这形成了**隐式安全依赖**。

**修复方案**: Controller 层显式构造更新请求对象：

```typescript
const updateRequest: UpdateKnowledgeBaseRequest = {
  name: req.body.name,
  description: req.body.description,
  scope: req.body.scope,
  status: req.body.status,
  company_id: req.body.company_id,
  project_id: req.body.project_id,
};
const item = await knowledgeBaseService.update(id, updateRequest, userId, role);
```

配合 Zod 的 `.strict()` 模式拒绝未定义字段。

---

### SEC-L-01: `description` 字段无长度限制

**严重级别**: LOW
**位置**: 第 50 行（createKnowledgeBase）
**OWASP 分类**: A05:2021 — Security Misconfiguration

```typescript
const { name, description, scope, company_id, project_id } = req.body;
// description 完全无验证，可传入任意长度字符串
```

**影响**: 攻击者可向 `description` 写入超长文本，可能导致：
1. 数据库存储膨胀（DoS 变体）
2. 列表查询性能下降（`contains: search, mode: 'insensitive'` 在超长文本上开销更大）

**修复方案**: 在 Zod schema 中添加 `z.string().max(2000)`。

---

### SEC-L-02: `listKnowledgeBases` 中 `search` 参数的 `insensitive` 模式可能影响性能

**严重级别**: LOW（性能/可用性风险）
**位置**: `knowledge-base.service.impl.ts:49`
**OWASP 分类**: A05:2021 — Security Misconfiguration

```typescript
// Service 层
where.OR = [
  { name: { contains: search, mode: 'insensitive' } },
  { description: { contains: search, mode: 'insensitive' } },
];
```

`insensitive` 模式在 PostgreSQL 中需要 `ILIKE` 或 `LOWER()` 函数，无法利用索引（除非创建专门的 `LOWER()` 函数索引）。如果 `knowledge_base` 表数据量大且搜索请求频繁，可能导致数据库负载过高。

**修复建议**: 考虑为 `name` 和 `description` 字段添加 PostgreSQL `pg_trgm` 碱引，或限制搜索长度：

```typescript
const search = typeof req.query.search === 'string'
  ? req.query.search.slice(0, 100)  // 限制搜索长度
  : undefined;
```

---

## 三、安全防御正面发现

| 防御措施 | 位置 | 评价 |
|----------|------|------|
| JWT 认证中间件 | `auth.middleware.ts` | ✓ 基于标准 JWT 库，token 过期处理正确 |
| 角色授权 — sysadmin + admin | `app.ts:178-182` | ✓ 所有 5 个端点均限制为 sysadmin/admin 角色 |
| Prisma 参数化查询 | `knowledge-base.service.impl.ts` | ✓ 天然防止 SQL 注入 |
| ID 参数验证 | 第 34、76、105 行 | ✓ `parseInt + isNaN` 模式一致执行 |
| Scope 验证 | 第 7、52-55、80-83 行 | ✓ `VALID_SCOPES` 常量 + `includes` 检查 |
| `err: unknown` 类型安全 | 所有 catch 块 | ✓ 比 company.controller.ts 的 `any` 有显著改进 |
| catch-all 通用错误消息 | 第 28、44、69、99、119 行 | ✓ 未泄露 `err.message`，返回通用消息 |
| 分页参数夹紧 | 第 11-13 行 | ✓ `Math.max(1, ...)` / `Math.min(100, Math.max(1, ...))` |
| 状态参数类型守卫 | 第 16 行 | ✓ `req.query.status === 'true'` 正确实现布尔解析 |
| 反爬虫中间件 | `anti-crawl.middleware.ts` | ✓ User-Agent 检查 + IP 频率限制 |
| 速率限制 | `rate-limit.middleware.ts` | ✓ 基于 `express-rate-limit` |
| 所有权检查（Service 层） | `knowledge-base.service.impl.ts:151-153` | ✓ 非 sysadmin 只能修改/删除自己创建的知识库 |
| 软删除 | `knowledge-base.service.impl.ts:202` | ✓ 使用 `deletedAt` 而非物理删除 |
| 无 console.log | 整个文件 | ✓ 生产代码无调试输出 |

---

## 四、攻击面总结

```
┌──────────────────────────────────────────────────────────────────┐
│                     攻击面分析图                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  攻击者 (sysadmin / admin)                                       │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────────────┐                                        │
│  │ JWT Auth ✅          │ ← 已防御                                │
│  │ Role: sysadmin/admin │ ← 已防御                                │
│  │ Rate Limit ✅        │ ← 已防御                                │
│  │ Anti-Crawl ✅        │ ← 已防御                                │
│  └──────────┬───────────┘                                        │
│             ▼                                                    │
│  ┌──────────────────────┐                                        │
│  │ Controller           │                                        │
│  │                      │                                        │
│  │ ❌ getById 无数据级   │ ← SEC-H-01: admin 可查看任意知识库      │
│  │    访问控制           │                                        │
│  │ ❌ 输入验证薄弱       │ ← SEC-H-02: 类型/格式/长度未校验        │
│  │ ❌ 关联归属未验证     │ ← SEC-M-01: company_id/project_id     │
│  │ ❌ 整数类型未验证     │ ← SEC-M-02: company_id/project_id     │
│  │ ❌ req.body 整体传入  │ ← SEC-M-04: update 批量赋值风险        │
│  │ ✓ err: unknown       │                                        │
│  │ ✓ 通用错误消息        │                                        │
│  │ ✓ Scope 验证         │                                        │
│  └──────────┬───────────┘                                        │
│             ▼                                                    │
│  ┌──────────────────────┐                                        │
│  │ Service Layer        │                                        │
│  │                      │                                        │
│  │ ✓ 所有权检查         │ ← update/delete 只能操作自己的          │
│  │ ✓ 软删除             │                                        │
│  │ ✓ Scope 业务逻辑     │                                        │
│  │ ⚠️ 字符串匹配异常    │ ← SEC-M-03: 脆弱的错误检测             │
│  └──────────┬───────────┘                                        │
│             ▼                                                    │
│  ┌──────────────────────┐                                        │
│  │ Prisma / Database    │                                        │
│  │                      │                                        │
│  │ ✓ 参数化查询         │ ← SQL 注入已防御                        │
│  │ ✓ 显式字段赋值       │ ← 当前无批量赋值                        │
│  └──────────────────────┘                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 五、修复优先级与工作量估算

### 第一阶段：紧急修复（0.5 天）

| 优先级 | 编号 | 问题 | 修复方案 | 工作量 |
|--------|------|------|----------|--------|
| P1 | SEC-H-01 | getById 无数据级访问控制 | Service 层添加权限过滤 | 2h |
| P1 | SEC-H-02 | 输入验证不足 | 引入 Zod schema | 2h |
| P1 | SEC-M-04 | update 批量赋值风险 | Controller 显式构造请求对象 | 0.5h |

### 第二阶段：短期改进（1 天）

| 优先级 | 编号 | 问题 | 修复方案 | 工作量 |
|--------|------|------|----------|--------|
| P2 | SEC-M-01 | 关联归属未验证 | Service 层添加归属校验 | 2h |
| P2 | SEC-M-02 | 整数类型未验证 | Zod schema 约束 | 0.5h（含在 SEC-H-02） |
| P2 | SEC-M-03 | 异常检测脆弱 | 引入 AppError 异常体系 | 3h |

### 第三阶段：加固优化

| 优先级 | 编号 | 问题 | 修复方案 | 工作量 |
|--------|------|------|----------|--------|
| P3 | SEC-L-01 | description 无长度限制 | Zod max(2000) | 0.5h（含在 SEC-H-02） |
| P3 | SEC-L-02 | search insensitive 性能 | 添加 pg_trgm 索引 | 1h |

---

## 六、与 OWASP Top 10 (2021) 映射

| OWASP 编号 | 分类 | 本文件涉及 | 具体问题 |
|------------|------|-----------|----------|
| A01 | 失效的访问控制 | ✅ | SEC-H-01: getById 无数据级权限; SEC-M-01: 关联归属未验证 |
| A02 | 加密机制失败 | — | 不涉及（JWT 认证在中间件层处理） |
| A03 | 注入 | ✅ | SEC-H-02: 输入验证不足 |
| A04 | 不安全的设计 | ✅ | SEC-M-03: 字符串匹配异常检测 |
| A05 | 安全配置错误 | ✅ | SEC-L-01: description 无长度限制; SEC-L-02: insensitive 搜索 |
| A06 | 过期组件 | — | 不涉及（需依赖审计） |
| A07 | 身份认证失败 | — | 不涉及（中间件层处理） |
| A08 | 软件和数据完整性失败 | ✅ | SEC-M-02: 整数类型未验证; SEC-M-04: 批量赋值风险 |
| A09 | 安全日志和监控不足 | ✅ | catch-all 未记录详细错误日志 |
| A10 | 服务端请求伪造 | — | 不涉及 |

---

## 七、与 company.controller.ts 安全对比

| 安全维度 | company.controller.ts | knowledge-base.controller.ts | 评价 |
|----------|----------------------|------------------------------|------|
| 错误类型 | `err: any` ❌ | `err: unknown` ✓ | 改进显著 |
| 错误泄露 | `err.message \|\| '...'` 直接返回 ❌ | 通用消息 ✓ | 改进显著 |
| 数据级权限 | sysadmin only（无此问题） | admin 可访问 → 缺少数据级过滤 ❌ | 新风险 |
| 输入验证 | 仅 truthy 检查 ❌ | 仅 truthy 检查 ❌ | 持平 |
| 批量赋值 | req.body 整体传入 ❌ | create 显式解构 ✓ / update 整体传入 ❌ | 部分改进 |
| Scope 验证 | 不涉及 | VALID_SCOPES 常量 ✓ | 良好实践 |

---

## 八、评审结论

**判定: ⚠️ 中风险 — 需要修复但无立即阻断性安全漏洞**

### 核心风险摘要

1. **访问控制不一致（SEC-H-01）** — 最高优先级。`list` 接口实现了精细的数据级访问控制，但 `getById` 完全跳过，admin 可通过 ID 遍历查看任意知识库详情。这是最严重的设计缺陷。
2. **输入验证缺失（SEC-H-02）** — 无类型、格式、长度校验，依赖 Prisma 的隐式防御。与 company.controller.ts 同样的问题。
3. **关联归属未验证（SEC-M-01）** — admin 可在创建/更新知识库时关联到无权访问的公司或项目。

### 风险缓解因素

- 所有端点限制为 sysadmin/admin 角色，view 角色无法访问
- Prisma ORM 防止 SQL 注入
- Service 层有所有权检查（update/delete）
- `err: unknown` + 通用错误消息防止信息泄露
- React 框架默认转义 HTML（但不应依赖前端防御）

### 建议

- **立即**: 修复 SEC-H-01（getById 数据级访问控制），消除访问控制不一致
- **短期**: 引入 Zod 验证（SEC-H-02）和统一异常体系（SEC-M-03）
- **长期**: 建立项目级安全编码规范，确保所有 Controller 遵循统一的输入验证和错误处理模式

---

*代码安全专家评审完成 — 2026-05-24*
