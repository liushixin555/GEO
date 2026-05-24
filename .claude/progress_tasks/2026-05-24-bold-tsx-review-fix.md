# bold.tsx 评审封装层修复

**日期**: 2026-05-24
**评审来源**: tasks/review/bold.tsx.md (安全 8.0) + bold.tsx.ui.md (UI 4.3) + bold.tsx.committer.md (Committer 8.0)

## 修复内容

### I18N-01 (P2) — 英文 aria-label/title 未被中文覆盖
- **根因**: `MarkdownEditor.tsx` 的 `annotateToolbar` 中 `if (btn.getAttribute('aria-label')) return` 导致已有英文 `aria-label` 的按钮（bold/italic/strikethrough 等）被跳过
- **修复**: 移除早期返回，始终匹配 `title` 内容并覆盖 `aria-label` + `title` 为中文
- **文件**: `pages/components/MarkdownEditor.tsx`

### A-02 (P3) — SVG 缺少 aria-hidden
- **修复**: `annotateToolbar` 中新增 `querySelectorAll('button svg')` 遍历，注入 `aria-hidden="true"`
- **文件**: `pages/components/MarkdownEditor.tsx`

### V-01 (P3) — SVG 图标尺寸偏小
- **修复**: CSS 覆盖 `.w-md-editor-toolbar button svg { width: 16px; height: 16px }`
- **文件**: `pages/styles/markdown-editor.css`

### R-01 (P3) — 移动端触摸目标不足
- **修复**: `@media (max-width: 672px)` 从 `min-height: 40px` → `44px`（WCAG AAA）
- **文件**: `pages/styles/markdown-editor.css`

## 未修复项（第三方库内部，需源码修改）

- S1/S2 (MEDIUM): `prefix!` 非空断言 — 运行时安全（bold 硬编码 prefix='**'），不阻塞
- UX-01 (P3): 快捷键提示 "ctrl" 未区分平台 — 需修改源码
- UX-02 (P2): 原生 title 替代 antd Tooltip — CSS 仅能部分缓解
- V-02 (P3): FontAwesome 实心风格与 Carbon 不一致 — 需修改源码替换图标
