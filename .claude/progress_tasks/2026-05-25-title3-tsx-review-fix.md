# title3.tsx 评审修复

**日期**: 2026-05-25
**文件**: `pages/components/MarkdownEditor.tsx`
**评审来源**: `tasks/review/title3.tsx.committer.md` (Committer 审核专家 — 有条件通过)

## 修复内容

基于 5 份评审报告（架构/安全/质量/UI/Committer），在 `MarkdownEditor.tsx` 封装层修复 4 项问题：

### Blocking 修复（Committer 要求合并前必须完成）

| # | 问题 | 修复方案 |
|---|------|----------|
| 1 | Ctrl+1-6 快捷键未被 `preventBrowserShortcut` 拦截，用户按 Ctrl+3 时浏览器切换标签页 | 在 `preventBrowserShortcut` 中添加数字键 1-6 的拦截（`new Set(['1'..'6'])`） |
| 2 | heading 图标 span 未声明 IBM Plex Sans 字体，与 Carbon Design System 不一致 | 添加 `fontFamily: "'IBM Plex Sans', sans-serif"` |
| 3 | H5(10px)/H6(8px) 图标字号过小，低于视觉可读阈值 | 将 `20 - levelNum * 2` 改为 `Math.max(12, 20 - levelNum * 2)` |

### Non-blocking 改进

| # | 问题 | 修复方案 |
|---|------|----------|
| 4 | heading 图标 span 缺少 `role="img"` + `aria-hidden`，屏幕阅读器冗余播报 | 添加 `role="img" aria-hidden="true"` |

## 验证结果

- `pnpm build`: 通过
- `pnpm lint`: 通过
- `pnpm test`: App.test.tsx 2 项既有失败（ErrorBoundary，与本次无关）+ OOM（系统内存）

## 影响文件

- `pages/components/MarkdownEditor.tsx` — 唯一修改文件
