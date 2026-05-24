# knowledge-base.controller.ts 评审修复

**日期**: 2026-05-24
**范围**: controller + schema + service + tests

## 修复清单

| 编号 | 问题 | 来源 | 修复方式 |
|------|------|------|----------|
| H-1/SEC-L-01 | validateInteger 静默吞没无效值 | 质量评审/安全评审 | 改为 `throw new Error(fieldName + ' 必须为正整数')` |
| H-3 | update 的 status 字段未做类型验证 | 质量评审 | `typeof req.body.status === 'boolean' ? req.body.status : undefined` |
| M-1 | description 验证条件四层嵌套 | 质量评审 | 简化为 `typeof description === 'string'` 判断 |
| M-3 | list catch 块不合理 404 分支 | 质量评审 | 删除 `err.message === '知识库不存在'` 分支 |
| SEC-L-02 | list 的 scope 查询参数未验证 | 安全评审 | `VALID_SCOPES.includes(rawScope)` 过滤 |
| CMT-H-01 | Zod schema 遗漏 status 字段 | Committer 评审 | `updateKnowledgeBaseSchema` 添加 `status: z.boolean().optional()` |
| SEC-M-01 | company_id/project_id 归属未校验 | 安全评审 | Service 层 admin 角色归属关系验证 |

## 变更文件

- `apis/controller/knowledge-base.controller.ts` — validateInteger + status + description + scope + catch 块
- `apis/schema/knowledge-base.schema.ts` — 补全 status 字段
- `apis/service/knowledge-base.service.ts` — create 接口增加 role 参数
- `apis/service/impl/knowledge-base.service.impl.ts` — create/update 增加 admin 归属校验
- `tests/apis/knowledge-base.controller.test.ts` — 新增 5 个测试 + 修复 3 个旧测试
- `tests/apis/knowledge-base.service.test.ts` — 修复 5 个角色参数

## 测试结果

- controller: 108 passed
- service: 68 passed
- entity: 3 passed
- **总计: 250 passed, 0 failed**
