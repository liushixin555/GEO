# skills.entity.ts 架构评审

**文件**: `apis/entity/skills.entity.ts`
**评审维度**: 架构（Architecture）
**评审日期**: 2026-05-26
**评审基线**: Prisma schema `model Skills` + 全量实体横向对比 + Service/Controller/Map 层消费分析

---

## 评审结论

**评分: 3.8/10 — REQUEST CHANGES**

实体层是系统契约的基石，当前 `skills.entity.ts` 存在 1 项 CRITICAL + 4 项 HIGH 级别架构缺陷，导致 Prisma 数据库字段与 TypeScript 实体严重失同步，且违背项目内已建立的实体设计模式。

---

## 发现清单

### C-1 [CRITICAL] `deleted_at` 遗漏——Prisma 有字段但实体未声明

| 项目 | 内容 |
|------|------|
| **现状** | Prisma schema 定义了 `deletedAt DateTime? @map("deleted_at")`，service impl 所有查询均 `where: { deletedAt: null }` 过滤软删除记录，delete 操作 `data: { deletedAt: new Date() }` 实现软删除。但 `Skills` 接口完全没有 `deleted_at` 字段 |
| **对比** | 项目内所有支持软删除的实体均声明了 `deleted_at`：`KnowledgeBase`(L20)、`KnowledgeKeyword`(L18)、`KnowledgePortrait`(L73)、`KnowledgeImage`(L113)、`KnowledgeDocument`(L160)、`MinedKeyword`(L203)、`Company`(L33) |
| **影响** | ① API 消费者无法区分已删除/未删除记录 ② `mapSkills()` 有意跳过映射，导致实体与数据库永久失同步 ③ 前端 `SkillsForm.tsx`、`skills/index.tsx` 无法展示或过滤软删除状态 ④ 违反项目实体设计铁律——数据库有字段则实体必须有对应声明 |
| **修复** | 在 `Skills` 接口添加 `deleted_at: Date \| null`；在 `mapSkills()` 添加 `deleted_at: prismaSkills.deletedAt ?? null` |

### H-1 [HIGH] `creator_name` 混入基础实体——违反 Base/Detail 分层模式

| 项目 | 内容 |
|------|------|
| **现状** | `Skills` 接口同时包含 Prisma 直字段 (`id`, `name`, `skill_dir`...) 和关联解析字段 (`creator_name`)。`creator_name` 来源于 Prisma `include: { creator: true }` 的 User 关联，不是 Skills 表自身的列 |
| **对比** | `KnowledgeBase` 正确拆分为 `KnowledgeBase`(基础，L5-21) 和 `KnowledgeBaseDetail extends KnowledgeBase`(含 `creator_name`、聚合计数，L24-36)。`KnowledgeKeyword` 同样拆分为 `KnowledgeKeyword`(基础) 和 `KnowledgeKeywordDetail`(含 `creator_name`、展开词) |
| **影响** | ① 基础实体与 API 响应 DTO 职责混合，消费方无法区分哪些字段来自表、哪些来自关联 ② Service 层的 `findSoftDeletedByName` 返回 `{ id, skill_dir }` 就是因为 `Skills` 接口过重，无法安全用于部分查询 ③ 新增关联字段时被迫修改基础接口，破坏开闭原则 |
| **修复** | 拆分为 `Skills`(基础，不含 `creator_name`) + `SkillsDetail extends Skills`(含 `creator_name`)；Service 接口 list/getById 返回 `SkillsDetail`；`index.ts` 导出新增 `SkillsDetail` |

### H-2 [HIGH] `created_by` 暴露内部用户 ID——安全与隐私风险

| 项目 | 内容 |
|------|------|
| **现状** | `Skills.created_by: number \| null` 直接暴露内部用户 ID；`CreateSkillsRequest.created_by?: number` 允许客户端指定创建者 ID |
| **对比** | `Todo` 实体使用 `created_by_id` + `created_by_name` 命名对；`PublishingScheduleItem` 使用 `created_by` + `created_by_name`；controller 中 `createSkills` 正确使用 `req.user.userId` 而非 `req.body.created_by`，说明 DTO 字段与实际用法不一致 |
| **影响** | ① `CreateSkillsRequest.created_by` 存在但 controller 不从 `req.body` 读取它——DTO 声明与实际消费者契约矛盾 ② 前端可通过构造请求注入 `created_by` 冒充他人（虽然 controller 覆盖了，但 DTO 给出错误信号） ③ `Skills.created_by` 暴露数字 ID 但无对应 name，前端需额外请求解析 |
| **修复** | ① `CreateSkillsRequest` 移除 `created_by`，由 controller 从 auth context 注入 ② `Skills` 基础实体保留 `created_by`（数据库字段），`SkillsDetail` 通过 `creator_name` 提供人类可读名 |

### H-3 [HIGH] `description` 不可清除——UpdateSkillsRequest 缺少 null 语义

| 项目 | 内容 |
|------|------|
| **现状** | `UpdateSkillsRequest.description?: string`——只有 `undefined`(不修改) 和 `string`(新值) 两种语义，无法表达"清除 description" |
| **对比** | `UpdateKnowledgeBaseRequest.description?: string \| null`——三态语义：`undefined`=不修改, `string`=新值, `null`=清除。`UpdatePortraitRequest.content?: string \| null`、`UpdateImageRequest.description?: string \| null` 同理 |
| **影响** | ① 用户一旦填写描述就无法清空（service impl L101 `data.description = request.description` 只接受 string） ② 与项目其他实体的 Update DTO 模式不一致 ③ 违反 DTO 设计原则——可 null 的字段在 Update 中必须支持三态 |
| **修复** | `UpdateSkillsRequest.description` 改为 `description?: string \| null`；service impl 中 `if (request.description !== undefined) data.description = request.description` 已经兼容（Prisma `null` 会清除字段），只需更新类型声明 |

### H-4 [HIGH] 零 JSDoc 文档——字段约束完全不可见

| 项目 | 内容 |
|------|------|
| **现状** | 全文件 23 行，0 行 JSDoc 注释。Prisma 约束（name VarChar(200)、description VarChar(500)、skill_dir VarChar(500)）在实体层完全不可见 |
| **对比** | `knowledge-base.entity.ts` 每个约束字段都有 JSDoc：`/** 描述，最长 500 字符（Prisma @db.VarChar(500)） */`；`knowledge.entity.ts` 每个字段都有类型和约束注释 |
| **影响** | ① 消费者无法从 TypeScript 接口推断字段约束 ② controller 层硬编码 `name.length > 200`、`description.length > 500` 魔数，与实体层断链 ③ IDE hover 无法提示字段含义和约束 |
| **修复** | 为所有字段添加 JSDoc，标注 Prisma 约束（VarChar 长度、可 null 性、默认值）。参考 `knowledge-base.entity.ts` 的注释风格 |

---

## 次要发现（MEDIUM）

### M-1 `skill_dir` 默认值语义不明

`skill_dir: string` 在基础实体中是非空 string，但 Prisma 默认值是 `@default("")`。创建时必须由 controller 传入提取后的目录名，空字符串表示"未设置"。建议在 JSDoc 中注明 `空字符串=未关联目录文件`。

### M-2 缺少 `name` 唯一约束文档

Prisma `@@unique([name])` 约束在实体层完全无体现。`name` 的唯一性是核心业务规则（同名技能上传铁律），应在实体注释中标注。

### M-3 `mapSkills` 参数类型过宽

`apis/map/index.ts:21` 的 `mapSkills` 参数类型为 `PrismaSkills & { creator?: { cnName?: string } | null }`，这是 Prisma 生成类型 + 手动扩展的交叉类型。应定义专门的 `PrismaSkillsWithCreator` 类型或使用 Prisma 的 `include` 返回类型，避免手工拼凑。

### M-4 缺少模块级 JSDoc

对比 `knowledge.entity.ts` 有 `/** @module knowledge-entity — 知识库子实体层 */`，`knowledge-base.entity.ts` 有枚举/字段注释，`skills.entity.ts` 没有任何模块级文档。

---

## 低级发现（LOW）

### L-1 无 `SkillsDetail` 导出

`apis/entity/index.ts:3` 仅导出 `Skills, CreateSkillsRequest, UpdateSkillsRequest`。若拆分 Base/Detail（H-1），需同步更新 barrel 导出。

### L-2 `CreateSkillsRequest.description` 类型与 Prisma 不一致

Prisma `description String?` 表示可 null，但 `CreateSkillsRequest.description?: string` 只允许 string | undefined。当传入空字符串时 Prisma 会存储空串而非 null，与 service impl 中 `request.description || null` 的回退逻辑语义冲突。

---

## 修复优先级与工时预估

| 优先级 | 编号 | 修复项 | 预估工时 |
|--------|------|--------|----------|
| P0 | C-1 | 添加 `deleted_at` 字段 + 更新 `mapSkills` | 15min |
| P0 | H-1 | 拆分 `Skills`/`SkillsDetail` + 更新 Service/Map/导出 | 45min |
| P1 | H-2 | 移除 `CreateSkillsRequest.created_by` | 10min |
| P1 | H-3 | `UpdateSkillsRequest.description` 改为三态 | 5min |
| P1 | H-4 | 补全 JSDoc 文档 | 20min |
| P2 | M-1~M-4 | 次要修复 | 20min |

**总预估工时**: ~2h

---

## 横向对比评分

| 实体 | Base/Detail 拆分 | `deleted_at` | JSDoc | Update 三态 | 评分 |
|------|:---:|:---:|:---:|:---:|:---:|
| knowledge-base.entity.ts | ✅ | ✅ | ✅ | ✅ | 8.0 |
| knowledge.entity.ts | ✅ | ✅ | ✅ | ✅ | 7.0 |
| **skills.entity.ts** | ❌ | ❌ | ❌ | ❌ | **3.8** |

---

## 修复后预期评分

全部 P0+P1 修复完成后，预期可达 **7.5/10**。
