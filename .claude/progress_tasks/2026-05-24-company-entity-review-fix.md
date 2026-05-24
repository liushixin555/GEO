# company.entity.ts 评审修复验证

**日期**: 2026-05-24
**基于评审**: 软件架构专家、代码安全专家、Committer 审核专家

## 验证结果

基于 `tasks/review/company.entity.fix.md` 修复报告，逐项验证所有修复：

| 修复项 | 状态 |
|--------|------|
| Entity 补全 deleted_at 字段 | ✅ |
| Map 层 PrismaCompany 类型替代 any | ✅ |
| Map 层 deleted_at 映射 | ✅ |
| Zod Schema 创建（company.schema.ts） | ✅ |
| Controller 使用 validate 中间件 | ✅ |
| Service 软删除过滤（list/getById/toggleStatus） | ✅ |
| Service validateUserIds 校验 | ✅ |
| Service 批量 updateMany 替代 N+1 | ✅ |

## 额外修复
- 移除 company.service.impl.ts 中未使用的 eslint-disable 指令

## 构建与测试
- pnpm build: ✅ 通过
- pnpm lint: ✅ 通过
- company 相关测试: 362 用例全通过（4 套件）
