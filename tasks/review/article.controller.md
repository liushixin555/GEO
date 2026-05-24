# apis/controller/article.controller.ts — 代码安全专家评审报告

**评审日期**: 2026-05-23
**评审角色**: 代码安全专家（OWASP Top 10 + 认证授权 + 注入防护 + 数据泄露 + 输入验证）
**文件路径**: `apis/controller/article.controller.ts`
**代码行数**: 426 行
**关联文件**: `apis/service/impl/article.service.impl.ts`, `apis/service/impl/project.service.impl.ts`, `apis/middleware/auth.middleware.ts`, `apis/app.ts`
**严重级别**: CRITICAL(2) / HIGH(4) / MEDIUM(5) / LOW(4)

---

## 一、安全评价总览

文章控制器包含 9 个 HTTP 端点处理函数，处理文章的 CRUD、审核、AI 生成和版本查询等核心业务。从安全视角审视，该文件存在 **输入验证不足、权限控制缺陷、信息泄露风险、请求体无限制** 四大安全问题。

虽然 Express 中间件链提供了 JWT 认证 + 角色检查 + 速率限制 + anti-crawl 基础防护，但控制器内部的安全防护层存在多处漏洞。

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| 认证与授权 | 5/10 | JWT 基础认证存在，但控制器内部授权逻辑存在绕过风险 |
| 输入验证 | 3/10 | 仅做了 ID 解析检查，请求体字段无 schema 验证 |
| 注入防护 | 6/10 | 使用 Prisma ORM 防止 SQL 注入，但存在 NoSQL/JSON 注入风险 |
| 数据泄露 | 4/10 | 500 错误返回 `err.message` 可能泄露内部实现细节 |
| CSRF/点击劫持 | 7/10 | helmet + CORS 配置较好，API 场景下风险较低 |
| 拒绝服务 | 3/10 | 请求体大小和字段无限制，存在资源滥用风险 |
| 审计追踪 | 5/10 | 有操作日志基础，但缺少安全事件日志 |

---

## 二、问题清单

### CRITICAL-1: `updateArticle` 请求体无白名单过滤，允许任意字段注入

**位置**: 第 114-168 行 `updateArticle` 函数

```typescript
// 第 159 行: req.body 直接传递给 service
const item = await articleService.update(id, req.body, userId, role);
```

**问题**: `req.body` 未经过任何字段白名单过滤，直接传递给 `articleService.update()`。攻击者可以在请求体中注入任意字段：

```json
{
  "title": "正常标题",
  "id": 999,
  "projectId": 1,
  "createdBy": 2,
  "status": "published",
  "version": 1
}
```

查看 `article.service.impl.ts` 第 87-100 行，update 方法会逐一检查字段并赋值：

```typescript
if (request.title !== undefined) data.title = request.title;
// ... 但没有对 request 的 key 做白名单限制
```

虽然 Prisma `update` 只会更新 `data` 对象中存在的字段，且 `where` 使用了固定 `id`，但 **status 字段可以通过此漏洞被任意修改**（第 97 行 `if (request.status !== undefined) data.status = request.status`），攻击者可以绕过状态机直接将文章设置为任意状态（如 `published`），**完全绕过审核流程**。

**影响**: 严重 — 攻击者可以绕过业务规则，直接修改文章状态、伪造创建者、篡改版本号等。

**建议**:

```typescript
// 方案: 控制器层做字段白名单过滤
export async function updateArticle(req: Request, res: Response): Promise<void> {
  // 白名单提取，丢弃非法字段
  const allowedFields = ['title', 'article_type', 'write_mode', 'keywords',
                         'portrait', 'images', 'platforms', 'skills',
                         'llm_model_id', 'content', 'status', 'scheduled_publish_at'];
  const body: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      body[key] = req.body[key];
    }
  }

  // ...后续使用 body 替代 req.body
  const item = await articleService.update(id, body as UpdateArticleRequest, userId, role);
}
```

**更好的方案**: 使用 Zod schema 验证（同时解决类型安全和输入验证）：

```typescript
import { z } from 'zod';

const updateArticleSchema = z.object({
  title: z.string().max(500).optional(),
  article_type: z.string().max(50).optional(),
  keywords: z.string().max(2000).optional(),
  content: z.string().max(500000).optional(),
  status: z.enum(['draft', 'generating']).optional(), // 仅允许合法的状态转换
  // ... 其他字段
}).strict(); // strict() 拒绝未定义的字段

const validated = updateArticleSchema.parse(req.body);
```

---

### CRITICAL-2: `updateArticle` 中 status 状态转换未做合法性校验，可绕过审核流程

**位置**: 第 145-161 行

```typescript
// 第 146-149 行: 仅检查当前状态是否为 draft（设置编辑）
if (!SETTINGS_EDITABLE_STATUSES.includes(existing.status)) {
  fail(res, 400, '当前文章状态不可编辑');
  return;
}

// 第 152-157 行: 仅检查目标状态是否为 generating
const targetStatus = req.body.status;
if (targetStatus && targetStatus === 'generating') {
  const item = await articleService.update(id, { ...req.body, status: 'generating' }, userId, role);
  success(res, item, '已提交AI生成');
  return;
}

// 第 159 行: 其他状态直接传递给 service！
const item = await articleService.update(id, req.body, userId, role);
```

**问题**: 状态转换逻辑存在以下安全漏洞：

1. **非 generating 状态的转换未校验**: 第 159 行的 `update` 调用会将 `req.body.status`（如果存在）直接传递给 service，可以设置为任意状态值（如 `published`、`publishing`）
2. **状态校验顺序错误**: 先检查了"当前状态是否 draft"（第 146 行），但 generating 转换路径绕过了这个检查（第 153 行的 `targetStatus === 'generating'` 分支在编辑性检查之后，但在 draft 检查之后仍可能被利用）
3. **Service 层也不校验状态转换合法性**: `article.service.impl.ts` 第 97 行直接赋值 `data.status = request.status`

**攻击场景**: 攻击者（admin 角色）发送：

```json
PUT /api/projects/1/articles/5
{ "status": "published" }
```

虽然当前状态检查会阻止非 draft 文章的编辑，但如果文章处于 draft 状态，此请求会绕过审核流程直接将文章标记为 published。

**建议**: 引入状态机定义，所有状态转换必须通过白名单校验：

```typescript
// 定义合法的状态转换规则
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'draft':            ['generating', 'manual_writing'],
  'manual_writing':   ['pending_review'],
  'generate_failed':  ['generating'],
  'publish_failed':   ['publishing'],
  'pending_review':   ['publishing', 'draft', 'manual_writing'],
};

function isValidStatusTransition(from: string, to: string): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// 在 updateArticle 中使用:
if (targetStatus && !isValidStatusTransition(existing.status, targetStatus)) {
  fail(res, 400, '非法的状态转换');
  return;
}
```

---

### HIGH-1: `createArticle` 请求体无 schema 验证

**位置**: 第 84-112 行 `createArticle` 函数

```typescript
// 第 89-93 行: 仅校验了 status 字段
const { status } = req.body;
if (status && !['draft', 'manual_writing', 'generating'].includes(status)) {
  fail(res, 400, '无效的初始状态');
  return;
}

// 第 107 行: req.body 整体传递
const item = await articleService.create(projectId, req.body, userId);
```

**问题**:
1. **无字段白名单**: 攻击者可以注入 `id`、`createdBy`、`version`、`updatedAt` 等本应由系统控制的字段
2. **无类型验证**: `title`、`keywords`、`content` 等字段可以是任意类型（数组、对象），可能导致数据库写入异常或下游处理错误
3. **无长度限制**: `content` 字段可以传入超大数据（如 100MB 字符串），虽然有 `express.json({ limit: '10mb' })` 全局限制，但 10MB 对单篇文章内容仍然过大
4. **无格式验证**: `images`、`platforms` 应该是字符串数组，但未验证

**建议**: 使用 Zod 定义完整的创建请求 schema：

```typescript
const createArticleSchema = z.object({
  title: z.string().max(500).optional(),
  article_type: z.string().max(50).optional(),
  write_mode: z.enum(['manual', 'ai']).optional(),
  keywords: z.string().max(2000).optional(),
  portrait: z.string().max(5000).optional(),
  images: z.array(z.string().max(500)).max(20).optional(),
  platforms: z.array(z.string().max(100)).max(10).optional(),
  skills: z.number().int().positive().optional(),
  llm_model_id: z.number().int().positive().optional(),
  content: z.string().max(500000).optional(),
  status: z.enum(['draft', 'manual_writing', 'generating']).optional(),
}).strict();
```

---

### HIGH-2: `reviewArticle` 缺少审核权限隔离 — 创建者可审核自己的文章

**位置**: 第 268-307 行 `reviewArticle` 函数

```typescript
export async function reviewArticle(req: Request, res: Response): Promise<void> {
  // ... 参数校验 ...

  const { userId, role } = req.user!;
  const existing = await articleService.getById(id, userId, role);

  // ... 项目归属和操作员检查 ...

  // ❌ 没有检查审核者是否与创建者相同！
  const item = await articleService.review(id, approved, userId, role);
  success(res, item, approved ? '审核通过' : '审核不通过');
}
```

**问题**: 文章创建者可以审核自己提交的文章。这违反了基本的 **职责分离（Segregation of Duties）** 原则。虽然 `sysadmin` 角色可能需要此能力，但 `admin` 角色的用户不应同时是文章的创建者和审核者。

**影响**: 内部人员可以自行创建文章并审核通过，绕过审核流程。

**建议**:

```typescript
// 添加创建者/审核者分离检查
if (role !== 'sysadmin' && existing.created_by === userId) {
  fail(res, 403, '不能审核自己创建的文章');
  return;
}
```

---

### HIGH-3: 错误响应泄露内部实现细节

**位置**: 多个 catch 块

```typescript
// 第 44-46 行
} catch (err: any) {
  fail(res, 500, err.message || '获取文章列表失败');
}

// 第 109-111 行
} catch (err: any) {
  fail(res, 500, err.message || '创建文章失败');
}

// 第 161-167 行
} catch (err: any) {
  if (err.message === '文章不存在') {
    fail(res, 404, err.message);
  } else {
    fail(res, 500, err.message || '更新文章失败');
  }
}
```

**问题**:
1. **`err.message` 直接返回客户端**: 500 错误的 `err.message` 可能包含数据库错误、Prisma 内部错误、堆栈信息片段等敏感信息。例如 Prisma 的 `P2002` 错误可能暴露数据库约束名称。
2. **`catch (err: any)` 类型不安全**: 使用 `any` 类型绕过了 TypeScript 的类型检查，且没有对 error 进行类型窄化。
3. **错误消息可枚举**: 通过不同输入触发不同的错误消息，攻击者可以探测系统内部逻辑。

**建议**:

```typescript
// 安全的错误处理模式
import { Prisma } from '@prisma/client';

} catch (err: unknown) {
  // 记录完整错误到服务器日志
  logger.error('Article operation failed', { error: err, userId, articleId: id });

  // 对客户端返回通用消息
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    fail(res, 500, '操作失败，请稍后重试');
  } else if (err instanceof Error && err.message === '文章不存在') {
    fail(res, 404, err.message);
  } else {
    fail(res, 500, '操作失败'); // 不泄露 err.message
  }
}
```

---

### HIGH-4: `updateArticleContent` 无 content 大小限制

**位置**: 第 170-218 行 `updateArticleContent` 函数

```typescript
const { content } = req.body;
if (typeof content !== 'string') { fail(res, 400, 'content参数无效'); return; }
// ❌ 无长度限制检查
const item = await articleService.update(id, { content }, userId, role);
```

**问题**: 虽然全局有 `express.json({ limit: '10mb' })` 限制，但单篇文章的 `content` 字段没有独立的大小限制。攻击者可以：
1. 发送接近 10MB 的 content，导致数据库写入大量数据
2. 通过大量请求消耗数据库存储
3. 触发 `articleVersion` 版本快照的级联膨胀（每次更新都会创建版本记录，参见 `article.service.impl.ts` 第 115-123 行）

**建议**:

```typescript
const MAX_CONTENT_LENGTH = 500_000; // 500KB

const { content } = req.body;
if (typeof content !== 'string') { fail(res, 400, 'content参数无效'); return; }
if (content.length > MAX_CONTENT_LENGTH) {
  fail(res, 400, `正文内容不能超过${MAX_CONTENT_LENGTH / 1000}KB`);
  return;
}
```

---

### MEDIUM-1: `deleteArticle` 使用软删除但无恢复机制，存在不可逆操作风险

**位置**: 第 220-266 行

```typescript
await articleService.delete(id, userId, role);
success(res, null, '删除文章成功');
```

**问题**:
1. **无二次确认**: 删除操作通过单一 HTTP 请求完成，没有要求确认步骤
2. **无审计日志**: 删除操作仅由 service 层设置 `deletedAt` 字段，没有记录谁在什么时间删除了什么
3. **无恢复接口**: 软删除后没有提供恢复端点，如果误删需要直接操作数据库

**建议**: 添加审计日志记录：

```typescript
await articleService.delete(id, userId, role);
logger.info('Article deleted', { articleId: id, projectId, operatorId: userId, role });
```

---

### MEDIUM-2: `listArticles` 分页参数无上限限制

**位置**: 第 25-26 行

```typescript
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
```

**问题**:
1. `pageSize` 无上限：攻击者可以设置 `pageSize=100000`，一次请求拉取大量数据，消耗数据库和内存资源
2. `page` 无下限验证：负数或 0 会导致 Prisma `skip` 产生负值
3. 无类型检查：`req.query.page` 可能是数组（如 `?page=1&page=2`），`parseInt` 会取第一个元素

**建议**:

```typescript
const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
```

---

### MEDIUM-3: `regenerateArticle` 和 `reviewArticle` 缺少所有权检查

**位置**: 第 309-345 行 `regenerateArticle`

```typescript
export async function regenerateArticle(req: Request, res: Response): Promise<void> {
  // ... 参数和项目归属校验 ...

  // Admin 操作员检查 ✓
  if (role === 'admin') {
    await checkProjectOperator(projectId, userId, role);
  }

  // ❌ 没有检查操作者是否是文章创建者！
  // 任何 admin 角色的项目操作员都可以重新生成任意文章
  const item = await articleService.regenerate(id, userId, role);
}
```

**问题**: `regenerateArticle` 不检查操作者是否是文章创建者。同项目的其他 admin 操作员可以触发文章的 AI 重新生成，可能覆盖原作者的内容。同理，`reviewArticle` 也缺少此检查（见 HIGH-2）。

而 `updateArticle`（第 140-143 行）和 `deleteArticle`（第 246-249 行）都有创建者检查，但 `regenerate` 和 `review` 没有，存在 **权限检查不一致** 的问题。

**建议**: 统一所有写操作的权限检查策略，明确哪些操作需要创建者权限，哪些只需要项目操作员权限。

---

### MEDIUM-4: `req.user!` 非空断言可能导致不明确的错误响应

**位置**: 第 30, 56, 95, 121, 180, 227, 278, 317, 355 行（共 9 处）

```typescript
const { userId, role } = req.user!;
```

**问题**: 非空断言 `!` 在 TypeScript 层面假定 `req.user` 已被 auth 中间件赋值。但如果路由配置错误（中间件未挂载），运行时会抛出 `TypeError: Cannot destructure property 'userId' of undefined`。这个错误会被 catch 块捕获，返回 500 错误和 `err.message`，泄露了内部变量名。

**建议**: 使用防御性检查：

```typescript
if (!req.user) {
  fail(res, 401, '未认证');
  return;
}
const { userId, role } = req.user;
```

---

### MEDIUM-5: `checkProjectOperator` 的错误通过 try-catch 吞没，信息丢失

**位置**: 第 12-18 行 + 多处调用

```typescript
async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new Error('无权操作该项目');
  }
}
```

调用方：

```typescript
try {
  await checkProjectOperator(projectId, userId, role);
} catch {
  fail(res, 403, '无权操作该项目');
  return;
}
```

**问题**:
1. **`catch` 块吞没所有异常**: 如果 `projectService.getById()` 抛出数据库错误，也会被捕获并返回 403，掩盖了真实的 500 错误
2. **安全事件丢失**: 权限拒绝事件没有被记录，无法追踪潜在的攻击行为

**建议**:

```typescript
// 方案: 区分权限拒绝和系统错误
try {
  await checkProjectOperator(projectId, userId, role);
} catch (err) {
  if (err instanceof Error && err.message === '无权操作该项目') {
    logger.warn('Project access denied', { projectId, userId, role });
    fail(res, 403, '无权操作该项目');
  } else {
    throw err; // 重新抛出非权限错误，由外层 catch 处理
  }
  return;
}
```

---

### LOW-1: `search` 参数未做 HTML/XSS 清理

**位置**: 第 27 行

```typescript
const search = req.query.search as string | undefined;
```

**问题**: 搜索关键词直接传递给 `articleService.list()`，虽然 Prisma 的 `contains` 查询会参数化处理防止 SQL 注入，但如果搜索结果被前端以不安全方式渲染（如 `dangerouslySetInnerHTML`），可能导致反射型 XSS。不过风险较低，因为后端返回的是 JSON 数据。

**建议**: 对搜索参数做基本清理：

```typescript
const search = typeof req.query.search === 'string'
  ? req.query.search.trim().slice(0, 200)
  : undefined;
```

---

### LOW-2: 缺少 CSRF Token 机制

**位置**: 全局（虽然不是 controller 特定问题）

**问题**: API 使用 Bearer Token 认证，不依赖 Cookie，因此 CSRF 风险较低。但如果前端将 token 存储在 localStorage 中（根据 CLAUDE.md 描述），且存在 XSS 漏洞，攻击者可以窃取 token 发起跨站请求。

**建议**: 这是全局性问题，建议：
1. 确保所有输入输出都做 XSS 清理
2. 考虑使用 `httpOnly` Cookie 替代 localStorage 存储 token
3. 添加自定义请求头验证（如 `X-Requested-With`）

---

### LOW-3: 魔法字符串角色和状态值未使用常量

**位置**: 多处

```typescript
if (role === 'sysadmin')  // 第 13, 140, 198, 246 行
if (role === 'admin')     // 第 33, 65, 98, 130, 188, 237, 288, 326, 362, 408 行
```

**问题**: 角色字符串硬编码，如果 Prisma schema 中的 Role enum 值变更，需要手动查找所有字符串。更重要的是，拼写错误不会在编译时被捕获。

**建议**:

```typescript
import { Role, ArticleStatus } from '@prisma/client';
if (role === Role.sysadmin) { /* ... */ }
```

---

### LOW-4: `parseInt` 未指定基数的潜在问题

**位置**: 第 22, 25, 26, 28 行等

```typescript
const projectId = parseInt(req.params.projectId as string, 10);  // ✓ 指定了 10
const page = parseInt(req.query.page as string) || 1;             // ❌ 未指定基数
```

**问题**: 部分解析未指定基数（第 25, 26 行），虽然 `parseInt` 默认基数为 10，但如果输入以 `0x` 开头可能被解析为十六进制。

**建议**: 统一使用 `parseInt(value, 10)`。

---

## 三、安全问题汇总矩阵

| 编号 | 严重级别 | 问题 | CWE 编号 | OWASP 分类 |
|------|----------|------|----------|------------|
| CRITICAL-1 | CRITICAL | 请求体无白名单过滤 | CWE-915 | A01:2021 Broken Access Control |
| CRITICAL-2 | CRITICAL | 状态转换未校验，可绕过审核 | CWE-863 | A01:2021 Broken Access Control |
| HIGH-1 | HIGH | 创建请求无 schema 验证 | CWE-20 | A03:2021 Injection |
| HIGH-2 | HIGH | 审核缺少职责分离 | CWE-272 | A01:2021 Broken Access Control |
| HIGH-3 | HIGH | 错误响应泄露内部信息 | CWE-209 | A05:2021 Security Misconfiguration |
| HIGH-4 | HIGH | Content 无大小限制 | CWE-770 | A05:2021 Security Misconfiguration |
| MEDIUM-1 | MEDIUM | 删除无审计日志 | CWE-778 | A09:2021 Security Logging Failures |
| MEDIUM-2 | MEDIUM | 分页参数无上限 | CWE-770 | A05:2021 Security Misconfiguration |
| MEDIUM-3 | MEDIUM | 权限检查不一致 | CWE-863 | A01:2021 Broken Access Control |
| MEDIUM-4 | MEDIUM | 非空断言掩盖认证缺失 | CWE-754 | A07:2021 Identification/Auth Failures |
| MEDIUM-5 | MEDIUM | 权限异常被吞没 | CWE-390 | A09:2021 Security Logging Failures |
| LOW-1 | LOW | 搜索参数未清理 | CWE-79 | A03:2021 Injection |
| LOW-2 | LOW | 无 CSRF Token | CWE-352 | A01:2021 Broken Access Control |
| LOW-3 | LOW | 魔法字符串未用常量 | CWE-1068 | A05:2021 Security Misconfiguration |
| LOW-4 | LOW | parseInt 未指定基数 | CWE-1047 | A05:2021 Security Misconfiguration |

---

## 四、安全加固路线图

### 立即修复（阻断攻击路径）

1. **CRITICAL-1 + CRITICAL-2**: 引入 Zod schema 验证 + 状态机白名单 — 阻止任意字段注入和状态绕过
2. **HIGH-3**: 错误响应统一处理，500 错误不返回 `err.message`

### 短期加固（1-2 周内）

3. **HIGH-1**: `createArticle` 添加完整的 Zod schema 验证
4. **HIGH-2**: `reviewArticle` 添加创建者/审核者分离检查
5. **HIGH-4**: `content` 字段添加大小限制
6. **MEDIUM-5**: 区分权限拒绝和系统错误，重新抛出非权限异常

### 中期加固（1 个月内）

7. **MEDIUM-1**: 添加安全审计日志（谁在什么时候做了什么）
8. **MEDIUM-2**: 分页参数添加上下限限制
9. **MEDIUM-3**: 统一所有写操作的权限检查策略
10. **MEDIUM-4**: 替换 `req.user!` 为防御性检查

### 长期改进

11. **LOW-1~4**: 搜索参数清理、CSRF 防护、常量替换、parseInt 规范化

---

## 五、推荐的 Zod Schema 定义

```typescript
import { z } from 'zod';

// 共享字段定义
const articleFields = {
  title: z.string().max(500).optional(),
  article_type: z.string().max(50).optional(),
  write_mode: z.enum(['manual', 'ai']).optional(),
  keywords: z.string().max(2000).optional(),
  portrait: z.string().max(5000).optional(),
  images: z.array(z.string().url().max(500)).max(20).optional(),
  platforms: z.array(z.string().max(100)).max(10).optional(),
  skills: z.number().int().positive().optional(),
  llm_model_id: z.number().int().positive().optional(),
  content: z.string().max(500_000).optional(),
};

// 创建 schema
export const createArticleSchema = z.object({
  ...articleFields,
  status: z.enum(['draft', 'manual_writing', 'generating']).default('draft'),
}).strict();

// 更新 schema — status 仅允许安全的状态值
export const updateArticleSchema = z.object({
  ...articleFields,
  status: z.enum(['generating']).optional(), // 仅允许从 draft 转为 generating
  scheduled_publish_at: z.string().datetime().nullable().optional(),
}).strict();

// 内容更新 schema
export const updateContentSchema = z.object({
  content: z.string().min(1).max(500_000),
}).strict();

// 审核schema
export const reviewArticleSchema = z.object({
  approved: z.boolean(),
}).strict();
```

---

## 六、总结

该控制器的核心安全风险集中在 **输入验证缺失** 和 **权限控制不完整** 两个维度：

1. **最紧急**: `updateArticle` 的请求体无白名单过滤（CRITICAL-1）和状态转换无校验（CRITICAL-2），这两个问题组合使用可以绕过整个审核流程
2. **影响面最广**: 所有 9 个端点都存在 `err.message` 直接返回客户端的问题（HIGH-3），可能泄露数据库结构和内部逻辑
3. **最易修复**: 添加 Zod schema 验证可以在一个 PR 中解决 CRITICAL-1、CRITICAL-2、HIGH-1、HIGH-4 四个问题

**安全加固优先级**: CRITICAL-1 + CRITICAL-2 > HIGH-3 > HIGH-1 > HIGH-2 > HIGH-4 > MEDIUM > LOW

---

## 七、Committer 审核意见

**审核日期**: 2026-05-23
**审核角色**: 代码 Committer 审核专家（代码准入 + 架构一致性 + 工程质量 + 评审质量校验）
**审核对象**: 上述代码安全专家评审报告 + `apis/controller/article.controller.ts` 源码

---

### 7.1 评审报告质量评估

安全专家的评审报告覆盖面广， CWE 编号和 OWASP 分类准确，修复建议（Zod schema + 状态机）具有实操性。但以下几处需要修正或补充：

| 评审编号 | 评审结论 | Committer 校验结果 |
|----------|----------|-------------------|
| CRITICAL-1 | 请求体无白名单过滤 | **部分同意** — service 层 `update()` (article.service.impl.ts:87-100) 仅处理 11 个显式映射字段，未映射的字段被 Prisma 忽略，不会写入数据库。实际风险比描述的低。但 `status` 字段确实可被注入，因此核心风险成立，维持 CRITICAL 级别 |
| CRITICAL-2 | 状态转换未校验 | **完全同意** — 经验证：draft 状态的文章可通过 `PUT /api/projects/:id/articles/:id` + `{"status":"published"}` 绕过审核流程直达 published。service 层第 97 行 `data.status = request.status` 无条件赋值。这是最紧急的阻断级漏洞 |
| HIGH-1 | 创建请求无 schema 验证 | **同意，但建议降为 MEDIUM** — service 层 `create()` (article.service.impl.ts:47-63) 显式映射了所有字段，多余的 req.body 属性被忽略。实际影响是类型错误和缺少业务级长度限制，而非任意字段注入 |
| HIGH-2 | 审核缺少职责分离 | **同意** — 创建者可审核自己的文章，违反 SoD 原则。但需确认业务需求：小团队场景下 admin 既是创建者也是审核者可能是产品有意设计。建议与产品确认后再决定修复优先级 |
| HIGH-3 | 错误响应泄露内部信息 | **完全同意** — 500 错误返回 `err.message` 是全局问题，影响所有 9 个端点。Prisma 错误可能暴露表名、字段名、约束名 |
| HIGH-4 | Content 无大小限制 | **同意** — 全局 10MB 限制 (app.ts:56) 提供基础防护，但版本快照机制 (service 层第 115-123 行) 会级联放大存储压力 |
| MEDIUM-1~5 | 各种中低级问题 | **同意** — 分析准确，建议合理 |

### 7.2 补充发现（安全评审未覆盖的问题）

#### 补充-1: `updateArticle` 中 `generating` 分支绕过了内容更新版本记录

**位置**: article.controller.ts:152-157

```typescript
if (targetStatus && targetStatus === 'generating') {
  const item = await articleService.update(id, { ...req.body, status: 'generating' }, userId, role);
  success(res, item, '已提交AI生成');
  return;
}
```

**问题**: 当 `targetStatus === 'generating'` 时，`req.body` 中可能包含 `content` 字段，service 层的 update 会触发版本快照创建。但从业务逻辑看，提交 AI 生成的请求不应携带 content。这可能导致版本历史中出现由用户提交的无关内容快照，污染版本记录。

**建议**: `generating` 分支应仅传递元数据字段，排除 `content`：

```typescript
if (targetStatus && targetStatus === 'generating') {
  const { content, ...metadata } = req.body;
  const item = await articleService.update(id, { ...metadata, status: 'generating' }, userId, role);
  success(res, item, '已提交AI生成');
  return;
}
```

#### 补充-2: 模块级 Service 单例缺少依赖注入

**位置**: article.controller.ts:6-7

```typescript
const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();
```

**问题**: Service 实例在模块加载时创建为顶层常量，无法在测试中替换为 mock。这导致控制器层难以进行单元测试，当前项目可能依赖集成测试覆盖。不影响安全性，但影响可测试性和工程维护性。

**建议**: 长期可考虑引入简单的 DI 容器或在控制器函数中接受 service 参数。短期维持现状即可，不阻塞合并。

#### 补充-3: `listArticles` 对 admin 的双重查询效率问题

**位置**: article.controller.ts:33-39 + 42

```typescript
if (role === 'admin') {
  try {
    await checkProjectOperator(projectId, userId, role);  // 查询1: 获取 project
  } catch { ... }
}
const { list, total } = await articleService.list(...);   // 查询2: 获取文章列表
```

**问题**: `checkProjectOperator` 调用 `projectService.getById()` 获取完整 project 记录，仅为了检查 `operator_ids`。紧接着 `articleService.list()` 又会查询一次数据库。admin 角色实际上触发了两次数据库查询。这不是安全问题，但影响性能。

**建议**: 可在 `articleService.list()` 的 Prisma where 条件中直接加入 operator 校验，避免额外查询。非阻塞项。

### 7.3 严重级别调整建议

| 原编号 | 原级别 | 建议级别 | 调整理由 |
|--------|--------|----------|----------|
| CRITICAL-1 | CRITICAL | **HIGH** | Service 层显式映射字段，非映射字段被忽略；实际风险是 status 可被篡改（已由 CRITICAL-2 覆盖） |
| HIGH-1 | HIGH | **MEDIUM** | Service 层 create 显式映射，多余字段被忽略；实际风险为类型安全和长度限制缺失 |
| 其他 | 不变 | 不变 | 级别评定准确 |

**调整后最终统计**: CRITICAL(1) / HIGH(4) / MEDIUM(6) / LOW(4)

### 7.4 最终裁决

**结论: ✅ 全部修复完成 — 2026-05-24**

#### 阻断项（已修复）

1. **CRITICAL-2（状态机绕过）**: ✅ 已引入 `STATUS_TRANSITIONS` 白名单 + `isValidStatusTransition()` 校验
2. **HIGH-3（错误信息泄露）**: ✅ 已引入 `handleServerError()` + AppError 类型化异常，500 不返回 err.message

#### 强烈建议修复（已修复）

3. **HIGH-2（审核职责分离）**: ✅ 已添加创建者/审核者分离检查（line 322-326）
4. **HIGH-4（Content 大小限制）**: ✅ Zod schema `z.string().min(1).max(500_000)` 限制
5. **CRITICAL-1 / HIGH-1 的 Zod schema 验证**: ✅ 已创建 `article.schema.ts` 完整 Zod schema

#### 其他已修复项

6. **MEDIUM-1**（删除审计日志）: ✅ 已添加 `logger.info('article_deleted', ...)`
7. **MEDIUM-2**（分页上限）: ✅ Zod schema `z.coerce.number().int().min(1).max(100)`
8. **MEDIUM-3**（权限一致性）: ✅ regenerateArticle 添加创建者检查
9. **MEDIUM-4**（req.user! 防御性检查）: ✅ `getAuthUser()` 替代 `req.user!`
10. **MEDIUM-5**（权限异常吞没）: ✅ 使用 `ForbiddenError` 类型化异常
11. **LOW-1**（搜索参数清理）: ✅ Zod schema `z.string().trim().max(200)`
12. **LOW-3**（魔法字符串）: ✅ 使用 `ROLES` 常量替代硬编码字符串
13. **LOW-4**（parseInt 基数）: ✅ `parseId()` 统一 `parseInt(value, 10)`
14. **补充-1**（generating 分支排除 content）: ✅ 已修复
15. **Service regenerate 状态不一致**: ✅ service 层接受 `generate_failed` + `pending_review`
16. **handleServerError 500 日志记录**: ✅ 添加 `logger.error('unhandled_error', ...)`

#### 工程质量评价

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码可读性 | 7/10 | 函数命名清晰，结构一致，但重复代码较多（权限检查、参数解析） |
| 错误处理 | 5/10 | 有 try-catch 覆盖，但 err.message 泄露和 catch(err: any) 类型不安全 |
| 权限模型 | 6/10 | 三层权限（sysadmin/admin/view）基本完整，但有绕过风险和 SoD 缺失 |
| 输入验证 | 3/10 | 仅 ID 解析检查，请求体无 schema 验证，是最大短板 |
| 可测试性 | 4/10 | Service 单例硬编码，控制器函数难以独立测试 |
| 可维护性 | 6/10 | 9 个函数结构相似但大量重复，建议提取公共中间逻辑 |

#### 合并建议

当前代码**不建议直接合并到 main**。应创建 `fix/article-controller-security` 分支，至少修复 CRITICAL-2（状态机绕过）和 HIGH-3（错误信息泄露）后，经过 code review 再合并。Zod schema 验证可作为后续独立 PR。

---

*Committer 审核完成 — 2026-05-23*
