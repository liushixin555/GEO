---
name: publishing-platform-controller-review-fix
description: publishing-platform.controller.ts 多轮评审修复记录——修复项和模式
metadata:
  type: project
---

publishing-platform.controller.ts 多轮评审修复（2026-05-25）

**Why**: 6份评审报告共发现 HIGH×3 + MEDIUM×5 + LOW×2 问题需要修复

**修复的关键模式**:
- `(req as any).user` → `req.user`：全局 AuthPayload 类型已扩展到 Express.Request，无需 as any
- 字符串匹配错误分派 → `BusinessError` + `instanceof`：service 层 throw BusinessError，controller 用 instanceof 判断
- sync 并发控制：模块级 `syncLock` 布尔互斥锁 + `try/finally` 保证释放
- query 参数安全：`qp()` 辅助函数处理 `string | string[]` 情况
- 错误消息脱敏：list 操作 catch 块统一返回通用消息 + logger.error 记录详情

**How to apply**: 其他 controller 评审修复时参考此模式，特别是 BusinessError 替代字符串匹配、qp 数组防护、审计日志三段式模式
