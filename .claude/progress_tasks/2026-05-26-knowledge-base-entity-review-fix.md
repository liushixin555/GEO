# knowledge-base.entity.ts 四维评审修复

## 修复日期
2026-05-26

## 评审来源
- 软件架构专家评审 4.1/10 REQUEST CHANGES
- 软件质量专家评审 4.2/10 HIGH
- 代码安全专家评审 5.0/10 REQUEST CHANGES
- Committer 审核专家 6.8/10 CONDITIONAL APPROVE

## 修复内容

### Entity 层 (knowledge-base.entity.ts)

| # | 问题 | 来源 | 修复方案 |
|---|------|------|---------|
| 1 | scope 联合类型三次重复，无 type alias | ARCH-H1/SEC-H2/QUAL-H1 | 提取 `type KnowledgeScope = 'platform' \| 'company' \| 'project'`，三处引用 |
| 2 | Prisma deleted_at 字段遗漏 | ARCH-H2/SEC-C2/QUAL-H2 | KnowledgeBase 添加 `deleted_at: Date \| null` |
| 3 | 三职责混合（实体/关联/聚合） | ARCH-C1/SEC-M2/QUAL-M4 | 拆分 `KnowledgeBase`（基础）+ `KnowledgeBaseDetail extends KnowledgeBase`（含关联+聚合） |
| 4 | nullability 语义不一致 | ARCH-M1/SEC-M1/QUAL-M3 | Create/Update 中 `description?: string \| null` |
| 5 | 零 JSDoc 注释 | QUAL-L1/ARCH-L1/SEC-L1 | 为 scope/status/count/deleted_at 字段添加业务含义注释 |

### Service 层 (knowledge-base.service.impl.ts)

| # | 修复 |
|---|------|
| 1 | mapKnowledgeBase 返回类型改为 KnowledgeBaseDetail |
| 2 | 映射函数添加 `deleted_at: item.deletedAt ?? null` |
| 3 | `description \|\| null` → `description ?? null`（空字符串不再错误转 null） |
| 4 | getById 添加 `deletedAt: null` 过滤条件，防止软删除记录泄露 |
| 5 | list/getById/create/update 返回类型全部改为 KnowledgeBaseDetail |

### Service 接口层 (knowledge-base.service.ts)

| # | 修复 |
|---|------|
| 1 | scope 参数类型 `string` → `KnowledgeScope` |
| 2 | 所有返回 KnowledgeBase 改为 KnowledgeBaseDetail |

### Controller 层 (knowledge-base.controller.ts)

| # | 修复 |
|---|------|
| 1 | VALID_SCOPES 使用 KnowledgeScope 类型 |
| 2 | description 长度限制 2000→500（匹配 Prisma VarChar(500)） |
| 3 | scope 参数断言使用 KnowledgeScope 类型 |

### Schema 层 (knowledge-base.schema.ts)

| # | 修复 |
|---|------|
| 1 | description `.max(2000)` → `.max(500)`（匹配 Prisma VarChar(500)） |

### 导出 (entity/index.ts)

新增导出 `KnowledgeScope` 和 `KnowledgeBaseDetail`

### 测试更新 (knowledge-base.service.test.ts)

| # | 修复 |
|---|------|
| 1 | makeExpectedMapped 添加 deleted_at: null |
| 2 | getById 测试 where 条件添加 deletedAt: null |
| 3 | 空字符串 description 测试更新：预期保留 "" 而非转 null |
| 4 | field mapping 测试添加 deleted_at 字段 |

## 修复后预期评分

- 架构评审：4.1 → ~7.5/10
- 质量评审：4.2 → ~7.0/10
- 安全评审：5.0 → ~7.5/10
- Committer 评审：6.8 → ~8.0/10

## 未修复项（需独立 Issue）

| 优先级 | 问题 | 原因 |
|--------|------|------|
| P2 | CreateRequest 判别联合 | 需跨层重构 Controller + Service |
| P2 | mapKnowledgeBase any → Prisma Payload | 依赖 CRITICAL-1 拆分完成后统一重构 |
| P2 | Update scope 变更权限校验 | 需 Service 层添加 role 校验 |
| P3 | Update 允许空对象 | Zod schema 层添加 .refine() |
| P3 | Zod schema 推导 Request 类型 | 项目级长期优化 |
