# apis/controller/article.controller.ts — 软件质量专家评审报告

**评审日期**: 2026-05-23
**评审角色**: 软件质量专家（代码质量 + 安全性 + 可维护性）
**文件路径**: `apis/controller/article.controller.ts`
**代码行数**: 426 行
**关联文件**: `apis/service/impl/article.service.impl.ts`, `apis/utils/response.util.ts`
**严重级别**: HIGH(3) / MEDIUM(5) / LOW(4)

---

## 一、质量评价总览

文章控制器是整个文章管理模块的入口层，承载了 9 个端点的请求处理、参数校验、权限控制和错误处理。该文件被路由层直接引用，是业务逻辑与 HTTP 层的桥梁。

| 质量维度 | 评分 | 说明 |
|----------|------|------|
| 权限控制 | 7/10 | 三级角色控制完整，但 admin 权限检查代码大量重复 |
| 输入验证 | 5/10 | ID 解析和基本类型校验存在，但缺少边界校验和枚举白名单 |
| 错误处理 | 6/10 | 主要异常场景覆盖，但 `err: any` 不安全且 catch 块过于宽泛 |
| 代码复用 | 3/10 | 权限检查、参数解析、项目校验逻辑在 9 个函数中高度重复 |
| 可测试性 | 5/10 | 模块级单例实例化使 mock 困难，checkProjectOperator 是亮点 |
| 安全防护 | 6/10 | 无 SQL 注入风险（Prisma 参数化），但缺少速率限制和输入长度限制 |

---

## 二、问题清单

### HIGH-1: `err: any` 类型不安全，违反 TypeScript 最佳实践

**位置**: 第 44, 75, 109, 161, 211, 259, 299, 336, 383, 419 行（全部 catch 块）
**CWE**: CWE-209 (Information Exposure Through Error Message)
**问题**: 所有 catch 块使用 `err: any` 类型注解，存在两个问题：

1. **类型不安全**: `any` 类型绕过 TypeScript 检查，`err.message` 可能不存在（非 Error 对象抛出时会报 `undefined`）
2. **信息泄露风险**: `err.message || '默认消息'` 直接将内部错误消息返回客户端，可能泄露数据库结构、文件路径等敏感信息

```typescript
// 当前代码 — 第 44 行
} catch (err: any) {
  fail(res, 500, err.message || '获取文章列表失败');
}
```

**修复建议**:
```typescript
// 安全的错误处理模式
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return '未知错误';
}

// 在 catch 中使用
} catch (err: unknown) {
  if (err instanceof Error && err.message === '文章不存在') {
    fail(res, 404, err.message);
  } else {
    // 生产环境不返回具体错误信息
    fail(res, 500, '获取文章列表失败');
  }
}
```

---

### HIGH-2: 模块级实例化 `new ArticleServiceImpl()` 无法被测试 Mock

**位置**: 第 6-7 行
**问题**: 在模块顶层直接 `new` 服务实例，导致：
1. **无法替换为 Mock**: 测试时无法注入模拟实例，必须 mock 整个模块
2. **紧耦合**: 控制器与服务实现绑定，违反依赖倒置原则
3. **测试现有做法**: 查看 `article.controller.test.ts`（2261 行），确实需要通过复杂手段绕过此限制

```typescript
// 当前代码
const articleService = new ArticleServiceImpl();
const projectService = new ProjectServiceImpl();
```

**修复建议**（依赖注入模式）:
```typescript
// 工厂函数，支持注入
export function createArticleController(
  articleSvc: IArticleService = new ArticleServiceImpl(),
  projectSvc: IProjectService = new ProjectServiceImpl()
) {
  return {
    listArticles: (req: Request, res: Response) => { /* ... */ },
    // ...
  };
}
```

> **注意**: 此项为架构层面改进，当前测试已通过大量 mock 覆盖，优先级可酌情降低。

---

### HIGH-3: `updateArticle` 中状态转换逻辑不完整，存在绕过校验风险

**位置**: 第 152-157 行
**问题**: `updateArticle` 中对 `generating` 状态做了特殊处理，允许从 draft 直接跳转到 generating，但：

1. **未校验前置状态**: 只检查了 `targetStatus === 'generating'`，没有验证 `existing.status === 'draft'`（虽然第 146 行检查了 `SETTINGS_EDITABLE_STATUSES`，但 generating 不在此列表内，说明逻辑意图模糊）
2. **直接透传 req.body**: `{ ...req.body, status: 'generating' }` 将所有请求体传给 service，可能包含不应该在此状态下修改的字段

```typescript
// 当前代码 — 第 152-157 行
if (targetStatus && targetStatus === 'generating') {
  const item = await articleService.update(id, { ...req.body, status: 'generating' }, userId, role);
  success(res, item, '已提交AI生成');
  return;
}
```

**修复建议**:
```typescript
// 显式校验前置状态
if (targetStatus === 'generating') {
  if (existing.status !== 'draft') {
    fail(res, 400, '只有草稿状态的文章可以提交AI生成');
    return;
  }
  // 只传递必要字段，不透传整个 body
  const item = await articleService.update(id, { status: 'generating' }, userId, role);
  success(res, item, '已提交AI生成');
  return;
}
```

---

### MEDIUM-1: 权限检查代码在 7 个函数中重复，违反 DRY 原则

**位置**: 第 33-40, 65-72, 98-105, 130-137, 188-195, 236-243, 287-294, 325-332, 362-369, 407-414 行
**问题**: admin 角色检查 + `checkProjectOperator` 的 try-catch 模式在几乎所有处理函数中重复出现。每新增一个端点都需要复制相同的权限检查代码，容易遗漏。

```typescript
// 重复出现 10 次的代码模式
if (role === 'admin') {
  try {
    await checkProjectOperator(projectId, userId, role);
  } catch {
    fail(res, 403, '无权操作该项目');
    return;
  }
}
```

**修复建议**: 使用中间件或装饰器模式提取权限检查：
```typescript
// 方案一：中间件（推荐）
async function requireProjectOperator(req: Request, res: Response, next: NextFunction) {
  const { userId, role } = req.user!;
  const projectId = parseInt(req.params.projectId, 10);
  if (role === 'sysadmin') return next();
  if (role === 'admin') {
    try {
      await checkProjectOperator(projectId, userId, role);
      return next();
    } catch {
      fail(res, 403, '无权操作该项目');
    }
  }
  next();
}

// 在路由定义中使用
router.get('/projects/:projectId/articles', auth, requireProjectOperator, listArticles);
```

---

### MEDIUM-2: `listArticles` 缺少分页参数边界校验

**位置**: 第 25-26 行
**问题**: `page` 和 `pageSize` 直接使用 `parseInt` 解析，无边界限制：
1. `pageSize` 可传入极大值（如 `999999`），导致一次查询返回海量数据，影响数据库性能
2. `page` 可传入负数或 0，虽然 service 层会计算出负数 offset，但语义不正确
3. 与 service 层 `article.service.impl.ts:28` 的 `skip: (page - 1) * pageSize` 配合，当 page=0 时 skip 为负数

```typescript
// 当前代码
const page = parseInt(req.query.page as string) || 1;
const pageSize = parseInt(req.query.pageSize as string) || 10;
```

**修复建议**:
```typescript
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
```

---

### MEDIUM-3: `createArticle` 中状态白名单不完整

**位置**: 第 90 行
**问题**: 只验证了 `status` 的白名单 `['draft', 'manual_writing', 'generating']`，但：
1. `req.body` 中其他字段（`title`, `content`, `keywords` 等）完全未校验
2. 客户端可以传入任意字段，service 层会直接忽略但不会报错
3. 字符串长度无限制，可传入超长字符串

```typescript
// 当前代码 — 只校验了 status
const { status } = req.body;
if (status && !['draft', 'manual_writing', 'generating'].includes(status)) {
  fail(res, 400, '无效的初始状态');
  return;
}
```

**修复建议**: 使用 Zod schema 校验请求体：
```typescript
import { z } from 'zod';

const createArticleSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.string().max(100000).optional(),
  keywords: z.string().max(1000).optional(),
  status: z.enum(['draft', 'manual_writing', 'generating']).optional(),
  write_mode: z.enum(['manual', 'ai']).optional(),
  // ... 其他字段
});

// 在 handler 中
const parsed = createArticleSchema.safeParse(req.body);
if (!parsed.success) {
  fail(res, 400, parsed.error.errors[0].message);
  return;
}
```

---

### MEDIUM-4: `updateArticleContent` 缺少内容长度限制

**位置**: 第 178 行
**问题**: 只校验了 `typeof content !== 'string'`，没有限制内容长度。超长内容可能导致：
1. 数据库写入失败（超过字段长度限制）
2. 内存压力
3. 版本快照表膨胀

```typescript
// 当前代码
if (typeof content !== 'string') { fail(res, 400, 'content参数无效'); return; }
```

**修复建议**:
```typescript
if (typeof content !== 'string') { fail(res, 400, 'content参数无效'); return; }
if (content.length > 100000) { fail(res, 400, '文章内容不能超过100000字符'); return; }
```

---

### MEDIUM-5: `deleteArticle` 只阻止 `published` 状态删除，其他中间状态未考虑

**位置**: 第 252 行
**问题**: 只检查了 `published` 状态不可删除，但 `generating`、`publishing` 等中间状态的文章删除后可能导致：
1. AI 生成任务回写失败
2. 发布流程中断
3. 数据不一致

```typescript
// 当前代码
if (existing.status === 'published') {
  fail(res, 400, '已发布的文章不能删除');
  return;
}
```

**修复建议**:
```typescript
const DELETE_BLOCKED_STATUSES = ['published', 'generating', 'publishing'];
if (DELETE_BLOCKED_STATUSES.includes(existing.status)) {
  const statusMessages: Record<string, string> = {
    published: '已发布的文章不能删除',
    generating: 'AI生成中的文章不能删除',
    publishing: '发布中的文章不能删除',
  };
  fail(res, 400, statusMessages[existing.status] || '当前状态不可删除');
  return;
}
```

---

### LOW-1: `reviewArticle` 缺少审核权限区分，任何角色都能审核

**位置**: 第 268-306 行
**问题**: `reviewArticle` 函数中，只要通过了项目操作者检查，创建者本人也能审核自己的文章。这违反了基本的审批分离原则（Segregation of Duties）。

**修复建议**:
```typescript
// 审核者不能是文章创建者
if (role !== 'sysadmin' && existing.created_by === userId) {
  fail(res, 403, '不能审核自己创建的文章');
  return;
}
```

---

### LOW-2: `SETTINGS_EDITABLE_STATUSES` 和 `CONTENT_EDITABLE_STATUSES` 定义在控制器层

**位置**: 第 9-10 行
**问题**: 业务规则常量定义在控制器层不合适，应该定义在 service 层或专门的常量文件中：
1. 控制器应只负责 HTTP 请求/响应处理
2. 如果 service 层也需要这些常量（如在 `review` 方法中判断状态），会导致重复定义
3. 状态转换规则散落在 controller 和 service 中，维护时容易不一致

**修复建议**: 移到 service 层或专门的 `constants.ts` 文件中。

---

### LOW-3: `submitForReview` 和 `regenerateArticle` 缺少创建者校验

**位置**: 第 309-345 行（regenerateArticle）
**问题**: `regenerateArticle` 没有检查操作者是否是文章创建者（对比 `submitForReview` 第 371 行有此检查），意味着任何项目操作者都可以重新生成他人创建的文章。这是否符合业务需求需要确认。

---

### LOW-4: 文件 426 行接近推荐的 800 行上限，但函数粒度合理

**位置**: 整个文件
**问题**: 文件包含 9 个导出函数，每个函数平均 30-50 行，函数粒度合理。但由于权限检查代码重复，实际有效逻辑更少。提取权限检查到中间件后，文件可缩减至约 250 行。

---

## 三、架构改进建议

### 3.1 引入请求验证层

当前所有参数校验都是手动 if-else，建议引入 Zod schema 做统一请求体验证：

```
controller (HTTP 适配) → schema 验证 → service (业务逻辑) → repository (数据访问)
```

### 3.2 权限检查中间件化

将 `checkProjectOperator` 提取为 Express 中间件，在路由定义时绑定，避免控制器内部重复：

```typescript
router.put('/projects/:projectId/articles/:id', auth, requireProjectOperator, updateArticle);
```

### 3.3 错误处理统一化

引入自定义业务异常类（如 `BusinessError`、`NotFoundError`、`AuthorizationError`），在 service 层抛出，控制器层统一捕获处理：

```typescript
// 统一错误处理
} catch (err: unknown) {
  if (err instanceof NotFoundError) fail(res, 404, err.message);
  else if (err instanceof AuthorizationError) fail(res, 403, err.message);
  else if (err instanceof ValidationError) fail(res, 400, err.message);
  else fail(res, 500, '操作失败');
}
```

---

## 四、优先级路线图

| 优先级 | 问题编号 | 修复建议 | 预估工时 |
|--------|----------|----------|----------|
| P0 | HIGH-1 | `err: any` → `err: unknown` + 安全错误消息 | 30 min |
| P0 | HIGH-3 | 状态转换前置校验 + 不透传 body | 15 min |
| P1 | MEDIUM-2 | 分页参数边界校验 | 5 min |
| P1 | MEDIUM-4 | 内容长度限制 | 5 min |
| P1 | MEDIUM-5 | 中间状态删除保护 | 10 min |
| P1 | HIGH-2 | 依赖注入改造（可选，当前测试已覆盖） | 2 hr |
| P2 | MEDIUM-1 | 权限检查中间件化 | 1 hr |
| P2 | MEDIUM-3 | Zod schema 请求体验证 | 1 hr |
| P2 | LOW-1 | 审核权限分离 | 10 min |
| P2 | LOW-2 | 常量提取到 service 层 | 15 min |
| P2 | LOW-3 | regenerateArticle 创建者校验 | 10 min |

---

## 五、代码亮点

1. **`checkProjectOperator` 辅助函数**: 虽然复用不够充分，但将权限查询逻辑提取为独立函数是好的设计方向
2. **三级角色控制**: sysadmin/admin/view 的权限分层清晰
3. **状态常量定义**: `SETTINGS_EDITABLE_STATUSES` 和 `CONTENT_EDITABLE_STATUSES` 使用数组常量而非魔法字符串
4. **项目-文章关联校验**: 每个操作都验证了文章确实属于指定项目（第 59, 124, 183 行等）
5. **测试覆盖**: 已有 2261 行的测试文件，覆盖了主要场景

---

## 六、Committer 审核意见

**审核人**: 软件质量专家
**审核结论**: **WARNING** — 无关键安全漏洞，但有 3 个 HIGH 级别问题建议修复后再合并

| 检查项 | 结果 |
|--------|------|
| 无硬编码密钥 | PASS |
| 输入验证 | WARN — 缺少长度和边界校验 |
| SQL 注入防护 | PASS — 使用 Prisma 参数化查询 |
| XSS 防护 | PASS — API 层无 HTML 渲染 |
| 认证/授权 | PASS — 三级角色控制完整 |
| 错误信息泄露 | WARN — `err.message` 直接返回客户端 |
| 测试覆盖 | PASS — 2261 行测试文件 |
| 代码重复 | WARN — 权限检查重复 10 次 |

**总结**: 控制器整体结构合理，业务逻辑正确，权限控制完整。主要问题集中在代码复用（权限检查重复）和输入验证不够严格。建议优先修复 HIGH-1（错误类型安全）和 HIGH-3（状态转换校验），这两项改动量小但安全收益高。
