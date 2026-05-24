# 2026-05-24 publishing-schedule.controller.ts 安全评审修复

## 变更文件
- apis/controller/publishing-schedule.controller.ts - H-1: list catch不再返回err.message; L-1: 两个catch块添加console.error审计日志
- tests/apis/publishing-schedule.controller.test.ts - 更新测试：list service抛错后期望固定消息

## 测试结果
- 112个测试全部通过, Build成功
