# apis/controller/knowledge.controller.ts — 软件质量专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件质量专家（代码质量 + 可维护性 + 安全性 + 性能 + 类型安全 + 最佳实践）
**文件路径**: `apis/controller/knowledge.controller.ts`
**代码行数**: 906 行（28 个导出函数 + 2 个内部辅助函数 + 8 个模块级服务实例）
**关联文件**: `apis/service/impl/knowledge.service.impl.ts`, `apis/service/impl/knowledge-base.service.impl.ts`, `apis/service/impl/project.service.impl.ts`, `apis/service/impl/llm.service.impl.ts`, `apis/utils/response.util.ts`

---

## 一、总体评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码质量 | 4/10 | 大量重复代码、类型安全问题、控制器直接访问 ORM |
| 可维护性 | 3/10 | 906 行远超 800 行上限，listInventory 单函数 193 行极度臃肿 |
| 安全性 | 5/10 | checkBaseAccess 为空函数，多处端点缺少权限校验 |
| 性能 | 3/10 | listInventory 全量加载 + 内存排序 + 内存分页，严重性能隐患 |
| 类型安全 | 2/10 | 32 处 `err: any`，7 处 Prisma 查询 `: any`，全面绕过类型系统 |
| 最佳实践 | 3/10 | 控制器层直接操作 Prisma ORM，违反分层架构原则 |

**严重问题数**: CRITICAL × 5 / HIGH × 6 / MEDIUM × 5 / LOW × 3

---

## 二、问题清单

### CRITICAL 级别

#### C-1: 文件严重超长（906 行），违反单一职责

**位置**: 全文件

**问题描述**: 文件包含 Keywords、Portraits、Images、Documents、Project-scoped Aggregation、Knowledge Inventory、Mined Keywords 共 7 个独立功能域，28 个导出函数。这远超 800 行上限，违反单一职责原则。

**影响**: 难以定位问题、代码审查困难、多人协作易冲突。

**修复建议**: 按功能域拆分为独立控制器文件：

```
controllers/
├── knowledge-keyword.controller.ts      (~200行) 关键词 CRUD + 批量创建 + 智能扩词
├── knowledge-portrait.controller.ts     (~120行) 画像 CRUD
├── knowledge-image.controller.ts        (~130行) 图片 CRUD（含去重检查）
├── knowledge-document.controller.ts     (~130行) 文档 CRUD（含去重检查）
├── knowledge-inventory.controller.ts    (~200行) 知识清单聚合
├── knowledge-mining.controller.ts       (~100行) 关键词挖掘
├── knowledge-project.controller.ts      (~80行)  项目维度聚合查询
└── knowledge.helpers.ts                 (~40行)   checkProjectOperator + checkBaseAccess
```

---

#### C-2: `checkBaseAccess` 为空函数，安全检查形同虚设

**位置**: 第 26-37 行

```typescript
async function checkBaseAccess(baseId: number, userId: number, role: string): Promise<void> {
  const base = await knowledgeBaseService.getById(baseId);
  if (role === 'sysadmin') return;

  // Check if user can access this base
  if (base.scope === 'platform') return; // platform bases are visible to all

  // For company scope: check if user belongs to the company
  // For project scope: check if user is an operator
  // This is already filtered in the list endpoint, but for direct access we check here
  // For now, allow access - the list endpoint handles visibility
}
```

**问题描述**: 函数虽然查询了 base 数据，但注释里明确写了 "For now, allow access"。这意味着：
1. `company` 作用域的知识库，任何登录用户均可直接访问（只需知道 baseId）
2. `project` 作用域的知识库，非项目操作人也可访问
3. **安全隐患**: 攻击者可通过遍历 baseId 访问其他公司/项目的知识库内容

该函数被 10 个端点调用（listKeywords、createKeyword、listPortraits、createPortrait、listImages、createImage、listDocuments、createDocument、expandKeywords、batchCreateKeywords），全部存在越权风险。

**修复建议**:

```typescript
async function checkBaseAccess(baseId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const base = await knowledgeBaseService.getById(baseId);
  if (base.scope === 'platform') return;
  if (base.scope === 'company') {
    // 检查用户是否属于该公司
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.companyId !== base.companyId) {
      throw new Error('无权访问该知识库');
    }
  }
  if (base.scope === 'project') {
    await checkProjectOperator(base.projectId!, userId, role);
  }
}
```

---

#### C-3: `listInventory` 函数（193 行）存在严重性能问题

**位置**: 第 615-808 行

**问题描述**:

1. **全量加载所有知识库** (第 625 行): `await knowledgeBaseService.list(1, 10000, ...)` — 硬编码 page=1, pageSize=10000，当知识库数量增长时将加载全部数据到内存
2. **全量查询所有实体** (第 670-769 行): 对 keyword/portrait/image/document 四张表分别执行无分页的 `findMany`，全量加载到内存
3. **内存排序** (第 792 行): `items.sort(...)` 对全量数据排序
4. **内存分页** (第 795 行): `items.slice(...)` 在内存中分页
5. **无条件全量计数** (第 638-643 行): 即使前端只需要某个 category 的数据，也计数全部四种类型

当数据库中有数万条记录时，此接口将导致严重的内存消耗和响应延迟。

**修复建议**:

```typescript
// 方案 A: 使用 SQL UNION ALL + LIMIT/OFFSET 实现数据库层分页
// 方案 B: 使用 service 层的聚合方法，在数据库层完成统计和分页
// 方案 C: 拆分为独立接口（stats 接口 + 分类列表接口）
```

---

#### C-4: 控制器层直接操作 Prisma ORM，严重违反分层架构

**位置**: 第 341-346、375-377、465-469、499-501、634-777、830-844、870-874 行

共 7 处控制器代码直接调用 `getPrisma()` 执行数据库查询。

```typescript
// 第 341-346 行 — createImage
const prisma = getPrisma();
const dupTitle = await prisma.knowledgeImage.findFirst({ where: { baseId, title, deletedAt: null } });
if (dupTitle) { fail(res, 400, '该知识库已存在相同标题的图片'); return; }
const dupUrl = await prisma.knowledgeImage.findFirst({ where: { baseId, imageUrl: image_url, deletedAt: null } });
if (dupUrl) { fail(res, 400, '该知识库已存在相同的图片'); return; }
```

**问题描述**:
1. **违反分层架构**: 控制器层应只负责参数提取、验证和响应构造，不应包含数据访问逻辑
2. **不可测试**: Prisma 调用硬编码在控制器中，单元测试无法 mock
3. **重复业务逻辑**: 去重检查应在 service 层实现，而非控制器层

**修复建议**: 将所有 Prisma 调用下沉到 service 层：

```typescript
// service 层
async function create(baseId: number, data: CreateImageDto, userId: number): Promise<Image> {
  // 在 service 层做去重检查
  const existing = await this.prisma.knowledgeImage.findFirst({ where: { baseId, title: data.title } });
  if (existing) throw new ValidationError('该知识库已存在相同标题的图片');
  // ...
}

// controller 层 — 只做参数提取和错误处理
export async function createImage(req: Request, res: Response): Promise<void> {
  const baseId = parseInt(req.params.baseId, 10);
  if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
  const { title, image_url } = req.body;
  if (!title || !image_url) { fail(res, 400, '标题和图片地址不能为空'); return; }
  const { userId, role } = req.user!;
  await checkBaseAccess(baseId, userId, role);
  const item = await imageService.create(baseId, req.body, userId);
  res.status(201).json({ code: 0, message: '创建图片成功', data: item });
}
```

---

#### C-5: 全部 32 处 catch 块使用 `err: any`，类型安全完全丧失

**位置**: 全文件 32 个 catch 块（第 55、73、91、118、142、163、178、199、217、236、260、284、305、323、350、382、406、427、444、474、506、530、551、570、589、608、805、818、854、877、891、902 行）

```typescript
} catch (err: any) {
  fail(res, 500, err.message || '获取关键词列表失败');
}
```

**问题描述**: 使用 `err: any` 丧失了 TypeScript 的类型安全保障，且访问 `err.message` 时没有类型收窄。参考 `knowledge-base.controller.ts` 已修复为 `err: unknown` + `instanceof Error` 模式。

**修复建议**:

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : '获取关键词列表失败';
  fail(res, 500, message);
}
```

---

### HIGH 级别

#### H-1: `getKeyword`/`getPortrait`/`getImage`/`getDocument` 缺少访问权限检查

**位置**: 第 60-76、204-220、310-326、432-447 行

```typescript
export async function getKeyword(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    const id = parseInt(req.params.id as string, 10);
    // ...
    const { userId, role } = req.user!;  // 取了用户信息
    const item = await keywordService.getById(id);  // 但没有调用 checkBaseAccess
    // ...
  }
}
```

**问题描述**: 这 4 个 get 端点解构了 `userId` 和 `role` 但从未调用 `checkBaseAccess`。任何已登录用户只需知道记录 ID 即可获取其他知识库的详情数据。虽然 C-2 的 `checkBaseAccess` 目前是空函数，但即使修复后这里也缺少调用。

**修复建议**: 添加 `await checkBaseAccess(baseId, userId, role);`

---

#### H-2: `updateKeyword`/`updatePortrait` 等端点中 `req.user!` 非空断言不安全

**位置**: 第 103、130、248、272、362、394、486、518 行（8 处 update/delete 操作中）

```typescript
const { userId, role } = req.user!;
```

**问题描述**: `req.user!` 使用非空断言操作符，假设 `req.user` 一定存在。虽然路由层面有 `authMiddleware` 保护，但防御性编程要求不依赖调用链隐含的假设。对比 `knowledge-base.controller.ts` 已修复为显式空值检查。

**修复建议**:

```typescript
const user = req.user;
if (!user) { fail(res, 401, '未登录'); return; }
const { userId, role } = user;
```

---

#### H-3: `mineKeywords` 缺少 `checkBaseAccess` 和 `source_type` 输入验证

**位置**: 第 823-857 行

```typescript
const { userId } = req.user!;
const sourceType = req.body.source_type || 'all';
```

**问题描述**:
1. 没有调用 `checkBaseAccess(baseId, userId, role)` — 任何用户可对任意知识库执行挖掘操作
2. `source_type` 没有枚举验证，用户可传入任意值（虽然后续 if 条件会跳过，但属于输入验证缺失）
3. 只解构了 `userId` 而忽略了 `role`，无法执行基于角色的权限检查

**修复建议**:

```typescript
const { userId, role } = req.user!;
const validTypes = ['all', 'document', 'portrait', 'image'];
const sourceType = validTypes.includes(req.body.source_type) ? req.body.source_type : 'all';
await checkBaseAccess(baseId, userId, role);
```

---

#### H-4: `saveMinedKeywords` 直接操作 Prisma 执行软删除，绕过 service 层

**位置**: 第 869-874 行

```typescript
// Delete saved keywords from mined list
const prisma = getPrisma();
await prisma.minedKeyword.updateMany({
  where: { baseId, keyword: { in: keywords }, deletedAt: null },
  data: { deletedAt: new Date() },
});
```

**问题描述**: 控制器层直接调用 Prisma 执行软删除，应委托给 `minedKeywordService` 处理。且 `keywordService.batchCreate` 和 `prisma.minedKeyword.updateMany` 不在同一个事务中，若 `batchCreate` 成功但后续操作失败会导致数据不一致。

**修复建议**: 在 `minedKeywordService` 中添加 `markAsSaved` 方法，并考虑事务包裹。

---

#### H-5: `pageSize` 无上限约束，可被设为极大值导致 OOM

**位置**: 第 47、191、297、419、543、562、581、600、618 行（9 处）

```typescript
const pageSize = parseInt(req.query.pageSize as string) || 10;
```

**问题描述**: 用户可传入 `pageSize=999999`，`listInventory` 函数中会尝试加载所有数据并分片返回。虽然 service 层的 list 方法可能有 LIMIT 保护，但 `listInventory` 是在内存中分页的，没有上限保护。

**修复建议**:

```typescript
const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
```

---

#### H-6: `listInventory` 硬编码 `pageSize=10000` 全量查询知识库

**位置**: 第 625 行

```typescript
const { list: bases } = await knowledgeBaseService.list(1, 10000, undefined, undefined, undefined, userId, role);
```

**问题描述**: 硬编码 `pageSize=10000` 获取所有知识库。当知识库数量超过 10000 时会丢失数据，且在大多数场景下远不需要这么多。

**修复建议**: 知识库数量通常不大，但应使用专门的 service 方法获取 ID 列表而非分页列表，避免加载不必要的字段。

---

### MEDIUM 级别

#### M-1: CRUD 操作函数高度重复，违反 DRY 原则

**位置**: 全文件

**问题描述**: Keywords（5 个函数）、Portraits（5 个函数）、Images（5 个函数）、Documents（5 个函数）的 CRUD 结构几乎完全相同：
- 参数解析（baseId、id）
- `isNaN` 验证
- `req.user!` 解构
- `checkBaseAccess` 调用
- service 调用
- `err.message === '...'` 字符串匹配
- 错误响应

4 种资源共 20 个函数中，约 70% 的代码是结构重复的。

**修复建议**: 可考虑使用工厂函数生成 CRUD 控制器：

```typescript
function createCrudHandlers<T>(config: CrudConfig<T>) {
  return {
    list: async (req: Request, res: Response) => { /* 通用 list 逻辑 */ },
    get: async (req: Request, res: Response) => { /* 通用 get 逻辑 */ },
    create: async (req: Request, res: Response) => { /* 通用 create 逻辑 */ },
    update: async (req: Request, res: Response) => { /* 通用 update 逻辑 */ },
    delete: async (req: Request, res: Response) => { /* 通用 delete 逻辑 */ },
  };
}
```

---

#### M-2: `listInventory` 中 Prisma 查询使用 `any` 类型（4 处）

**位置**: 第 671、695、719、743 行

```typescript
const kwWhere: any = { ...baseFilter };
if (search) kwWhere.keyword = { contains: search, mode: 'insensitive' };
```

**问题描述**: 使用 `any` 绕过 Prisma 的类型安全查询系统。Prisma 提供了完善的 `Prisma.KnowledgeKeywordWhereInput` 类型。

**修复建议**:

```typescript
import { Prisma } from '@prisma/client';
const kwWhere: Prisma.KnowledgeKeywordWhereInput = { baseId: { in: baseIds } };
if (search) kwWhere.keyword = { contains: search, mode: 'insensitive' };
```

---

#### M-3: `listInventory` 中用户查询的 map 回调使用 `any`

**位置**: 第 777 行

```typescript
const creatorMap = new Map(creators.map((c: any) => [c.id, c.cnName || '']));
```

**问题描述**: `select: { id: true, cnName: true }` 的返回类型完全可推导，无需 `any`。

---

#### M-4: `mineKeywords` 中 map 回调使用 `any`（3 处）

**位置**: 第 835、839、843 行

```typescript
contentParts.push(...docs.map((d: any) => `[文档] 标题: ${d.title}...`));
```

**问题描述**: Prisma `findMany` 返回的类型已包含 `title`、`description` 等字段，无需 `any`。

---

#### M-5: `expandKeywords` 未验证 `keyword` 长度

**位置**: 第 168-181 行

```typescript
const { keyword } = req.body;
if (!keyword) { fail(res, 400, '关键词不能为空'); return; }
const keywords = await llmService.expandKeywords(keyword);
```

**问题描述**: 未限制 `keyword` 长度，恶意用户可传入超长字符串导致 LLM 调用消耗大量 token。

**修复建议**: 添加长度限制：`if (keyword.length > 200) { fail(res, 400, '关键词长度不能超过200'); return; }`

---

### LOW 级别

#### L-1: `checkProjectOperator` 错误处理不一致

**位置**: 第 18-24 行

```typescript
async function checkProjectOperator(projectId: number, userId: number, role: string): Promise<void> {
  if (role === 'sysadmin') return;
  const project = await projectService.getById(projectId, userId, role);
  if (!project.operator_ids.includes(userId)) {
    throw new Error('无权操作该项目');
  }
}
```

**问题描述**: 函数通过 `throw new Error` 抛出错误，但 `projectService.getById` 本身也可能抛出异常（如项目不存在）。调用方只匹配 `'无权操作该项目'`，其他异常会被统一 500 处理，可能丢失有意义的错误信息。

---

#### L-2: `batchCreateKeywords` 和 `saveMinedKeywords` 未限制批量数量

**位置**: 第 152-153、865 行

```typescript
if (!Array.isArray(keywords) || keywords.length === 0) {
```

**问题描述**: 未设置上限，用户可传入数万个关键词导致批量插入超时。

---

#### L-3: `toggleMinedKeywordsBatch` 缺少 `selected` 参数验证

**位置**: 第 886 行

```typescript
const { ids, selected } = req.body;
if (!Array.isArray(ids) || ids.length === 0) { fail(res, 400, '请选择关键词'); return; }
```

**问题描述**: 未验证 `selected` 是否为 boolean，可能导致 service 层处理异常。

---

## 三、问题统计

| 级别 | 数量 | 编号 |
|------|------|------|
| CRITICAL | 5 | C-1, C-2, C-3, C-4, C-5 |
| HIGH | 6 | H-1, H-2, H-3, H-4, H-5, H-6 |
| MEDIUM | 5 | M-1, M-2, M-3, M-4, M-5 |
| LOW | 3 | L-1, L-2, L-3 |
| **合计** | **19** | |

---

## 四、修复优先级建议

### P0 — 必须立即修复（安全 + 类型安全）

| 编号 | 问题 | 影响面 |
|------|------|--------|
| C-2 | checkBaseAccess 空函数 | 10 个端点可被越权访问 |
| C-5 | 32 处 `err: any` | 全文件类型安全丧失 |
| H-1 | 4 个 get 端点缺少权限检查 | 详情数据可被任意用户获取 |
| H-2 | 8 处 `req.user!` 非空断言 | 潜在运行时崩溃 |
| H-3 | mineKeywords 缺少权限检查 | 任意用户可执行挖掘 |

### P1 — 本迭代内修复（架构 + 性能）

| 编号 | 问题 | 影响面 |
|------|------|--------|
| C-1 | 文件超长（906 行） | 可维护性 |
| C-3 | listInventory 性能问题 | 生产环境响应慢/内存溢出 |
| C-4 | 控制器直接操作 Prisma | 分层架构违反 |
| H-4 | saveMinedKeywords 绕过 service 层 | 事务一致性 |
| H-5 | pageSize 无上限 | 潜在 OOM |

### P2 — 后续迭代修复（代码质量）

| 编号 | 问题 | 影响面 |
|------|------|--------|
| H-6 | 硬编码 pageSize=10000 | 可扩展性 |
| M-1 | CRUD 代码重复 | 可维护性 |
| M-2~M-4 | `any` 类型（8 处） | 类型安全 |
| M-5 | expandKeywords 无长度限制 | LLM 成本控制 |
| L-1~L-3 | 参数验证缺失 | 边界处理 |

---

## 五、与已修复的 knowledge-base.controller.ts 对比

`knowledge-base.controller.ts` 在之前的评审中已修复了以下问题，但 `knowledge.controller.ts` 仍存在：

| 已修复问题 | knowledge-base.controller | knowledge.controller |
|-----------|--------------------------|---------------------|
| `err: unknown` + `instanceof Error` | ✅ 已修复 | ❌ 32 处 `err: any` |
| `req.user` 空值保护 | ✅ 已修复 | ❌ 27 处 `req.user!` |
| `pageSize` 上限 | ✅ 已修复 | ❌ 9 处无上限 |
| `page` 范围校验 | ✅ 已修复 | ❌ 未校验 |
| `created()` 响应函数 | ✅ 已修复 | ❌ 仍使用 `res.status(201).json(...)` |
