# help.tsx 代码安全专家评审

**日期**: 2026-05-25
**文件**: `tasks/review/help.tsx.security.md`
**类型**: 代码安全专家评审

## 评审结果

**评分**: 5.5/10 — CONDITIONAL APPROVE

## 关键发现

| # | 级别 | 发现 |
|---|------|------|
| H-1 | 🔴 高 | `window.open` 缺少 `noopener` — 反向标签劫持风险（CWE-1021） |
| H-2 | 🟡 中 | `noreferrer` 作为 windowFeatures 可能无实际效果 |
| M-1 | 🟡 中 | 外部 URL 硬编码，消费应用无法自定义或审计（CWE-918） |
| M-2 | 🔵 低 | 弹窗被拦截时静默失败，无降级处理 |

## 修复建议

- 添加 `noopener` 到 `window.open` 特性字符串
- 将 URL 提取为可配置参数
- 检查 `window.open` 返回值提供降级处理

## 消费侧缓解

本项目已通过 `commandsFilter` 机制移除默认 help 命令（见 Editor.common.tsx 评审修复），实际不受影响。
