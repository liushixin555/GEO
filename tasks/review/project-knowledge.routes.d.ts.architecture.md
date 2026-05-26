# project-knowledge.routes.ts — 软件架构专家评审

**文件**: `dist/apis/apis/routes/project-knowledge.routes.d.ts` → 源文件 `apis/routes/project-knowledge.routes.ts`
**评审日期**: 2026-05-26
**评审类型**: 软件架构专家评审（Architecture Review）
**评审基线**: 与 `project.routes.ts`、`knowledge.routes.ts`、`article.routes.ts`、`knowledge.controller.ts`（L627-705）、`app.ts`（L126）对比

---

## 综合评分：6.5/10 — CONDITIONAL APPROVE

路由文件职责单一，仅提供项目级知识聚合的只读端点。`auth` + `roleMiddleware` 双重保障与 `controller` 层 `checkProjectOperator()` 形成纵深防御。主要架构问题在于：路由层零输入校验（路径参数和查询参数均无 Zod 保护），与 `article.routes.ts` 同属"项目级子资源"但防御深度不一致；`controller` 层四个 handler 结构完全相同，暴露出缺少工厂抽象。

---

## 评审维度评分

| 维度 | 评分 | 等级 |
|------|------|------|
| 路由职责划分 | 9/10 | GOOD |
| 中间件链设计 | 8/10 | GOOD |
| 输入校验纵深 | 4/10 | HIGH |
| 与同级路由一致性 | 6/10 | HIGH |
| 分层契约完备性 | 5/10 | HIGH |
| 可扩展性 | 5/10 | MEDIUM |
| 模块化与 DRY | 4/10 | MEDIUM |
| **综合** | **6.5/10** | **CONDITIONAL APPROVE** |

---

## HIGH-1 — 路由层零输入校验，防御纵深断裂

**位置**: L10-13（四条 GET 路由）

四条路由均接受 `projectId` 路径参数 + `page`/`pageSize`/`search` 查询参数，但**无任何 Zod schema 保护**：

```typescript
// project-knowledge.routes.ts — 零 validate()
router.get('/:projectId/knowledge/keywords', knowledgeController.listProjectKeywords);
router.get('/:projectId/knowledge/portraits', knowledgeController.listProjectPortraits);
router.get('/:projectId/knowledge/images', knowledgeController.listProjectImages);
router.get('/:projectId/knowledge/documents', knowledgeController.listProjectDocuments);
```

**对比**：同为项目级子资源的 `article.routes.ts`：

```typescript
// article.routes.ts L14 — 有 validate()
router.get('/:projectId/articles', validate(listArticlesSchema, 'query'), ctrl.listArticles);
```

**防御链现状**：

| 层级 | 校验行为 | 状态 |
|------|---------|------|
| 路由层 | 无 Zod schema | ❌ 缺失 |
| controller 层 | `parseId()` 手动解析 `projectId` | ✅ 存在 |
| controller 层 | `parseInt()` 手动解析 `page`/`pageSize` | ⚠️ 无上限/类型校验 |
| controller 层 | `search` 直接 `as string \| undefined` 传递 | ❌ 无长度校验 |

**影响链**：

1. **`search` 参数无长度限制**：恶意请求可发送超长 `search` 字符串，直接传入 service 层的 `WHERE keyword LIKE '%...%'` SQL，造成 DB 性能退化
2. **`page`/`pageSize` 类型不安全**：`parseInt(req.query.page as string)` 对非数字输入（如 `page=abc`）返回 `NaN`，虽然 `|| 1` 回退，但 `pageSize=abc` 也会回退到 10，静默吞掉无效输入
3. **与 `article.routes.ts` 防御深度不一致**：同挂载路径 `/api/v1/projects`，article 路由有 `validate(listArticlesSchema, 'query')`，project-knowledge 完全依赖 controller 手动解析

**修复建议**：

```typescript
import { validate } from '../middleware/validate';
import { z } from 'zod';

const projectKnowledgeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().max(200).optional(),
});

const projectIdParamSchema = z.object({
  projectId: z.coerce.number().int().positive(),
});

router.get(
  '/:projectId/knowledge/keywords',
  validate(projectIdParamSchema, 'params'),
  validate(projectKnowledgeQuerySchema, 'query'),
  knowledgeController.listProjectKeywords
);
```

---

## HIGH-2 — controller 层四方法结构完全相同，缺少工厂抽象

**位置**: `knowledge.controller.ts` L627-705

四个 handler 的代码结构**逐行对应**，仅变量名不同：

```typescript
// L627-645  listProjectKeywords
const projectId = parseId(req.params.projectId, '项目ID');
const page = parseInt(req.query.page as string) || 1;
const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
const search = req.query.search as string | undefined;
const { userId, role } = getUser(req);
await checkProjectOperator(projectId, userId, role);
const { keywordService } = getServices();
const { list, total } = await keywordService.listByProject(projectId, page, pageSize, search);
paginate(res, list, total, page, pageSize);
```

| 方法 | 获取的 service | service 方法 | 错误消息 |
|------|---------------|-------------|---------|
| listProjectKeywords | `keywordService` | `listByProject` | 获取关键词列表失败 |
| listProjectPortraits | `portraitService` | `listByProject` | 获取画像列表失败 |
| listProjectImages | `imageService` | `listByProject` | 获取图片列表失败 |
| listProjectDocuments | `documentService` | `listByProject` | 获取文档列表失败 |

**架构影响**：

1. **78 行重复代码**：四个方法共 78 行（L627-705），其中约 60 行是纯重复
2. **修改一处漏一处**：如果 `pageSize` 上限从 100 改为 50，需同步修改 4 处
3. **路由层间接暴露**：`project-knowledge.routes.ts` 绑定了 4 个实质相同的 handler，路由定义本身成为重复的映射

**修复建议**：在 controller 层提取工厂函数

```typescript
type ProjectListService = { listByProject: (projectId: number, page: number, pageSize: number, search?: string) => Promise<{ list: any[]; total: number }> };

function createProjectListHandler(
  getService: (s: ReturnType<typeof getServices>) => ProjectListService,
  errorLabel: string
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const projectId = parseId(req.params.projectId, '项目ID');
      if (projectId === null) { fail(res, 400, '无效的项目ID'); return; }
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.max(1, Math.min(parseInt(req.query.pageSize as string) || 10, 100));
      const search = req.query.search as string | undefined;
      const { userId, role } = getUser(req);
      await checkProjectOperator(projectId, userId, role);
      const service = getService(getServices());
      const { list, total } = await service.listByProject(projectId, page, pageSize, search);
      paginate(res, list, total, page, pageSize);
    } catch (err: unknown) {
      handleControllerError(err, res, errorLabel);
    }
  };
}

export const listProjectKeywords = createProjectListHandler(s => s.keywordService, '获取关键词列表失败');
export const listProjectPortraits = createProjectListHandler(s => s.portraitService, '获取画像列表失败');
export const listProjectImages = createProjectListHandler(s => s.imageService, '获取图片列表失败');
export const listProjectDocuments = createProjectListHandler(s => s.documentService, '获取文档列表失败');
```

---

## HIGH-3 — 路由层与 controller 层的参数解析职责边界模糊

**位置**: L10-13 + `knowledge.controller.ts` L629-633

当前 `projectId` 的校验完全由 controller 层承担：

```typescript
// controller 层 L629-630
const projectId = parseId(req.params.projectId, '项目ID');
if (projectId === null) { fail(res, 400, '无效的项目ID'); return; }
```

**架构问题**：路由层本应是"第一道防线"，负责在请求到达 controller 之前完成结构化校验。当前架构中：

| 职责 | 应有层级 | 实际层级 |
|------|---------|---------|
| `projectId` 类型/范围校验 | 路由层（Zod） | controller 层（parseId） |
| `page`/`pageSize` 范围校验 | 路由层（Zod） | controller 层（parseInt + Math） |
| `search` 长度校验 | 路由层（Zod） | ❌ 无校验 |
| 认证/授权 | 路由层（middleware） | ✅ 路由层 |

**对比项目先例**：`article.routes.ts` L14 的分层模式：

```
请求 → 路由层 validate(listArticlesSchema, 'query') → controller 层业务逻辑
```

当前 project-knowledge 的分层模式：

```
请求 → controller 层 parseId() + parseInt() + 业务逻辑（全部混合）
```

**违反原则**：Single Level of Abstraction — controller 方法中混合了参数解析（基础设施关注点）和业务逻辑（领域关注点）。

---

## MEDIUM-1 — 通配符导入隐式依赖整个 controller 模块

**位置**: L4

```typescript
import * as knowledgeController from '../controller/knowledge.controller';
```

`knowledge.controller.ts` 导出 40+ 函数（包括 keyword、portrait、image、document 的全部 CRUD + 4 个 project 聚合 + inventory + mining），但本路由文件仅使用 4 个。

**影响**：

1. **依赖关系不明确**：读者无法从 import 语句看出实际使用了哪些函数
2. **IDE 跳转效率低**：`knowledgeController.listProjectKeywords` 需要两次跳转（module → function）
3. **与 project.routes.ts 模式一致但非最佳实践**：`project.routes.ts` L6 也使用 `import * as ctrl`

**建议**：使用具名导入

```typescript
import {
  listProjectKeywords,
  listProjectPortraits,
  listProjectImages,
  listProjectDocuments,
} from '../controller/knowledge.controller';
```

---

## MEDIUM-2 — `router.use()` 路径参数作用域模式——与同级路由两种风格并存

**位置**: L9

```typescript
router.use('/:projectId/knowledge', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));
```

项目中路由级中间件的应用存在两种模式：

| 模式 | 使用者 | 特点 |
|------|--------|------|
| 无路径前缀 | `project.routes.ts` L9、`knowledge.routes.ts` L27 | `router.use(authMiddleware, ...)` — 应用于全部路由 |
| 含路径前缀 | `article.routes.ts` L11、`project-knowledge.routes.ts` L9 | `router.use('/:projectId/...', authMiddleware, ...)` — 仅匹配特定前缀 |

**分析**：含路径前缀的模式在逻辑上正确——`project-knowledge.routes.ts` 的所有路由确实都在 `/:projectId/knowledge` 下。但存在以下架构隐患：

1. **路径匹配重复**：L9 定义了 `/:projectId/knowledge`，L10-13 又各定义了完整路径 `/:projectId/knowledge/keywords` 等，路径模式声明了两次
2. **Express 路径参数提取依赖隐式合并**：`router.use('/:projectId/...')` 设置的 `req.params.projectId` 会被后续路由处理器继承，但这个行为是 Express 的隐式约定，非显式契约

**对比**：如果改为无路径前缀模式（与 `project.routes.ts` 一致），需确保中间件仍只应用于目标路由。由于本文件所有路由都需认证，无路径前缀的 `router.use(authMiddleware, ...)` 反而更简洁。

**建议**：统一为无路径前缀模式

```typescript
const router: Router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.get('/:projectId/knowledge/keywords', knowledgeController.listProjectKeywords);
// ...
```

---

## MEDIUM-3 — 缺少模块级架构文档

**位置**: 文件顶部

当前仅有一行注释：

```typescript
// Project Knowledge aggregation routes — scoped under /projects/:projectId/knowledge
```

**缺失信息**：

| 信息项 | 现状 | 影响 |
|--------|------|------|
| 与 `knowledge.routes.ts` 的关系 | 未说明 | 开发者不知道两者分别负责"项目级聚合"和"知识库级 CRUD" |
| 为何只有 GET 路由 | 未说明 | 开发者可能误以为遗漏了 POST/PUT/DELETE |
| 挂载路径 | 注释中说明 | 但未提及 `app.ts` L126 的 `/api/v1/projects` 挂载点 |
| 权限策略 | 未说明 | sysadmin + admin 的选择理由未记录 |

**建议**：

```typescript
/**
 * Project-scoped Knowledge Aggregation Routes
 *
 * 跨知识库聚合查询——按项目维度查看所有关键词/画像/图片/文档。
 * 只读路由（GET only），不支持创建/修改/删除操作。
 *
 * 与 knowledge.routes.ts 的关系：
 *   - 本文件：项目级聚合（/api/v1/projects/:projectId/knowledge/*）
 *   - knowledge.routes.ts：知识库级 CRUD（/api/v1/knowledge-bases/:baseId/*）
 *
 * 挂载点：app.ts → app.use('/api/v1/projects', projectKnowledgeRoutes)
 * 权限：sysadmin + admin（controller 层 checkProjectOperator 限制运营者范围）
 */
```

---

## LOW-1 — `.d.ts` 编译产物缺少请求/响应类型导出

**位置**: `dist/apis/apis/routes/project-knowledge.routes.d.ts`

```typescript
import { Router } from 'express';
declare const router: Router;
export default router;
```

Express 路由模块不需要额外类型导出——default export 的 `Router` 类型足够类型推断。但从长期演进角度，如果未来需要为路由添加 OpenAPI 类型描述（如 `@route GET /:projectId/knowledge/keywords`），当前声明无法承载。

**当前判定**：编译产物正确，无需修改。此为架构演进观察点。

---

## LOW-2 — 与 `article.routes.ts` 共享挂载路径但无合并策略

**位置**: `app.ts` L125-126

```typescript
app.use('/api/v1/projects', articleRoutes);           // L125
app.use('/api/v1/projects', projectKnowledgeRoutes);   // L126
```

两个路由模块共享同一个挂载路径，各自通过不同的子路径（`/:projectId/articles` vs `/:projectId/knowledge`）区分。当前功能正确，但如果未来项目级子资源持续增长（如 `/:projectId/reports`、`/:projectId/settings`），将导致 `app.ts` 中线性增长 `app.use('/api/v1/projects', ...)` 行。

**对比**：`knowledge.routes.ts` 独享 `/api/v1/knowledge-bases` 挂载路径（L127），无需与其他路由模块竞争。

**建议**（长期）：评估创建 `project-index.routes.ts` 作为项目级子资源的聚合入口。

---

## 积极实践（值得保持）

1. **只读路由设计** — 4 条 GET 路由无写入操作，符合"聚合查询不应修改数据"的 REST 原则
2. **常量化角色引用** — `ROLES.SYSADMIN`/`ROLES.ADMIN` 而非字符串字面量，与项目约定一致
3. **Barrel 导入中间件** — 从 `../middleware` 导入而非直接引用文件路径
4. **双重权限纵深** — 路由层 `roleMiddleware` + controller 层 `checkProjectOperator()` 形成纵深防御
5. **与 `article.routes.ts` 结构对称** — 同为项目级子资源路由，使用相同的 scoped middleware 模式，开发者在两个文件间切换时认知负担低
6. **职责单一** — 15 行代码，仅做路由映射，不含业务逻辑

---

## 架构对比：同级路由文件

| 维度 | project.routes.ts | knowledge.routes.ts | article.routes.ts | project-knowledge.routes.ts |
|------|-------------------|--------------------|--------------------|-----------------------------|
| 行数 | 17 | 66 | 25 | 15 |
| 路由数 | 5 | 35 | 12 | 4 |
| validate() | 2（POST/PUT） | 14（全部写操作） | 6（含 GET query） | **0** |
| 中间件模式 | 无路径前缀 | 无路径前缀 | 含路径前缀 | 含路径前缀 |
| 导入方式 | `* as ctrl` | `* as knowledgeController` | `* as ctrl` | `* as knowledgeController` |
| 模块注释 | 无 | 1 行 | 1 行 | 1 行 |
| HTTP 方法 | GET/POST/PUT/DELETE | GET/POST/PUT/DELETE | GET/POST/PUT/DELETE | **GET only** |

**关键发现**：project-knowledge.routes.ts 是项目中唯一一个**纯只读**路由文件，也是唯一一个**完全无 validate()** 的路由文件。article.routes.ts 虽然同为项目级子资源且使用相同的 scoped middleware 模式，但在 GET 路由上仍使用了 `validate(listArticlesSchema, 'query')`。

---

## 架构改进路线图

### 第一阶段（HIGH 级，建议修复）

| # | 问题 | 修复方案 | 预估工作量 |
|---|------|---------|-----------|
| H-1 | 零输入校验 | 创建 Zod schema（params + query）+ 添加 validate() | 30min |
| H-2 | controller 四方法重复 | 提取 `createProjectListHandler` 工厂函数 | 45min |
| H-3 | 参数解析职责混合 | H-1 修复后 controller 可移除 parseId/parseInt | 包含在 H-1 |

### 第二阶段（MEDIUM 级，建议改进）

| # | 问题 | 修复方案 |
|---|------|---------|
| M-1 | 通配符导入 | 改为具名导入 |
| M-2 | scoped middleware 模式 | 评估统一为无路径前缀模式 |
| M-3 | 缺少模块文档 | 添加 JSDoc 模块注释 |

### 第三阶段（长期观察）

| # | 问题 | 修复方案 |
|---|------|---------|
| L-2 | 共享挂载路径 | 评估创建项目级路由聚合入口 |

---

## 修复后预期评分

修复 H-1 + H-2 + H-3 后预期综合评分：**8.5/10**

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 源文件 | apis/routes/project-knowledge.routes.ts |
| 编译产物 | dist/apis/apis/routes/project-knowledge.routes.d.ts |
| 源文件行数 | 15 |
| 路由数量 | 4（GET only） |
| 评审类型 | 软件架构专家评审 |
| 评审日期 | 2026-05-26 |
| 关联文件 | apis/app.ts（L126 挂载）、apis/controller/knowledge.controller.ts（L627-705）、apis/middleware/index.ts、apis/constants/roles.ts |
| 对比文件 | apis/routes/project.routes.ts、apis/routes/knowledge.routes.ts、apis/routes/article.routes.ts |
| 关联评审 | [质量评审](project-knowledge.routes.d.ts.quality.md) 7.0/10 |
