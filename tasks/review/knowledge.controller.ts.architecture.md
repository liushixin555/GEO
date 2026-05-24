# knowledge.controller.ts 软件架构专家评审

**文件**: `apis/controller/knowledge.controller.ts`
**行数**: 940 行
**端点数**: 32 个导出函数
**评审日期**: 2026-05-24
**评审角色**: 软件架构专家

---

## 总体评价

该控制器包含 4 大资源域（Keywords / Portraits / Images / Documents）+ 知识清单聚合 + 关键词挖掘，共 32 个端点处理函数。代码具备基本的输入校验和权限分层，但存在**严重的架构缺陷**，包括：大量重复的 CRUD 模板代码违反 DRY 原则、控制器直接操作 Prisma 破坏分层、缺少输入 schema 验证、错误处理不一致、以及 `listInventory` 函数存在严重性能问题。

---

## 严重问题 (CRITICAL)

### C-1. 控制器直接操作 Prisma —— 严重破坏分层架构

**位置**: L364-369, L396-401, L491-496, L523-528, L660-818, L859-873, L900-904

控制器层出现大量 `getPrisma()` 直接调用，违反 controller → service → repository 的三层架构：

```typescript
// createImage L364-369 — 标题/URL 重复检查直接查数据库
const prisma = getPrisma();
const dupTitle = await prisma.knowledgeImage.findFirst({ where: { baseId, title, deletedAt: null } });
const dupUrl = await prisma.knowledgeImage.findFirst({ where: { baseId, imageUrl: image_url, deletedAt: null } });
```

**问题**:
- 重复检测逻辑散落在控制器中，service 层毫不知情，绕过了 service 的业务规则
- 控制器同时承担了路由编排和数据访问双重职责
- 如果未来需要从其他入口（CLI、消息队列）创建 Image，重复检测逻辑无法复用

**影响**: 架构分层退化、业务逻辑散落、无法复用

**建议**: 所有 Prisma 调用下沉到 service 层，控制器只做参数提取、权限校验编排和响应格式化

### C-2. `listInventory` 函数——940 行文件中近 200 行的"上帝函数"

**位置**: L641-834

```typescript
export async function listInventory(req: Request, res: Response): Promise<void> {
  // 一次性加载 10000 个知识库 (L651)
  const { list: bases } = await knowledgeBaseService.list(1, 10000, ...);
  // 全量加载 4 种资源，全在内存中排序分页 (L699-818)
  const keywords = await prisma.knowledgeKeyword.findMany({ where: kwWhere, orderBy: { updatedAt: 'desc' } });
  const portraits = await prisma.knowledgePortrait.findMany({ where: ptWhere, ... });
  const images = await prisma.knowledgeImage.findMany({ where: imgWhere, ... });
  const documents = await prisma.knowledgeDocument.findMany({ where: docWhere, ... });
}
```

**问题**:
1. **全量加载**: 加载最多 10000 个知识库 + 所有 4 类资源的**全量数据**到内存
2. **内存排序分页**: 在 Node.js 内存中对可能上万条记录做 `.sort()` + `.slice()`，而非数据库分页
3. **无限制查询**: `findMany` 没有 `take` 限制，数据量增长后 OOM 风险极高
4. **N+1 查询模式**: 4 次 `findMany` + 1 次 `findMany`（用户名批量查询），生产环境数据量大时延迟叠加
5. **硬编码 `10000`**: `list(1, 10000, ...)` 不是真正的分页

**影响**: 生产环境 OOM / 响应超时 / 数据库连接池耗尽

**建议**: 拆分为独立 service，使用数据库 `UNION ALL` 或分表查询 + 游标分页，禁止全量加载到内存

### C-3. 无输入 Schema 验证（Zod/Joi）

**位置**: 所有 POST/PUT 端点

路由层 `knowledge.routes.ts` 中只有 `knowledge-base` 使用了 `validate(createKnowledgeBaseSchema)`，所有 32 个知识项端点**完全没有 schema 验证**：

```typescript
// createKeyword L102-103 — 仅做了空值检查
const { keyword } = req.body;
if (!keyword) { fail(res, 400, '关键词不能为空'); return; }
```

**问题**:
- 无法防御类型错误（`keyword` 为数字、对象等）
- 无法限制字段长度（可传入超长字符串）
- `req.body` 中的额外字段直接传递给 service，可能导致 unintended data writing
- `file_size` 应为数字但未做类型校验（L485）

**影响**: 数据完整性风险、注入风险

**建议**: 为每个 POST/PUT 端点创建 Zod schema，在路由层通过 `validate()` 中间件统一拦截

### C-4. `expandKeywords` 无知识库归属校验

**位置**: L187-200

```typescript
export async function expandKeywords(req: Request, res: Response): Promise<void> {
  const baseId = parseInt(req.params.baseId as string, 10);
  if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
  const { keyword } = req.body;
  if (!keyword) { fail(res, 400, '关键词不能为空'); return; }
  // ❌ 没有 checkBaseAccess 调用！
  const keywords = await llmService.expandKeywords(keyword);
  success(res, keywords);
}
```

**问题**: 解析了 `baseId` 但从未调用 `checkBaseAccess(baseId, userId, role)` 验证用户是否有权访问该知识库。虽然 LLM 扩词不直接操作知识库数据，但该端点挂在 `/knowledge-bases/:baseId/keywords/expand` 路径下，语义上应受知识库权限保护。

**影响**: 权限绕过——任何已认证的 admin 可调用任意知识库的扩词功能

**建议**: 在调用 LLM 之前添加 `await checkBaseAccess(baseId, userId, role)`

---

## 高危问题 (HIGH)

### H-1. 大量 CRUD 模板代码重复——4 资源 × 5 操作 ≈ 20 个高度相似的函数

**位置**: Keywords (L54-185), Portraits (L204-308), Images (L312-432), Documents (L436-559)

四种资源（Keyword/Portrait/Image/Document）的 list/get/create/update/delete 函数结构几乎完全一致：

```
parse baseId → check NaN → checkBaseAccess → service call → response
```

**问题**:
- 修改任何通用逻辑（如添加日志、审计）需要修改 20+ 处
- 错误处理分支（`err.message === 'X不存在'`）在每个 catch 块中硬编码

**建议**: 抽取泛型 CRUD 工厂函数：
```typescript
function createCrudHandlers<TEntity>(config: CrudConfig<TEntity>) {
  return { list, get, create, update, delete: deleteHandler };
}
```

### H-2. 错误处理方式不一致——字符串匹配 vs 错误类型

**位置**: 所有 catch 块

```typescript
// 方式 1: 字符串匹配（当前做法）
catch (err: unknown) {
  if (err instanceof Error && err.message === '知识库不存在') { ... }
}

// 方式 2: 项目已有但未使用的错误类体系（errors.ts）
export class NotFoundError extends AppError { ... }
export class BusinessError extends AppError { ... }
```

**问题**:
- 项目已定义 `NotFoundError`/`BusinessError`/`ForbiddenError`，但本控制器完全未使用
- 通过 `err.message` 做字符串匹配脆弱且不可维护——service 层修改消息文本会导致 controller 静默失败
- 多个 catch 块中的条件链越来越长（如 L93、L239、L347），易遗漏分支

**建议**: service 层抛出 `NotFoundError`/`BusinessError` 等 typed errors，controller 统一通过 `instanceof` 捕获

### H-3. `parseInt` 未处理负数和零

**位置**: 所有 `parseInt` 调用（L56, L79, L99 等）

```typescript
const baseId = parseInt(req.params.baseId as string, 10);
if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
// ❌ baseId = 0 或 baseId = -1 会通过验证
```

**建议**: 添加范围检查 `if (isNaN(baseId) || baseId <= 0)`

### H-4. `checkBaseAccess` 未覆盖 `view` 角色场景

**位置**: L26-50

```typescript
async function checkBaseAccess(baseId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  // ❌ 没有 role === 'view' 的拦截
```

**问题**: 虽然路由层 `roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN)` 已限制，但 controller 层的权限检查函数应与项目铁律一致——view 角色在所有场景都应被拦截。当前如果有人绕过路由中间件（如新增路由忘记加 roleMiddleware），view 角色可以访问知识库数据。

**建议**: 在 `checkBaseAccess` 开头添加 view 角色显式拒绝：
```typescript
if (role === 'view') throw new ForbiddenError('权限不足');
```

### H-5. `mineKeywords` 在控制器中拼接业务内容

**位置**: L859-877

```typescript
// 控制器直接查询 3 张表，拼接内容字符串
if (sourceType === 'all' || sourceType === 'document') {
  const docs = await prisma.knowledgeDocument.findMany({ where: { baseId, deletedAt: null } });
  contentParts.push(...docs.map((d: any) => `[文档] 标题: ${d.title}...`));
}
```

**问题**:
- 控制器直接操作 Prisma 查询 3 张表
- 内容拼接逻辑属于业务规则，应在 service 层
- `substring(0, 8000)` 硬编码截断长度，大文档可能截断在 UTF-8 多字节字符中间

**建议**: 将内容聚合逻辑下沉到 `MinedKeywordService` 或新建 `ContentAggregationService`

### H-6. `saveMinedKeywords` 事务不一致

**位置**: L888-910

```typescript
const result = await keywordService.batchCreate(baseId, keywords, userId, '关键词挖掘');
// 然后单独执行删除
await prisma.minedKeyword.updateMany({ ... });
```

**问题**: 关键词创建和挖掘词删除是两个独立操作，没有事务保护。如果 `updateMany` 失败，关键词已创建但挖掘词未标记删除，导致数据不一致。

**建议**: 使用 Prisma `$transaction` 包裹两个操作

---

## 中等问题 (MEDIUM)

### M-1. 模块级 service 实例化——无法 mock 测试

**位置**: L9-16

```typescript
const keywordService = new KeywordServiceImpl();
const portraitService = new PortraitServiceImpl();
// ...
```

**问题**: 8 个 service 实例在模块加载时创建，测试时无法替换为 mock 对象。

**建议**: 使用依赖注入或至少使用延迟初始化工厂函数

### M-2. `listInventory` 响应格式与其他端点不一致

**位置**: L823-830

```typescript
res.json({
  code: 0,
  data: {
    stats: { keyword: keywordCount, ... },
    list: pagedItems,
    total,
  },
});
```

其他列表端点使用 `paginate()` 工具函数返回 `{ code: 0, data: { list, total, page, pageSize } }` 格式，而 `listInventory` 直接 `res.json()` 且缺少 `page`/`pageSize` 字段。

**建议**: 使用 `paginate()` 或至少保持响应结构一致

### M-3. `listInventory` 中 `deletedAt: null` 过滤不一致

**位置**: L664-668 vs L697-775

```typescript
// 计数时没有 deletedAt 过滤
const baseFilter = { baseId: { in: baseIds } };
const keywordCount = await prisma.knowledgeKeyword.count({ where: baseFilter });

// 详情查询时也没有 deletedAt 过滤（kwWhere 继承了 baseFilter）
const kwWhere: any = { ...baseFilter }; // 缺少 deletedAt: null
```

但 service 层的其他 list 方法都包含 `deletedAt: null`。如果有关键词被软删除，`listInventory` 的统计数和列表都会包含已删除数据。

**建议**: `baseFilter` 中添加 `deletedAt: null`

### M-4. update 操作缺少 `checkBaseAccess`

**位置**: L115-140 (updateKeyword), L262-284 (updatePortrait), L378-408 (updateImage), L505-535 (updateDocument)

所有 update/delete 函数都没有调用 `checkBaseAccess`，而是通过 `existing.base_id !== baseId` 间接判断。但 `baseId` 来自请求参数，如果攻击者构造其他 baseId，仍可通过所有权检查（`created_by === userId`）修改自己创建的资源——虽然限制在同类资源内，但绕过了知识库级别访问控制。

**建议**: 在 update/delete 中也调用 `checkBaseAccess`

### M-5. `batchCreateKeywords` 缺少数组长度上限

**位置**: L166-185

```typescript
if (!Array.isArray(keywords) || keywords.length === 0) { ... }
// ❌ 没有上限检查，可传入百万级数组
```

**建议**: 添加 `if (keywords.length > 500)` 等上限限制

---

## 低危问题 (LOW)

### L-1. `req.params` 类型断言冗余

**位置**: 所有 `parseInt(req.params.baseId as string, 10)`

Express 的 `req.params` 值已经是 `string` 类型，`as string` 断言多余。

### L-2. 错误信息硬编码中文

**位置**: 所有 catch 块和 fail 调用

中文错误信息直接硬编码在代码中，如果未来需要 i18n 支持会很困难。建议使用错误码 + 消息映射表。

### L-3. `getScopeLabel` 函数定义在 `listInventory` 内部

**位置**: L690-694

```typescript
const getScopeLabel = (base: typeof bases[0]) => { ... };
```

每次请求都重新定义函数，虽然性能影响极小，但应提取为模块级工具函数。

### L-4. `created_by` 类型不安全

**位置**: L127, L154, L274, L298, L390, L422, L517, L549

```typescript
if (role !== 'sysadmin' && existing.created_by !== userId)
```

`created_by` 可能为 `null`（数据库允许），与 `userId: number` 比较时 `null !== number` 永远为 true，可能产生非预期行为。

---

## 量化评估

| 维度 | 评分 (1-10) | 说明 |
|------|-------------|------|
| 架构分层 | 3 | 控制器直接操作 ORM，分层退化严重 |
| DRY 原则 | 2 | 4 资源 × 5 操作的模板代码高度重复 |
| 错误处理 | 4 | 有统一格式但使用字符串匹配而非类型系统 |
| 安全性 | 5 | 有基本权限校验但存在绕过点 |
| 输入验证 | 3 | 无 schema 验证，仅空值检查 |
| 性能 | 2 | listInventory 全量加载到内存 |
| 可测试性 | 3 | 模块级实例化无法 mock |
| 可维护性 | 3 | 940 行单文件、模板代码多 |

**综合评分**: **3.1 / 10**

---

## 修复优先级路线图

| 优先级 | 编号 | 修复建议 | 预估工时 |
|--------|------|----------|----------|
| P0 | C-2 | `listInventory` 重构为数据库分页 | 2d |
| P0 | C-3 | 为所有 POST/PUT 添加 Zod schema | 1d |
| P0 | C-4 | `expandKeywords` 添加 `checkBaseAccess` | 0.5h |
| P1 | C-1 | Prisma 调用下沉到 service 层 | 2d |
| P1 | H-1 | CRUD 泛型工厂函数 | 1.5d |
| P1 | H-2 | 统一使用 typed errors | 1d |
| P1 | H-3 | 添加负数/零 ID 检查 | 0.5h |
| P1 | H-4 | checkBaseAccess 显式拒绝 view 角色 | 0.5h |
| P1 | H-5 | 内容聚合逻辑下沉 service | 0.5d |
| P1 | H-6 | saveMinedKeywords 添加事务 | 1h |
| P2 | M-1~5 | 依赖注入、响应格式、软删除过滤等 | 1d |
| P2 | L-1~4 | 小修复 | 0.5d |

**总计预估**: ~8 个工作日

---

## 总结

`knowledge.controller.ts` 是一个典型的"快速原型阶段"产物——功能完整但架构质量差。核心问题是：

1. **分层退化**: 控制器承担了过多数据访问职责，应严格回归到"参数提取 → 权限校验 → 调用 service → 格式化响应"的单一职责
2. **模板泛滥**: 4 种资源的 CRUD 代码高度雷同，是引入泛型工厂的最佳候选
3. **验证缺失**: 缺少 Zod schema 验证是最大的安全隐患
4. **性能隐患**: `listInventory` 的全量内存操作在生产环境将不可用

建议按 P0 → P1 → P2 顺序分阶段修复，优先解决安全和性能问题。
