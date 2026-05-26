# project-knowledge.routes.d.ts 代码安全专家评审

**评审文件**: `apis/routes/project-knowledge.routes.ts`（编译产物 `dist/apis/apis/routes/project-knowledge.routes.d.ts`）
**评审类型**: 安全评审
**评审日期**: 2026-05-26
**综合评分**: 5.5/10 — CONDITIONAL APPROVE

---

## 评审范围

路由文件 `project-knowledge.routes.ts`（15行）及其调用的 controller 方法（`listProjectKeywords`、`listProjectPortraits`、`listProjectImages`、`listProjectDocuments`），对照项目内其他路由文件的安全模式进行横向比对。

---

## 安全发现

### S1-HIGH: 路由层零输入校验

**位置**: `project-knowledge.routes.ts:10-13`

```typescript
router.get('/:projectId/knowledge/keywords', knowledgeController.listProjectKeywords);
router.get('/:projectId/knowledge/portraits', knowledgeController.listProjectPortraits);
router.get('/:projectId/knowledge/images', knowledgeController.listProjectImages);
router.get('/:projectId/knowledge/documents', knowledgeController.listProjectDocuments);
```

**问题**: 四条路由均无 `validate()` 中间件。项目内其他路由文件（`knowledge.routes.ts`、`article.routes.ts`、`user.routes.ts`、`todo.routes.ts`、`publishing-schedule.routes.ts` 等）全部使用 `validate(schema)` 对参数进行 Zod 校验。本文件是唯一一个零路由级校验的路由模块。

**影响**:
- `projectId` 路径参数依赖 controller 内 `parseId()` 校验（L629），但 `page`/`pageSize`/`search` 查询参数完全无 schema 约束
- `search` 参数直接 `as string | undefined` 传入 service 层，无长度限制、无内容过滤
- `page` 参数无上界检查（`parseInt(req.query.page) || 1`），攻击者可传入 `page=999999` 触发慢查询

**对比**: `article.routes.ts:14` — `router.get('/:projectId/articles', validate(listArticlesSchema, 'query'), ctrl.listArticles)`，即使是 GET 请求也做了 query schema 校验。

**修复建议**:
```typescript
import { validate } from '../middleware/validate';
import { listProjectKnowledgeSchema } from '../schema/knowledge.schema';

// schema 定义（新增）
// const listProjectKnowledgeSchema = z.object({
//   page: z.coerce.number().int().min(1).max(10000).default(1),
//   pageSize: z.coerce.number().int().min(1).max(100).default(10),
//   search: z.string().max(200).optional(),
// });

router.get('/:projectId/knowledge/keywords', validate(listProjectKnowledgeSchema, 'query'), knowledgeController.listProjectKeywords);
```

---

### S2-HIGH: 通配符命名空间导入暴露内部函数

**位置**: `project-knowledge.routes.ts:4`

```typescript
import * as knowledgeController from '../controller/knowledge.controller';
```

**问题**: `* as` 导入将 controller 的所有 export 引入命名空间，包括测试专用函数 `_resetServices()`。虽然 Express 路由只绑定了四个方法，通配符导入本身不构成运行时风险，但违反了最小暴露原则——若 controller 新增的内部函数被意外 export，会增加攻击面审计负担。

**对比**: 其他路由文件虽然也有使用 `* as` 导入的情况（如 `knowledge.routes.ts`），但该文件 controller 导出了 `_resetServices` 这个测试专用函数，应显式限制。

**修复建议**: 使用具名导入。
```typescript
import {
  listProjectKeywords,
  listProjectPortraits,
  listProjectImages,
  listProjectDocuments,
} from '../controller/knowledge.controller';
```

---

### S3-MEDIUM: 数据聚合查询无独立限流

**位置**: `project-knowledge.routes.ts:10-13`

**问题**: 四条 GET 路由执行跨知识库聚合查询（`listByProject`），数据量可能较大。项目全局有 `rateLimitMiddleware`（`app.ts:81`），但对于数据密集型聚合查询没有独立限流。对比 `article.routes.ts:19` 的 `articleActionLimiter` 对敏感操作设置了独立限流。

**影响**: 已认证的 admin 用户可高频调用聚合接口批量提取项目数据，绕过全局限流的宽泛窗口。

**修复建议**: 为聚合路由添加独立限流。
```typescript
import { rateLimit } from 'express-rate-limit';
const knowledgeAggLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { code: 429, message: '查询过于频繁，请稍后再试' },
});
router.get('/:projectId/knowledge/keywords', knowledgeAggLimiter, knowledgeController.listProjectKeywords);
```

---

### S4-MEDIUM: 路径作用域中间件模式存在绕过风险

**位置**: `project-knowledge.routes.ts:9`

```typescript
router.use('/:projectId/knowledge', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));
```

**问题**: auth + role 中间件绑定到 `/:projectId/knowledge` 路径模式。若后续开发者在此路由文件中添加新路由且路径不匹配 `/:projectId/knowledge` 前缀，该路由将无认证保护。

**对比**: 其他路由文件（`knowledge.routes.ts:27`、`project.routes.ts:9`、`user.routes.ts:9`）使用 `router.use(authMiddleware, roleMiddleware(...))` 无路径参数的全局中间件模式，保护所有子路由。

**修复建议**: 改为根级中间件，与项目惯例一致。
```typescript
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));
router.get('/:projectId/knowledge/keywords', knowledgeController.listProjectKeywords);
// ...
```

---

### S5-MEDIUM: search 查询参数未过滤特殊字符

**位置**: `knowledge.controller.ts:634`

```typescript
const search = req.query.search as string | undefined;
```

**问题**: `search` 参数未经任何长度限制或字符过滤直接传入 service 层。若 service 层使用 Prisma 的 `contains` 查询，虽然 ORM 参数化可防 SQL 注入，但超长字符串或特殊正则字符可能导致 ReDoS 或性能降级。

**影响**: 攻击者可传入超长 search 字符串（如 10MB）触发内存/性能压力。

**修复建议**: 在路由层通过 Zod schema 限制 search 长度和字符范围（见 S1 修复建议中的 schema 定义）。

---

### S6-MEDIUM: page 参数无上界保护

**位置**: `knowledge.controller.ts:632`

```typescript
const page = parseInt(req.query.page as string) || 1;
```

**问题**: `page` 使用 `parseInt || 1` 默认值，但没有上界校验。`pageSize` 有 `Math.min(..., 100)` 保护，但 `page` 没有。`page=999999` 会导致 OFFSET 极大的慢查询，可能被用于 DoS。

**修复建议**: 通过路由层 Zod schema 限制 `page` 最大值（如 10000），或在 controller 添加上界检查。

---

### S7-LOW: view 角色未显式排除

**位置**: `project-knowledge.routes.ts:9`

```typescript
roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)
```

**说明**: `roleMiddleware` 仅允许 SYSADMIN 和 ADMIN，view 角色已被正确拦截。此项仅为确认 view 权限边界正确，无安全问题。

---

### S8-LOW: 仅暴露 GET 只读端点

**说明**: 四条路由均为 GET 方法，无数据变更能力，攻击面限于信息泄露和 DoS，不涉及数据篡改。这是良好的安全实践。

---

### S9-INFO: CORS 依赖全局中间件

**说明**: CORS 由 `app.ts` 全局 `cors()` 中间件处理，路由层无额外限制。符合项目惯例，无独立安全问题。

---

### S10-INFO: controller 层有 operator 权限校验

**位置**: `knowledge.controller.ts:80-87`（`checkProjectOperator`）

**说明**: controller 内通过 `checkProjectOperator` 验证当前用户是否为项目 operator，sysadmin 除外。这是纵深防御的正确实践——即使绕过路由层角色检查，controller 层仍做项目级授权。

---

## 评审汇总

| 编号 | 等级 | 发现 | 状态 |
|------|------|------|------|
| S1 | HIGH | 路由层零输入校验，四条路由无 validate() 中间件 | 需修复 |
| S2 | HIGH | 通配符 `import *` 导入暴露 `_resetServices` 等内部函数 | 需修复 |
| S3 | MEDIUM | 数据聚合查询无独立限流 | 建议修复 |
| S4 | MEDIUM | 路径作用域中间件模式可能遗漏新路由保护 | 建议修复 |
| S5 | MEDIUM | search 参数无长度/字符校验 | 建议修复 |
| S6 | MEDIUM | page 参数无上界保护（OFFSET 慢查询 DoS） | 建议修复 |
| S7 | LOW | view 角色已正确拦截（确认项） | 无需操作 |
| S8 | LOW | 仅 GET 只读端点，攻击面有限（确认项） | 无需操作 |
| S9 | INFO | CORS 依赖全局中间件（项目惯例） | 无需操作 |
| S10 | INFO | controller 层有项目级 operator 校验（纵深防御） | 确认 |

---

## 修复后预期评分

修复 S1（路由级 Zod 校验）+ S2（具名导入）+ S4（根级中间件）后预期可达 **8.0/10**。S3/S5/S6 随 S1 的 schema 校验一并解决。

---

## 与已有评审的关系

| 已有评审 | 评分 | 重叠项 |
|----------|------|--------|
| `project-knowledge.routes.ts.architecture.md`（架构评审） | 6.5/10 | S1（路由校验）、S4（中间件模式）与架构评审 H1/H2 重叠 |
| `project-knowledge.routes.d.ts.quality.md`（质量评审） | 7.0/10 | S2（通配符导入）与质量评审 M1 重叠 |
| 本次安全评审 | 5.5/10 | 新增 S3（限流）、S5（search 注入）、S6（page DoS）安全视角发现 |
