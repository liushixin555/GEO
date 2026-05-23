# map.test.ts TDD 执行报告

## 测试目标
- 源文件: `apis/map/index.ts`
- 测试文件: `tests/apis/map.test.ts`

## 源文件内容概要
- 16 个 map 函数，将 Prisma camelCase 数据映射为 snake_case 业务实体
- `mapCompany` — Company 映射
- `mapSkills` — Skills 映射（含 creator 关联）
- `mapUser` — User 映射（含 company 关联）
- `mapLlmModel` — LlmModel 映射
- `mapSystemConfig` — SystemConfig 映射
- `mapProject` — Project 映射（含 operators/viewers 关联数组）
- `mapArticle` — Article 映射（含多个 nullable 字段）
- `mapArticleVersion` — ArticleVersion 映射
- `mapPublishingPlatform` — PublishingPlatform 映射
- `mapKeyword` — KnowledgeKeyword 映射
- `mapPortrait` — KnowledgePortrait 映射
- `mapKnowledgeImage` — KnowledgeImage 映射
- `mapKnowledgeDocument` — KnowledgeDocument 映射
- `mapMinedKeyword` — MinedKeyword 映射
- `mapTodo` — Todo 映射（含多个关联和 dueAt→ISO 转换）
- `mapTodoLog` — TodoLog 映射

## 测试用例统计
- 总测试数: **90 个**
- 通过: 90
- 失败: 0
- 跳过: 0

## 测试分组详情

### mapCompany（4 个测试）
- 完整字段映射、address 为 null、status 为 false、不同 id 值

### mapSkills（5 个测试）
- 完整字段映射（含 creator 关联）、createdBy 为 null/undefined、creator 为 null、cnName 为空字符串时返回 null

### mapUser（8 个测试）
- 完整字段映射（含 company 关联）、companyId 为 null/undefined、company 为 null/空字符串
- 三种角色（sysadmin/admin/view）、status 为 false

### mapLlmModel（3 个测试）
- 完整字段映射、status 为 false、不同 provider/modelName

### mapSystemConfig（2 个测试）
- 完整字段映射、不同 configKey/configValue

### mapProject（9 个测试）
- 完整字段映射（含 operators/viewers 数组）
- 空数组场景、undefined 默认空数组
- user 为 null 时回退到 userId、company 为 null
- description 为 null、status 为 false

### mapArticle（11 个测试）
- 完整字段映射、articleType/writeMode 为 null/undefined
- llmModelId 为 null/undefined、scheduledPublishAt 为 null/undefined
- createdBy 为 null/undefined、images/platforms 为 null

### mapArticleVersion（3 个测试）
- 完整字段映射、createdBy 为 null/undefined

### mapPublishingPlatform（4 个测试）
- 完整字段映射、remark 为 null、price 为 0、includeRate 为 0

### mapKeyword（7 个测试）
- 完整字段映射、seedWord/groupId/createdBy 的 null/undefined 场景

### mapPortrait（3 个测试）
- 完整字段映射、createdBy 为 null/undefined

### mapKnowledgeImage（3 个测试）
- 完整字段映射、createdBy 为 null/undefined

### mapKnowledgeDocument（4 个测试）
- 完整字段映射、createdBy 为 null/undefined、fileSize 为 0

### mapMinedKeyword（4 个测试）
- 完整字段映射、selected 为 false、createdBy 为 null/undefined

### mapTodo（11 个测试）
- 完整字段映射（含 company/project/assignee/createdBy 关联）
- projectId/objectId 为 null/undefined、project 为 null
- company/assignee/createdBy 为 null、dueAt 为 null/undefined/存在时 ISO 转换

### mapTodoLog（8 个测试）
- 完整字段映射、objectType/objectId/remark 为 null/undefined、operator 为 null

## 测试覆盖率

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| index.ts | 100% | 100% | 100% | 100% |

## 测试结果
```
Test Suites: 1 passed, 1 total
Tests:       90 passed, 90 total
Time:        6.944 s
```

## 关键发现
- `mapSkills` 中 `creator?.cnName || null`：cnName 为空字符串时走 falsy 返回 null，而非空字符串
- `mapUser` 返回类型为 `any`，其余函数均有明确返回类型
- `mapTodo` 的 `dueAt` 使用 `.toISOString()` 转换，需确保 Date 对象非 null 才调用
