# knowledge.entity.ts 软件质量专家评审

**文件**: `apis/entity/knowledge.entity.ts`
**评审日期**: 2026-05-26
**评审类型**: 软件质量评审（Quality Review）
**评审基线**: 与 `prisma/schema.prisma` (KnowledgeKeyword/KeywordExpandedWord/MinedKeyword/KnowledgePortrait/KnowledgeImage/KnowledgeDocument) + `knowledge-base.entity.ts` 对比

---

## 综合评分：4.0/10 — CONDITIONAL APPROVE

6 个实体接口全部遗漏 `deleted_at` 软删除字段（Prisma schema 已定义），Create/Update DTO 不一致且缺少约束文档化。

---

## 一、评审维度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| Schema-Entity 映射准确性 | 2/10 | 6/6 实体遗漏 `deleted_at`，MinedKeyword `updated_at` 遗漏已确认是 Prisma 无此字段 |
| DTO 设计规范性 | 4/10 | UpdateKeywordRequest 与 Create 完全相同，keyword 不应必填；nullability 三值逻辑未文档化 |
| 类型安全性 | 5/10 | file_type 无约束，file_size 无边界，inline 类型重复 |
| 文档与注释 | 2/10 | 零 JSDoc，零字段约束文档，与 knowledge-base.entity.ts 形成鲜明对比 |
| 命名一致性 | 7/10 | snake_case 字段名与项目约定一致，但 base_id 语义未注释 |
| 可维护性 | 5/10 | 无类型复用，inline 匿名类型散布，无判别联合 |

---

## 二、问题清单

### CRITICAL（阻断级）

#### C-1: 6 个实体接口全部遗漏 `deleted_at` 软删除字段
- **位置**: L1-109（`KnowledgeKeyword`、`KeywordExpandedWord`、`KnowledgePortrait`、`KnowledgeImage`、`KnowledgeDocument`、`MinedKeyword`）
- **现状**: Prisma schema 中所有 6 个模型均有 `deletedAt DateTime? @map("deleted_at") @db.Timestamptz()`，但 entity 接口均未声明 `deleted_at: Date | null`
- **影响**:
  - Service 层查询返回的 `deleted_at` 字段在 TypeScript 层面不可见，运行时访问会触发 `ts-ignore` 或类型断言
  - 软删除过滤条件（`WHERE deleted_at IS NULL`）无法在类型层面表达
  - 与 `knowledge-base.entity.ts` L20 `deleted_at: Date | null` 的修复不一致，属于回归遗漏
- **修复**: 每个 interface 添加 `deleted_at: Date | null`
- **Prisma 参考**:
  - `KnowledgeKeyword`: schema.prisma:290 `deletedAt DateTime? @map("deleted_at")`
  - `KeywordExpandedWord`: schema.prisma:304 `deletedAt DateTime? @map("deleted_at")`
  - `KnowledgePortrait`: schema.prisma:335 `deletedAt DateTime? @map("deleted_at")`
  - `KnowledgeImage`: schema.prisma:352 `deletedAt DateTime? @map("deleted_at")`
  - `KnowledgeDocument`: schema.prisma:372 `deletedAt DateTime? @map("deleted_at")`
  - `MinedKeyword`: schema.prisma:318 `deletedAt DateTime? @map("deleted_at")`

---

### HIGH（高优先级）

#### H-1: `UpdateKeywordRequest.keyword` 必填违反 Partial Update 模式
- **位置**: L48-51
- **现状**: `keyword: string` 是 required，与 Create 完全相同
- **对比**: `UpdateKnowledgeBaseRequest` 所有字段均为 optional；`UpdatePortraitRequest` 所有字段均为 optional；`UpdateImageRequest` 所有字段均为 optional
- **影响**: 客户端无法做部分更新（PATCH 语义），必须每次提交完整 keyword
- **修复**: `keyword?: string`

#### H-2: Create/Update Keyword Request 的 inline 类型重复
- **位置**: L43-51
- **现状**: `{ word: string; selected: boolean }` 在 `CreateKeywordRequest.expanded_words` 和 `UpdateKeywordRequest.expanded_words` 中重复定义
- **影响**: 类型演进时需同步修改两处，违反 DRY
- **修复**: 提取为 `ExpandedWordInput` 类型

#### H-3: Entity 与 Request DTO 的 nullability 三值逻辑未文档化
- **位置**: L43-72（所有 Request 接口）
- **现状**:
  - Entity: `content: string | null`（可为空）
  - CreateRequest: `content?: string`（可选，不可为 null）
  - 无法表达 "显式清除" 语义（`null`）
- **对比**: `knowledge-base.entity.ts` L40-41 有明确文档 `/** undefined=不提供, string=新值, null=显式清除 */`
- **修复**: Request 字段应为 `field?: string | null` 并添加 JSDoc

#### H-4: 零字段约束文档
- **位置**: 全文件
- **现状**: Prisma 定义了严格的 VarChar 长度限制（keyword 200、title 200、description 500、image_url 500、file_name 255、file_type 20），但 entity 文件中无任何注释说明
- **对比**: `knowledge-base.entity.ts` L9 有 `/** 描述，最长 500 字符（Prisma @db.VarChar(500)） */`
- **影响**: API 消费者无法从类型定义获知约束边界，可能提交超长数据导致 500 错误
- **修复**: 为所有 constrained 字段添加 JSDoc

---

### MEDIUM（中优先级）

#### M-1: `file_type: string` 过于宽泛
- **位置**: L81, L94
- **现状**: Prisma `@db.VarChar(20)` 暗示 MIME type，但无类型约束
- **修复**: 至少添加 JSDoc `/** MIME type，如 'application/pdf' */`，理想情况使用联合类型

#### M-2: `file_size: number` 无边界约束
- **位置**: L83, L95
- **现状**: 无最小值/最大值文档
- **修复**: 添加 JSDoc `/** 文件大小（字节），必须 > 0 */`

#### M-3: 无 `updated_by` 审计字段
- **位置**: 全部实体接口
- **现状**: 仅有 `created_by`，无 `updated_by`
- **说明**: Prisma schema 也无此字段，属于设计层面的统一缺失，此处仅记录
- **优先级**: 低，与 schema 一致

#### M-4: 缺少判别联合（Discriminated Union）
- **位置**: 全部实体
- **现状**: 5 种知识子实体共享 `base_id` 外键，无 `type` 或 `kind` 字段区分
- **影响**: 在列表 API 返回混合类型时无法做类型安全判断
- **建议**: 当前未触发实际问题，标记为 MEDIUM

---

### LOW（低优先级）

#### L-1: 文件缺少文件级 TSDoc
- **位置**: L1
- **现状**: 无 `/** @module knowledge-entity */` 文件说明
- **对比**: `knowledge-base.entity.ts` 有 `/** 知识库基础实体 */` 等文档

#### L-2: `base_id` 语义未注释
- **位置**: 所有实体的 `base_id` 字段
- **现状**: 未说明指向 `knowledge_bases.id`
- **修复**: `/** 关联的知识库 ID */`

#### L-3: 无 re-export barrel
- **位置**: 文件级
- **现状**: 独立文件，无从 `knowledge-base.entity.ts` re-export，消费者需多路径导入
- **建议**: 可考虑合并或建立 barrel

---

## 三、Schema-Entity 映射对照表

| Prisma Model | Entity Interface | `deleted_at` | `updated_at` | 备注 |
|---|---|---|---|---|
| KnowledgeKeyword | KnowledgeKeyword | **遗漏** | OK | |
| KeywordExpandedWord | KeywordExpandedWord | **遗漏** | OK | |
| KnowledgePortrait | KnowledgePortrait | **遗漏** | OK | |
| KnowledgeImage | KnowledgeImage | **遗漏** | OK | |
| KnowledgeDocument | KnowledgeDocument | **遗漏** | OK | |
| MinedKeyword | MinedKeyword | **遗漏** | 无此字段(Prisma也无) | 正确 |

**映射准确率**: 1/7 字段组正确（仅 MinedKeyword 的 updated_at 映射正确），`deleted_at` 6/6 遗漏

---

## 四、DTO 一致性对照

| DTO 类型 | 全 Optional | 含 null 语义 | 有字段约束文档 | 与 Entity nullability 一致 |
|---|---|---|---|---|
| CreateKeywordRequest | 否(keyword必填) | 否 | 否 | N/A |
| UpdateKeywordRequest | 否(keyword必填) | 否 | 否 | N/A |
| CreatePortraitRequest | 是 | 否 | 否 | 否(entity是`null`,request是`?`) |
| UpdatePortraitRequest | 是 | 否 | 否 | 否 |
| CreateImageRequest | 否(title/image_url必填) | 否 | 否 | N/A |
| UpdateImageRequest | 是 | 否 | 否 | N/A |
| CreateDocumentRequest | 否(多个必填) | 否 | 否 | N/A |
| UpdateDocumentRequest | 是 | 否 | 否 | N/A |

---

## 五、修复建议优先级

| 优先级 | 编号 | 工作量 | 影响范围 |
|---|---|---|---|
| P0-CRITICAL | C-1 | 小 | 6 个 interface 各加 1 行 |
| P1-HIGH | H-1 | 小 | 1 行改为 optional |
| P1-HIGH | H-2 | 小 | 提取 1 个共享类型 |
| P1-HIGH | H-3 | 小 | 字段类型 + JSDoc |
| P1-HIGH | H-4 | 中 | 20+ 字段添加 JSDoc |
| P2-MEDIUM | M-1~M-4 | 小~中 | 类型约束 |

---

## 六、总结

**核心问题**: 该文件是 `knowledge-base.entity.ts` 的子实体层（知识库下的关键词/人设/图片/文档/挖掘词），但质量水准远低于父实体。父实体已经历安全评审修复（含 `deleted_at` 补全、JSDoc 约束文档、三值逻辑注释），而本文件仍处于"裸类型定义"阶段。

**最严重风险**: `deleted_at` 全部遗漏意味着软删除功能在 TypeScript 层面完全不可见，Service 层使用时必然出现类型不安全代码（`as any` 或 `@ts-ignore`），且与父实体形成语义断层。

**修复后预期评分**: 完成 P0 + P1 修复后可达 **7.0/10**。
