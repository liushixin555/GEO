# apis/entity/article.entity.ts — Committer 审核专家评审报告

**评审日期**: 2026-05-26
**评审角色**: Committer 审核专家（代码合并准入 + 测试完备性 + API 契约正确性 + 项目规范遵循 + 生产就绪度）
**文件路径**: `apis/entity/article.entity.ts`
**代码行数**: 82 行（纯 TypeScript 类型定义，无可执行逻辑）
**关联文件**: `tests/apis/article.entity.test.ts`, `apis/schema/article.schema.ts`, `apis/service/impl/article.service.impl.ts`, `apis/map/index.ts`, `pages/article/types.ts`, `prisma/schema.prisma`
**已有评审**: 代码安全专家 + Committer 审核（2026-05-25，类型安全修复已完成）
**严重级别汇总**: 前次评审已修复 CRITICAL(2) / HIGH(3) / MEDIUM(5) / LOW(1)，本次新发现 MEDIUM(2) / LOW(3)

---

## 一、Committer 审核总览

从代码提交审核人（Committer）视角审视，`article.entity.ts` 是一个 **82 行的纯类型定义文件**，定义了 5 个导出类型：`ArticleStatus`、`ScheduleType`、`Article`、`ArticleVersion`、`CreateArticleRequest`、`UpdateArticleRequest`、`ReviewArticleRequest`。该文件无可执行逻辑，无安全攻击面。

前次评审（2026-05-25）已修复全部 CRITICAL/HIGH 级类型安全问题（skills 类型一致性、Zod Schema 集成等）。本次评审关注**测试数据真实性**和**Entity 文档完备性**。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 类型正确性 | 9/10 | 通过 — 字段定义与 Prisma Schema + Zod Schema + 前端类型一致 |
| API 契约完备性 | 8/10 | 通过 — Create/Update 差异化合理，ScheduleType 约束完整 |
| 项目规范遵循 | 8/10 | 通过 — 命名、导出方式与同项目 Entity 一致 |
| 测试数据真实性 | 6/10 | **需修复** — baseArticle.skills 使用标量值 `1`，与实际 API 契约 `number[] | null` 不符 |
| 生产就绪度 | 9/10 | 通过 — 纯类型定义，无运行时风险 |

**综合判定: 有条件通过（APPROVE WITH MINOR FIXES）**

---

## 二、本次新发现问题

### M-1: 测试 baseArticle.skills 使用非真实数据

| 属性 | 值 |
|------|-----|
| **编号** | M-1 |
| **级别** | MEDIUM |
| **文件** | `tests/apis/article.entity.test.ts:26,47` |
| **问题** | `baseArticle.skills: 1` 使用标量数字，与实际 API 数据流 `number[] \| null` 不符。虽然 `Article.skills` 类型为 `unknown \| null`（对齐 Prisma `Json?`），但实际经过 Zod 验证后的 API 输入输出数据均为 `number[] \| null`。测试基础数据应反映真实使用场景 |
| **修复** | `skills: 1` → `skills: [1]`，`expect(baseArticle.skills).toBe(1)` → `toEqual([1])` |

### M-2: 测试 skills: 0 使用标量值

| 属性 | 值 |
|------|-----|
| **编号** | M-2 |
| **级别** | MEDIUM |
| **文件** | `tests/apis/article.entity.test.ts:155-157` |
| **问题** | `skills: 0` 同 M-1，应使用数组 `[0]` |
| **修复** | `skills: 0` → `skills: [0]`，`expect(article.skills).toBe(0)` → `toEqual([0])` |

### L-1: 测试存在死断言

| 属性 | 值 |
|------|-----|
| **编号** | L-1 |
| **级别** | LOW |
| **文件** | `tests/apis/article.entity.test.ts:1543-1544` |
| **问题** | `approve.approve !== undefined ? reject.approved === false : false` 中 `approve.approve` 不存在（应为 `approved`），导致条件永远为 `false`，断言恒通过 |
| **修复** | 修正属性名或删除无效断言 |

### L-2: 测试使用过时的 article_type 值

| 属性 | 值 |
|------|-----|
| **编号** | L-2 |
| **级别** | LOW |
| **文件** | `tests/apis/article.entity.test.ts:121` |
| **问题** | `['seo', 'original', 'rewrite', 'custom']` 与前端 `ArticleType` 定义（'榜单排名', '方法论讲解' 等）不一致 |
| **修复** | 更新测试数据使用前端定义的 ArticleType 值 |

### L-3: Entity 字段缺少 JSDoc 文档

| 属性 | 值 |
|------|-----|
| **编号** | L-3 |
| **级别** | LOW |
| **文件** | `apis/entity/article.entity.ts` |
| **问题** | Article 接口多个字段缺少文档说明，`article_type` 和 `write_mode` 未说明推荐值 |
| **修复** | 补充 JSDoc 注释 |

---

## 三、前次已修复项验证

| 编号 | 前次级别 | 修复内容 | 验证状态 |
|------|---------|---------|---------|
| CRITICAL-2 | CRITICAL | `UpdateArticleRequest.status` 使用 `ArticleStatus` 联合类型 | ✅ 已验证 |
| 遗漏-1 | HIGH | `Article.skills` 使用 `unknown \| null` 对齐 Prisma `Json?` | ✅ 已验证 |
| 类型一致性 | HIGH | `UpdateArticleRequest.skills` → `number[] \| null` | ✅ 已验证 |
| 类型完整性 | MEDIUM | `CreateArticleRequest.skills` → `number[] \| null` | ✅ 已验证 |
| Zod Schema | HIGH | `article.schema.ts` 集成到路由 validate 中间件 | ✅ 已验证 |

---

## 四、BACKLOG（未修复，需后续迭代）

| 编号 | 级别 | 说明 |
|------|------|------|
| BACKLOG-1 | BACKLOG | `ReviewArticleRequest` 添加 `reason?: string` 字段（需 DB 迁移） |
| BACKLOG-2 | BACKLOG | `version` 从 Prisma `Float` 改为 `Int`（需 DB 迁移） |
| BACKLOG-3 | BACKLOG | `Article`/`ArticleVersion` 添加 `deleted_at` 字段（软删除透明，暂不影响功能） |
