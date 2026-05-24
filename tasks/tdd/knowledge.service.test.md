# TDD 执行报告 — knowledge.service.impl.ts

## 测试文件
- `tests/apis/knowledge.service.test.ts`（Round 1: 105 用例）
- `tests/apis/knowledge.service.r2.test.ts`（Round 2: 32 用例）

## 测试目标
`apis/service/impl/knowledge.service.impl.ts` — 包含 5 个服务类

## 覆盖范围

### 1. KeywordServiceImpl（38 个测试）
| 方法 | 测试数 | 覆盖场景 |
|------|--------|----------|
| list() | 5 | 分页、偏移量计算、搜索过滤、字段映射、空结果 |
| listByProject() | 3 | 无访问基础返回空、有基础查询、搜索过滤 |
| getById() | 4 | 正常返回含扩展词、不存在抛错、无扩展词、null行响应 |
| create() | 3 | 无扩展词创建、含扩展词创建、空扩展词数组 |
| batchCreate() | 5 | 混合创建与去重、带seedWord、全部重复、无重复、空数组 |
| listByGroup() | 1 | stub 返回空数组 |
| syncGroup() | 1 | stub 返回空数组 |
| update() | 5 | 不存在抛错、无扩展词更新、含扩展词同步、createdBy非0、createdBy为null时回退0 |
| delete() | 3 | 不存在抛错、软删除、deletedAt过滤 |
| listExpandedWords() | 2 | 返回映射列表、空数组 |
| syncExpandedWords() | 2 | 删除旧+插入新、多词插入 |
| mapRawKeyword | 2 | null字段、非null字段 |

### 2. PortraitServiceImpl（17 个测试）
| 方法 | 测试数 | 覆盖场景 |
|------|--------|----------|
| list() | 4 | 分页、搜索过滤、字段映射、空结果 |
| listByProject() | 3 | 无基础返回空、搜索过滤、多基础ID查询 |
| getById() | 2 | 正常返回、不存在抛错 |
| create() | 3 | 有内容、无内容设null、返回字段映射验证 |
| update() | 5 | 不存在抛错、仅更新title、仅更新content、双更新、空更新 |
| delete() | 2 | 不存在抛错、软删除 |

### 3. ImageServiceImpl（18 个测试）
| 方法 | 测试数 | 覆盖场景 |
|------|--------|----------|
| list() | 4 | 分页、搜索过滤、字段映射、空结果 |
| listByProject() | 3 | 无基础返回空、有基础查询、搜索过滤 |
| getById() | 2 | 正常返回、不存在抛错 |
| create() | 2 | 全字段创建、无描述设null |
| update() | 5 | 不存在抛错、仅title、仅description、同时更新title+description、空更新 |
| delete() | 3 | 不存在抛错、软删除、验证deletedAt过滤 |

### 4. DocumentServiceImpl（17 个测试）
| 方法 | 测试数 | 覆盖场景 |
|------|--------|----------|
| list() | 3 | 分页（无deletedAt过滤）、搜索双字段、字段映射 |
| listByProject() | 3 | 无基础返回空、有基础含deletedAt、搜索双字段 |
| getById() | 2 | 正常返回、不存在抛错 |
| create() | 2 | 全字段创建、无描述设null |
| update() | 5 | 不存在抛错、仅title、仅description、同时更新title+description、空更新 |
| delete() | 3 | 不存在抛错、软删除、验证deletedAt过滤 |

### 5. MinedKeywordServiceImpl（11 个测试）
| 方法 | 测试数 | 覆盖场景 |
|------|--------|----------|
| listByBase() | 3 | 正常返回、字段映射、空数组 |
| addMinedKeywords() | 4 | 混合去重、全新增、全重复、空数组 |
| toggleSelectBatch() | 3 | 设为true、设为false、空ids数组 |
| deleteByIds() | 2 | 软删除、空ids数组 |
| clearAll() | 1 | 全量软删除 |

## 测试结果
- **测试总数**: 137（Round 1: 105 + Round 2: 32）
- **通过**: 137
- **失败**: 0
- **执行时间**: 6.9s

## 覆盖率
| 指标 | 覆盖率 | 未覆盖行 |
|------|--------|----------|
| 语句覆盖率 | 100% | — |
| 分支覆盖率 | 100% | — |
| 函数覆盖率 | 100% | — |
| 行覆盖率 | 100% | — |

## 本次新增测试用例（15个）
### KeywordServiceImpl 补充（3个）
1. `list should return empty result with zero total`：验证空结果列表返回 {list:[], total:0}
2. `batchCreate with empty keywords array should return zeros`：验证空关键词数组边界处理
3. `getById should handle null rows response`：验证 Prisma 返回 null 时的错误抛出

### PortraitServiceImpl 补充（3个）
4. `list should return empty result`：验证空结果
5. `listByProject should use accessible base IDs correctly`：验证多基础ID查询
6. `create should correctly map returned portrait fields`：验证 create 返回字段映射正确性

### ImageServiceImpl 补充（3个）
7. `update should update both title and description simultaneously`：验证同时更新两字段
8. `list should return empty result`：验证空结果
9. `delete should verify findFirst uses deletedAt filter`：验证删除时的查询条件

### DocumentServiceImpl 补充（3个）
10. `update should update both title and description simultaneously`：验证同时更新两字段
11. `update should not update fields that are undefined`：验证空更新不修改字段
12. `delete should verify findFirst uses deletedAt filter`：验证删除时的查询条件

### MinedKeywordServiceImpl 补充（3个）
13. `deleteByIds with empty ids array should still call updateMany`：验证空ids数组边界
14. `toggleSelectBatch with empty ids array should still call updateMany`：验证空ids数组边界
15. `addMinedKeywords with empty array should return zeros`：验证空关键词数组边界处理

## Mock 策略
- `getPrisma()`: Mock 返回包含对应 Prisma Model 方法的对象
- `KnowledgeBaseServiceImpl`: Mock 构造函数和 `getAccessibleBaseIds` 方法
- 原始SQL查询 (`$queryRaw`、`$executeRaw`): 模拟返回原始行数据

## 执行日期
- Round 1: 2026-05-24
- Round 2: 2026-05-25

---

## Round 2 新增验证性测试（32个）

### KeywordServiceImpl R2（9个）
1. `list page 2 pageSize 5 should skip first 5`：验证非首页分页 skip 计算
2. `listByProject should pass correct orderBy/skip/take`：验证 listByProject 完整查询参数传递
3. `getById should call queryRaw twice`：验证 getById 调用 $queryRaw 2次（SELECT + 扩展词）
4. `create should map returned snake_case fields`：验证 create 返回字段完整 snake_case 映射
5. `update with empty expanded_words should trigger sync`：验证空 expanded_words 数组触发 sync（仅 DELETE，0 INSERT）
6. `update with undefined expanded_words should only list`：验证 undefined expanded_words 仅 list（不调用 executeRaw）
7. `batchCreate should pass correct where to findMany`：验证 batchCreate 的 findMany where 条件
8. `syncExpandedWords 3 words should call executeRaw 4 times`：验证 1 DELETE + N INSERT 的 executeRaw 调用次数
9. `delete should pass Date instance`：验证 deletedAt 传递 Date 实例

### PortraitServiceImpl R2（7个）
10. `list page 2 pageSize 15 should skip 15`：验证分页 skip 计算
11. `getById should use deletedAt null filter`：验证 findFirst where 条件
12. `create without content should pass null`：验证无 content 时传 null
13. `update should find via deletedAt null`：验证 update 的 findFirst 过滤条件
14. `listByProject page 3 pageSize 10 should skip 20`：验证 listByProject 分页
15. `delete should find via deletedAt null`：验证 delete 的 findFirst 过滤条件
16. `create should return snake_case fields`：验证 create 返回 snake_case 字段映射

### ImageServiceImpl R2（5个）
17. `list page 4 pageSize 5 should skip 15`：验证跨页 skip 计算
18. `getById should use deletedAt null filter`：验证 findFirst where 条件
19. `create should map image_url to imageUrl`：验证 snake_case→camelCase 字段映射
20. `update should find via deletedAt null`：验证 update 的 findFirst 过滤条件
21. `listByProject page 2 pageSize 25 should skip 25`：验证 listByProject 分页

### DocumentServiceImpl R2（6个）
22. `list should NOT include deletedAt filter`：验证 Document.list 故意不加 deletedAt 过滤
23. `list page 5 pageSize 10 should skip 40`：验证大页码分页
24. `getById should use deletedAt null filter`：验证 findFirst where 条件
25. `create should map snake_case request to camelCase data`：验证完整 snake_case→camelCase 字段映射
26. `update should find via deletedAt null`：验证 update 的 findFirst 过滤条件
27. `listByProject page 2 pageSize 10 should skip 10`：验证 listByProject 分页

### MinedKeywordServiceImpl R2（5个）
28. `listByBase should order by id desc`：验证排序字段
29. `addMinedKeywords should use correct where in findMany`：验证 findMany where + createMany data 完整参数
30. `clearAll should not include id in where`：验证 clearAll 不含 id 约束
31. `toggleSelectBatch should only update non-deleted`：验证 deletedAt 过滤
32. `deleteByIds should constrain baseId and ids`：验证双条件约束
