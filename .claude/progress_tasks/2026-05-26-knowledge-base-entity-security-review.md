# knowledge-base.entity.ts 代码安全专家评审

**日期**: 2026-05-26
**文件**: `tasks/review/knowledge-base.entity.ts.security.md`
**评分**: 5.0/10 REQUEST CHANGES

## 评审结果

- CRITICAL × 2: scope/company_id/project_id 无判别联合约束 + deleted_at 遗漏导致软删除记录泄露
- HIGH × 4: scope 变更权限提升通道 + scope 三次重复类型漂移 + mapKnowledgeBase any 映射 + 跨边界重绑定
- MEDIUM × 5: nullability 不一致 + 聚合字段未分离 + service scope: string + description Zod/Prisma 长度不一致(2000 vs 500) + admin 创建 platform 约束缺失
- LOW × 3: 零文档 + 双重定义漂移 + 空对象允许

## 关联文件

- `apis/entity/knowledge-base.entity.ts` (评审对象)
- `apis/schema/knowledge-base.schema.ts` (Zod 验证)
- `apis/controller/knowledge-base.controller.ts` (消费者)
- `apis/service/impl/knowledge-base.service.impl.ts` (消费者)
- `tasks/review/knowledge-base.entity.ts.quality.md` (质量评审 4.2/10)
- `tasks/review/knowledge-base.entity.ts.architecture.md` (架构评审 4.1/10)
