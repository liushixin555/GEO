# pages/article/components/ArticleReviewActions.tsx — 代码安全评审报告

**文件**: `pages/article/components/ArticleReviewActions.tsx` (29行)
**评审类型**: 安全评审（Security Review）
**评审日期**: 2026-05-26
**评审人**: Claude (代码安全专家)

---

## 综合评分: 3.2 / 10 — REQUEST CHANGES

| 维度 | 评分 | 说明 |
|------|------|------|
| 权限控制与授权 | 2/10 | 组件无任何权限感知，内联版本仅凭 status 渲染，前端缺少角色校验；后端 roleMiddleware 允许 admin 审核，与 useArticlePermissions 定义矛盾 |
| 输入校验与数据完整性 | 6/10 | 后端 reviewArticleSchema z.boolean().strict() 校验充分；前端 onReview 回调无类型约束，Promise 返回值被丢弃 |
| 审计可追溯性 | 4/10 | 后端有 logger.info 记录删除操作，但 review/reject 操作无审计日志；前端无操作日志 |
| CSRF/重放防护 | 8/10 | JWT Authorization header 天然防 CSRF；后端 articleActionLimiter 限流 |
| 双重提交防护 | 2/10 | 组件无 loading 状态，API 调用期间用户可反复点击确认按钮；onReview 签名返回 void，Promise 被丢弃 |
| 信息泄露控制 | 5/10 | "该文章待审核"文案对所有能查看文章的用户可见，泄露内部工作流状态 |

---

## 安全亮点（值得肯定）

### 1. 后端多层安全校验设计合理

```
路由层: authMiddleware + roleMiddleware(SYSADMIN, ADMIN)
中间件层: articleActionLimiter 限流
Schema层: reviewArticleSchema z.boolean().strict()
控制器层: withArticleAuth 统一认证上下文
服务层: 自审检查 + 状态校验 + 项目归属校验
```

即使前端权限完全失效，后端仍能阻止未授权审核操作。

### 2. JWT 认证天然防 CSRF

审核 API 使用 `PUT /projects/:projectId/articles/:id/review`，JWT 在 Authorization header 中传递，攻击者无法通过跨站请求伪造提交审核操作。

### 3. 自审防护

`article.service.impl.ts:254-256` 正确实现了自审拦截：

```typescript
if (existing.createdBy === auth.userId) {
  throw new ForbiddenError('不能审核自己创建的文章');
}
```

### 4. 状态机转换校验

`article.service.impl.ts:258-260` 确保只有 `pending_review` 状态的文章才能被审核，防止状态跳过攻击。

---

## CRITICAL-1 — 审核按钮对所有认证用户可见，前端零权限控制

**位置**: `ArticleContentEditor.tsx:77-94`（实际生效的内联版本）

**安全缺陷**: 审核按钮的渲染条件仅为 `article?.status === 'pending_review'`，**无任何角色/权限检查**：

```tsx
// ArticleContentEditor.tsx L77 — 仅检查文章状态，不检查用户角色
{article?.status === 'pending_review' && (
  <Alert type="warning" message="该文章待审核" ...>
    <Popconfirm onConfirm={() => onReview(true)}>审核通过</Popconfirm>
    <Popconfirm onConfirm={() => onReview(false)}>审核不通过</Popconfirm>
  </Alert>
)}
```

**影响链**:

| 用户角色 | 是否看到审核按钮 | 点击后 API 结果 | 安全评估 |
|---------|---------------|----------------|---------|
| sysadmin | 是 | 成功（非自创文章） | 正常 |
| admin | 是 | 成功（非自创文章，且是项目操作员） | **越权** |
| view | 否（路由层已拦截） | 401 | 安全 |

**权限模型矛盾**:

```typescript
// useArticlePermissions.ts:20 — 前端定义
const canReview = article?.status === 'pending_review' && user.role === 'sysadmin';
// ❗ 仅允许 sysadmin

// article.routes.ts:11 — 后端定义
roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)
// ❗ 允许 sysadmin + admin
```

前端 `canReview` 权限虽然正确定义了（仅 sysadmin），但**从未被用来控制审核按钮的渲染**。审核 UI 完全绕过了权限系统。

**ArticleReviewActions.tsx 同样无权限感知**: 组件是纯展示组件，不接收也不判断任何权限信息。

**修复方案**:

```tsx
// ArticleContentEditor.tsx — 使用已有的 canReview 权限
interface Props {
  canReview: boolean;  // 新增
  // ... 其他 props
}

// 渲染条件改为
{canReview && article?.status === 'pending_review' && (
  <Alert ...>...</Alert>
)}
```

---

## CRITICAL-2 — 权限定义与实际执行存在前后端矛盾

**位置**: `useArticlePermissions.ts:20` vs `article.routes.ts:11`

| 层级 | 角色 | 审核权限 |
|------|------|---------|
| 前端 `useArticlePermissions` | `sysadmin` only | `canReview` |
| 后端路由 `roleMiddleware` | `sysadmin` + `admin` | 实际执行 |
| 后端服务 `review()` | 不检查角色 | 依赖路由层 |

**风险**:
1. **admin 越权审核**: admin 用户通过前端（内联按钮可见）或直接调 API 可执行审核操作
2. **安全审计盲区**: 审计时若只看前端代码会认为只有 sysadmin 能审核，但后端实际允许 admin
3. **权限漂移**: 后端新增角色时前端无感知，权限边界不可控

**修复方案**: 后端路由层应与前端权限定义对齐：

```typescript
// 方案A: 审核路由仅允许 sysadmin（推荐，审核是高权限操作）
router.put('/:projectId/articles/:id/review',
  authMiddleware,
  roleMiddleware(ROLES.SYSADMIN),  // 移除 ADMIN
  articleActionLimiter,
  validate(reviewArticleSchema),
  ctrl.reviewArticle
);

// 方案B: 如果确实允许 admin 审核，更新 useArticlePermissions
const canReview = article?.status === 'pending_review'
  && (user.role === 'sysadmin' || user.role === 'admin');
```

---

## HIGH-1 — 自审防护仅后端实现，前端无对应视觉反馈

**位置**: `article.service.impl.ts:254-256` vs `ArticleContentEditor.tsx:77-94`

后端正确拦截了自审操作（`createdBy === auth.userId`），但前端仍然为文章创建者显示审核按钮。

**影响**: 创建者看到审核按钮 → 点击确认 → API 返回 403 "不能审核自己创建的文章" → 用户困惑

**数据流分析**:

```
创建者打开文章 → status=pending_review → 前端显示审核按钮
→ 点击确认 → API PUT /review → 后端检查 createdBy === userId
→ 抛出 ForbiddenError → 前端 message.error("不能审核自己创建的文章")
```

**修复方案**: 在 `useArticlePermissions.ts` 中增加自创检查：

```typescript
const canReview = article?.status === 'pending_review'
  && user.role === 'sysadmin'
  && article.created_by !== user.id;  // 新增：排除自审
```

---

## HIGH-2 — 双重提交无防护，onReview 签名丢弃 Promise

**位置**: `ArticleReviewActions.tsx:6` / `ArticleContentEditor.tsx:85,88`

**问题 1 — 类型签名与实现不匹配**:

```typescript
// 组件 props 定义 — 返回 void
onReview: (approved: boolean) => void;

// 实际消费者 useArticleActions.review — 返回 Promise<void>
const review = useCallback(async (approved: boolean) => {
  await apiClient.put(...);
}, [...]);
```

TypeScript 协变允许 `Promise<void>` 赋值给 `void`，Promise 返回值被静默丢弃。

**问题 2 — 无 loading 状态**:

```tsx
// L85-88 — Button 无 loading/disabled 属性
<Popconfirm onConfirm={() => onReview(true)}>
  <Button type="primary">审核通过</Button>  {/* ❌ 无 loading */}
</Popconfirm>
<Popconfirm onConfirm={() => onReview(false)}>
  <Button danger>审核不通过</Button>  {/* ❌ 无 loading */}
</Popconfirm>
```

**攻击向量**: 用户连续快速点击确认 → 触发多次 `PUT /review` API 请求。虽然后端有 `articleActionLimiter` 限流，但在限流阈值内（通常 10-20 次/分钟）仍可触发重复审核。

**修复方案**:

```tsx
interface ArticleReviewActionsProps {
  onReview: (approved: boolean) => Promise<void>;  // 修正签名
}

const ArticleReviewActions: React.FC<Props> = ({ onReview }) => {
  const [loading, setLoading] = useState(false);

  const handleReview = async (approved: boolean) => {
    setLoading(true);
    try { await onReview(approved); }
    finally { setLoading(false); }
  };

  return (
    <Alert ... action={
      <Popconfirm onConfirm={() => handleReview(true)}>
        <Button loading={loading} disabled={loading}>审核通过</Button>
      </Popconfirm>
      <Popconfirm onConfirm={() => handleReview(false)}>
        <Button loading={loading} disabled={loading}>审核不通过</Button>
      </Popconfirm>
    } />
  );
};
```

---

## HIGH-3 — 审核操作无后端审计日志

**位置**: `article.controller.ts:133-137`

对比删除操作的日志记录：

```typescript
// 删除 — 有审计日志 ✅
export const deleteArticle = withArticleAuth(async (req, res, ctx) => {
  await articleService.delete(ctx.projectId, ctx.articleId!, ctx);
  logger.info('article_deleted', {
    articleId: ctx.articleId,
    projectId: ctx.projectId,
    operatorId: ctx.userId,
    role: ctx.role
  });
  success(res, null, '删除文章成功');
}, ...);

// 审核 — 无审计日志 ❌
export const reviewArticle = withArticleAuth(async (req, res, ctx) => {
  const { approved } = req.body as z.infer<typeof reviewArticleSchema>;
  const item = await articleService.review(ctx.projectId, ctx.articleId!, approved, ctx);
  success(res, item, approved ? '审核通过' : '审核不通过');
  // ❗ 无 logger.info 记录审核操作
}, ...);
```

审核是高风险业务操作（改变文章发布状态），缺乏审计日志意味着：
- 无法追溯"谁在何时审核了哪篇文章"
- 发生争议时无据可查
- 无法检测异常审核行为（如短时间内大量审核）

**修复方案**:

```typescript
export const reviewArticle = withArticleAuth(async (req, res, ctx) => {
  const { approved } = req.body as z.infer<typeof reviewArticleSchema>;
  const item = await articleService.review(ctx.projectId, ctx.articleId!, approved, ctx);
  logger.info('article_reviewed', {
    articleId: ctx.articleId,
    projectId: ctx.projectId,
    operatorId: ctx.userId,
    role: ctx.role,
    approved,
  });
  success(res, item, approved ? '审核通过' : '审核不通过');
}, { requireId: true, errorContext: '审核操作失败' });
```

---

## MEDIUM-1 — 工作流状态泄露

**位置**: `ArticleReviewActions.tsx:13` / `ArticleContentEditor.tsx:80`

```tsx
message="该文章待审核"
```

**影响**: 任何能查看文章详情页的用户（sysadmin + admin）都能看到"待审核"状态标签。虽然路由层已限制 view 角色访问，但对于 admin 角色，内部工作流状态是不必要的信息暴露。

**风险评级**: MEDIUM — 在当前路由权限模型下影响有限（admin 本身有较高权限），但违反最小权限原则。

---

## MEDIUM-2 — inline style 硬编码存在样式注入理论风险

**位置**: `ArticleReviewActions.tsx:14,16`

```tsx
style={{ marginBottom: 12 }}
style={{ display: 'flex', gap: 8 }}
```

虽然 React 的 `style` prop 会自动转义字符串值，防止直接的 CSS 注入，但硬编码样式绕过了项目 CSS Token 体系，无法通过 CSP `unsafe-inline` 策略统一管控。

**项目其他组件已使用 antd Space 替代 inline flex 布局**，此组件应保持一致。

---

## MEDIUM-3 — ArticleReviewActions 死代码增加攻击面

**位置**: `ArticleReviewActions.tsx` 全文件（29 行）

组件从未被任何文件导入使用，但：
1. 存在于代码仓库中，增加代码审计负担
2. 与 `ArticleContentEditor.tsx` 中的内联版本行为不一致（Button size、alignItems）
3. 给安全审计者造成困惑——应审计哪个版本？

**修复**: 删除死代码或在 `ArticleContentEditor` 中导入使用（推荐后者）。

---

## LOW-1 — Popconfirm 确认操作无二次校验上下文

**位置**: `ArticleContentEditor.tsx:85-89`

Popconfirm 提供了确认对话框，但不包含文章标题等上下文信息：

```tsx
<Popconfirm title="确认审核通过？" description="通过后文章将完成审核流程">
```

在同时打开多个文章标签页的场景下，用户可能误操作。建议在 description 中包含文章标题或项目名。

---

## LOW-2 — 前端错误处理仅依赖 message.error

**位置**: `useArticleActions.ts:21-23`

```typescript
} catch (err: unknown) {
  message.error(getApiErrorMessage(err, '审核操作失败'));
}
```

错误仅通过 toast 提示，不记录到前端日志系统。在安全事件排查时无法追溯前端错误上下文。

---

## 修复优先级路线图

### P0 — 阻断级（必须修复）

| # | 问题 | 修复方案 | 预估工时 |
|---|------|---------|---------|
| C-1 | 审核按钮无权限控制 | ArticleContentEditor 接收 `canReview` prop，渲染条件改为 `canReview && status === 'pending_review'` | 20min |
| C-2 | 前后端权限模型矛盾 | 统一 roleMiddleware 或 useArticlePermissions，确定 admin 是否可审核 | 15min |

### P1 — 高优先级

| # | 问题 | 修复方案 | 预估工时 |
|---|------|---------|---------|
| H-1 | 自审前端无视觉反馈 | useArticlePermissions 的 canReview 增加 `created_by !== user.id` | 10min |
| H-2 | 双重提交无防护 | onReview 签名改为 `Promise<void>`，添加 loading/disabled 状态 | 20min |
| H-3 | 审核无审计日志 | controller 的 reviewArticle handler 添加 `logger.info('article_reviewed', {...})` | 5min |

### P2 — 中优先级

| # | 问题 | 修复方案 |
|---|------|---------|
| M-1 | 状态泄露 | 仅对有审核权限的用户显示审核 Alert |
| M-2 | inline style | 使用 antd Space 替代 div flex |
| M-3 | 死代码 | 导入 ArticleReviewActions 替换内联代码，或删除 |

---

## 修复后预期评分

| 维度 | 当前 | 修复后 |
|------|------|--------|
| 权限控制与授权 | 2 | 8 |
| 输入校验与数据完整性 | 6 | 8 |
| 审计可追溯性 | 4 | 8 |
| CSRF/重放防护 | 8 | 9 |
| 双重提交防护 | 2 | 8 |
| 信息泄露控制 | 5 | 7 |
| **综合** | **3.2** | **8.0** |

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 文件 | pages/article/components/ArticleReviewActions.tsx |
| 行数 | 29 |
| 评审类型 | 代码安全专家评审 |
| 评审日期 | 2026-05-26 |
| 关联文件 | pages/article/components/ArticleContentEditor.tsx, pages/article/ArticleDetail.tsx, pages/article/hooks/useArticleActions.ts, pages/article/hooks/useArticlePermissions.ts, apis/controller/article.controller.ts, apis/routes/article.routes.ts, apis/service/impl/article.service.impl.ts, apis/schema/article.schema.ts |
| 关联评审 | [架构评审](ArticleReviewActions.tsx.architecture.md) 2.9/10 · [质量评审](ArticleReviewActions.tsx.quality.md) 4.0/10 |
