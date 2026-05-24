# 2026-05-24 knowledge-base.controller.ts TDD 补全（第五轮）

## 变更摘要
- 修复 `createKnowledgeBase` 未传递 `role` 参数的安全 bug
- 新增 5 个测试用例覆盖未覆盖的 catch 分支（line 36, 96, 149）
- 达到 113 个测试 100% 覆盖率

## 修改文件
- `apis/controller/knowledge-base.controller.ts` — create 方法补充 `role` 参数传递
- `tests/apis/knowledge-base.controller.test.ts` — 新增 5 个测试
- `tasks/tdd/knowledge-base.controller.test.md` — 更新 TDD 报告

## 发现的 Bug
- `createKnowledgeBase` 调用 `knowledgeBaseService.create()` 时只传了 `userId`，缺少 `role` 参数
- 导致 admin 创建知识库时完全跳过 service 层的归属校验（无权关联该公司/项目）
- 其他 4 个端点（list/getById/update/delete）均正确传递了 `role`

## 覆盖率
- 113 tests, 100% Statements/Branches/Functions/Lines
