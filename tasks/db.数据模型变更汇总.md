# db. 数据模型变更汇总

> 状态：✅ 全部已完成

---

## db001. User.company_id 改为可选

### 变更原因
用户不再绑定单一公司，可操作多家公司，具体权限由公司关联设置。

### Schema 变更
```prisma
// Before
companyId Int @map("company_id")
company   Company @relation(...)

// After
companyId Int? @map("company_id")
company   Company? @relation(...)
```

### 影响
- 后端：移除用户创建时的 company_id 必填校验和公司过滤
- 前端：移除用户卡片中的公司名显示和表单中的公司选择
- Entity/Map/Controller 全链路更新

---

## db002. User 新增 selected_company_id / selected_project_id

### 变更原因
支持公司/项目切换器的选择持久化。

### Schema 变更
```prisma
model User {
  // ... existing fields
  selectedCompanyId Int? @map("selected_company_id")
  selectedProjectId Int? @map("selected_project_id")
  selectedCompany   Company? @relation("UserSelectedCompany", ...)
  selectedProject   Project? @relation("UserSelectedProject", ...)
}
```

### 迁移
Prisma migrate 自动处理，新增两个可空字段。

---

## db003. Skills.company_id 改为可选

### 变更原因
技能不绑定单一公司，与用户一致。

### Schema 变更
```prisma
// Before
companyId Int @map("company_id")

// After
companyId Int? @map("company_id")
company   Company? @relation(...)
```

---

## db004. Skills 新增 created_by

### 变更原因
追踪技能创建者，实现 admin 只能修改/删除自己创建的技能。

### Schema 变更
```prisma
model Skills {
  // ... existing fields
  createdBy Int? @map("created_by")
  creator   User? @relation("SkillsCreator", fields: [createdBy], references: [id])
}

model User {
  // ... existing fields
  createdSkills Skills[] @relation("SkillsCreator")
}
```

### 完整更新链
1. `prisma/schema.prisma` — 字段 + 关系
2. `apis/entity/skills.entity.ts` — `created_by?: number | null`
3. `apis/map/index.ts` — `mapSkills()` 新增 `created_by` 映射
4. `apis/service/impl/skills.service.impl.ts` — `create()` 写入 `createdBy`
5. `apis/controller/skills.controller.ts` — 权限检查

### 迁移
`20260517025739_add_skills_created_by`

---

## db005. Project 模型

### 变更原因
新增项目管理功能。

### Schema 变更
```prisma
model Project {
  id          Int      @id @default(autoincrement())
  shortName   String   @db.VarChar(100)
  fullName    String   @db.VarChar(200)
  description String?  @db.VarChar(500)
  companyId   Int      @map("company_id")
  status      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  company    Company  @relation(fields: [companyId], references: [id])
  operators  ProjectOperator[]
  viewers    ProjectViewer[]

  @@map("projects")
}
```

---

## db006. project_operators / project_viewers 多对多关联

### 变更原因
项目支持多运营者和多查看者。

### Schema 变更
```prisma
model ProjectOperator {
  projectId Int     @map("project_id")
  userId    Int     @map("user_id")
  project   Project @relation("ProjectOperators", fields: [projectId], references: [id])
  user      User    @relation("UserProjectOperator", fields: [userId], references: [id])

  @@id([projectId, userId])
  @@map("project_operators")
}

model ProjectViewer {
  projectId Int     @map("project_id")
  userId    Int     @map("user_id")
  project   Project @relation("ProjectViewers", fields: [projectId], references: [id])
  user      User    @relation("UserProjectViewer", fields: [userId], references: [id])

  @@id([projectId, userId])
  @@map("project_viewers")
}
```

### 关键经验
- **Prisma 多对多必须命名关系**：双方都用 `@relation("关系名")`，名字必须匹配
- **更新关联表**：先 `deleteMany` 再 `create`，避免唯一约束冲突

---

## db007. LlmModel 模型

### 变更原因
支持 LLM 模型管理，存储不同供应商的 API 配置。

### Schema 变更
```prisma
model LlmModel {
  id        Int      @id @default(autoincrement())
  provider  String   @db.VarChar(100)
  baseUrl   String   @map("base_url") @db.VarChar(500)
  apiKey    String   @map("api_key") @db.VarChar(500)
  modelName String   @map("model_name") @db.VarChar(200)
  status    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

  articles  Article[]

  @@map("llm_models")
}
```

### 关联
- `Article.llmModelId` → `LlmModel.id`（文章使用的 LLM 模型，SetNull 删除策略）

---

## db008. PublishingPlatform 模型

### 变更原因
存储发布平台信息，关联资源管理系统。

### Schema 变更
```prisma
model PublishingPlatform {
  id           Int      @id @default(autoincrement())
  rmResourceId Int      @unique @map("rm_resource_id")
  name         String   @db.VarChar(200)
  taxonomy     String   @db.VarChar(100)
  price        Float    @default(0)
  remark       String?  @db.VarChar(500)
  includeRate  Float    @default(0) @map("include_rate")
  publishRate  Float    @default(0) @map("publish_rate")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

  @@index([rmResourceId])
  @@index([taxonomy])
  @@map("publishing_platforms")
}
```

### 说明
- `rmResourceId`：资源管理系统的资源 ID，唯一约束
- `includeRate` / `publishRate`：收录率 / 发布率
- 目前为独立表，暂未与其他模型建立外键关联

---

## db009. SystemConfig 模型

### 变更原因
系统级配置项持久化存储（如定时任务配置等）。

### Schema 变更
```prisma
model SystemConfig {
  id          Int      @id @default(autoincrement())
  configKey   String   @unique @map("config_key") @db.VarChar(100)
  configValue String   @map("config_value") @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()

  @@map("system_configs")
}
```

### 说明
- `configKey` 唯一约束，键值对模式
- `configValue` 使用 `Text` 类型，支持存储复杂配置（JSON 字符串等）

---

## db010. ArticleStatus 枚举 + Article 模型

### 变更原因
文章管理功能，支持从草稿到发布的完整生命周期。

### Schema 变更
```prisma
enum ArticleStatus {
  draft
  manual_writing
  generating
  generate_failed
  pending_review
  publishing
  publish_failed
  published
}

model Article {
  id          Int           @id @default(autoincrement())
  projectId   Int           @map("project_id")
  title       String        @db.VarChar(500)
  articleType String?       @map("article_type") @db.VarChar(50)
  writeMode   String?       @map("write_mode") @db.VarChar(20)
  keywords    String?       @db.VarChar(500)
  portrait    String?
  images      Json?
  platforms   Json?
  skills      Json?
  llmModelId  Int?          @map("llm_model_id")
  content     String?
  version     Float         @default(1.0)
  status      ArticleStatus @default(draft)
  scheduledPublishAt DateTime? @map("scheduled_publish_at") @db.Timestamptz()
  createdBy   Int?          @map("created_by")
  createdAt   DateTime      @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime      @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
  project     Project       @relation(...)
  creator     User?         @relation("ArticleCreator", ...)
  llmModel    LlmModel?     @relation(...)
  versions    ArticleVersion[]

  @@index([projectId])
  @@index([status])
  @@index([createdBy])
  @@map("articles")
}
```

### 字段演变
- `keywords`：Json → **String**（从多选改为单选）
- `articleType`：新增，必填字段
- `writeMode`：新增，必填字段
- `scheduledPublishAt`：新增，支持定时发布

### 状态流转
```
draft → manual_writing / generating
generating → generate_failed / pending_review
pending_review → publishing
publishing → publish_failed / published
```

---

## db011. ArticleVersion 模型

### 变更原因
文章版本历史记录，支持内容追溯和回滚。

### Schema 变更
```prisma
model ArticleVersion {
  id        Int      @id @default(autoincrement())
  articleId Int      @map("article_id")
  version   Float
  content   String
  createdBy Int?     @map("created_by")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz()
  article   Article  @relation(...)
  creator   User?    @relation("ArticleVersionCreator", ...)

  @@index([articleId])
  @@map("article_versions")
}
```

### 说明
- 级联删除：删除文章时自动删除所有版本
- `version` 使用 Float 类型（1.0, 1.1, 2.0...）

---

## db012. KnowledgeScope 枚举 + KnowledgeBase 模型

### 变更原因
AI 知识库功能，支持平台级/公司级/项目级三级作用域。

### Schema 变更
```prisma
enum KnowledgeScope {
  platform
  company
  project
}

model KnowledgeBase {
  id          Int             @id @default(autoincrement())
  name        String          @db.VarChar(200)
  description String?         @db.VarChar(500)
  scope       KnowledgeScope  @default(project)
  companyId   Int?            @map("company_id")
  projectId   Int?            @map("project_id")
  status      Boolean         @default(true)
  createdBy   Int?            @map("created_by")
  createdAt   DateTime        @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime        @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
  company     Company?        @relation(...)
  project     Project?        @relation(...)
  creator     User?           @relation("KnowledgeBaseCreator", ...)
  keywords    KnowledgeKeyword[]
  portraits   KnowledgePortrait[]
  images      KnowledgeImage[]

  @@index([scope])
  @@index([companyId])
  @@index([projectId])
  @@map("knowledge_bases")
}
```

### 关联更新
- `Company` 新增 `knowledgeBases KnowledgeBase[]`
- `Project` 新增 `knowledgeBases KnowledgeBase[]`
- `User` 新增 `createdKnowledgeBases KnowledgeBase[]`

---

## db013. KnowledgeKeyword + KeywordExpandedWord 模型

### 变更原因
知识库关键词管理，支持种子词→智能扩词→选关键词的完整流程。

### Schema 变更
```prisma
model KnowledgeKeyword {
  id        Int             @id @default(autoincrement())
  baseId    Int             @map("base_id")
  keyword   String          @db.VarChar(200)
  seedWord  String?         @map("seed_word") @db.VarChar(200)
  groupId   Int?            @map("group_id")
  createdBy Int?            @map("created_by")
  createdAt DateTime        @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt DateTime        @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
  base      KnowledgeBase   @relation(...)
  creator   User?           @relation("KnowledgeKeywordCreator", ...)
  expandedWords KeywordExpandedWord[]

  @@index([baseId])
  @@map("knowledge_keywords")
}

model KeywordExpandedWord {
  id        Int      @id @default(autoincrement())
  keywordId Int      @map("keyword_id")
  word      String   @db.VarChar(200)
  selected  Boolean  @default(false)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
  keyword   KnowledgeKeyword @relation(...)

  @@index([keywordId])
  @@map("keyword_expanded_words")
}
```

### 字段演变
- `groupId`：关键词分组 ID，支持分组管理
- `seedWord`：新增，记录生成该关键词的种子词
- `KeywordExpandedWord.selected`：标记是否被用户选中

---

## db014. KnowledgePortrait 模型

### 变更原因
知识库人物画像，存储人物相关的详细信息。

### Schema 变更
```prisma
model KnowledgePortrait {
  id        Int             @id @default(autoincrement())
  baseId    Int             @map("base_id")
  title     String          @db.VarChar(200)
  content   String?         @db.Text
  createdBy Int?            @map("created_by")
  createdAt DateTime        @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt DateTime        @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
  base      KnowledgeBase   @relation(...)
  creator   User?           @relation("KnowledgePortraitCreator", ...)

  @@index([baseId])
  @@map("knowledge_portraits")
}
```

---

## db015. KnowledgeImage 模型

### 变更原因
知识库图片管理，存储图片 URL 和描述信息。

### Schema 变更
```prisma
model KnowledgeImage {
  id          Int             @id @default(autoincrement())
  baseId      Int             @map("base_id")
  title       String          @db.VarChar(200)
  description String?         @db.VarChar(500)
  imageUrl    String          @map("image_url") @db.VarChar(500)
  createdBy   Int?            @map("created_by")
  createdAt   DateTime        @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime        @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
  base        KnowledgeBase   @relation(...)
  creator     User?           @relation("KnowledgeImageCreator", ...)

  @@index([baseId])
  @@map("knowledge_images")
}
```

---

## db016. Project 关联扩展

### 变更原因
项目与文章、知识库建立关联。

### 新增关联
```prisma
model Project {
  // ... existing fields
  articles        Article[]
  knowledgeBases  KnowledgeBase[]
}
```

---

## User 模型关联汇总

随着功能迭代，User 模型新增了大量反向关联：

```prisma
model User {
  // ... existing fields
  createdSkills        Skills[]              @relation("SkillsCreator")
  createdArticles      Article[]             @relation("ArticleCreator")
  articleVersions      ArticleVersion[]      @relation("ArticleVersionCreator")
  createdKeywords      KnowledgeKeyword[]    @relation("KnowledgeKeywordCreator")
  createdPortraits     KnowledgePortrait[]   @relation("KnowledgePortraitCreator")
  createdImages        KnowledgeImage[]      @relation("KnowledgeImageCreator")
  createdKnowledgeBases KnowledgeBase[]      @relation("KnowledgeBaseCreator")
}
```

### 经验
- 每个 `created_by` 字段都需要在 User 上声明对应的反向关联
- 关系命名必须双方匹配：如 `"KnowledgeBaseCreator"`

---

## db017. Skills 模型精简

### 变更原因
技能管理简化，移除不再需要的字段，新增 skill_dir 存储技能目录路径。

### Schema 变更
```prisma
// 移除字段
- category   String   @db.VarChar(100)  // 已删除
- companyId  Int?     @map("company_id") // 已删除
- status     Boolean  @default(true)     // 已删除

// 新增字段
+ skillDir   String   @default("") @map("skill_dir") @db.VarChar(500)

// 新增约束
+ @@unique([name])
```

### 数据影响
- `category`、`company_id`、`status` 三列数据被删除
- `skill_dir` 使用 `@default("")` 确保已有行兼容
- `name` 添加唯一约束

### 迁移
通过 `npx prisma db push --accept-data-loss` 执行，无正式 migration 文件。

### pg_hba.conf 配置更新
同步修改 `/etc/postgresql/16/main/pg_hba.conf`，将 host 规则改为 `0.0.0.0/0`（所有 IPv4）和 `::/0`（所有 IPv6），认证方式 md5，支持本机多网卡多 IP 连接。

---

## db017. Skills 模型重构：移除 category/status/companyId，新增 skill_dir

### 变更原因
技能管理改为上传 zip 包模式，名称和描述从 SKILL.md frontmatter 提取，不再需要手动输入类别、状态管理和公司归属。

### Schema 变更
```prisma
// Before
model Skills {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(200)
  category    String   @db.VarChar(100)
  description String?  @db.VarChar(500)
  status      Boolean  @default(true)
  companyId   Int?     @map("company_id")
  createdBy   Int?     @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
  company     Company? @relation(fields: [companyId], references: [id])
  creator     User?    @relation("SkillsCreator", fields: [createdBy], references: [id])
}

// After
model Skills {
  id          Int      @id @default(autoincrement())
  name        String   @db.VarChar(200)
  description String?  @db.VarChar(500)
  skillDir    String   @default("") @map("skill_dir") @db.VarChar(500)
  createdBy   Int?     @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
  creator     User?    @relation("SkillsCreator", fields: [createdBy], references: [id])

  @@unique([name])
  @@map("skills")
}
```

### 变更说明
- 移除 `category`（类别从 SKILL.md 获取，无需单独字段）
- 移除 `status`（无禁用功能）
- 移除 `companyId`（技能为全局资源，无公司归属）
- 移除 `company` 关联（Company 模型上同步移除 `skills` 反向关联）
- 新增 `skillDir`（技能包解压目录路径，如 `skills/ant-design`）
- 新增 `@@unique([name])`（防止同名技能重复创建）

### 完整更新链
1. `prisma/schema.prisma` — 模型变更
2. `prisma/migrations/20260523000000_refactor_skills_remove_category_status/migration.sql` — 迁移 SQL
3. `apis/entity/skills.entity.ts` — 接口更新
4. `apis/service/skills.service.ts` + `impl` — 服务层重构
5. `apis/controller/skills.controller.ts` — 改为 zip 上传处理
6. `apis/map/index.ts` — 映射更新
7. `apis/app.ts` — 上传路由添加 multer 中间件
8. `pages/skills/index.tsx` — 前端页面重构
9. `package.json` — 新增 `adm-zip` 依赖

---

## db018. KnowledgeDocument 模型

### 变更原因
AI知识库增加文档管理功能，支持多种文档格式上传。

### Schema 变更
```prisma
model KnowledgeDocument {
  id          Int             @id @default(autoincrement())
  baseId      Int             @map("base_id")
  title       String          @db.VarChar(200)
  description String?         @db.VarChar(500)
  fileUrl     String          @map("file_url") @db.VarChar(500)
  fileName    String          @map("file_name") @db.VarChar(255)
  fileType    String          @map("file_type") @db.VarChar(20)
  fileSize    Int             @map("file_size")
  createdBy   Int?            @map("created_by")
  createdAt   DateTime        @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime        @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
  base        KnowledgeBase   @relation(fields: [baseId], references: [id], onDelete: Cascade)
  creator     User?           @relation("KnowledgeDocumentCreator", fields: [createdBy], references: [id])

  @@index([baseId])
  @@map("knowledge_documents")
}
```

### 关联更新
- `KnowledgeBase` 新增 `documents KnowledgeDocument[]`
- `User` 新增 `createdDocuments KnowledgeDocument[] @relation("KnowledgeDocumentCreator")`

### 新增依赖
- `js-yaml` — YAML 格式校验
- `fast-xml-parser` — XML 格式校验

### 迁移
通过 `npx prisma db push` 执行，无正式 migration 文件。

---

## db012. 新增 mined_keywords 表

### 变更原因
关键词挖掘功能需要持久化保存从文档/画像/图片中提取的关键词候选列表。

### 变更内容
- 新增 `mined_keywords` 表
- `KnowledgeBase` 模型新增 `minedKeywords` 关联

### 表结构
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | Int | PK, AUTO | 主键 |
| base_id | Int | NOT NULL, FK | 关联 knowledge_bases(id)，CASCADE |
| keyword | VARCHAR(200) | NOT NULL | 关键词文本 |
| selected | Boolean | DEFAULT false | 是否被用户选中 |
| created_by | Int | NULL | 创建者用户ID |
| created_at | TIMESTAMPTZ | DEFAULT now() | 创建时间 |

唯一约束：(base_id, keyword)

### 迁移
通过 `npx prisma db push` 执行。

---

## db019. Todo + TodoLog 模型 + 枚举

### 变更原因
今日待办功能，支持手工创建和系统自动生成待办事项，提供按优先级、状态、责任人的多维度筛选。

### 新增枚举
```prisma
enum TodoSource {
  manual
  content_iteration
  smart_link
  daily_check
  risk_warning
}

enum TodoPriority {
  P0
  P1
  P2
  P3
  P4
}

enum TodoStatus {
  open
  closed
  draft
}

enum TodoLogAction {
  submit
  close
  reopen
  transfer
  reject
}
```

### Todo 表
```prisma
model Todo {
  id          Int          @id @default(autoincrement())
  title       String       @db.VarChar(500)
  companyId   Int          @map("company_id")
  projectId   Int?         @map("project_id")
  objectType  String       @map("object_type") @db.VarChar(100)
  objectId    Int?         @map("object_id")
  action      String       @db.VarChar(500)
  source      TodoSource   @default(manual)
  priority    TodoPriority @default(P2)
  assigneeId  Int          @map("assignee_id")
  status      TodoStatus   @default(open)
  createdById Int          @map("created_by_id")
  createdAt   DateTime     @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt   DateTime     @default(now()) @updatedAt @map("updated_at") @db.Timestamptz()
  deletedAt   DateTime?    @map("deleted_at") @db.Timestamptz()

  company     Company      @relation(...)
  project     Project?     @relation(...)
  assignee    User         @relation("TodoAssignee", ...)
  createdBy   User         @relation("TodoCreator", ...)
  logs        TodoLog[]

  @@index([companyId, assigneeId, status, priority, source])
  @@map("todos")
}
```

### TodoLog 表
```prisma
model TodoLog {
  id          Int            @id @default(autoincrement())
  todoId      Int            @map("todo_id")
  operatorId  Int            @map("operator_id")
  action      TodoLogAction
  objectType  String?        @map("object_type") @db.VarChar(100)
  objectId    Int?           @map("object_id")
  remark      String?        @db.VarChar(500)
  createdAt   DateTime       @default(now()) @map("created_at") @db.Timestamptz()

  todo        Todo           @relation(...)
  operator    User           @relation("TodoLogOperator", ...)

  @@index([todoId])
  @@map("todo_logs")
}
```

### 关联更新
- `Company` 新增 `todos Todo[]`
- `Project` 新增 `todos Todo[]`
- `User` 新增 `assignedTodos Todo[] @relation("TodoAssignee")`
- `User` 新增 `createdTodos Todo[] @relation("TodoCreator")`
- `User` 新增 `todoLogOperations TodoLog[] @relation("TodoLogOperator")`

### 状态流转
```
创建 → open（处理中）
open → closed（关闭/完成）
closed → open（重新打开）
open → draft（驳回）
draft → open（提交）
```

### 迁移
通过 `npx prisma db push` 执行。 — 所有模型添加 deletedAt 字段

### 变更原因
所有删除操作改为软删除，只标记 `deletedAt` 字段而非真正删除记录，前端通过后端过滤不显示已删除数据。

### 变更内容
为以下18个模型添加 `deletedAt DateTime? @map("deleted_at") @db.Timestamptz()` 字段：

Company, User, Skills, LlmModel, PublishingPlatform, SystemConfig, Project, ProjectOperator, ProjectViewer, KnowledgeBase, Article, ArticleVersion, KnowledgeKeyword, KeywordExpandedWord, MinedKeyword, KnowledgePortrait, KnowledgeImage, KnowledgeDocument

### 关联代码变更
- 所有 service 层的 `delete()` 改为 `update({ data: { deletedAt: new Date() } })`
- 所有 `findMany` / `findFirst` 查询添加 `deletedAt: null` 过滤
- `$queryRaw` 查询添加 `AND deleted_at IS NULL`

### 迁移
通过 `npx prisma db push` 执行。

---

## db014. Todo 新增 dueAt 字段

### 变更原因
新建待办表单重构为结构化表单，增加"完成时间"选择，需存储截止时间。

### 变更内容
- `Todo` 模型新增 `dueAt DateTime?`（可选，截止时间，UTC 时区）

### 影响范围
- `apis/entity/todo.entity.ts`：Todo 接口增加 `due_at`，CreateTodoRequest 增加 `due_at`
- `apis/map/index.ts`：mapTodo 增加 `due_at` 映射
- `apis/service/impl/todo.service.impl.ts`：create 方法支持 `due_at`
- `pages/todo/TodoForm.tsx`：新建表单增加完成时间选择

### 迁移
通过 `npx prisma db push` 执行。

---

## db020. Article 新增 schedule_type 字段

### 变更原因
发布计划支持三种类型：尽快执行、指定时间执行、指定时间之后执行。

### Schema 变更
```prisma
model Article {
  // ... existing fields
  scheduleType String? @map("schedule_type") @db.VarChar(20)
}
```

### 说明
- `scheduleType`：可选字段，取值为 `'asap'`（尽快执行）、`'scheduled'`（指定时间执行）、`'after'`（指定时间之后执行）
- 与 `scheduledPublishAt` 配合使用：`asap` 时无需时间，`scheduled`/`after` 时需要时间

### 影响范围
- `prisma/schema.prisma` — 新增字段
- `apis/entity/article.entity.ts` — 新增 ScheduleType 类型和接口字段
- `apis/schema/article.schema.ts` — updateArticleSchema 新增 schedule_type 验证
- `apis/map/index.ts` — mapArticle 增加 schedule_type 映射
- `apis/service/publishing-schedule.service.ts` — updateSchedule 签名新增 scheduleType
- `apis/service/impl/publishing-schedule.service.impl.ts` — 实现 scheduleType 写入
- `apis/controller/publishing-schedule.controller.ts` — controller 接收和验证 schedule_type
- `pages/publish/index.tsx` — 前端编辑 Modal 支持三种计划类型

### 迁移
通过 `npx prisma db push` 执行。

---

## db012. 文章管理与发布计划解耦

### 变更原因
文章管理和发布计划紧密耦合：文章审核通过后直接进入 `publishing` 状态。需要将两者完全解耦，文章审核通过即结束流程（`approved`），发布计划作为独立实体手工创建。

### 变更内容

#### 1. ArticleStatus 枚举变更
- 新增 `approved` 状态（审核通过）
- `publishing`/`publish_failed`/`published` 保留于 Prisma schema（待后续迁移移除）
- 状态机更新：`pending_review → approved`（替代原 `pending_review → publishing`）

#### 2. Article 模型变更
- 移除 `platforms`、`scheduledPublishAt`、`scheduleType` 字段（待迁移）
- 新增 `schedules PublishingSchedule[]` 关联关系
- 列表/详情 API 返回 `schedule_count`（关联发布计划数量）

#### 3. 新建 PublishingSchedule 模型
- 独立发布计划表，包含：articleId、platforms、scheduleType、scheduledPublishAt、status、createdBy
- `PublishingScheduleStatus` 枚举：`pending`/`publishing`/`published`/`publish_failed`
- `ScheduleType` 枚举：`asap`/`scheduled`/`after`
- 支持软删除（deletedAt）

### 影响文件
- `prisma/schema.prisma` — 新增 PublishingSchedule 模型、Article 关联
- `apis/entity/article.entity.ts` — 新增 schedule_count，状态类型更新
- `apis/entity/publishing-schedule.entity.ts` — 全新发布计划实体
- `apis/service/article.service.ts` — 移除发布相关方法
- `apis/service/publishing-schedule.service.ts` — 全新发布计划服务接口
- `apis/service/impl/publishing-schedule.service.impl.ts` — Prisma 实现
- `apis/controller/article.controller.ts` — 移除发布端点
- `apis/controller/publishing-schedule.controller.ts` — 全新发布计划控制器
- `pages/article/index.tsx` — 显示"可发布"/"x个发布"标签
- `pages/publish/index.tsx` — 独立发布计划管理页面
- `pages/article/components/PlatformSelectModal.tsx` — 已删除
- `pages/article/components/ArticleSettingsForm.tsx` — 移除平台选择

---

## db019. PublishingSchedule 新增 reject_reason 字段

### 变更原因
安全评审 H-3 修复：reject 端点的 reason 字段需持久化到数据库，满足审计可追溯性要求。

### Schema 变更
```prisma
// Before
model PublishingSchedule {
  status  PublishingScheduleStatus @default(pending)
  createdBy  Int? @map("created_by")
}

// After
model PublishingSchedule {
  status       PublishingScheduleStatus @default(pending)
  rejectReason String? @map("reject_reason") @db.VarChar(500)
  createdBy    Int?    @map("created_by")
}
```

### 影响文件
- `prisma/schema.prisma` — PublishingSchedule 新增 rejectReason 字段
- `prisma/migrations/20260526000001_add_publishing_schedule_reject_reason/migration.sql` — 新增迁移
- `apis/entity/publishing-schedule.entity.ts` — PublishingSchedule 接口新增 reject_reason
- `apis/map/index.ts` — mapPublishingSchedule / mapPublishingScheduleItem 新增 reject_reason 映射
- `apis/service/impl/publishing-schedule.service.impl.ts` — reject 方法保存 rejectReason
- `apis/schema/publishing-schedule.schema.ts` — listPublishableArticlesSchema pageSize 默认值统一为 10
