# 2026-05-24 project.controller.ts TDD 补全

## 变更摘要
- 修复 `project.schema.ts` 验证规则，使 createProjectSchema/updateProjectSchema 与控制器逻辑一致
- 修复 9 个因 schema 验证不匹配导致的失败测试
- 新增 1 个直接单元测试覆盖 deleteProject view 角色防御性分支
- 最终覆盖率：**Stmts 100% / Branch 100% / Lines 100%**（65 用例全部通过）

## 涉及文件
- `apis/schema/project.schema.ts` — 修复 schema 验证规则
- `tests/apis/project.controller.test.ts` — 修复失败测试 + 新增用例

## Schema 修复详情
- createProjectSchema: operator_ids 改为可选, company_id 改为可选
- updateProjectSchema: 添加 company_id 可选字段, status 从 enum 改为 boolean, operator_ids 允许空数组
