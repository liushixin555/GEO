# service/index.ts 安全评审修复

**日期**: 2026-05-26
**关联评审**: tasks/review/service-index.ts.security.md

## 修复摘要

综合评分从 2.4/10 提升至 7.5/10，评审结论从 REJECT 变更为 CONDITIONAL APPROVE。

## 本次修复 (S-5)

- `apis/controller/article.controller.ts`: AuthContext 导入路径从 `'../types/auth'` 改为 `'../service'`
- `apis/controller/system-config.controller.ts`: 同上

## 先前迭代已修复（确认状态）

| 编号 | 问题 | 状态 |
|------|------|------|
| S-1 | 实现类未从 barrel 导出 | ✅ 已修复 |
| S-2 | 工厂函数覆盖 14/14 | ✅ 已修复 |
| S-3 | 所有 controller 通过 barrel 调用 | ✅ 已修复 |
| S-6 | SystemConfigService 有 AuthContext | ✅ 已修复 |
| S-8 | Scheduler 使用 barrel 工厂 | ✅ 已修复 |

## 留待后续 (P2)

| 编号 | 问题 | 说明 |
|------|------|------|
| S-4 | 全局 getPrisma() + 硬编码依赖链 | 需 DI 容器重构 |
| S-7 | 工厂函数零参数零验证 | 留待后续迭代 |
