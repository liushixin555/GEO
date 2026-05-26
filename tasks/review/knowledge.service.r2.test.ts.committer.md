# tests/apis/knowledge.service.r2.test.ts — Committer 审核专家评审报告

**评审日期**: 2026-05-26
**评审角色**: Committer 审核专家（合并准入 · 测试置信度 · 架构一致性 · 安全合规 · 测试铁律合规）
**文件路径**: `tests/apis/knowledge.service.r2.test.ts`（429行，32个测试用例）
**被测文件**: `apis/service/impl/knowledge.service.impl.ts`（475行，5个服务类，41个公共方法）
**关联文件**: `apis/service/knowledge.service.ts`（接口定义）、`apis/utils/db.util.ts`、`apis/service/impl/knowledge-base.service.impl.ts`
**已有评审**: 架构评审（5.2/10 CONDITIONAL APPROVE）、质量评审（4.5/10 CONDITIONAL APPROVE）、安全评审（3.8/10 REJECT）

---

## 一、Committer 审核总览

本测试文件作为 "R2 深度验证" 测试套件，声称对 `knowledge.service.impl.ts` 中 5 个服务类进行深度验证。Committer 视角的核心关切：

1. **测试是否兑现"深度验证"承诺？** — 32 个测试全走 happy path，分支覆盖率仅 29.72%，与"深度验证"定位严重不符
2. **测试提供的合并信心是否足够？** — 41 个公共方法中 12 个零测试，安全敏感操作覆盖率约 30%，合并信心不足
3. **三份评审交叉验证后，哪些是真实阻断项？** — 三份评审一致标记零错误路径和 12 方法零覆盖为 BLOCKING/CRITICAL
4. **测试本身的质量是否达到合并标准？** — 测试结构规范但覆盖严重不足

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 测试架构与结构 | 7.5/10 | 通过 — describe 分组、Helper 工厂、Mock 隔离规范 |
| 测试完备性（方法覆盖） | 4.0/10 | 不通过 — 12/41 方法零覆盖 |
| 测试深度（分支覆盖） | 3.0/10 | 不通过 — 29.72% 分支覆盖率 |
| 错误/异常路径覆盖 | 1.0/10 | 不通过 — 32 个测试零错误路径 |
| 安全敏感操作覆盖 | 2.0/10 | 不通过 — checkDuplicate/saveAndRemove/Raw SQL 零验证 |
| Mock 保真度 | 6.5/10 | 有条件通过 — Mock 劫持模块系统掩盖硬编码依赖 |
| 测试可维护性 | 7.0/10 | 通过 — Helper 工厂、命名规范、setup 清晰 |

**综合判定: REJECT — 作为"R2 深度验证"测试套件未达到合并标准**

---

## 二、三份评审综合裁定

| 评审 | 评分 | 核心结论 | Committer 裁定 |
|------|------|---------|---------------|
| 架构评审 | 5.2/10 CONDITIONAL APPROVE | Mock 劫持掩盖硬编码依赖；12 接口方法零测试；Raw SQL/ORM 双模式映射一致性无保护 | B-1(Mock注入)、B-2(接口契约)、B-3(双模式映射) 需修复 |
| 质量评审 | 4.5/10 CONDITIONAL APPROVE | 32 个测试全走 happy path；search 分支空白；8 方法零覆盖；分支覆盖率仅 29.72% | B-1(错误路径)、B-2(search分支)、B-3(方法覆盖) 为阻断项 |
| 安全评审 | 3.8/10 REJECT | Raw SQL 注入零验证；checkDuplicate 守门零测试；事务原子性零测试；恶意输入零测试 | C-1(Raw SQL)、C-2(重复检测)、C-3(事务) 为致命级 |

### 交叉验证结论

三份评审**一致标记**以下问题：

| 问题 | 架构 | 质量 | 安全 | Committer 裁定 |
|------|------|------|------|---------------|
| 12 个方法零测试 | B-2 | B-3 | C-2/C-3 | **阻断合并** — 接口契约验证严重不足 |
| 零错误路径覆盖 | 隐含于 B-2 | B-1 | C-1/C-2 | **阻断合并** — 32 测试全 happy path |
| search 分支空白 | H-3(映射层) | B-2 | — | **阻断合并** — 分支覆盖率主因 |
| Raw SQL 参数化零验证 | B-3 | — | C-1 | **阻断合并** — 安全敏感操作无保障 |
| Mock 劫持模块系统 | B-1 | — | M-5 | 有条件通过 — 当前可接受的测试策略 |
| saveAndRemove 事务零测试 | H-1 | B-3 | C-3 | **阻断合并** — 最高架构复杂度方法无测试 |

---

## 三、逐条审核意见

### 3.1 BLOCKING — 阻断合并

#### B-1 [BLOCKING] 零错误路径覆盖——32 个测试全走 happy path

- **来源**: 质量评审 B-1 + 安全评审 C-1/C-2 — 两份评审一致标记
- **位置**: 整个测试文件（32 个 it 块）
- **被测实现中的错误路径**（全部未测试）:

  | 服务 | 方法 | 行号 | 错误类型 | 未验证内容 |
  |------|------|------|---------|-----------|
  | KeywordServiceImpl | getById | impl:67 | NotFoundError | 空结果集时应抛出 |
  | KeywordServiceImpl | update | impl:114 | NotFoundError | 已删除记录更新应拒绝 |
  | KeywordServiceImpl | delete | impl:128 | NotFoundError | 已删除记录删除应拒绝 |
  | PortraitServiceImpl | getById | impl:183 | NotFoundError | 同上 |
  | PortraitServiceImpl | update | impl:198 | NotFoundError | 同上 |
  | PortraitServiceImpl | delete | impl:209 | NotFoundError | 同上 |
  | ImageServiceImpl | getById | impl:249 | NotFoundError | 同上 |
  | ImageServiceImpl | update | impl:264 | NotFoundError | 同上 |
  | ImageServiceImpl | delete | impl:275 | NotFoundError | 同上 |
  | ImageServiceImpl | checkDuplicate | impl:282/284 | ConflictError | 标题/URL 重复检测 |
  | ImageServiceImpl | checkDuplicateTitle | impl:290 | ConflictError | 排除自身后的重复检测 |
  | DocumentServiceImpl | getById | impl:335 | NotFoundError | 同上 |
  | DocumentServiceImpl | update | impl:358 | NotFoundError | 同上 |
  | DocumentServiceImpl | delete | impl:369 | NotFoundError | 同上 |
  | DocumentServiceImpl | checkDuplicate | impl:377/379 | ConflictError | 标题/URL 重复检测 |
  | DocumentServiceImpl | checkDuplicateTitle | impl:385 | ConflictError | 排除自身后的重复检测 |

- **Committer 裁定**: **阻断合并** — "深度验证"测试套件不验证任何错误路径，提供了**虚假的合并信心**。若 `NotFoundError` 抛出条件被意外修改（如删掉 `deletedAt: null` 检查），所有错误将绕过 service 层直达 controller，测试不会报警
- **修复方案**: 每个服务的 getById/update/delete 至少添加 1 个 NotFoundError 测试；checkDuplicate/checkDuplicateTitle 添加 ConflictError + 成功路径测试
- **预估工作量**: 16 个错误路径测试，约 2.5h

#### B-2 [BLOCKING] search 参数分支完全空白——分支覆盖率 29.72% 的主因

- **来源**: 质量评审 B-2 + 架构评审 H-3
- **位置**: impl 行 39, 55, 155, 171, 221, 237, 301, 320（8 处 search 条件分支）
- **影响范围**:
  - `KeywordServiceImpl.list / listByProject` — `where.keyword = { contains: search, mode: 'insensitive' }`
  - `PortraitServiceImpl.list / listByProject` — `where.title = { contains: search, mode: 'insensitive' }`
  - `ImageServiceImpl.list / listByProject` — `where.title = { contains: search, mode: 'insensitive' }`
  - `DocumentServiceImpl.list / listByProject` — `where.OR = [{ title: contains }, { fileName: contains }]`
- **Committer 裁定**: **阻断合并** — search 是核心业务功能，8 处条件分支全未覆盖。特别是 `DocumentServiceImpl` 使用 `OR` 查询条件（title + fileName），逻辑更复杂，测试应优先覆盖
- **修复方案**: 每个服务的 list / listByProject 各添加 1 个 search 测试（至少 8 个测试）
- **预估工作量**: 约 1.5h

#### B-3 [BLOCKING] 12 个公共方法零测试——接口契约验证率仅 70.7%

- **来源**: 架构评审 B-2 + 质量评审 B-3 + 安全评审 C-2/C-3
- **零测试方法清单**:

  | 方法 | 服务 | 安全敏感度 | Committer 裁定 |
  |------|------|-----------|---------------|
  | `checkDuplicate(baseId, title, imageUrl)` | ImageServiceImpl | **CRITICAL** — 数据完整性守门 | **必须测试** |
  | `checkDuplicateTitle(baseId, title, excludeId)` | ImageServiceImpl | **CRITICAL** — 更新去重 | **必须测试** |
  | `checkDuplicate(baseId, title, fileUrl)` | DocumentServiceImpl | **CRITICAL** — 数据完整性守门 | **必须测试** |
  | `checkDuplicateTitle(baseId, title, excludeId)` | DocumentServiceImpl | **CRITICAL** — 更新去重 | **必须测试** |
  | `saveAndRemove(baseId, keywords, userId, keywordService)` | MinedKeywordServiceImpl | **CRITICAL** — 唯一事务方法 | **必须测试** |
  | `aggregateContent(baseId, sourceType)` | MinedKeywordServiceImpl | HIGH — 跨实体聚合+截断 | **必须测试** |
  | `delete(id)` | ImageServiceImpl | HIGH — 软删除验证 | **必须测试** |
  | `delete(id)` | DocumentServiceImpl | HIGH — 软删除验证 | **必须测试** |
  | `listByGroup(groupId)` | KeywordServiceImpl | LOW — 空实现 | 建议测试 |
  | `syncGroup(groupId, baseId, keywords, userId)` | KeywordServiceImpl | LOW — 空实现 | 建议测试 |

- **Committer 裁定**: **阻断合并** — 其中 8 个方法涉及安全敏感操作（重复检测、事务原子性、软删除）。这些是 controller 层依赖的安全守门方法，若实现被意外修改，无任何测试捕获
- **修复方案**: 优先补全 checkDuplicate x4 + saveAndRemove + aggregateContent + delete x2，最少 10 个测试
- **预估工作量**: 约 3h

#### B-4 [BLOCKING] Raw SQL 参数化安全性零验证

- **来源**: 安全评审 C-1 + 架构评审 B-3
- **位置**: impl 行 64-71（getById: `$queryRaw`）、132-145（syncExpandedWords: `$executeRaw` × N）
- **代码**:
  ```typescript
  // impl 行 64: getById
  await prisma.$queryRaw`SELECT * FROM knowledge_keywords WHERE id = ${id} AND deleted_at IS NULL`;

  // impl 行 140-142: syncExpandedWords — w.word 来自用户输入
  await prisma.$executeRaw`INSERT INTO keyword_expanded_words (keyword_id, word, selected, ...)
    VALUES (${keywordId}, ${w.word}, ${w.selected}, NOW(), NOW())`;
  ```
- **当前测试缺陷**:
  - `getById` 测试（test:97-103）仅验证 `$queryRaw` 调用 2 次
  - `syncExpandedWords` 测试（test:158-166）仅验证 `$executeRaw` 调用 4 次
  - **未验证 SQL 模板内容、参数绑定方式、参数值**
- **Committer 裁定**: **阻断合并** — 虽然使用了 Prisma tagged template（自动参数化），但 `syncExpandedWords` 的 INSERT 直接插入用户输入的 `w.word`，测试未验证此安全机制。若未来重构为字符串拼接，测试不会捕获 SQL 注入回归
- **修复方案**: 验证 `$executeRaw` 调用使用 tagged template 而非字符串拼接；验证参数值正确传递
- **预估工作量**: 约 1h

### 3.2 HIGH — 高优先级（不阻断但强烈建议本迭代修复）

#### H-1 [HIGH] Mock 劫持模块系统掩盖硬编码依赖

- **来源**: 架构评审 B-1
- **位置**: test 行 12-16, impl 行 33/149/215/295
- **代码**:
  ```typescript
  // test: 通过 jest.mock 替换构造函数
  jest.mock('../../apis/service/impl/knowledge-base.service.impl', () => ({
    KnowledgeBaseServiceImpl: jest.fn().mockImplementation(() => ({
      getAccessibleBaseIds: jest.fn(),
    })),
  }));

  // impl: 硬编码实例化
  private kbService = new KnowledgeBaseServiceImpl();
  ```
- **Committer 裁定**: **不阻断合并** — 当前 Mock 策略在功能上是正确的，且 `(service as any).kbService` 访问在测试中是常见的实践。但这一策略掩盖了实现中的硬编码依赖问题（4 个服务类通过 `new` 直接实例化依赖），测试验证的是"mock 后的行为"而非"真实的依赖交互"
- **建议**: 实现侧应改为构造器注入或工厂注入；测试侧应验证 DI 路径而非劫持模块
- **预估工作量**: 实现重构 2h + 测试调整 1h

#### H-2 [HIGH] mapRawKeyword vs mapKeyword 双映射一致性无保护

- **来源**: 架构评审 B-3
- **位置**: impl 行 8-19（mapRawKeyword）vs 外部 mapKeyword 函数
- **Committer 裁定**: **不阻断合并** — Raw SQL 路径和 ORM 路径使用不同的映射函数，若两者产生字段遗漏/分歧，无测试捕获。但此问题与 B-4（Raw SQL 参数化验证）相关，修复 B-4 时可一并解决
- **建议**: 添加对比测试，用相同数据分别走 ORM 和 Raw SQL 路径

#### H-3 [HIGH] listByProject 授权边界仅验证成功路径

- **来源**: 安全评审 H-3
- **位置**: test 行 85-95, 219-227, 288-296, 357-365
- **Committer 裁定**: **不阻断合并** — 当前验证了 `getAccessibleBaseIds` 返回有效 baseIds 时的查询参数。但未验证:
  1. 空 baseIds 时的提前返回（`if (baseIds.length === 0) return { list: [], total: 0 }`）
  2. `getAccessibleBaseIds` 是否被以正确 projectId 调用
- **建议**: 添加授权失败路径测试 + projectId 传递验证

#### H-4 [HIGH] DocumentServiceImpl.list 与 listByProject 的 deletedAt 不一致

- **来源**: 架构评审 H-2 + 安全评审 M-4
- **位置**: impl 行 297-311 vs 317-327
- **Committer 裁定**: **不阻断合并** — 测试已正确识别了此行为差异（test 行 303-311）。但这是一个**实现侧问题**（list 不过滤已删除文档导致潜在数据泄露），测试不应为实现的 bug 负责。测试文件应添加注释标注此不一致
- **建议**: 在实现侧确认此不一致是有意为之还是 bug，并统一行为

### 3.3 MEDIUM — 中等问题（排期修复）

| 编号 | 问题 | 来源 | Committer 裁定 |
|------|------|------|---------------|
| M-1 | `create` 方法未测试 expanded_words 非空分支 | 质量 H-1 | 不阻断 — 关键分支，建议本迭代补全 |
| M-2 | syncExpandedWords 仅验证调用次数，未验证 SQL 参数 | 质量 M-1 | 不阻断 — 与 B-4 相关 |
| M-3 | batchCreate 返回值 { created, duplicates } 未验证 | 质量 H-2 | 不阻断 — 建议增加计数断言 |
| M-4 | 测试与实现高度耦合（行为验证 vs 结果验证） | 质量 M-3 | 不阻断 — 单元测试行为验证可接受 |
| M-5 | Helper 工厂使用 camelCase，与 Raw SQL snake_case 返回不匹配 | 架构 M-2 | 不阻断 — 建议 Helper 区分 ORM/Raw 两种模式 |
| M-6 | 五个 describe 缺少服务间差异对比 | 架构 M-3 | 不阻断 — 建议添加跨服务约定测试 |
| M-7 | 未使用 test.each 消除分页测试重复 | 质量 L-3 | 不阻断 — 纯重构，可排期 |
| M-8 | 环境变量 JWT_SECRET 设置在无 JWT 逻辑的测试中 | 安全 M-1 | 不阻断 — 应移除未使用的设置 |

### 3.4 认可的优点

| # | 优点 | 说明 |
|---|------|------|
| 1 | **Helper 工厂函数设计规范** | `makePrismaKeyword` 等 5 个工厂函数使用合理默认值 + overrides 模式，减少重复代码 |
| 2 | **测试命名清晰** | 遵循 `方法 + 场景 + 预期` 三段式命名，如 `list page 2 pageSize 5 should skip first 5` |
| 3 | **describe 分组与实现 1:1 映射** | 5 个 describe 块准确映射 5 个服务类，结构清晰 |
| 4 | **Mock 隔离边界明确** | `jest.mock` 隔离 db.util 和 KnowledgeBaseServiceImpl，无 mock 泄漏风险 |
| 5 | **成功捕获 DocumentServiceImpl.list 无 deletedAt** | test 行 303-311 正确验证了 `where` 不含 `deletedAt`，展现了测试的架构感知力 |
| 6 | **分页计算覆盖到位** | 对每个服务的 list / listByProject 都验证了 skip/take 参数，使用不同的 page/pageSize 组合 |
| 7 | **update expanded_words 分支验证** | 正确区分了 `expanded_words: []`（触发 sync）和 `undefined`（仅 list）两种行为 |
| 8 | **字段映射验证** | KeywordServiceImpl.create 和 PortraitServiceImpl.create 验证了 snake_case → camelCase 映射 |
| 9 | **测试数据无安全风险** | URL 使用 example.com，无敏感信息泄露 |
| 10 | **beforeEach 统一清理** | 每个 describe 块的 `jest.clearAllMocks()` 确保测试隔离 |

---

## 四、测试覆盖率分析

### 4.1 覆盖率数据

```
File                        | % Stmts | % Branch | % Funcs | % Lines
knowledge.service.impl.ts   |  67.57  |   29.72  |   67.3  |  76.01
```

### 4.2 方法覆盖矩阵

```
KeywordServiceImpl (12 方法):
  list ✓ (无 search)          listByProject ✓ (无 search)    getById ✓ (无错误路径)
  create ✓ (无 expanded_words 分支)    batchCreate ✓
  update ✓ (两种分支)          delete ✓ (仅 Keyword)
  syncExpandedWords ✓ (仅次数)    listExpandedWords (间接)
  listByGroup ✗    syncGroup ✗

PortraitServiceImpl (6 方法):
  list ✓ (无 search)    listByProject ✓ (无 search)    getById ✓ (无错误路径)
  create ✓    update ✓ (无错误路径)    delete ✓ (仅 where)

ImageServiceImpl (8 方法):
  list ✓ (无 search)    listByProject ✓ (无 search)    getById ✓ (无错误路径)
  create ✓    update ✓ (无错误路径)    delete ✗
  checkDuplicate ✗    checkDuplicateTitle ✗

DocumentServiceImpl (8 方法):
  list ✓ (验证无 deletedAt)    listByProject ✓ (无 search)    getById ✓ (无错误路径)
  create ✓    update ✓ (无错误路径)    delete ✗
  checkDuplicate ✗    checkDuplicateTitle ✗

MinedKeywordServiceImpl (7 方法):
  listByBase ✓    addMinedKeywords ✓    toggleSelectBatch ✓
  deleteByIds ✓    clearAll ✓    aggregateContent ✗    saveAndRemove ✗
```

**方法覆盖**: 29/41 = 70.7%（但仅覆盖 happy path）
**未覆盖方法**: 12 个（含 8 个安全敏感方法）

---

## 五、修复路线图

### P0 — 立即修复（阻断合并）

| 修复项 | 来源 | 预估工作量 | 说明 |
|--------|------|-----------|------|
| B-1: 补全错误路径测试（NotFoundError/ConflictError） | 质量 B-1 | 2.5h | 16 个错误路径测试 |
| B-2: 补全 search 参数分支测试 | 质量 B-2 | 1.5h | 8 个 search 测试（含 Document OR 条件） |
| B-3: 补全 8 个安全敏感方法测试 | 架构 B-2 + 安全 C-2/C-3 | 3h | checkDuplicate x4 + saveAndRemove + aggregateContent + delete x2 |
| B-4: 补全 Raw SQL 参数化验证 | 安全 C-1 | 1h | 验证 tagged template 使用 + 参数值传递 |

**P0 总工作量**: 约 8h

### P1 — 本迭代修复（强烈建议）

| 修复项 | 来源 | 预估工作量 | 说明 |
|--------|------|-----------|------|
| H-1: Mock 策略改进（实现侧构造器注入） | 架构 B-1 | 3h | 实现重构 2h + 测试调整 1h |
| H-3: listByProject 授权失败路径 | 安全 H-3 | 0.5h | 空 baseIds 提前返回 + projectId 传递 |
| M-1: create expanded_words 非空分支 | 质量 H-1 | 0.5h | 1 个测试 |

### P2 — 下迭代优化

| 修复项 | 说明 |
|--------|------|
| H-2: Raw SQL/ORM 映射一致性对比测试 | 双映射函数一致性保障 |
| H-4: DocumentServiceImpl.list deletedAt 行为统一 | 确认设计决策 |
| M-2~M-8: 参数验证、返回值断言、test.each 重构 | 测试质量提升 |

---

## 六、问题统计

| 严重程度 | 数量 | 编号 |
|----------|------|------|
| BLOCKING | 4 | B-1(错误路径), B-2(search分支), B-3(方法覆盖), B-4(Raw SQL) |
| HIGH（不阻断） | 4 | H-1(Mock注入), H-2(双映射), H-3(授权边界), H-4(deletedAt不一致) |
| MEDIUM | 8 | M-1 ~ M-8 |
| **合计** | **16** | |

---

## 七、最终裁决

### 裁决结果：REJECT

### 裁决理由

**1. 未兑现"R2 深度验证"承诺**

测试文件命名为 `knowledge.service.r2.test.ts`，标注为 "Round 2 – Deep Verification Tests"。然而：
- 32 个测试**全部走 happy path**，零错误路径覆盖
- 分支覆盖率仅 **29.72%**，与"深度验证"严重不符
- 41 个公共方法中 **12 个零测试**，方法覆盖率 70.7%
- 8 个安全敏感方法（checkDuplicate ×4、saveAndRemove、aggregateContent、delete ×2）**完全没有测试**

作为 R1 基础验证测试可以接受（约 5.5/10），但作为 R2 深度验证测试，未能兑现其承诺。

**2. 安全评审给出 REJECT 且理由充分**

安全评审评分 3.8/10 REJECT，三份评审中发现的安全敏感问题：
- Raw SQL 参数化安全性零验证（`syncExpandedWords` 直接插入用户输入 `w.word`）
- 重复检测守门方法（`checkDuplicate`/`checkDuplicateTitle`）零测试——可被静默移除
- 唯一事务方法 `saveAndRemove` 零测试——事务原子性无保障
- 用户恶意输入（XSS/注入向量）零测试

**安全敏感操作覆盖率约 30%**，测试提供的合并信心不足。

**3. 测试给予虚假的合并信心**

32 个测试全部通过，给开发者造成"测试充分、代码可靠"的假象。但事实上：
- 若删掉所有 `NotFoundError` 抛出逻辑，所有 32 个测试仍然通过
- 若删掉所有 `checkDuplicate` 方法，所有 32 个测试仍然通过
- 若将 `syncExpandedWords` 的 Raw SQL 改为字符串拼接，所有 32 个测试仍然通过
- 若将 `search` 参数处理逻辑完全移除，所有 32 个测试仍然通过

这意味着测试无法捕获最常见的回归类型（错误处理丢失、安全守门移除、SQL 注入引入）。

**4. 测试基础架构值得保留**

尽管覆盖不足，测试文件的基础架构设计良好：
- Helper 工厂函数模式统一
- Mock 隔离策略清晰
- describe 分组与实现 1:1 映射
- 测试命名规范
- 成功捕获了 DocumentServiceImpl.list 的 deletedAt 行为差异

这些基础设施为后续扩展提供了良好的起点。

### 前置条件（修复完成前不可合并）

- [ ] **B-1**: 补全 NotFoundError 错误路径测试（至少 10 个服务方法 × 1 个错误测试）
- [ ] **B-2**: 补全 search 参数分支测试（至少 8 个 list/listByProject × search 测试）
- [ ] **B-3**: 补全 checkDuplicate ×4 + saveAndRemove + aggregateContent + delete ×2 测试
- [ ] **B-4**: 补全 Raw SQL 参数化验证（验证 tagged template 使用 + 参数传递）
- [ ] 修复后分支覆盖率目标: **≥ 60%**（当前 29.72%）
- [ ] 修复后方法覆盖率目标: **≥ 90%**（当前 70.7%）

### 建议改进（Non-blocking — 排期修复）

- [ ] 实现侧改为构造器注入（H-1）
- [ ] 补全 listByProject 授权失败路径（H-3）
- [ ] Raw SQL/ORM 映射一致性对比测试（H-2）
- [ ] 移除未使用的 JWT_SECRET 环境变量设置（M-8）
- [ ] test.each 参数化分页测试（M-7）

---

**评审人**: Committer 审核专家
**评审结论**: REJECT — 作为"R2 深度验证"测试套件，覆盖严重不足，三份评审一致标记多项 BLOCKING/CRITICAL 问题
**阻断原因**: 零错误路径 + 零 search 分支 + 12 方法零覆盖 + Raw SQL 安全零验证
**预估修复工作量**: P0 约 8h（16 个错误路径 + 8 个 search + 10 个新方法 + 2 个 Raw SQL 验证测试）
**修复后预期评分**: B-1~B-4 修复后预估可达 **7.0/10** — 合并标准
