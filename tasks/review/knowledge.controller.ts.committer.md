# apis/controller/knowledge.controller.ts — Committer 审核专家评审报告

**评审日期**: 2026-05-24
**评审角色**: Committer 审核专家（代码合并准入 + 测试完备性 + API 契约正确性 + 项目规范遵循 + 生产就绪度）
**文件路径**: `apis/controller/knowledge.controller.ts`
**代码行数**: 940 行（28 个导出函数 + 2 个内部辅助函数 + 8 个模块级服务实例）
**测试文件**: `tests/apis/knowledge.controller.test.ts`（3561 行，含 239 个测试用例）
**关联路由**: `apis/routes/knowledge.routes.ts`
**关联文件**: `apis/service/impl/knowledge.service.impl.ts`, `apis/entity/knowledge.entity.ts`, `apis/utils/response.util.ts`, `apis/errors.ts`
**已有评审**: 架构评审（knowledge.controller.ts.architecture.md）、质量评审（knowledge.controller.ts.md）、安全评审（knowledge.controller.security.md — 旧版）、修复记录（knowledge.controller.fix.md — 旧版）

---

## 一、Committer 审核总览

从代码提交审核人（Committer）视角审视，本文件是项目中**规模最大的控制器**——940 行涵盖 4 大资源域（Keywords / Portraits / Images / Documents）的完整 CRUD + 项目级聚合 + 知识清单 + 关键词挖掘，共 28 个端点处理函数。代码具备基本的输入校验、权限分层和错误处理，测试覆盖 239 个用例。但存在**多个阻塞性问题**需要合并前修复。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 功能完整性 | 8/10 | 条件通过 — 28 个端点功能完整，但 expandKeywords 缺权限检查、saveMinedKeywords 非事务 |
| 测试完备性 | 7.5/10 | 条件通过 — 239 用例覆盖所有端点，但缺少 listInventory 性能边界测试和 saveMinedKeywords 事务失败测试 |
| API 契约正确性 | 6/10 | 不通过 — 无 Zod schema 验证、listInventory 响应格式不一致、URL 字段无格式校验 |
| 项目规范遵循 | 7/10 | 条件通过 — 函数式导出、success/fail/created/paginate 工具函数使用正确，但控制器直接操作 Prisma 违反分层 |
| 生产就绪度 | 4/10 | 不通过 — listInventory 全量内存分页存在 OOM 风险、输入无长度限制、saveMinedKeywords 非事务 |
| 向后兼容性 | 10/10 | 通过 — 新模块，无兼容性问题 |

**综合判定: 需修改后合并（REQUEST CHANGES）**

---

## 二、与已有评审的交叉审核

### 2.1 各评审核心发现汇总

| 评审来源 | 问题总数 | CRITICAL | HIGH | MEDIUM | LOW | Committer 评估 |
|----------|---------|----------|------|--------|-----|---------------|
| 架构评审 | 17 | 4 | 6 | 5 | 2 | 认可，问题分类准确 |
| 质量评审 | 23 | 6 | 8 | 6 | 3 | 认可，覆盖面更广 |
| 安全评审（旧版） | — | — | — | — | — | 已过时，需重新评估 |
| **Committer 评审** | **16** | **3** | **6** | **4** | **3** | 见下文 |

### 2.2 Committer 独立发现与采纳情况

| 编号 | 问题 | 来源 | Committer 判定 | 理由 |
|------|------|------|---------------|------|
| CMT-C-01 | expandKeywords 缺 checkBaseAccess | 架构 C-4 / 质量 C-1 | **阻塞合并** | 越权漏洞，任何 admin 可调用任意知识库 LLM 扩词 |
| CMT-C-02 | listInventory 全量内存分页 OOM | 架构 C-2 / 质量 C-2 | **阻塞合并** | 生产环境数据增长后必然 OOM/超时 |
| CMT-C-03 | saveMinedKeywords 非事务 | 架构 H-6 / 质量 C-3 | **阻塞合并** | 数据不一致风险，关键词已创建但挖掘词未删除 |
| CMT-H-01 | 无 Zod schema 验证 | 架构 C-3 | **不阻塞但强烈建议** | 路由层完全无 validate() 中间件，但 Controller 有手动校验 |
| CMT-H-02 | 控制器直接操作 Prisma（7 处） | 架构 C-1 / 质量 H-2 | **不阻塞** | 重复检测逻辑在 Controller 中，违反分层但不影响功能正确性 |
| CMT-H-03 | batchCreateKeywords 无数组长度上限 | 架构 M-5 / 质量 H-5 | **阻塞合并** | 可提交百万级数组导致数据库锁表 |
| CMT-H-04 | URL 字段无格式校验 | 质量 H-6 | **不阻塞** | image_url/file_url 可为任意字符串，但存储风险由前端渲染层控制 |
| CMT-H-05 | file_size 类型未校验 | 质量 H-7 | **不阻塞** | 可为负数/非数字，但数据库类型约束兜底 |
| CMT-H-06 | update/delete 缺 checkBaseAccess | 架构 M-4 | **不阻塞** | 通过 created_by 所有权检查间接保护，风险较低 |
| CMT-M-01 | parseInt 允许零和负数 | 架构 H-3 / 质量 M-1 | **不阻塞** | Prisma 查询返回空结果，无安全影响 |
| CMT-M-02 | listInventory 响应格式不一致 | 架构 M-2 | **不阻塞** | 直接 res.json 而非 paginate()，缺少 page/pageSize |
| CMT-M-03 | listInventory 缺 deletedAt 过滤 | 架构 M-3 | **不阻塞** | 可能包含已删除数据，但功能影响有限 |
| CMT-M-04 | toggleMinedKeywordsBatch selected 未校验 | 质量 M-5 | **不阻塞** | 未校验布尔类型，但 service 层兜底 |
| CMT-L-01 | 错误消息字符串匹配方式 | 架构 H-2 / 质量 M-3 | **不阻塞** | 项目已有 NotFoundError 等错误类但未使用，属技术债务 |
| CMT-L-02 | 8 个模块级 service 实例化 | 架构 M-1 / 质量 L-3 | **不阻塞** | 项目通用模式，jest.mock 可测试 |
| CMT-L-03 | req.params 冗余 as string 断言 | 架构 L-1 | **不阻塞** | 无功能影响 |

---

## 三、阻塞性问题详细分析（Merge 前必须修复）

### CMT-C-01: `expandKeywords` 缺少知识库访问权限检查 — 越权漏洞

**严重级别**: CRITICAL（安全）
**位置**: 第 187-200 行
**来源**: 架构 C-4 / 质量 C-1

```typescript
export async function expandKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }

    const { keyword } = req.body;
    if (!keyword) { fail(res, 400, '关键词不能为空'); return; }

    // ❌ 缺少: const { userId, role } = req.user!;
    // ❌ 缺少: await checkBaseAccess(baseId, userId, role);

    const keywords = await llmService.expandKeywords(keyword);
    success(res, keywords);
  } catch (err: unknown) {
    fail(res, 500, '智能扩词失败');
  }
}
```

**问题**:
- 解析了 `baseId` 但从未调用 `checkBaseAccess(baseId, userId, role)` 验证用户权限
- 也未解构 `req.user!`，意味着根本没有认证上下文检查
- 该接口调用外部 LLM 服务（`llmService.expandKeywords`），任何已认证 admin 可无限调用，存在资源滥用风险

**修复方案**:

```typescript
const { userId, role } = req.user!;
await checkBaseAccess(baseId, userId, role);
const keywords = await llmService.expandKeywords(keyword);
```

**预估工时**: 0.5h

---

### CMT-C-02: `listInventory` 全量内存分页 — OOM 及性能灾难

**严重级别**: CRITICAL（性能 + 可靠性）
**位置**: 第 641-834 行（194 行单函数）
**来源**: 架构 C-2 / 质量 C-2

**执行流程分析**:

```
1. knowledgeBaseService.list(1, 10000, ...) → 加载最多 10000 个知识库
2. Promise.all([count×4])                    → 4 次计数查询（合理）
3. prisma.knowledgeKeyword.findMany()         → 加载所有关键词（无 take 限制）
4. prisma.knowledgePortrait.findMany()        → 加载所有画像（无 take 限制）
5. prisma.knowledgeImage.findMany()           → 加载所有图片（无 take 限制）
6. prisma.knowledgeDocument.findMany()        → 加载所有文档（无 take 限制）
7. items.sort()                               → 内存排序全量数据
8. items.slice()                              → 内存分页
```

**量化影响**:

| 数据量 | 内存占用 | 响应时间 | 判定 |
|--------|---------|---------|------|
| 1000 条 | ~2 MB | ~500ms | 可接受 |
| 10000 条 | ~20 MB | ~3s | 不可接受 |
| 100000 条 | ~200 MB | ~30s+ | **不可接受** |
| 500000+ 条 | **OOM 风险** | **超时** | **生产事故** |

**修复方案**:

短期（最小修复）:
```typescript
// 添加 take 限制，防止全量加载
const MAX_ITEMS = 5000;
const keywords = await prisma.knowledgeKeyword.findMany({
  where: kwWhere,
  orderBy: { updatedAt: 'desc' },
  take: MAX_ITEMS,
});
```

中长期: 将聚合逻辑下沉到新建 `InventoryService`，使用数据库 UNION ALL + LIMIT/OFFSET。

**预估工时**: 短期 2h / 中长期 2d

---

### CMT-C-03: `saveMinedKeywords` 非事务操作 — 数据不一致

**严重级别**: CRITICAL（数据一致性）
**位置**: 第 888-910 行
**来源**: 架构 H-6 / 质量 C-3

```typescript
export async function saveMinedKeywords(req: Request, res: Response): Promise<void> {
  // ...
  const result = await keywordService.batchCreate(baseId, keywords, userId, '关键词挖掘');

  // ❌ 如果上面成功但下面失败，已创建的关键词无法回滚
  await prisma.minedKeyword.updateMany({
    where: { baseId, keyword: { in: keywords }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  // ...
}
```

**问题**: `batchCreate` 和 `updateMany` 是两个独立的数据库操作，不在同一事务中。失败场景：
1. `batchCreate` 成功 → 关键词已写入 `knowledgeKeyword` 表
2. `updateMany` 失败 → `minedKeyword` 仍标记为未保存
3. 用户再次点击保存 → 重复创建（虽然 service 层有去重，但依赖实现细节）

**修复方案**:

```typescript
const prisma = getPrisma();
await prisma.$transaction(async (tx) => {
  const result = await keywordService.batchCreateWithTx(tx, baseId, keywords, userId, '关键词挖掘');
  await tx.minedKeyword.updateMany({
    where: { baseId, keyword: { in: keywords }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result;
});
```

**预估工时**: 2h

---

## 四、HIGH 级问题详细分析

### CMT-H-01: 无 Zod schema 验证

**严重级别**: HIGH
**位置**: 路由文件 `knowledge.routes.ts` — 所有 POST/PUT 端点

路由文件中，knowledge-base 系列端点使用了 `validate(createKnowledgeBaseSchema)` Zod 中间件，但本文件管理的 28 个端点（keywords/portraits/images/documents/mined-keywords）**完全没有 Zod schema 验证**。

**风险**:
- 无法防御类型错误（keyword 为数字/对象）
- 无法限制字段长度（可传入超长字符串）
- `req.body` 额外字段直接传递给 service

**Committer 判定**: 不阻塞合并。Controller 层有手动校验（非空检查），且 service 层 Prisma 参数化查询提供基本防御。但应在合并后一周内为所有 POST/PUT 端点添加 Zod schema。

**预估工时**: 1d

---

### CMT-H-02: 控制器直接操作 Prisma（7 处）

**严重级别**: HIGH
**位置**:

| 行号 | 函数 | Prisma 操作 | 应归属 |
|------|------|------------|--------|
| 364-369 | createImage | findFirst × 2 | ImageService |
| 399 | updateImage | findFirst × 1 | ImageService |
| 491-496 | createDocument | findFirst × 2 | DocumentService |
| 526 | updateDocument | findFirst × 1 | DocumentService |
| 660-795 | listInventory | findMany × 4 + count × 4 + findMany × 1 | InventoryService |
| 859-873 | mineKeywords | findMany × 3 | MiningService |
| 900-904 | saveMinedKeywords | updateMany × 1 | MinedKeywordService |

**Committer 判定**: 不阻塞合并。分层退化是项目级技术债务，不影响功能正确性。应在下一迭代将 Prisma 调用下沉到 service 层。

**预估工时**: 1d

---

### CMT-H-03: `batchCreateKeywords` 无数组长度上限

**严重级别**: HIGH
**位置**: 第 166-185 行

```typescript
const { keywords, seed_word } = req.body;
if (!Array.isArray(keywords) || keywords.length === 0) {
  fail(res, 400, '关键词列表不能为空');
  return;
}
// ❌ 无上限检查 — 可传入百万级数组
const result = await keywordService.batchCreate(baseId, keywords, userId, seed_word);
```

**Committer 判定**: 阻塞合并。恶意用户可提交数万个关键词导致数据库批量 INSERT 锁表。

**修复方案**: `if (keywords.length > 500) { fail(res, 400, '单次批量创建不能超过500个'); return; }`

**预估工时**: 0.5h

---

### CMT-H-04: URL 字段无格式校验

**严重级别**: HIGH → 降级为 MEDIUM
**位置**: 第 356-358 行 (image_url)、第 481-485 行 (file_url)

**Committer 判定**: 不阻塞。URL 存储后由前端渲染层控制风险，且 Prisma 参数化查询防止注入。建议后续迭代添加 `new URL()` 格式校验。

---

### CMT-H-05: `file_size` 类型未校验

**严重级别**: HIGH → 降级为 MEDIUM
**位置**: 第 480-485 行

```typescript
if (!file_size) { fail(res, 400, '文件大小不能为空'); return; }
// ❌ file_size 可以是 -1、0、"abc"、Infinity
```

**Committer 判定**: 不阻塞。数据库 INTEGER 类型约束提供兜底，非法值会被 Prisma/PostgreSQL 拒绝。但应在 Zod schema 中添加正整数校验。

---

### CMT-H-06: update/delete 缺 `checkBaseAccess`

**严重级别**: HIGH → 降级为 MEDIUM
**位置**: 所有 update/delete 函数（第 115-164, 262-308, 378-432, 505-559 行）

**分析**: update/delete 函数未调用 `checkBaseAccess`，而是通过 `existing.base_id !== baseId` 和 `created_by !== userId` 双重检查间接保护。

**攻击向量评估**:
- 攻击者需同时知道：有效 baseId + 该 baseId 下的资源 id + 该资源是自己创建的
- 即使绕过 baseId 检查，也受限于自己的资源
- **风险等级**: 低

**Committer 判定**: 不阻塞。间接保护机制足够，但建议后续迭代在 update/delete 中也调用 `checkBaseAccess` 保持一致性。

---

## 五、测试完备性审核

### 5.1 测试规模与分布

**测试文件**: `tests/apis/knowledge.controller.test.ts`（3561 行，239 个测试用例）

| 测试分组 | 用例数 | 覆盖端点 |
|----------|--------|----------|
| Auth & Role Guards | 9 | 所有端点的认证/角色拦截 |
| Keywords CRUD | ~30 | list/get/create/update/delete/batch/expand |
| Portraits CRUD | ~25 | list/get/create/update/delete |
| Images CRUD | ~25 | list/get/create/update/delete |
| Documents CRUD | ~25 | list/get/create/update/delete |
| Project Knowledge | ~15 | 4 个项目级聚合端点 |
| Knowledge Inventory | ~15 | listInventory 各种场景 |
| Mined Keywords | ~20 | list/mine/save/toggle/delete |
| Error catch 分支 | ~50 | 所有端点的错误处理分支 |
| checkBaseAccess 分支 | ~15 | platform/company/project scope |
| 边界条件 | ~10 | 各种边界场景 |
| **合计** | **239** | |

### 5.2 测试质量评价

**优点**:

1. **Auth & Role Guard 覆盖完整**: view 角色在所有端点均测试返回 403
2. **错误处理分支全覆盖**: 每个端点的 `err.message === 'X不存在'` 分支均有对应测试
3. **supertest 全链路测试**: 使用 HTTP 请求直接测试完整中间件链（auth → role → controller）
4. **mock 策略合理**: `getPrisma` + service 层 mock，测试隔离性好
5. **边界条件覆盖**: 无效 ID（abc）、不存在的资源（404）、权限不足（403）
6. **checkBaseAccess 三种 scope 测试**: platform/company/project 分别测试
7. **去重检查测试**: createImage/createDocument 的标题/URL 重复检查
8. **更新跳过去重检查**: updateImage/updateDocument title 未变时跳过去重检查
9. **mineKeywords 多 source_type 测试**: document/portrait/image/all 四种来源分别测试
10. **Knowledge Inventory 多维度测试**: search 按不同类别过滤、不同 scope 的 base

**不足**:

1. **listInventory 无性能边界测试**: 未测试大量数据时的响应时间和内存行为
2. **saveMinedKeywords 无事务失败测试**: 未测试 batchCreate 成功但 updateMany 失败的场景
3. **expandKeywords 权限缺失无测试**: 测试文件中未测试未授权知识库的扩词请求（因为代码本身缺少该检查）
4. **输入长度无边界测试**: 未测试 keyword=超长字符串、keywords=万级数组的场景
5. **file_size 类型测试缺失**: 未测试 file_size 为负数/零/字符串的场景
6. **URL 格式测试缺失**: 未测试 image_url 为 `javascript:alert(1)` 等恶意 URL
7. **listInventory deletedAt 测试缺失**: 未测试已软删除数据是否被排除

### 5.3 测试覆盖率评估

| 函数集合 | 代码行 | 正常流覆盖 | 异常流覆盖 | 边界覆盖 | 评估 |
|----------|--------|-----------|-----------|---------|------|
| checkProjectOperator | 18-24 | ✅ | ✅ | — | ~90% |
| checkBaseAccess | 26-50 | ✅ | ✅ | ✅ | ~95% |
| Keywords CRUD (5) | 54-185 | ✅ | ✅ | 部分 | ~85% |
| Portraits CRUD (5) | 204-308 | ✅ | ✅ | 部分 | ~85% |
| Images CRUD (5) | 312-432 | ✅ | ✅ | 部分 | ~85% |
| Documents CRUD (5) | 436-559 | ✅ | ✅ | 部分 | ~85% |
| Project Aggregation (4) | 563-637 | ✅ | ✅ | — | ~80% |
| listInventory | 641-834 | ✅ | 部分 | 缺失 | ~70% |
| Mined Keywords (5) | 838-939 | ✅ | ✅ | 部分 | ~85% |

**预估总行覆盖率: ~80%**

---

## 六、API 契约正确性审核

### 6.1 路由注册一致性

**knowledge.routes.ts 路由定义**:

| 路由模式 | HTTP 方法 | Controller 函数 | 中间件 | Zod |
|----------|----------|----------------|--------|-----|
| `/knowledge-bases/:baseId/keywords` | GET | listKeywords | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/keywords/:id` | GET | getKeyword | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/keywords` | POST | createKeyword | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/keywords/:id` | PUT | updateKeyword | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/keywords/:id` | DELETE | deleteKeyword | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/keywords/batch` | POST | batchCreateKeywords | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/keywords/expand` | POST | expandKeywords | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/portraits` | GET/POST | listPortraits/createPortrait | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/portraits/:id` | GET/PUT/DELETE | get/update/deletePortrait | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/images` | GET/POST | listImages/createImage | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/images/:id` | GET/PUT/DELETE | get/update/deleteImage | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/documents` | GET/POST | listDocuments/createDocument | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/documents/:id` | GET/PUT/DELETE | get/update/deleteDocument | auth + role | ❌ 无 |
| `/projects/:projectId/knowledge/keywords` | GET | listProjectKeywords | auth + role | ❌ 无 |
| `/projects/:projectId/knowledge/portraits` | GET | listProjectPortraits | auth + role | ❌ 无 |
| `/projects/:projectId/knowledge/images` | GET | listProjectImages | auth + role | ❌ 无 |
| `/projects/:projectId/knowledge/documents` | GET | listProjectDocuments | auth + role | ❌ 无 |
| `/knowledge-inventory` | GET | listInventory | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/mined-keywords` | GET | listMinedKeywords | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/mined-keywords/mine` | POST | mineKeywords | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/mined-keywords/save` | POST | saveMinedKeywords | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/mined-keywords/toggle` | POST | toggleMinedKeywordsBatch | auth + role | ❌ 无 |
| `/knowledge-bases/:baseId/mined-keywords` | DELETE | deleteMinedKeywords | auth + role | ❌ 无 |

**检查结果**:

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 中间件链完整 | 23/23 通过 | 所有端点均有 authMiddleware + roleMiddleware |
| 角色限制正确 | 23/23 通过 | 限制为 sysadmin + admin，view 角色 403 |
| Zod 验证 | 0/23 | **全部 POST/PUT 端点缺少 Zod schema 验证** |
| HTTP 方法正确 | 23/23 通过 | GET/POST/PUT/DELETE 语义正确 |
| Controller 导出函数名匹配 | 23/23 通过 | 函数名完全一致 |

### 6.2 响应格式一致性

| 端点 | HTTP 状态码 | 工具函数 | 一致性 |
|------|-----------|---------|--------|
| list 系列 (4) | 200 | `paginate()` | ✅ 一致 |
| get 系列 (4) | 200 | `success()` | ✅ 一致 |
| create 系列 (4) | 201 | `created()` | ✅ 一致 |
| update 系列 (4) | 200 | `success()` | ✅ 一致 |
| delete 系列 (4) | 200 | `success()` | ✅ 一致 |
| batchCreateKeywords | 200 | `success()` | ✅ 一致 |
| expandKeywords | 200 | `success()` | ✅ 一致 |
| listProject 系列 (4) | 200 | `paginate()` | ✅ 一致 |
| **listInventory** | 200 | **直接 res.json()** | ❌ **不一致** — 缺少 page/pageSize |
| listMinedKeywords | 200 | `success()` | ✅ 一致 |
| mineKeywords | 200 | `success()` | ✅ 一致 |
| saveMinedKeywords | 200 | `success()` | ✅ 一致 |
| toggleMinedKeywordsBatch | 200 | `success()` | ✅ 一致 |
| deleteMinedKeywords | 200 | `success()` | ✅ 一致 |

### 6.3 HTTP 状态码使用审核

| 场景 | 状态码 | 使用位置 | 正确性 |
|------|--------|----------|--------|
| 成功获取列表 | 200 | list 系列 | ✅ |
| 成功获取详情 | 200 | get 系列 | ✅ |
| 成功创建 | 201 | create 系列 | ✅ RESTful 规范 |
| 成功更新 | 200 | update 系列 | ✅ |
| 成功删除 | 200 | delete 系列 | ✅ |
| 未登录 | 401 | 所有端点（authMiddleware） | ✅ |
| 无效 ID | 400 | get/update/delete | ✅ |
| 参数验证失败 | 400 | create/update | ✅ |
| 权限不足（非创建者） | 403 | update/delete | ✅ |
| 资源不存在 | 404 | get/update/delete/list | ✅ |
| 服务器错误 | 500 | 所有端点 | ✅ |

---

## 七、项目规范遵循审核

### 7.1 代码规范遵循度

| 规范要求 | 遵循情况 | 说明 |
|----------|---------|------|
| 函数式导出（非 Class Controller） | ✅ 通过 | 28 个独立 async 函数 |
| Service 层分离 | ⚠️ 部分违反 | 7 处直接操作 Prisma |
| success/fail/created/paginate 工具函数 | ✅ 通过 | 27/28 正确使用（listInventory 除外） |
| try-catch 全覆盖 | ✅ 通过 | 28/28 端点 |
| 中文错误消息 | ✅ 通过 | 全部中文 |
| 无 console.log | ✅ 通过 | 生产代码无调试输出 |
| ID 参数 parseInt + isNaN 验证 | ✅ 通过 | 所有使用 path param 的端点 |
| err: unknown 类型安全 | ✅ 通过 | 所有 catch 块 |
| catch-all 通用错误消息 | ✅ 通过 | 未泄露 err.message |
| Git commit 中文 | ✅ 通过 | 见 commit 历史 |

### 7.2 与项目内其他 Controller 的质量对比

| 维度 | knowledge-base.controller.ts | knowledge.controller.ts | 评价 |
|------|------------------------------|------------------------|------|
| 代码行数 | 166 行 | 940 行 | 过大，建议拆分 |
| Zod 验证 | ✅ 路由层 | ❌ 无 | 差距明显 |
| err: unknown | ✅ | ✅ | 持平 |
| 500 错误消息 | 通用消息 | 通用消息 | 持平 |
| 批量赋值防护 | 显式 UpdateRequest | 解构传递 | 前者更优 |
| Prisma 穿透 | 无 | 7 处 | 差距明显 |
| 分页格式 | 统一 paginate() | listInventory 例外 | 前者更优 |
| 测试用例数 | 73+ | 239 | 本文件更充分 |

**Committer 评价**: knowledge.controller.ts 在规模上远超 knowledge-base.controller.ts（940 vs 166 行），但质量标准明显低于后者。knowledge-base.controller.ts 是项目的标杆实现（三层纵深防御），而 knowledge.controller.ts 仍处于"快速原型"阶段。

---

## 八、生产就绪度审核

### 8.1 风险评估

| 风险项 | 级别 | 影响 | 缓解因素 | Committer 决策 |
|--------|------|------|----------|---------------|
| expandKeywords 越权 | CRITICAL | LLM 资源滥用 | 路由层有 auth + role 限制 | **阻塞合并** |
| listInventory OOM | CRITICAL | 生产环境宕机 | 当前数据量可能不大 | **阻塞合并** |
| saveMinedKeywords 非事务 | CRITICAL | 数据不一致 | service 层有去重兜底 | **阻塞合并** |
| batchCreate 无上限 | HIGH | 数据库锁表 | admin 角色限制 | **阻塞合并** |
| 无 Zod schema | HIGH | 数据完整性 | Controller 手动校验 | 不阻塞 |
| Prisma 穿透 | HIGH | 分层退化 | 功能正确 | 不阻塞 |
| URL 格式未校验 | MEDIUM | XSS/SSRF | 前端渲染层控制 | 不阻塞 |
| file_size 未校验 | MEDIUM | 数据错误 | 数据库类型约束 | 不阻塞 |
| update/delete 缺 checkBaseAccess | MEDIUM | 间接绕过 | created_by 检查兜底 | 不阻塞 |
| parseInt 负数 | LOW | 无效查询 | Prisma 隐式防御 | 不阻塞 |

### 8.2 阻塞性问题

**3 个 CRITICAL + 1 个 HIGH = 4 个阻塞项**

| 编号 | 问题 | 预估修复时间 |
|------|------|-------------|
| CMT-C-01 | expandKeywords 添加 checkBaseAccess | 0.5h |
| CMT-C-02 | listInventory 添加 take 限制（短期） | 2h |
| CMT-C-03 | saveMinedKeywords 事务包装 | 2h |
| CMT-H-03 | batchCreateKeywords 数组长度上限 | 0.5h |

**预估总修复时间: ~5h（约 1 个工作日内可完成）**

### 8.3 生产部署评估

1. **当前不可部署**: 需修复 4 个阻塞项后方可安全部署
2. **修复后可部署**: 修复阻塞项后，代码可安全部署到生产环境
3. **监控建议**: 对 500 错误设置告警；监控 listInventory 响应时间；关注 expandKeywords 调用频率（LLM 成本）

---

## 九、审核意见汇总

### 9.1 必须修复（Merge 前必须完成）— 4 项

| 优先级 | 编号 | 问题 | 修复方案 | 预估工时 |
|--------|------|------|----------|---------|
| P0 | CMT-C-01 | expandKeywords 缺 checkBaseAccess | 添加权限检查 | 0.5h |
| P0 | CMT-C-02 | listInventory 全量内存分页 | 添加 take 限制 | 2h |
| P0 | CMT-C-03 | saveMinedKeywords 非事务 | $transaction 包装 | 2h |
| P0 | CMT-H-03 | batchCreateKeywords 无上限 | 添加 length > 500 检查 | 0.5h |

### 9.2 强烈建议修复（Merge 后一周内完成）— 3 项

| 优先级 | 编号 | 问题 | 修复方案 | 预估工时 |
|--------|------|------|----------|---------|
| P1 | CMT-H-01 | 无 Zod schema | 为所有 POST/PUT 端点添加 Zod schema | 1d |
| P1 | CMT-H-02 | Prisma 穿透（7 处） | 将 Prisma 调用下沉到 service 层 | 1d |
| P1 | — | listInventory 缺 deletedAt 过滤 | baseFilter 添加 deletedAt: null | 0.5h |

### 9.3 建议改进（下一迭代完成）— 4 项

| 优先级 | 编号 | 问题 | 修复方案 | 预估工时 |
|--------|------|------|----------|---------|
| P2 | CMT-H-06 | update/delete 缺 checkBaseAccess | 添加权限检查保持一致性 | 2h |
| P2 | CMT-M-01 | parseInt 允许零/负数 | 添加 `id <= 0` 检查 | 1h |
| P2 | CMT-M-02 | listInventory 响应格式不一致 | 使用 paginate() 或添加 page/pageSize | 0.5h |
| P2 | CMT-M-04 | selected/toggleMinedKeywordsBatch 类型 | 添加 typeof boolean 校验 | 0.5h |

### 9.4 技术债务（中长期规划）— 3 项

| 优先级 | 问题 | 修复方案 | 来源 |
|--------|------|----------|------|
| P3 | 错误消息字符串匹配 | 引入 NotFoundError/ForbiddenError + instanceof | 架构 H-2 |
| P3 | 8 个模块级 service 实例化 | 引入轻量级 DI 或延迟初始化 | 架构 M-1 |
| P3 | 四资源 CRUD 模板代码重复（~420 行） | 泛型 CRUD 工厂函数 | 架构 H-1 |

---

## 十、最终裁决

### 裁决结果: 需修改后合并（REQUEST CHANGES）

**裁决依据**:

1. **安全缺陷**: expandKeywords 端点缺少访问权限检查，任何 admin 可调用任意知识库的 LLM 扩词功能（CMT-C-01）
2. **可靠性缺陷**: listInventory 全量加载到内存排序分页，数据增长后必然 OOM/超时（CMT-C-02）
3. **数据一致性缺陷**: saveMinedKeywords 的两个数据库操作无事务保护，失败会导致数据不一致（CMT-C-03）
4. **资源滥用风险**: batchCreateKeywords 无数组长度上限，可提交百万级数组（CMT-H-03）
5. **测试充分**: 239 个测试用例覆盖所有 28 个端点的正常/异常/权限场景
6. **功能完整**: 4 资源域 CRUD + 项目聚合 + 知识清单 + 关键词挖掘功能齐全
7. **项目规范基本遵循**: 函数式导出、err:unknown、通用错误消息等最佳实践已采用

**合并前必须完成的修复**:

| 步骤 | 修复内容 | 验证方式 |
|------|----------|----------|
| 1 | expandKeywords 添加 `checkBaseAccess` | 测试非授权知识库返回 403/404 |
| 2 | listInventory 添加 `take` 限制 + 短路返回 | 测试大量数据时响应时间 < 5s |
| 3 | saveMinedKeywords 使用 `$transaction` | 测试 batchCreate 成功但 updateMany 失败时回滚 |
| 4 | batchCreateKeywords 添加 `length > 500` 检查 | 测试 501 个关键词返回 400 |

**合并后行动项**:

1. 一周内为所有 POST/PUT 端点添加 Zod schema（CMT-H-01）
2. 一周内将 Prisma 调用下沉到 service 层（CMT-H-02）
3. 补充 listInventory 性能测试和 saveMinedKeywords 事务失败测试
4. 将 P2/P3 级问题纳入迭代规划

---

## 十一、代码亮点（正面评价）

| 亮点 | 位置 | 说明 |
|------|------|------|
| 权限分层设计 | checkBaseAccess/checkProjectOperator | 三级 scope (platform/company/project) + 双重角色检查 |
| 测试覆盖全面 | 测试文件 3561 行 | 239 个测试用例，含 Auth Guard、错误分支、边界条件 |
| 统一响应格式 | 全文件 | 27/28 端点使用 success/fail/created/paginate 工具函数 |
| 去重检查 | createImage/createDocument | 标题 + URL 双重去重防止数据重复 |
| update 跳过去重 | updateImage/updateDocument | title 未变时跳过去重检查，性能优化 |
| 柔性错误处理 | 全文件 catch 块 | 通用错误消息不泄露 err.message，安全实践 |
| 关键词挖掘流程 | mine/save/toggle/delete | 完整的 LLM 挖掘 → 预览 → 选择 → 保存工作流 |
| 知识清单聚合 | listInventory | 跨 4 种资源的统一视图 + 按类型统计 |
| 模块化服务层 | 8 个独立 service | 每种资源有独立 service，职责分离清晰 |

---

*Committer 审核专家评审完成 — 2026-05-24*
*基于 940 行最新代码版本*
*阻塞项修复预估工时: ~5h（1 个工作日内可完成）*
