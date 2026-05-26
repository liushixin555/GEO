# knowledge.service.r2.test.ts 软件质量专家评审

**文件**: `tests/apis/knowledge.service.r2.test.ts`
**被测文件**: `apis/service/impl/knowledge.service.impl.ts`
**评审日期**: 2026-05-26
**评审类型**: 软件质量评审（TDD Round 2 深度验证）
**综合评分**: **4.5 / 10** — CONDITIONAL APPROVE

---

## 评分维度

| 维度 | 得分 | 权重 | 加权分 |
|------|------|------|--------|
| 测试完备性 | 4.0 | 30% | 1.20 |
| 测试深度/断言质量 | 5.5 | 25% | 1.38 |
| 错误/异常路径覆盖 | 1.0 | 20% | 0.20 |
| 测试结构与可维护性 | 7.5 | 15% | 1.13 |
| 边界条件与健壮性 | 4.0 | 10% | 0.40 |
| **加权总分** | | | **4.31 → 4.5** |

---

## 覆盖率数据

```
File                        | % Stmts | % Branch | % Funcs | % Lines
knowledge.service.impl.ts   |  67.57  |   29.72  |   67.3  |  76.01
```

**未覆盖行**: 22, 39, 55, 80, 104-108, 155, 171, 221, 237, 273-290, 301, 320, 368-385, 439-471

---

## 优点

### G-1: Helper 工厂函数设计规范
`makePrismaKeyword` / `makePrismaPortrait` / `makePrismaImage` / `makePrismaDocument` 工厂函数使用合理的默认值 + overrides 模式，减少重复代码，提高可读性。

### G-2: 测试命名清晰
测试用例名称遵循 `方法 + 场景 + 预期` 的三段式命名，如 `list page 2 pageSize 5 should skip first 5`，一目了然。

### G-3: 分页计算验证到位
对每个服务类的 `list` / `listByProject` 都验证了 `skip` / `take` 参数的正确计算，覆盖了不同的 page/pageSize 组合。

### G-4: Mock 隔离策略合理
通过 `jest.mock` 隔离 `db.util` 和 `KnowledgeBaseServiceImpl`，确保单元测试不依赖数据库。

---

## 问题清单

### BLOCKING（阻塞级）

#### B-1: 零错误路径覆盖
**严重度**: BLOCKING | **行号**: impl 67, 114, 128, 183, 198, 209, 249, 264, 275, 335, 358, 369

`NotFoundError` 在 `getById` / `update` / `delete` 中被抛出，但所有 32 个测试用例均走 happy path，没有任何一个测试验证当记录不存在时是否正确抛出 `NotFoundError`。

```typescript
// 缺失：应测试 getById 记录不存在
it('getById should throw NotFoundError when not found', async () => {
  const mockQueryRaw = jest.fn().mockResolvedValueOnce([]);
  mockedGetPrisma.mockReturnValue({ $queryRaw: mockQueryRaw } as any);
  await expect(service.getById(999)).rejects.toThrow('关键词');
});
```

**影响**: 若 `NotFoundError` 抛出逻辑被意外修改（如错误消息拼写错误或条件变更），测试不会捕获。

#### B-2: search 参数分支完全未覆盖
**严重度**: BLOCKING | **行号**: impl 39, 55, 155, 171, 221, 237, 301, 320

所有 `list` / `listByProject` 方法的 `search` 可选参数分支均未触发。分支覆盖率 29.72% 的主要原因。search 涉及 `contains` + `mode: 'insensitive'` 的 Prisma 查询构建，是核心业务功能。

```typescript
// 缺失：应测试 search 参数
it('list with search should add contains filter', async () => {
  const mockFindMany = jest.fn().mockResolvedValue([]);
  const mockCount = jest.fn().mockResolvedValue(0);
  mockedGetPrisma.mockReturnValue({ knowledgeKeyword: { findMany: mockFindMany, count: mockCount } } as any);
  await service.list(10, 1, 10, '测试');
  expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ keyword: { contains: '测试', mode: 'insensitive' } }),
  }));
});
```

**影响**: search 功能回归不会被测试捕获；DocumentServiceImpl 的 OR 搜索条件（title + fileName）完全未验证。

#### B-3: 6 个公共方法完全未测试
**严重度**: BLOCKING | **行号**: impl 104-108, 273-290, 368-385, 439-471

| 方法 | 服务类 | 说明 |
|------|--------|------|
| `listByGroup()` | KeywordServiceImpl | 空实现但仍需测试 |
| `syncGroup()` | KeywordServiceImpl | 空实现但仍需测试 |
| `checkDuplicate()` | ImageServiceImpl | 标题+URL 去重逻辑，抛 ConflictError |
| `checkDuplicateTitle()` | ImageServiceImpl | 排除自身后的标题去重 |
| `checkDuplicate()` | DocumentServiceImpl | 标题+URL 去重逻辑 |
| `checkDuplicateTitle()` | DocumentServiceImpl | 排除自身后的标题去重 |
| `aggregateContent()` | MinedKeywordServiceImpl | 聚合文档/画像/图片内容 |
| `saveAndRemove()` | MinedKeywordServiceImpl | 事务：批量创建+软删除 |

**影响**: `checkDuplicate` / `checkDuplicateTitle` 是防止数据重复的关键防线；`aggregateContent` 涉及 8000 字符截断逻辑；`saveAndRemove` 涉及事务一致性。这些方法无任何测试保护。

---

### HIGH（高优先级）

#### H-1: create 方法未测试 expanded_words 非空分支
**严重度**: HIGH | **行号**: impl 79-81

`KeywordServiceImpl.create` 中 `request.expanded_words && request.expanded_words.length > 0` 分支未被测试。这是 create 方法与 syncExpandedWords 的交互路径，验证 expanded_words 在创建时正确同步。

```typescript
// 缺失：create 时带 expanded_words
it('create with expanded_words should call syncExpandedWords', async () => {
  const created = makePrismaKeyword({ id: 1 });
  const mockCreate = jest.fn().mockResolvedValue(created);
  const mockExecuteRaw = jest.fn().mockResolvedValue(undefined);
  const mockQueryRaw = jest.fn().mockResolvedValue([]);
  mockedGetPrisma.mockReturnValue({
    knowledgeKeyword: { create: mockCreate },
    $executeRaw: mockExecuteRaw, $queryRaw: mockQueryRaw,
  } as any);
  await service.create(10, { keyword: 'test', expanded_words: [{ word: 'A', selected: true }] }, 1);
  expect(mockExecuteRaw).toHaveBeenCalled(); // syncExpandedWords 被调用
});
```

#### H-2: 返回值验证不充分
**严重度**: HIGH

大多数测试仅验证 Prisma 方法被以正确参数调用，但未充分验证返回值结构。例如：
- `list` / `listByProject` 返回 `{ list, total }` 但无测试验证 `total` 值
- `batchCreate` / `addMinedKeywords` 返回 `{ created, duplicates }` 但无测试验证计数正确性
- 仅 `create` 的 snake_case 映射验证了返回值结构

#### H-3: listByProject 空 baseIds 提前返回路径未测试
**严重度**: HIGH | **行号**: impl 51, 167, 233, 316

`if (baseIds.length === 0) return { list: [], total: 0 }` 分支未被测试。应在 mock 中让 `getAccessibleBaseIds` 返回空数组以验证此路径。

---

### MEDIUM（中优先级）

#### M-1: syncExpandedWords 仅验证调用次数
**严重度**: MEDIUM | **行号**: test 158-166

测试验证 `executeRaw` 被调用 4 次（1 DELETE + 3 INSERT），但未验证各次调用的 SQL 参数（keywordId、word、selected）。若参数映射逻辑出错，测试无法捕获。

#### M-2: 缺少边界条件测试
**严重度**: MEDIUM

- `batchCreate` 传入空数组 `[]` 时的行为
- `addMinedKeywords` 传入全部重复关键词时的行为
- `listByProject` 跨多个 baseId（`{ in: [10, 20] }`）时的 where 条件
- `deleteByIds` 传入空数组时的行为

#### M-3: 测试与实现高度耦合
**严重度**: MEDIUM

测试断言精确匹配 Prisma 调用签名（如 `findFirst({ where: { id: 5, deletedAt: null } })`），属于**行为验证**而非**结果验证**。若实现从 `findFirst` 改为 `findUnique` + 软删除检查，所有测试都会失败，即使功能行为未变。建议在关键路径增加结果验证作为补充。

#### M-4: PortraitServiceImpl/ImageServiceImpl 缺少 delete 返回值验证
**严重度**: MEDIUM

`delete` 方法应返回 `void`，但测试仅验证 `findFirst` 的 where 条件，未验证 `update` 的调用参数和最终返回值。

---

### LOW（低优先级）

#### L-1: Helper 工厂缺少类型约束
**严重度**: LOW

`makePrismaKeyword(overrides: Record<string, any>)` 使用 `any` 类型，失去类型安全。建议使用 `Partial<PrismaKeyword>` 替代。

#### L-2: 缺少 describe 分组内的 setup 文档
**严重度**: LOW

每个 `describe` 块的 `beforeEach` 含义自明，但未说明被测服务的依赖关系（如 `kbService` 子依赖如何被注入和 mock）。

#### L-3: 未利用 test.each 参数化
**严重度**: LOW

分页计算测试（skip/take）适合用 `test.each` 参数化，减少重复代码：
```typescript
test.each([
  [1, 10, 0, 10],
  [2, 10, 10, 10],
  [3, 15, 30, 15],
])('list page %d pageSize %d → skip %d take %d', async (page, size, expSkip, expTake) => { ... });
```

---

## 修复优先级矩阵

| 优先级 | 编号 | 工作量估算 | 修复建议 |
|--------|------|-----------|----------|
| P0 | B-1 | 2h | 为每个服务的 getById/update/delete 添加 NotFoundError 测试 |
| P0 | B-2 | 1h | 为每个服务的 list/listByProject 添加 search 参数测试 |
| P0 | B-3 | 3h | 补充 checkDuplicate/checkDuplicateTitle/aggregateContent/saveAndRemove 测试 |
| P1 | H-1 | 0.5h | 添加 create with expanded_words 测试 |
| P1 | H-2 | 1h | 增加返回值结构断言 |
| P1 | H-3 | 0.5h | 添加 listByProject 空 baseIds 测试 |
| P2 | M-1~M-4 | 2h | 增强 syncExpandedWords 参数验证、边界条件、结果断言 |
| P3 | L-1~L-3 | 1h | 类型约束、参数化重构 |

**总修复工作量**: ~11h

---

## 测试覆盖缺口可视化

```
KeywordServiceImpl:
  list ✓       listByProject ✓   getById ✓ (无错误路径)
  create ✓ (无 expanded_words 分支)   batchCreate ✓
  listByGroup ✗    syncGroup ✗    update ✓    delete ✓ (无错误路径)
  syncExpandedWords ✓ (仅次数)    listExpandedWords (通过 getById 间接测试)

PortraitServiceImpl:
  list ✓ (无 search)  listByProject ✓ (无 search)  getById ✓ (无错误路径)
  create ✓    update ✓ (无错误路径)    delete ✓ (无错误路径)

ImageServiceImpl:
  list ✓ (无 search)  listByProject ✓ (无 search)  getById ✓ (无错误路径)
  create ✓    update ✓ (无错误路径)    delete ✗ (无测试)
  checkDuplicate ✗    checkDuplicateTitle ✗

DocumentServiceImpl:
  list ✓ (无 search, 已验证无 deletedAt)  listByProject ✓ (无 search)
  getById ✓ (无错误路径)    create ✓    update ✓ (无错误路径)    delete ✗
  checkDuplicate ✗    checkDuplicateTitle ✗

MinedKeywordServiceImpl:
  listByBase ✓    addMinedKeywords ✓    toggleSelectBatch ✓
  deleteByIds ✓    clearAll ✓    aggregateContent ✗    saveAndRemove ✗
```

---

## 结论

测试文件在**基础结构**（helper 工厂、命名规范、mock 隔离）上表现良好，但作为 "R2 深度验证" 测试套件，存在三个根本性缺陷：

1. **零错误路径覆盖** — 32 个测试全走 happy path，`NotFoundError` / `ConflictError` 完全未验证
2. **search 分支空白** — 导致分支覆盖率仅 29.72%
3. **8 个公共方法零覆盖** — 包括关键的重复检测和事务操作

建议在修复 B-1 ~ B-3 后重新评审，预期可将分支覆盖率提升至 70%+，语句覆盖率提升至 85%+。

**评审结论**: **CONDITIONAL APPROVE** — 当前可合并作为 Round 2 基础框架，但 B-1 ~ B-3 必须在下一轮迭代中补全。
