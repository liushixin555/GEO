# map.test.ts TDD 执行报告

## 测试目标
- 源文件: `apis/map/index.ts`
- 测试文件: `tests/apis/map.test.ts`

## 源文件内容概要
- 16 个 map 函数，将 Prisma camelCase 数据映射为 snake_case 业务实体
- `mapCompany` — Company 映射
- `mapSkills` — Skills 映射（含 creator 关联）
- `mapUser` — User 映射（含 company 关联）
- `mapLlmModel` — LlmModel 映射（apiKey 脱敏）
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
- 总测试数: **158 个**（从 90 个补全至 158 个）
- 通过: 158
- 失败: 0
- 跳过: 0

## 本次补全内容

### 新增测试用例（68 个）

#### mapCompany（+5 个）
- contactPerson 为 null 时正确映射
- contactPhone 为 null 时正确映射
- full_name 为空字符串时正确映射
- id 为字符串类型时正确映射
- shortName 为空字符串时正确映射

#### mapSkills（+3 个）
- description 为 null 时正确映射
- skillDir 为 null 时正确映射
- name 为空字符串时正确映射

#### mapUser（+3 个）
- cnName 为 null 时正确映射
- cnName 为空字符串时正确映射
- company 为 undefined 时 company_name 为空字符串

#### mapLlmModel（+7 个，修复 1 个）
- 修复：apiKey 脱敏断言值 `'sk-t****here'`（原测试错误期望 `'sk-test-key'`）
- apiKey 脱敏格式：前4位+****+后4位
- apiKey 为 null/undefined/空字符串时返回空字符串
- apiKey 为短字符串时正确脱敏（边界值）
- baseUrl 为 null 时正确映射
- id 为数字类型时正确映射

#### mapSystemConfig（+3 个）
- configValue 为空字符串时正确映射
- configValue 为 JSON 字符串时正确映射
- configKey 包含特殊字符时正确映射

#### mapProject（+5 个）
- operator 中 user.id 与 userId 不同时优先使用 user.id
- operator 中 user 存在但 cnName 为空字符串时返回空字符串
- company 存在但 shortName 为空字符串时返回空字符串
- 多个 operators 和 viewers 正确映射
- viewer 中 user 存在但 cnName 为空时返回空字符串

#### mapArticle（+8 个）
- keywords 为 null 时正确映射
- portrait 为 null 时正确映射
- content 为空字符串时正确映射
- version 为 0 时正确映射
- images 为空数组时正确映射
- platforms 为空数组时正确映射
- status 为 published 时正确映射
- writeMode 为 undefined 时映射为 null

#### mapArticleVersion（+3 个）
- content 为空字符串时正确映射
- version 为 0 时正确映射
- version 为大数值时正确映射

#### mapPublishingPlatform（+4 个）
- publishRate 为 0 时正确映射
- taxonomy 为 null 时正确映射
- name 为空字符串时正确映射
- rmResourceId 为 null 时正确映射
- includeRate 为 1 时正确映射

#### mapKeyword（+2 个）
- keyword 为空字符串时正确映射
- seedWord 为空字符串时保持为空字符串（?? 只对 null/undefined 生效）

#### mapPortrait（+3 个）
- title 为空字符串时正确映射
- content 为 null 时正确映射
- content 为空字符串时正确映射

#### mapKnowledgeImage（+3 个）
- description 为 null 时正确映射
- imageUrl 为 null 时正确映射
- title 为空字符串时正确映射

#### mapKnowledgeDocument（+4 个）
- description 为 null 时正确映射
- fileType 为空字符串时正确映射
- fileName 为空字符串时正确映射
- fileUrl 为 null 时正确映射

#### mapMinedKeyword（+1 个）
- keyword 为空字符串时正确映射

#### mapTodo（+9 个）
- projectId 为 undefined 时映射为 null
- project 存在但 shortName 为空字符串时 project_name 为 null
- company 存在但 shortName 为空字符串时 company_name 为空字符串
- assignee 存在但 cnName 为空字符串时 assignee_name 为空字符串
- createdBy 存在但 cnName 为空字符串时 created_by_name 为空字符串
- status 为不同值时正确映射
- priority 为不同值时正确映射
- title 为空字符串时正确映射
- dueAt.toISOString() 返回正确的格式

#### mapTodoLog（+4 个）
- operator 存在但 cnName 为空字符串时 operator_name 为空字符串
- action 为不同值时正确映射
- remark 为空字符串时保持为空字符串（?? 只对 null/undefined 生效）
- operatorId 为 0 时正确映射

## 测试覆盖率

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| index.ts | 100% | 100% | 100% | 100% |

## 测试结果
```
Test Suites: 1 passed, 1 total
Tests:       158 passed, 158 total
Time:        4.736 s
```

## 关键发现
1. **mapLlmModel apiKey 脱敏逻辑**：`apiKey ? slice(0,4)+'****'+slice(-4) : ''` — 当 apiKey 为 falsy（null/undefined/''）返回空字符串，否则取前4后4拼接
2. **`??` vs `||` 行为差异**：`seedWord ?? null` 中空字符串 `''` 不是 nullish，所以保留为空字符串；而 `creator?.cnName || null` 中空字符串是 falsy，会返回 null
3. **mapUser 返回类型为 `any`**，其余函数均有明确返回类型
4. **mapTodo 的 `dueAt`** 使用 `?.toISOString() || null`，需确保 Date 对象非 null 才调用
5. **mapProject operators/viewers** 使用 `|| []` 默认空数组，operator_ids 中 `user?.id ?? userId` 优先使用 user.id
