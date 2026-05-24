# useCopied.tsx UI 专家评审

**日期**: 2026-05-24
**类型**: 评审

## 变更内容

- 新增 `tasks/review/useCopied.tsx.ui.md` — 软件UI专家评审报告
- 评审对象: `@uiw/react-markdown-preview/src/plugins/useCopied.tsx`（36 行）
- 综合评分: **2.7/10**

## 主要发现

| 级别 | 数量 | 关键问题 |
|------|------|----------|
| P1 严重 | 3 项 | 无可访问性反馈（aria-live）、剪贴板失败仍显示成功、反馈时间硬编码 |
| P2 中等 | 4 项 | DOM 操作绕过 React 状态、绕过 antd message、handle 引用不稳定、递归无深度限制 |
| P3 轻微 | 4 项 | 无防抖保护、data-code 语义模糊、冗余 removeEventListener、React 19 兼容 |

## 集成建议

- CSS 补充 `.copied.active::after` 视觉反馈（"已复制" Carbon 风格提示）
- 关键场景考虑 `disableCopy={true}` + antd `message.success()` 自定义实现
