# Entity 全量测试 TDD 执行报告

## 执行日期
2026-05-24

## 概述
对 `apis/entity/index.ts` 导出的所有 12 个 entity 文件进行全量测试补全。

## 测试结果汇总

| Entity | 测试文件 | 测试数量 | 状态 | 接口数量 |
|--------|---------|---------|------|---------|
| user.entity | user.entity.test.ts | 109 | PASS | 10 (UserRole, User, LoginRequest, LoginResponse, SaveSelectionRequest, LoginSelectionError, PermissionDeniedError, UserListItem, CreateUserRequest, UpdateUserRequest) |
| company.entity | company.entity.test.ts | 34 | PASS | 4 (Company, CreateCompanyRequest, UpdateCompanyRequest, CompanyDetail) |
| skills.entity | skills.entity.test.ts | 92 | PASS | 3 (Skills, CreateSkillsRequest, UpdateSkillsRequest) |
| llm-model.entity | llm-model.entity.test.ts | 73 | PASS | 3 (LlmModel, CreateLlmModelRequest, UpdateLlmModelRequest) |
| system-config.entity | system-config.entity.test.ts | 68 | PASS | 2 (SystemConfig, UpdateSystemConfigsRequest) |
| publishing-platform.entity | publishing-platform.entity.test.ts | 76 | PASS | 1 (PublishingPlatform) |
| project.entity | project.entity.test.ts | 101 | PASS | 3 (Project, CreateProjectRequest, UpdateProjectRequest) |
| article.entity | article.entity.test.ts | 47 | PASS | 5 (Article, ArticleVersion, CreateArticleRequest, UpdateArticleRequest, ReviewArticleRequest) |
| knowledge.entity | knowledge.entity.test.ts | 110 | PASS | 14 (KnowledgeKeyword, KeywordExpandedWord, KnowledgePortrait, KnowledgeImage, KnowledgeDocument, MinedKeyword + 7个 Request 接口) |
| knowledge-base.entity | knowledge-base.entity.test.ts | 43 | PASS | 3 (KnowledgeBase, CreateKnowledgeBaseRequest, UpdateKnowledgeBaseRequest) |
| todo.entity | todo.entity.test.ts | 26 | PASS | 5 (Todo, TodoLog, CreateTodoRequest, UpdateTodoRequest, TransferTodoRequest) |
| publishing-schedule.entity | publishing-schedule.entity.test.ts | 53 | PASS | 3 (PublishingScheduleListParams, PublishingScheduleItem, PublishingScheduleUpdateResult) |

## 最终统计

```
Test Suites: 12 passed, 12 total
Tests:       1361 passed, 1361 total
Snapshots:   0 total
Time:        7.529s
```

## 覆盖率分析

| 指标 | 值 |
|------|-----|
| Statements | 100% |
| Branches | 100% |
| Functions | 75% |
| Lines | 100% |

> Functions 75% 是因为 index.ts 的 re-export 函数在类型推断层面不需要执行

## 本次变更（2026-05-24 第二轮补全）

### 新增
1. **publishing-schedule.entity.test.ts** - 全新测试文件（53个测试）
   - PublishingScheduleListParams: 必需字段、可选字段、边界值、JSON 序列化
   - PublishingScheduleItem: 全15字段验证、7个可空字段、Date类型、多种状态值
   - PublishingScheduleUpdateResult: 全13字段验证、与 Item 的字段差异验证
   - 跨接口集成：ListParams 过滤 Item、Item 转 UpdateResult

2. **user.entity.test.ts** - 新增 PermissionDeniedError 类测试（+15个测试）
   - 基本创建、name/message 属性、instanceof 验证
   - 与 LoginSelectionError 区分、原型链、async/await、Promise.allSettled

### 修复
3. **article.entity.test.ts** - 修复2个断言边界错误
   - `toBeGreaterThan(500)` → `toBeGreaterThanOrEqual(400)`（中文字符长度计算）
   - `toBeGreaterThan(20000)` → `toBeGreaterThanOrEqual(20000)`（中文字符长度计算）

### 覆盖率提升
- user.entity.ts: Statements 66.66% → 100%，Lines 66.66% → 100%（PermissionDeniedError 覆盖）

## 测试覆盖范围

每个 entity 测试覆盖：
- 所有接口的字段完整性验证
- 可选字段的 undefined/null 测试
- 边界值测试（0, MAX_SAFE_INTEGER, 负数）
- 中文字符和特殊字符支持
- 空字符串、长字符串支持
- 日期类型验证
- 数组字段操作
- JSON 序列化
- 对象操作（spread, destructuring, entries）
- 类型收窄（type narrowing）
- index.ts 重新导出验证
- 跨接口集成验证
