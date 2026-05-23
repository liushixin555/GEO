# knowledge.controller.ts TDD 执行报告

## 文件信息
- **源文件**: `apis/controller/knowledge.controller.ts`
- **测试文件**: `tests/apis/knowledge.controller.test.ts`
- **执行日期**: 2026-05-23

## 测试结果

| 指标 | 结果 |
|------|------|
| 测试总数 | 155 |
| 通过 | 155 |
| 失败 | 0 |
| 通过率 | **100%** |

## 测试覆盖率

| 类型 | 覆盖率 |
|------|--------|
| 语句覆盖率 (Statements) | **87.13%** |
| 分支覆盖率 (Branches) | **62.76%** |
| 函数覆盖率 (Functions) | **90.69%** |
| 行覆盖率 (Lines) | **88.46%** |

### 未覆盖行
```
19-22, 31 (checkProjectOperator 部分分支)
176-179 (expandKeywords 的 LLM 调用)
542-552, 561-571, 580-590, 599-609 (listProject* 的成功路径，需要复杂的 getAccessibleBaseIds mock)
720-722, 741, 748-750, 777 (listInventory 的部分分支)
843-848, 865-871, 884-885 (mineKeywords 的成功路径，需要 LLM 服务 mock)
```

## 测试用例分类

### Auth & Role Guards (7个)
- 未登录返回401
- view角色返回403（关键词、画像、图片、文档、知识清单、项目关键词）

### Keywords CRUD (33个)
- **listKeywords** (3个): 成功列表、无效baseId、服务异常
- **getKeyword** (6个): 成功详情、无效baseId/id、baseId不匹配、不存在、服务异常
- **createKeyword** (5个): 成功创建、无效baseId、keyword为空、知识库不存在、服务异常
- **updateKeyword** (8个): sysadmin更新、创建者更新、无效参数、baseId不匹配、权限403、keyword为空、不存在
- **deleteKeyword** (7个): sysadmin删除、创建者删除、无效参数、baseId不匹配、权限403、不存在
- **batchCreateKeywords** (5个): 成功批量、无效baseId、非数组、空数组、服务异常
- **expandKeywords** (2个): 无效baseId、keyword为空

### Portraits CRUD (21个)
- **listPortraits** (3个): 成功列表、无效baseId、服务异常
- **getPortrait** (6个): 成功详情、无效参数、baseId不匹配、不存在、服务异常
- **createPortrait** (6个): 成功创建、无效baseId、title为空、content为空、知识库不存在、服务异常
- **updatePortrait** (6个): 成功更新、无效参数、baseId不匹配、权限403、不存在
- **deletePortrait** (5个): 成功删除、无效baseId、baseId不匹配、权限403、不存在

### Images CRUD (25个)
- **listImages** (3个): 成功列表、无效baseId、服务异常
- **getImage** (6个): 成功详情、无效参数、baseId不匹配、不存在、服务异常
- **createImage** (8个): 成功创建、无效baseId、title为空、image_url为空、标题重复、URL重复、知识库不存在、服务异常
- **updateImage** (7个): 成功更新、无效参数、baseId不匹配、权限403、标题重复、不存在
- **deleteImage** (5个): 成功删除、无效baseId、baseId不匹配、权限403、不存在

### Documents CRUD (25个)
- **listDocuments** (3个): 成功列表、无效baseId、服务异常
- **getDocument** (6个): 成功详情、无效参数、baseId不匹配、不存在、服务异常
- **createDocument** (11个): 成功创建、无效baseId、5个字段校验、标题重复、URL重复、知识库不存在、服务异常
- **updateDocument** (7个): 成功更新、无效参数、baseId不匹配、权限403、标题重复、不存在
- **deleteDocument** (5个): 成功删除、无效baseId、baseId不匹配、权限403、不存在

### Project Knowledge Aggregation (4个)
- 无效projectId返回400（关键词、画像、图片、文档）

### Knowledge Inventory (4个)
- 无知识库空统计、成功含统计、category过滤、服务异常

### Mined Keywords (16个)
- **listMinedKeywords** (3个): 成功列表、无效baseId、服务异常
- **mineKeywords** (3个): 无效baseId、无内容返回400、服务异常
- **saveMinedKeywords** (4个): 无效baseId、非数组、空数组、服务异常
- **toggleMinedKeywordsBatch** (4个): 无效baseId、非数组、空数组、服务异常
- **deleteMinedKeywords** (3个): 成功清空、无效baseId、服务异常

## 关键测试模式

### KeywordServiceImpl.getById 使用 $queryRaw
关键词的 `getById` 使用原生SQL查询 (`$queryRaw`)，mock 时需返回 snake_case 字段名：
```typescript
mockPrisma({
  $queryRaw: jest.fn()
    .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: 'SEO', ... }]) // 关键词行
    .mockResolvedValueOnce([]), // expanded words
});
```

### Portrait/Image/Document 使用 findFirst
这些实体的 `getById` 使用标准 Prisma `findFirst`，返回 camelCase 字段，service 层自动映射为 snake_case。

### update/delete 多步骤 mock
更新和删除操作涉及多步骤 Prisma 调用，需要按序 mock：
```typescript
findFirst: jest.fn()
  .mockResolvedValueOnce(existing)  // getById
  .mockResolvedValueOnce(null)       // 标题重复检查
  .mockResolvedValueOnce(existing),  // update 内部 findFirst
```

### 限流配置
测试中 `RATE_LIMIT_MAX` 设置为 1000，避免 155 个测试触发限流。
