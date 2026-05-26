# 知识库实体安全评审修复

**日期**: 2026-05-26
**评审文件**: `tasks/review/knowledge-base.entity.ts.security.md`
**安全评分**: 5.0/10 → 7.5+/10（预期）

## 修复的安全问题

### P0（安全阻断）
| 编号 | 问题 | 修复措施 |
|------|------|---------|
| C-1 | scope/company_id/project_id 无判别联合约束 | `CreateKnowledgeBaseRequest` 改为判别联合类型，编译期阻止非法组合 |
| C-2 | deleted_at 遗漏 + getById 未过滤软删除 | 已在之前修复确认 |
| M-4 | description Zod 2000 vs Prisma 500 | controller 层 description 长度校验从 2000 改为 500 |

### P1（安全加固）
| 编号 | 问题 | 修复措施 |
|------|------|---------|
| H-1 | Update 允许 scope 变更（权限提升） | service impl 新增 sysadmin 权限校验：非 sysadmin 不可变更 scope |
| H-3 | mapKnowledgeBase 使用 any | 替换为 `Prisma.KnowledgeBaseGetPayload` 类型 |
| H-4 | Update 允许 company_id/project_id 变更（跨边界重绑定） | service impl 新增 sysadmin 权限校验 |
| M-3 | service scope 参数使用 string | 改为 `KnowledgeScope` 强类型 |

## 涉及文件
- `apis/entity/knowledge-base.entity.ts` — CreateKnowledgeBaseRequest 改为判别联合
- `apis/controller/knowledge-base.controller.ts` — 适配判别联合 + description 长度修复
- `apis/service/impl/knowledge-base.service.impl.ts` — any 去除 + sysadmin 权限校验 + 强类型
- `tests/apis/knowledge-base.service.test.ts` — 测试用例更新适配新安全规则
