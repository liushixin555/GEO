# 2026-05-25 publishing-schedule.controller.ts R3 评审修复

## 变更摘要
基于 R2 架构评审 + Committer 评审 + 质量评审，修复 4 个问题（H-1 验证冗余 + M-1 常量重复 + M-2 list 错误处理 + R2-1 常量位置不一致）

## 变更文件
- `apis/controller/publishing-schedule.controller.ts` — 移除重复验证、引入共享常量、统一错误处理
- `apis/constants/publish-statuses.ts` — 新建共享常量 PUBLISH_STATUSES
- `apis/service/impl/publishing-schedule.service.impl.ts` — 引用共享常量
- `tests/apis/publishing-schedule.controller.test.ts` — 更新 12 个测试用例
- `tasks/review/publishing-schedule.controller.fix.md` — 追加 R3 修复记录

## 测试结果
- 253 tests passed, 0 failed
- TypeScript build: passed
- ESLint: passed
