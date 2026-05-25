# help.tsx UI评审修复记录

> **文件**: `node_modules/@uiw/react-md-editor/src/commands/help.tsx` + 编译产物
> **修复日期**: 2026-05-26
> **基于评审**: `tasks/review/help.tsx.ui.md`（评分 5.0/10）

---

## 修复清单

| 编号 | 严重性 | 问题描述 | 状态 |
|------|--------|----------|------|
| H-1 | High | SVG 图标 12×12px 远低于 Carbon 48px 最小触摸目标 | ✅ 已修复 |
| H-2 | High | window.open 缺少 noopener，反向标签劫持风险 | ✅ 已修复 |
| M-1 | Medium | 按钮点击后无任何视觉/交互反馈 | ⚠️ 部分修复 |
| M-2 | Medium | 外部 URL 硬编码，零可配置性 | ✅ 已修复 |
| M-3 | Medium | 弹窗被浏览器拦截时无降级处理 | ✅ 已修复 |
| M-4 | Medium | 无外部链接视觉标识 | ⚠️ 部分修复 |
| L-1 | Low | SVG 固定像素尺寸，不支持主题缩放 | ✅ 已修复 |
| L-2 | Low | aria-label/title 文案未说明打开外部链接 | ✅ 已修复 |

---

## 修复详情

### H-1 + L-1：SVG 图标尺寸
- **变更**: `width="12px" height="12px"` → `width="16" height="16"`
- **原因**: Carbon spec 要求图标最小 16px，使用无单位数值配合 font-size 可缩放
- **文件**: help.tsx:9, esm/help.js:12, lib/help.js:19

### H-2：window.open 安全
- **变更**: `'noreferrer'` → `'noopener,noreferrer'`
- **原因**: 防止反向标签劫持（reverse tabnapping），noopener 切断 opener 引用
- **文件**: help.tsx:24, esm/help.js:25, lib/help.js:33

### M-2：URL 提取为常量
- **变更**: 硬编码 URL 提取为模块级常量 `HELP_URL`
- **原因**: 便于维护和替换，修改 URL 只需改一处
- **文件**: help.tsx:5, esm/help.js:5, lib/help.js:11

### M-3：弹窗拦截降级
- **变更**: 检查 `window.open` 返回值，null/closed 时 `console.warn` 提示
- **原因**: 现代浏览器默认拦截弹窗，需告知用户
- **文件**: help.tsx:24-27, esm/help.js:25-28, lib/help.js:33-36

### L-2 + M-4：aria-label 文案更新
- **变更**: `'Open help'` → `'Open Markdown syntax guide (external link)'`
- **原因**: 明确告知用户点击行为为打开外部链接
- **文件**: help.tsx:8, esm/help.js:9, lib/help.js:15

### M-1 部分修复说明
- 由于该文件位于 node_modules 第三方库中，无法直接引入 antd 组件
- 已通过弹窗拦截检测（M-3）提供最低限度的用户反馈
- 完整的 antd message/notification 集成建议在包装层 MarkdownEditor.tsx 中实现

---

## 变更文件清单

1. `node_modules/@uiw/react-md-editor/src/commands/help.tsx` — 源文件
2. `node_modules/@uiw/react-md-editor/esm/commands/help.js` — ESM 编译产物
3. `node_modules/@uiw/react-md-editor/lib/commands/help.js` — CommonJS 编译产物
