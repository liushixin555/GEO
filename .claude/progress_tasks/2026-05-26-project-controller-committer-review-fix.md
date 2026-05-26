# project.controller.ts Committer 评审修复

**日期**: 2026-05-26
**评分**: 7.2→8.5/10 CONDITIONAL APPROVE→APPROVE

## 修复项
- H-1: admin 无 companyId 返回 403（非 fallback 到 body）
- H-2: admin 不能修改项目 status（只有 sysadmin）
- M-2: 移除冗余 Number() 转换
- M-3: destructiveActionLimiter 别名替代 articleActionLimiter
- L-2: Zod schema description 空字符串 transform

## 测试
- project: 630 passed
- 全量: 10404 passed（72 failed 为 rmapi 既有问题）
