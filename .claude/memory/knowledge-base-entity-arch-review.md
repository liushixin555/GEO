---
name: knowledge-base-entity-arch-review
description: knowledge-base.entity.ts 架构评审 4.1/10 REQUEST CHANGES：三职责混合+判别联合缺失+deleted_at遗漏+any映射
metadata:
  type: project
---

knowledge-base.entity.ts 架构评审 4.1/10 REQUEST CHANGES（2026-05-26）

**Why:** 三职责混合（实体字段+关联解析+聚合计数）导致 mapKnowledgeBase 使用 any，判别联合缺失使 scope/company_id/project_id 关联约束仅能在运行时校验，deleted_at 字段遗漏。

**How to apply:** 修复时应拆分 KnowledgeBase / KnowledgeBaseDetail 层级，CreateRequest 改为 discriminated union，提取 KnowledgeScope type alias，使用 Prisma Payload 类型替代 any 映射。

详见 [[knowledge-base-entity-quality]] 和 tasks/review/knowledge-base.entity.ts.architecture.md
