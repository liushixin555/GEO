# TDD 执行报告 — knowledge.service.impl.ts

## 测试文件
`tests/apis/knowledge.service.test.ts`

## 测试目标
`apis/service/impl/knowledge.service.impl.ts` — 包含 5 个服务类

## 覆盖范围

### 1. KeywordServiceImpl（35 个测试）
| 方法 | 测试数 | 覆盖场景 |
|------|--------|----------|
| list() | 4 | 分页、偏移量计算、搜索过滤、字段映射 |
| listByProject() | 3 | 无访问基础返回空、有基础查询、搜索过滤 |
| getById() | 3 | 正常返回含扩展词、不存在抛错、无扩展词 |
| create() | 3 | 无扩展词创建、含扩展词创建、空扩展词数组 |
| batchCreate() | 4 | 混合创建与去重、带seedWord、全部重复、无重复 |
| listByGroup() | 1 | stub 返回空数组 |
| syncGroup() | 1 | stub 返回空数组 |
| update() | 5 | 不存在抛错、无扩展词更新、含扩展词同步、createdBy非0、createdBy为null时回退0 |
| delete() | 3 | 不存在抛错、软删除、deletedAt过滤 |
| listExpandedWords() | 2 | 返回映射列表、空数组 |
| syncExpandedWords() | 2 | 删除旧+插入新、多词插入 |
| mapRawKeyword | 2 | null字段、非null字段 |

### 2. PortraitServiceImpl（14 个测试）
| 方法 | 测试数 | 覆盖场景 |
|------|--------|----------|
| list() | 3 | 分页、搜索过滤、字段映射 |
| listByProject() | 2 | 无基础返回空、搜索过滤 |
| getById() | 2 | 正常返回、不存在抛错 |
| create() | 2 | 有内容、无内容设null |
| update() | 4 | 不存在抛错、仅更新title、仅更新content、双更新、空更新 |
| delete() | 2 | 不存在抛错、软删除 |

### 3. ImageServiceImpl（15 个测试）
| 方法 | 测试数 | 覆盖场景 |
|------|--------|----------|
| list() | 3 | 分页、搜索过滤、字段映射 |
| listByProject() | 3 | 无基础返回空、有基础查询、搜索过滤 |
| getById() | 2 | 正常返回、不存在抛错 |
| create() | 2 | 全字段创建、无描述设null |
| update() | 4 | 不存在抛错、仅title、仅description、空更新 |
| delete() | 2 | 不存在抛错、软删除 |

### 4. DocumentServiceImpl（14 个测试）
| 方法 | 测试数 | 覆盖场景 |
|------|--------|----------|
| list() | 3 | 分页（无deletedAt过滤）、搜索双字段、字段映射 |
| listByProject() | 3 | 无基础返回空、有基础含deletedAt、搜索双字段 |
| getById() | 2 | 正常返回、不存在抛错 |
| create() | 2 | 全字段创建、无描述设null |
| update() | 3 | 不存在抛错、仅title、仅description |
| delete() | 2 | 不存在抛错、软删除 |

### 5. MinedKeywordServiceImpl（8 个测试）
| 方法 | 测试数 | 覆盖场景 |
|------|--------|----------|
| listByBase() | 3 | 正常返回、字段映射、空数组 |
| addMinedKeywords() | 3 | 混合去重、全新增、全重复 |
| toggleSelectBatch() | 2 | 设为true、设为false |
| deleteByIds() | 1 | 软删除 |
| clearAll() | 1 | 全量软删除 |

## 测试结果
- **测试总数**: 90
- **通过**: 90
- **失败**: 0
- **执行时间**: 7.31s

## 覆盖率
| 指标 | 覆盖率 | 未覆盖行 |
|------|--------|----------|
| 语句覆盖率 | 100% | — |
| 分支覆盖率 | 100% | — |
| 函数覆盖率 | 100% | — |
| 行覆盖率 | 100% | — |

## 本次新增测试用例（2个）
1. `ImageServiceImpl.listByProject — should filter by search in project context`：覆盖 ImageServiceImpl.listByProject 中 search 参数的 title 过滤分支（原第236行）
2. `KeywordServiceImpl.update — should use 0 as userId when existing.createdBy is null`：覆盖 update 方法中 `existing.createdBy ?? 0` 的 nullish coalescing 右侧分支（原第117行）

## Mock 策略
- `getPrisma()`: Mock 返回包含对应 Prisma Model 方法的对象
- `KnowledgeBaseServiceImpl`: Mock 构造函数和 `getAccessibleBaseIds` 方法
- 原始SQL查询 (`$queryRaw`、`$executeRaw`): 模拟返回原始行数据

## 执行日期
2026-05-24
