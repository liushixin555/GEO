# company.entity Committer 评审修复验证

**日期**: 2026-05-26
**关联评审**: `tasks/review/company.entity.committer.md`

## 修复概要

Committer 评审报告（APPROVE）中所有 P1 和 P2 修复项已在先前迭代中完成，本次任务验证并恢复评审文件。

## 已验证修复项

| 优先级 | 问题 | 修复方案 | 状态 |
|--------|------|----------|------|
| P1 | Entity 缺少 `deleted_at` 字段 | Company 接口添加 `deleted_at: Date \| null`，Map 层同步补全 | ✅ |
| P1 | 缺少 Zod Schema | 新建 `apis/schema/company.schema.ts` | ✅ |
| P1 | Service 层 `operator_ids` 无校验 | Service `validateUserIds` 校验 | ✅ |
| P2 | Service 层 N+1 循环更新 | 改为 `updateMany` 批量操作 | ✅ |
| P2 | Map 层 `any` 输入类型 | 改为 `PrismaCompany` 类型 | ✅ |
| P2 | `operator_ids`/`viewer_ids` 添加 JSDoc | 已添加全量替换语义注释 | ✅ |

## 技术债务（P3，暂不处理）

- Company/Project 关联范式统一
- `CompanyDetail` 跨领域聚合拆分
- Create/Update 接口分化
- 提取 `UserSummary` 共享类型
- 评估 `BaseEntity` 泛型

## 测试结果

- company 相关测试：4 套件 569 用例，全部通过
- company.entity 测试：1 套件 180 用例，全部通过
- build + lint 通过

## 关联文件

- `apis/entity/company.entity.ts`
- `apis/map/index.ts`
- `apis/schema/company.schema.ts`
- `apis/service/impl/company.service.impl.ts`
- `tests/apis/company.entity.test.ts`
- `tasks/review/company.entity.committer.md`（从 git 历史恢复）
