# knowledge.service.r2.test.ts 软件架构专家评审

**文件**: `tests/apis/knowledge.service.r2.test.ts`
**被测文件**: `apis/service/impl/knowledge.service.impl.ts`（475行，5个服务类）
**接口定义**: `apis/service/knowledge.service.ts`（55行，5个接口）
**评审日期**: 2026-05-26
**评审类型**: 软件架构评审
**综合评分**: **5.2 / 10** — CONDITIONAL APPROVE

---

## 评分维度

| 维度 | 得分 | 权重 | 加权分 |
|------|------|------|--------|
| 测试架构与被测代码结构对齐度 | 5.0 | 20% | 1.00 |
| Mock 层设计与依赖边界验证 | 6.5 | 20% | 1.30 |
| 接口契约覆盖率 | 3.0 | 20% | 0.60 |
| 数据流映射验证完备性 | 6.0 | 15% | 0.90 |
| 跨服务交互架构验证 | 4.0 | 15% | 0.60 |
| 测试套件可扩展性与维护性 | 7.5 | 10% | 0.75 |
| **加权总分** | | | **5.15 → 5.2** |

---

## 一、架构映射分析

### 1.1 被测架构概览

实现文件采用**五服务并列架构**，共享以下架构模式：

```
┌─────────────────────────────────────────────────┐
│           knowledge.service.impl.ts             │
├──────────┬──────────┬──────────┬────────┬───────┤
│Keyword   │Portrait  │Image     │Document│Mined  │
│Service   │Service   │Service   │Service │Keyword│
│Impl      │Impl      │Impl      │Impl    │Service│
│(12方法)  │(6方法)   │(8方法)   │(8方法) │(7方法)│
├──────────┴──────────┴──────────┴────────┴───────┤
│  kbService: KnowledgeBaseServiceImpl (共享依赖) │
├─────────────────────────────────────────────────┤
│  getPrisma() → PrismaClient (全局工厂)           │
├─────────────────────────────────────────────────┤
│  mapKeyword / mapPortrait / mapKnowledgeImage... │
│  mapRawKeyword / mapRawExpandedWord (内部映射)   │
└─────────────────────────────────────────────────┘
```

### 1.2 测试架构映射评估

测试文件的 `describe` 分组**准确映射**到 5 个服务类：

| 测试 describe | 被测服务 | 公共方法数 | 已测试方法数 | 覆盖率 |
|--------------|---------|-----------|------------|--------|
| KeywordServiceImpl R2 | KeywordServiceImpl | 12 | 8 | 66.7% |
| PortraitServiceImpl R2 | PortraitServiceImpl | 6 | 6 | 100% |
| ImageServiceImpl R2 | ImageServiceImpl | 8 | 5 | 62.5% |
| DocumentServiceImpl R2 | DocumentServiceImpl | 8 | 6 | 75.0% |
| MinedKeywordServiceImpl R2 | MinedKeywordServiceImpl | 7 | 5 | 71.4% |

**总方法覆盖**: 30/41 = 73.2%，但仅覆盖 happy path，无错误路径和分支覆盖。

---

## 二、问题清单

### BLOCKING（阻塞级）

#### B-1: Mock 层切断 kbService 依赖但未验证注入架构
**严重度**: BLOCKING | **行号**: test 12-16, impl 33/149/215/295

四个服务类通过 `private kbService = new KnowledgeBaseServiceImpl()` 硬编码实例化依赖。测试通过 `jest.mock` 替换模块来绕过此限制，但**未验证真实的依赖注入路径**：

```typescript
// test: 间接 mock 了构造函数
jest.mock('../../apis/service/impl/knowledge-base.service.impl', () => ({
  KnowledgeBaseServiceImpl: jest.fn().mockImplementation(() => ({
    getAccessibleBaseIds: jest.fn(),
  })),
}));

// impl: 硬编码 new，无法在运行时替换
private kbService = new KnowledgeBaseServiceImpl();
```

**架构问题**: 测试验证了"mock 后的行为"而非"真实的依赖交互"。若 `KnowledgeBaseServiceImpl` 构造函数签名变更（如需要参数），测试不会发现。同时测试中通过 `(service as any).kbService` 访问私有属性，是对封装的破坏性耦合。

**建议**: 实现应采用构造器注入或工厂注入，测试应验证 DI 注入而非劫持模块系统。

#### B-2: 接口契约验证缺失——12 个接口方法零测试
**严重度**: BLOCKING | **接口文件**: knowledge.service.ts

以下接口方法在实现中存在但测试完全未涉及：

| 接口 | 方法 | 签名 | 架构角色 |
|------|------|------|---------|
| IKeywordService | `listByGroup(groupId)` | `→ Promise<KnowledgeKeyword[]>` | 分组查询（空实现） |
| IKeywordService | `syncGroup(groupId, baseId, keywords, userId)` | `→ Promise<KnowledgeKeyword[]>` | 分组同步（空实现） |
| IImageService | `checkDuplicate(baseId, title, imageUrl)` | `→ Promise<void>` | 数据完整性约束 |
| IImageService | `checkDuplicateTitle(baseId, title, excludeId)` | `→ Promise<void>` | 更新时去重 |
| IDocumentService | `checkDuplicate(baseId, title, fileUrl)` | `→ Promise<void>` | 数据完整性约束 |
| IDocumentService | `checkDuplicateTitle(baseId, title, excludeId)` | `→ Promise<void>` | 更新时去重 |
| IMinedKeywordService | `aggregateContent(baseId, sourceType)` | `→ Promise<string>` | 跨实体内容聚合 |
| IMinedKeywordService | `saveAndRemove(baseId, keywords, userId, keywordService)` | `→ Promise<...>` | 跨服务事务 |

**架构影响**:
- `checkDuplicate` / `checkDuplicateTitle` 是 controller 层调用的**数据完整性守门方法**，若映射逻辑出错（如 `imageUrl` ↔ `fileUrl` 混淆），controller 层无法正确拦截重复数据
- `aggregateContent` 跨越三个实体模型（Document/Portrait/Image）聚合内容，包含 8000 字符截断逻辑，是最复杂的跨实体查询方法
- `saveAndRemove` 是唯一使用 `$transaction` 的事务方法，涉及跨服务调用 `keywordService.batchCreate`，架构复杂度最高
- `listByGroup` / `syncGroup` 虽为空实现，但接口契约承诺返回 `KnowledgeKeyword[]`，测试应验证其确实返回空数组而非 null/undefined

#### B-3: Prisma 双模式访问未对齐测试策略
**严重度**: BLOCKING | **实现文件**: 行 8-19, 64-71, 132-145

实现文件采用**混合数据访问策略**：

| 方法 | Prisma 访问模式 | 测试覆盖 |
|------|----------------|---------|
| `list` / `listByProject` | ORM (`findMany` / `count`) | ✓ 已覆盖 |
| `getById` | Raw SQL (`$queryRaw`) + ORM 映射 | ✓ 部分覆盖 |
| `listExpandedWords` | Raw SQL (`$queryRaw`) | ✓ 通过 getById 间接 |
| `syncExpandedWords` | Raw SQL (`$executeRaw`) × N | △ 仅验证次数 |
| `batchCreate` | ORM (`findMany` + `createMany`) | ✓ 已覆盖 |
| `create` / `update` / `delete` | ORM (`findFirst` + `create`/`update`) | ✓ 已覆盖 |

**架构问题**: `getById` 使用 `$queryRaw` 直接查询 `knowledge_keywords` 表，而 `list` 使用 Prisma ORM `findMany`。测试验证了两种模式分别被调用，但**未验证两套查询返回的数据结构是否一致**。Raw SQL 返回 `snake_case`（`base_id`），ORM 返回 `camelCase`（`baseId`），映射函数 `mapRawKeyword` vs `mapKeyword` 分别处理。若两个映射函数产生分歧（字段遗漏），测试无法捕获。

```typescript
// impl 行 8-19: mapRawKeyword（raw SQL 用）
function mapRawKeyword(r: any): KnowledgeKeyword {
  return { id: r.id, base_id: r.base_id, keyword: r.keyword, ... };
}

// impl 行 79: mapKeyword（ORM 用，来自 map/index.ts）
const keyword = mapKeyword(item);
```

**建议**: 添加对比测试，用相同数据分别走 ORM 和 Raw SQL 路径，验证映射结果一致。

---

### HIGH（高优先级）

#### H-1: 跨服务事务 saveAndRemove 零验证
**严重度**: HIGH | **实现文件**: 行 458-473

`saveAndRemove` 是整个文件中**架构复杂度最高的方法**：

```typescript
async saveAndRemove(baseId, keywords, userId, keywordService): Promise<...> {
  const prisma = getPrisma();
  return prisma.$transaction(async () => {
    const result = await keywordService.batchCreate(baseId, keywords, userId, '关键词挖掘');
    await prisma.minedKeyword.updateMany({
      where: { baseId, keyword: { in: keywords }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return result;
  });
}
```

架构特性未验证：
1. **跨服务依赖**: 接收 `IKeywordService` 作为参数，测试应验证此依赖注入路径
2. **事务边界**: `$transaction` 内部两步操作的原子性——batchCreate 成功但 updateMany 失败时的回滚
3. **seedWord 硬编码**: 传递 `'关键词挖掘'` 作为 seedWord，测试应验证此业务常量
4. **返回值透传**: transaction 内部返回 `batchCreate` 的结果，测试应验证返回值结构

#### H-2: DocumentServiceImpl.list 故意省略 deletedAt 的架构决策未验证
**严重度**: HIGH | **实现文件**: 行 297-311, **测试文件**: 行 303-311

测试正确地验证了 `DocumentServiceImpl.list` 不包含 `deletedAt` 过滤：

```typescript
it('list should NOT include deletedAt filter', async () => {
  // ...
  const where = mockFindMany.mock.calls[0][0].where;
  expect(where).toEqual({ baseId: 10 });
  expect(where).not.toHaveProperty('deletedAt');
});
```

这是一个**架构亮点**——测试确实捕获了 DocumentServiceImpl.list 与其他服务 list 的不一致行为。但问题在于：

1. **未解释为何不一致**: 这是有意为之还是 bug？其他四个服务的 `list` 都过滤 `deletedAt: null`，唯独 DocumentServiceImpl 不做过滤
2. **listByProject 仍有 deletedAt**: DocumentServiceImpl 的 `listByProject`（行 317）包含 `deletedAt: null`，与 `list` 行为不一致，测试未覆盖此差异
3. **未测试实际行为差异**: 若故意不过滤，应测试 list 返回包含已删除文档的场景

#### H-3: 响应映射层验证不充分
**严重度**: HIGH

实现文件的数据映射链路为：

```
Prisma Entity → map 函数 → Domain Entity → 测试断言
```

测试仅在 `KeywordServiceImpl.create`（test 行 105-114）和 `PortraitServiceImpl.create`（test 行 238-245）中验证了 snake_case 映射。其余方法的返回值**仅通过 mock 间接验证**，未确认 map 函数是否被正确调用。

| 服务 | map 函数 | 测试验证 map 调用 |
|------|---------|-----------------|
| KeywordServiceImpl | `mapKeyword` / `mapRawKeyword` | △ 仅 create |
| PortraitServiceImpl | `mapPortrait` | △ 仅 create |
| ImageServiceImpl | `mapKnowledgeImage` | ✗ 未验证 |
| DocumentServiceImpl | `mapKnowledgeDocument` | ✗ 未验证 |
| MinedKeywordServiceImpl | `mapMinedKeyword` | ✗ 未验证 |

---

### MEDIUM（中优先级）

#### M-1: 测试未验证 Prisma 并发查询模式
**严重度**: MEDIUM | **实现文件**: 行 41-44, 57-60 等

所有 `list` / `listByProject` 方法使用 `Promise.all([findMany, count])` 并发执行查询和计数。测试通过 `mockResolvedValue` 让两个 mock 同时成功，但**未验证并发模式本身**：

```typescript
// impl: 并发模式
const [items, total] = await Promise.all([
  prisma.knowledgeKeyword.findMany({ where, ... }),
  prisma.knowledgeKeyword.count({ where }),
]);
```

测试中 `findMany` 和 `count` 是独立的 mock，即使实现改为串行也能通过。应验证 `Promise.all` 的使用而非独立的 mock 调用。

#### M-2: Helper 工厂函数不匹配 Prisma Raw SQL 返回格式
**严重度**: MEDIUM | **测试文件**: 行 27-67

`makePrismaKeyword` 生成的数据使用 camelCase（`baseId`, `seedWord`, `groupId`），这是 Prisma ORM 返回格式。但 `getById` 使用 Raw SQL，返回 snake_case（`base_id`, `seed_word`, `group_id`）。Helper 数据格式与部分被测路径不匹配：

```typescript
// helper 生成 camelCase
function makePrismaKeyword(overrides = {}) {
  return { id: 1, baseId: 10, keyword: '测试关键词', seedWord: null, groupId: null, ... };
}

// getById 的 Raw SQL 期望 snake_case
const rows: any[] = await prisma.$queryRaw`SELECT * FROM knowledge_keywords ...`;
// mapRawKeyword 读取 r.base_id（snake_case）
```

虽然 `getById` 测试（test 行 97-103）手动构造了 snake_case 的 rawRow，但 helper 工厂本身不能复用于 Raw SQL 路径，降低了可维护性。

#### M-3: 五个 describe 块缺少服务间差异对比
**严重度**: MEDIUM

五个服务类共享高度相似的结构模式（list / listByProject / getById / create / update / delete），测试对每个服务**独立编写相同模式的测试**，但未在架构层面验证服务间的约定一致性：

1. 所有 `getById` 都应使用 `deletedAt: null` 过滤——仅验证了 4 个服务中的 4 个 ✓
2. 所有 `delete` 都应使用软删除——仅验证了 KeywordServiceImpl
3. 所有 `update` 都应先 findFirst 再 update——验证了 4 个服务 ✓
4. 所有 `listByProject` 都应走 `getAccessibleBaseIds`——验证了 4 个服务 ✓

但 `ImageServiceImpl.delete` 和 `DocumentServiceImpl.delete` 完全没有测试，无法确认它们是否遵循软删除约定。

#### M-4: MinedKeywordServiceImpl 缺少 kbService 依赖分析
**严重度**: MEDIUM | **实现文件**: 行 389

`MinedKeywordServiceImpl` 是唯一没有 `kbService` 依赖的服务类，但测试未说明这一架构差异。`aggregateContent` 方法直接查询三个不同的 Prisma 模型（knowledgeDocument / knowledgePortrait / knowledgeImage），跨实体聚合测试完全缺失。

---

### LOW（低优先级）

#### L-1: Helper 函数缺乏类型安全
**严重度**: LOW | **测试文件**: 行 27, 35, 43, 51, 60

所有 `makePrisma*` 函数参数类型为 `Record<string, any>`，与 Prisma 生成的类型完全脱钩。若 Prisma schema 变更（字段重命名/删除），helper 函数不会产生编译错误。

#### L-2: jest.mock 路径硬编码
**严重度**: LOW | **测试文件**: 行 7, 12

两个 `jest.mock` 调用使用相对路径 `'../../apis/utils/db.util'` 和 `'../../apis/service/impl/knowledge-base.service.impl'`。若文件迁移目录，所有 mock 路径需同步更新。建议使用 `jest.mock` 与 `require.resolve` 或路径别名。

#### L-3: 未使用 test.each 消除分页测试重复
**严重度**: LOW

五个 describe 块中有 7 个分页计算测试，逻辑完全相同（验证 skip/take），仅参数不同。适合用 `test.each` 参数化。

---

## 三、架构风险矩阵

```
                     高影响
                       │
      B-2 接口契约     │    B-1 Mock 注入
      B-3 双模式映射   │    B-2 跨服务事务
                       │
  ─────────────────────┼───────────────────── 高概率
                       │
      M-1 并发模式     │    H-2 deletedAt 不一致
      M-2 Helper 格式  │    H-3 映射层验证
                       │
                     低影响
```

---

## 四、修复优先级矩阵

| 优先级 | 编号 | 工作量 | 修复建议 |
|--------|------|--------|---------|
| P0 | B-1 | 2h | 重构测试：通过接口注入 kbService mock，而非劫持模块系统 |
| P0 | B-2 | 4h | 补全 12 个接口方法测试，特别是 checkDuplicate、aggregateContent、saveAndRemove |
| P0 | B-3 | 1.5h | 添加 mapRawKeyword vs mapKeyword 映射一致性对比测试 |
| P1 | H-1 | 1.5h | 补全 saveAndRemove 事务测试（成功/回滚/跨服务依赖） |
| P1 | H-2 | 1h | 明确 DocumentServiceImpl.list 的 deletedAt 策略并补充测试 |
| P1 | H-3 | 1h | 为每个服务的 map 函数调用添加返回值结构验证 |
| P2 | M-1~M-4 | 2h | 验证 Promise.all、修复 Helper 格式、服务间约定对比 |
| P3 | L-1~L-3 | 1h | 类型安全、路径别名、test.each 重构 |

**总修复工作量**: ~14h

---

## 五、测试架构改进建议

### 5.1 建议引入测试基础设施层

```typescript
// tests/apis/helpers/knowledge-test-base.ts
abstract class KnowledgeServiceTestBase<T> {
  protected service: T;
  protected mockPrisma: any;
  protected mockKbService: any;

  abstract createService(): T;
  abstract getModelName(): string;

  beforeEach() {
    this.mockPrisma = createMockPrisma();
    this.service = this.createService();
    this.mockKbService = (this.service as any).kbService;
    jest.clearAllMocks();
  }
}
```

此基类可消除 5 个 describe 块中的重复 setup 代码，并为跨服务约定测试提供统一接口。

### 5.2 建议补充集成层测试

当前测试完全隔离了 Prisma 和 kbService 依赖，属于纯单元测试。建议补充：
1. **映射层集成测试**: 使用真实 map 函数验证 Prisma → Domain 转换
2. **SQL 模式验证测试**: 确认 Raw SQL 查询的列名与 Prisma schema 一致
3. **事务回滚测试**: 验证 `$transaction` 内部异常时的回滚行为

---

## 六、结论

### 架构优势
- G-1: 测试 describe 分组与实现服务类 1:1 映射，结构清晰
- G-2: Mock 隔离策略（db.util + KnowledgeBaseServiceImpl）边界明确
- G-3: Helper 工厂函数模式统一，降低测试数据构建成本
- G-4: 成功捕获了 DocumentServiceImpl.list 不含 deletedAt 的架构差异

### 架构风险
- R-1: Mock 劫持模块系统掩盖了硬编码依赖的架构问题（B-1）
- R-2: 41 个接口方法中 12 个完全未测试，接口契约验证率 70.7%（B-2）
- R-3: Raw SQL + ORM 双模式的映射一致性无测试保护（B-3）
- R-4: 唯一的事务方法 `saveAndRemove` 零测试，跨服务一致性无保障（H-1）

### 评审结论

**CONDITIONAL APPROVE** — 测试架构的基础框架（隔离策略、Helper 模式、分组结构）设计合理，但在三个维度存在根本性缺陷：

1. **依赖注入验证**：测试绕过了实现的硬编码依赖，提供了虚假的信心
2. **接口契约完整性**：30% 的接口方法无测试，包括关键的重复检测和事务操作
3. **双数据访问模式一致性**：Raw SQL 和 ORM 路径的映射分歧无测试保护

建议修复 B-1 ~ B-3 后重新评审，预期架构评分可提升至 7.0+。
