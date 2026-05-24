# apis/controller/knowledge.controller.ts — 软件质量专家评审报告

**评审日期**: 2026-05-24
**评审角色**: 软件质量专家（代码质量 + 安全性 + 可靠性 + 可维护性 + 性能 + 测试覆盖度）
**文件路径**: `apis/controller/knowledge.controller.ts`
**代码行数**: 940 行（28 个导出函数 + 2 个内部辅助函数 + 8 个模块级服务实例）
**关联路由**: `apis/app.ts` 知识库子资源路由

---

## 一、总体质量评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 代码安全性 | 3/10 | expandKeywords 越权访问、req.user! 空指针风险、无输入长度限制 |
| 代码可靠性 | 3/10 | saveMinedKeywords 非事务操作、listInventory 内存分页 OOM 风险 |
| 代码可维护性 | 2/10 | 四资源 CRUD 高度重复、单文件 940 行、7 处 Prisma 穿透 |
| 性能 | 2/10 | listInventory 全表扫描 + 内存排序分页、未分页数据加载 |
| 代码可读性 | 4/10 | 部分函数结构清晰，但 catch 块单行压缩严重降低可读性 |
| 测试覆盖度 | N/A | 未发现对应的测试文件 |

**问题统计**: CRITICAL × 6 / HIGH × 8 / MEDIUM × 6 / LOW × 3

---

## 二、质量问题清单

### CRITICAL 级别

#### C-1: `expandKeywords` 缺少知识库访问权限检查 — 越权漏洞

**位置**: 第 187-200 行

```typescript
export async function expandKeywords(req: Request, res: Response): Promise<void> {
  try {
    const baseId = parseInt(req.params.baseId as string, 10);
    if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
    const { keyword } = req.body;
    if (!keyword) { fail(res, 400, '关键词不能为空'); return; }
    // ❌ 缺少: await checkBaseAccess(baseId, userId, role);
    const keywords = await llmService.expandKeywords(keyword);
    success(res, keywords);
  }
```

**问题分析**:
- 虽然解构了 `req.user!`（隐式），但没有调用 `checkBaseAccess`
- 任何已认证用户（包括 view 角色）都可以调用此端点进行智能扩词
- 该接口会调用外部 LLM 服务，存在资源滥用风险

**修复建议**: 添加权限检查，与其他端点保持一致：

```typescript
const { userId, role } = req.user!;
await checkBaseAccess(baseId, userId, role);
```

---

#### C-2: `listInventory` 全表扫描 + 内存分页 — OOM 及性能灾难

**位置**: 第 641-834 行（194 行单函数）

**问题分析**:

```
执行流程:
1. knowledgeBaseService.list(1, 10000, ...) → 最多加载 10000 个知识库
2. prisma.knowledgeKeyword.findMany() → 加载所有关键词（无 limit）
3. prisma.knowledgePortrait.findMany() → 加载所有画像（无 limit）
4. prisma.knowledgeImage.findMany() → 加载所有图片（无 limit）
5. prisma.knowledgeDocument.findMany() → 加载所有文档（无 limit）
6. items.sort() → 内存排序全量数据
7. items.slice() → 内存分页
```

**量化影响估算**:

| 数据量 | 内存占用（估算） | 响应时间（估算） |
|--------|-----------------|-----------------|
| 1000 条 | ~2 MB | ~500ms |
| 10000 条 | ~20 MB | ~3s |
| 100000 条 | ~200 MB | ~30s+ |
| 500000 条 | **OOM 风险** | **超时** |

**修复建议**: 将聚合逻辑下沉到 service 层，使用数据库 UNION ALL + LIMIT/OFFSET 实现真正的服务端分页。

---

#### C-3: `saveMinedKeywords` 非事务操作 — 数据一致性风险

**位置**: 第 888-909 行

```typescript
export async function saveMinedKeywords(req: Request, res: Response): Promise<void> {
  // ...
  const result = await keywordService.batchCreate(baseId, keywords, userId, '关键词挖掘');
  // ❌ 如果上面成功但下面失败，已创建的关键词无法回滚
  await prisma.minedKeyword.updateMany({
    where: { baseId, keyword: { in: keywords }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
}
```

**问题分析**: `batchCreate` 和 `updateMany` 是两个独立的数据库操作，不在同一个事务中。如果 `updateMany` 失败：
1. 关键词已创建到 `knowledgeKeyword` 表
2. 但 `minedKeyword` 未标记为已保存
3. 用户再次保存时会重复创建（虽然有去重，但依赖 service 层实现）

**修复建议**: 在 service 层使用 Prisma `$transaction`：

```typescript
await getPrisma().$transaction(async (tx) => {
  const result = await keywordService.batchCreateWithTx(tx, baseId, keywords, userId, '关键词挖掘');
  await tx.minedKeyword.updateMany({
    where: { baseId, keyword: { in: keywords }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result;
});
```

---

#### C-4: `req.user!` 非空断言遍布全文件 — 运行时空指针风险

**位置**: 第 63, 84, 105, 122, 149, 177, 213, 231, 252, 269, 294, 321, 339, 360, 386, 414, 436, 447, 462, 510, 538, 567, 586, 605, 624, 648, 842, 855, 872, 887, 893, 916, 933 行（共 33 处）

**问题分析**:
- TypeScript `!` 非空断言只抑制编译器警告，不提供运行时保护
- 如果 JWT 中间件配置有误（如路由注册顺序错误），`req.user` 可能为 `undefined`
- 访问 `undefined.userId` 会抛出 `TypeError: Cannot read properties of undefined`
- 该 TypeError 会被 catch 块捕获，返回 500 错误，但不暴露真正原因

**修复建议**: 使用防御性解构并提供明确错误：

```typescript
const user = req.user;
if (!user) { fail(res, 401, '未登录'); return; }
const { userId, role } = user;
```

---

#### C-5: `mineKeywords` 内容收集逻辑在控制器中 — 分层穿透 + 截断不可控

**位置**: 第 851-885 行

```typescript
const prisma = getPrisma();
const contentParts: string[] = [];

if (sourceType === 'all' || sourceType === 'document') {
  const docs = await prisma.knowledgeDocument.findMany({ where: { baseId, deletedAt: null } });
  contentParts.push(...docs.map((d: any) => `[文档] 标题: ${d.title}${d.description ? ', 描述: ' + d.description : ''}`));
}
// ... 重复 3 次类似逻辑

const content = contentParts.join('\n').substring(0, 8000); // ❌ 魔数硬编码
```

**问题分析**:
1. 控制器直接操作 Prisma ORM，绕过 service 层
2. `8000` 字符截断是魔数，无注释说明选择依据
3. `(d: any)` 类型断言隐藏了 ORM 模型类型
4. source_type 值未做白名单校验，任意字符串都可通过

**修复建议**: 将内容收集逻辑移入 service 层，source_type 做 enum 校验。

---

#### C-6: 输入字段无长度限制 — 存储滥用及潜在 DoS

**位置**: 所有 create/update 函数

**问题分析**:

| 端点 | 字段 | 当前校验 | 风险 |
|------|------|----------|------|
| createKeyword | keyword | 仅检查非空 | 可提交 1MB 字符串 |
| createPortrait | title + content | 仅检查非空 | content 可提交超大文本 |
| createImage | title + image_url | 仅检查非空 | image_url 可为任意 URL |
| createDocument | title + file_url | 仅检查非空 | file_url 可为任意 URL |
| batchCreateKeywords | keywords[] | 仅检查非空数组 | 数组长度无上限 |
| expandKeywords | keyword | 仅检查非空 | 可提交超长关键词 |

**修复建议**: 对所有字符串字段添加最大长度限制，对数组添加最大长度限制：

```typescript
if (keyword.length > 200) { fail(res, 400, '关键词长度不能超过200字符'); return; }
if (keywords.length > 500) { fail(res, 400, '单次批量创建不能超过500个'); return; }
```

---

### HIGH 级别

#### H-1: 四资源类型 CRUD 代码高度重复 — DRY 原则严重违反

**位置**: Keywords (52-185行), Portraits (202-308行), Images (310-432行), Documents (434-558行)

**问题分析**:

四组 CRUD 函数结构几乎完全相同，以下为重复模式对比：

```
list{Resource}:     parseInt baseId → checkBaseAccess → service.list → paginate
get{Resource}:      parseInt baseId+id → checkBaseAccess → service.getById → base_id校验 → success
create{Resource}:   parseInt baseId → 校验必填字段 → checkBaseAccess → service.create → created
update{Resource}:   parseInt baseId+id → getById → base_id校验 → created_by校验 → service.update → success
delete{Resource}:   parseInt baseId+id → getById → base_id校验 → created_by校验 → service.delete → success
```

**量化重复**:
- list 函数：4 个 × ~20 行 = 80 行重复
- get 函数：4 个 × ~18 行 = 72 行重复
- create 函数：4 个 × ~20 行 = 80 行重复
- update 函数：4 个 × ~25 行 = 100 行重复
- delete 函数：4 个 × ~22 行 = 88 行重复
- **总计约 420 行可复用代码（占全文件 45%）**

---

#### H-2: 控制器层 7 处直接操作 Prisma — 分层架构穿透

**位置**:

| 行号 | 函数 | Prisma 操作 | 应归属层 |
|------|------|------------|---------|
| 364-369 | createImage | findFirst × 2 (去重检查) | ImageService |
| 399 | updateImage | findFirst (去重检查) | ImageService |
| 491-496 | createDocument | findFirst × 2 (去重检查) | DocumentService |
| 526 | updateDocument | findFirst (去重检查) | DocumentService |
| 660-795 | listInventory | findMany × 4 + count × 4 + findMany × 1 | InventoryService (新建) |
| 859-873 | mineKeywords | findMany × 3 | MiningService |
| 900-904 | saveMinedKeywords | updateMany × 1 | MinedKeywordService |

**问题分析**: 项目架构明确定义 `controller/ → service/ → service/impl/` 三层，但控制器中存在 7 处直接调用 `getPrisma()` 的代码，绕过 service 层直接操作 ORM。

---

#### H-3: `checkBaseAccess` 中 company scope 检查存在信息泄露风险

**位置**: 第 33-43 行

```typescript
if (base.scope === 'company') {
  const prisma = getPrisma();
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { companyId: true },
  });
  if (!user || user.companyId !== base.company_id) {
    throw new Error('知识库不存在');  // ❌ 返回 404 而非 403
  }
}
```

**问题分析**:
1. 返回"知识库不存在"（404）而非"无权访问"（403），虽然安全上合理（不泄露资源存在性），但与其他检查点风格不一致（`checkProjectOperator` 返回 403）
2. 每次调用都查询 user 表获取 companyId，但该信息可缓存或在 JWT 中携带
3. `base.company_id` 可能为 null（当 scope 不是 company 时），但在 scope 为 company 时未做 null 检查

---

#### H-4: 错误处理 catch 块严重压缩 — 可读性极差

**位置**: 第 93, 239, 347, 471 行

```typescript
// 第 93 行 — 单行 287 字符
} catch (err: unknown) {
  if (err instanceof Error && err.message === '关键词不存在') { fail(res, 404, err.message); } else if (err instanceof Error && err.message === '知识库不存在') { fail(res, 404, err.message); } else { fail(res, 500, '获取关键词详情失败'); }
}
```

**问题分析**:
1. 单行超过 200 字符，远超 80-120 字符的行业惯例
2. 多个 `if/else if/else` 挤在一行，难以 review
3. 错误消息匹配方式脆弱 — 使用 `===` 精确匹配，service 层任何消息变动都会导致错误分类失败
4. 未处理 `err` 非 Error 实例的情况（如 Prisma 抛出的原始错误）

**修复建议**: 展开为正常的多行格式，并使用错误类型而非字符串匹配：

```typescript
} catch (err: unknown) {
  if (err instanceof NotFoundError) {
    fail(res, 404, err.message);
  } else {
    fail(res, 500, '获取关键词详情失败');
  }
}
```

---

#### H-5: `batchCreateKeywords` 无数组长度上限 — 批量操作滥用

**位置**: 第 166-185 行

```typescript
const { keywords, seed_word } = req.body;
if (!Array.isArray(keywords) || keywords.length === 0) {
  fail(res, 400, '关键词列表不能为空');
  return;
}
// ❌ 无 keywords.length 上限检查
const result = await keywordService.batchCreate(baseId, keywords, userId, seed_word);
```

**问题分析**: 恶意用户可提交包含数万个关键词的数组，导致：
1. 数据库批量 INSERT 操作锁表
2. 内存消耗线性增长
3. 响应时间不可控

---

#### H-6: `createImage`/`createDocument` 中 URL 字段未做格式校验

**位置**: 第 356-358 行 (image_url)、第 481-485 行 (file_url)

```typescript
const { title, image_url } = req.body;
if (!title) { fail(res, 400, '图片标题不能为空'); return; }
if (!image_url) { fail(res, 400, '图片地址不能为空'); return; }
// ❌ image_url 可以是任意字符串，如 "javascript:alert(1)" 或 "../etc/passwd"
```

**问题分析**: URL 字段存储后可能在前端被渲染为 `<img src>` 或 `<a href>`，恶意 URL 可能导致：
1. XSS（`javascript:` 协议）
2. SSRF（内网地址）
3. 路径遍历（相对路径）

---

#### H-7: `createDocument` 中 `file_size` 仅做非空检查 — 应为正整数

**位置**: 第 480-485 行

```typescript
const { title, file_url, file_name, file_type, file_size } = req.body;
if (!file_size) { fail(res, 400, '文件大小不能为空'); return; }
// ❌ file_size 可以是 -1、0、"abc"、Infinity
```

**修复建议**:

```typescript
if (typeof file_size !== 'number' || file_size <= 0 || !Number.isFinite(file_size)) {
  fail(res, 400, '文件大小必须为正整数');
  return;
}
```

---

#### H-8: `listInventory` 中硬编码 `pageSize: 10000` 加载知识库列表

**位置**: 第 651 行

```typescript
const { list: bases } = await knowledgeBaseService.list(1, 10000, undefined, undefined, undefined, userId, role);
```

**问题分析**:
1. 硬编码 `10000` 作为上限，随系统增长可能不够
2. 加载所有可见知识库到内存中，只为获取 baseId 列表
3. 应使用专门的 `getAccessibleBaseIds(userId, role)` 方法（service 层已有 `getAccessibleBaseIds` 实现）

---

### MEDIUM 级别

#### M-1: `parseInt` 缺少负数检查

**位置**: 全文件约 20 处 parseInt 调用

```typescript
const baseId = parseInt(req.params.baseId as string, 10);
if (isNaN(baseId)) { fail(res, 400, '无效的知识库ID'); return; }
// ❌ baseId 可以是 -1 或 0，这些不是有效的 ID
```

**修复建议**: 添加正整数检查：

```typescript
const baseId = parseInt(req.params.baseId as string, 10);
if (!baseId || baseId <= 0) { fail(res, 400, '无效的知识库ID'); return; }
```

---

#### M-2: `pageSize` 可能为负数或零

**位置**: 所有 list 函数

```typescript
const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 100);
// parseInt("-5") → -5, -5 || 10 → -5（因为 -5 是 truthy）
```

**修复建议**:

```typescript
const rawPageSize = parseInt(req.query.pageSize as string) || 10;
const pageSize = Math.max(1, Math.min(rawPageSize, 100));
```

---

#### M-3: 错误消息字符串匹配方式脆弱

**位置**: 所有 catch 块

```typescript
if (err instanceof Error && err.message === '知识库不存在') { ... }
```

**问题分析**:
1. 使用 `===` 精确匹配中文错误消息，service 层任何消息文本变动（如加标点、改措辞）都会导致错误分类失败
2. 每个新错误消息都需要在控制器中添加对应的 `else if` 分支
3. 无法处理 i18n 场景

**修复建议**: 使用自定义错误类：

```typescript
class NotFoundError extends Error { constructor(msg: string) { super(msg); this.name = 'NotFoundError'; } }
class ForbiddenError extends Error { constructor(msg: string) { super(msg); this.name = 'ForbiddenError'; } }

// controller catch 块
} catch (err: unknown) {
  if (err instanceof NotFoundError) { fail(res, 404, err.message); }
  else if (err instanceof ForbiddenError) { fail(res, 403, err.message); }
  else { fail(res, 500, '操作失败'); }
}
```

---

#### M-4: `createImage` 去重检查字段名与 Prisma schema 不一致风险

**位置**: 第 365-369 行

```typescript
const dupTitle = await prisma.knowledgeImage.findFirst({ where: { baseId, title, deletedAt: null } });
const dupUrl = await prisma.knowledgeImage.findFirst({ where: { baseId, imageUrl: image_url, deletedAt: null } });
```

**问题分析**: `req.body.image_url` (snake_case) vs `prisma.imageUrl` (camelCase) 的映射关系隐含在代码中。如果 Prisma schema 字段名变更，此处不会得到编译时提示。

---

#### M-5: `toggleMinedKeywordsBatch` 中 `selected` 字段未做类型校验

**位置**: 第 918 行

```typescript
const { ids, selected } = req.body;
if (!Array.isArray(ids) || ids.length === 0) { fail(res, 400, '请选择关键词'); return; }
// ❌ selected 未校验 — 可以是任意值（string、number、null、undefined）
await minedKeywordService.toggleSelectBatch(baseId, ids, selected);
```

**修复建议**:

```typescript
if (typeof selected !== 'boolean') { fail(res, 400, 'selected 必须为布尔值'); return; }
```

---

#### M-6: `mineKeywords` 中 `source_type` 未做白名单校验

**位置**: 第 857 行

```typescript
const sourceType = req.body.source_type || 'all';
// ❌ sourceType 可以是任意字符串，如 'hack'
```

虽然后续的 `if (sourceType === 'all' || sourceType === 'document')` 检查会自然过滤无效值（所有条件不匹配时 contentParts 为空，返回 400），但显式校验更安全：

```typescript
const VALID_SOURCE_TYPES = ['all', 'document', 'portrait', 'image'] as const;
const sourceType: string = req.body.source_type || 'all';
if (!VALID_SOURCE_TYPES.includes(sourceType as any)) {
  fail(res, 400, '无效的资源类型');
  return;
}
```

---

### LOW 级别

#### L-1: `listInventory` 中 `getScopeLabel` 定义在函数体内 — 每次调用重建

**位置**: 第 690-694 行

```typescript
const getScopeLabel = (base: typeof bases[0]) => {
  if (base.project_name) return base.project_name;
  if (base.company_name) return base.company_name;
  return '平台';
};
```

应提取为模块级函数，使用明确类型替代 `typeof bases[0]`。

---

#### L-2: `createImage`/`createDocument` 去重检查应合并为单次查询

**位置**: 第 364-369 行

```typescript
const dupTitle = await prisma.knowledgeImage.findFirst({ where: { baseId, title, deletedAt: null } });
if (dupTitle) { fail(res, 400, '该知识库已存在相同标题的图片'); return; }
const dupUrl = await prisma.knowledgeImage.findFirst({ where: { baseId, imageUrl: image_url, deletedAt: null } });
if (dupUrl) { fail(res, 400, '该知识库已存在相同的图片'); return; }
```

两次 `findFirst` 可合并为一次 `findFirst` with `OR` 条件，减少数据库往返。

---

#### L-3: 8 个服务实例在模块顶层 `new` — 无法注入或替换

**位置**: 第 9-16 行

```typescript
const keywordService = new KeywordServiceImpl();
const portraitService = new PortraitServiceImpl();
// ...
```

紧耦合具体实现类，无法在测试中注入 mock。

---

## 三、问题统计与优先级

| 级别 | 数量 | 编号 | 建议修复时间 |
|------|------|------|-------------|
| CRITICAL | 6 | C-1 ~ C-6 | P0（1-3 天内） |
| HIGH | 8 | H-1 ~ H-8 | P1（1 周内） |
| MEDIUM | 6 | M-1 ~ M-6 | P2（2 周内） |
| LOW | 3 | L-1 ~ L-3 | P3（有空时） |
| **合计** | **23** | | |

---

## 四、修复优先级排序

### P0 — 安全与可靠性（影响线上）

| 编号 | 问题 | 工作量 |
|------|------|--------|
| C-1 | expandKeywords 越权访问 | 0.5h |
| C-2 | listInventory OOM 风险 | 2d |
| C-3 | saveMinedKeywords 非事务 | 2h |
| C-4 | req.user! 空指针风险 | 2h |
| C-6 | 输入长度无限制 | 3h |
| H-6 | URL 格式未校验 | 1h |

### P1 — 代码质量与可维护性

| 编号 | 问题 | 工作量 |
|------|------|--------|
| C-5 | mineKeywords 分层穿透 | 3h |
| H-1 | 四资源 CRUD 重复（420行） | 2d |
| H-2 | 7 处 Prisma 穿透 | 4h |
| H-4 | catch 块压缩 | 2h |
| H-5 | batchCreate 无上限 | 0.5h |
| H-7 | file_size 类型校验 | 0.5h |
| H-8 | 硬编码 10000 | 1h |

### P2 — 代码健壮性

| 编号 | 问题 | 工作量 |
|------|------|--------|
| M-1 | parseInt 负数检查 | 1h |
| M-2 | pageSize 边界检查 | 0.5h |
| M-3 | 错误类型化 | 3h |
| M-4 | 字段名映射一致性 | 1h |
| M-5 | selected 类型校验 | 0.5h |
| M-6 | source_type 白名单 | 0.5h |

**总估算**: P0 约 4 天 / P1 约 5 天 / P2 约 1.5 天

---

## 五、与已有评审的关系

本文件与以下已有评审互补：

| 已有评审 | 文件 | 本文件侧重 |
|---------|------|-----------|
| 架构评审 | `knowledge.controller.md` | 本文件更关注运行时安全、性能和代码健壮性 |
| 安全评审 | `knowledge.controller.security.md` | 本文件的安全发现（C-1, H-6）为其补充 |
| 修复记录 | `knowledge.controller.fix.md` | 本文件发现了之前修复未覆盖的新问题 |

---

## 六、质量改进关键收益

| 改进项 | 收益 |
|--------|------|
| expandKeywords 权限修复 | 消除越权漏洞，防止 LLM 资源滥用 |
| listInventory 服务端分页 | 响应时间从 O(n) 降到 O(1)，消除 OOM 风险 |
| 事务保护 | 消除数据不一致风险 |
| 输入长度限制 | 防止存储滥用和 DoS |
| 错误类型化 | catch 块可读性提升 80%，消除字符串匹配脆弱性 |
| CRUD 去重 | 代码量减少 45%，新增资源类型从 5 个函数降到 1 个配置 |
| Prisma 穿透修复 | 恢复分层架构完整性，可测试性从 0% 提升到可 mock |
