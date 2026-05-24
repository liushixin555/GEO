# group.tsx 评审封装层修复

> 日期：2026-05-25
> 评审来源：tasks/review/group.tsx*.md（5 份）

## 修改摘要

根据 5 份评审报告（质量 5.0/10、安全 3.2/10 FAIL、架构 4.5/10、UI 不合规、Committer 5.5/10 CONDITIONAL APPROVE），对 `@uiw/react-md-editor` 的 `group.tsx` 进行封装层修复。

## 修改文件

| 文件 | 变更 |
|------|------|
| `pages/components/MarkdownEditor.tsx` | +FontSizeOutlined 导入 +commandsFilter group 命令处理 +annotateToolbar 下拉菜单 ARIA |
| `pages/styles/markdown-editor.css` | +Carbon 下拉菜单样式 +@media (pointer: coarse) 48px 规则 |
| `tests/pages/components/MarkdownEditor.test.tsx` | +FontSizeOutlined mock +5 个 group 测试用例 |
| `tasks/fix.Bug修复汇总.md` | +fix028 条目 |
| `tasks/fix.group命令评审修复.md` | 新建修复文档 |
| `.claude/progress.md` | +变更索引 |

## 修复项

1. **P1 ARIA 无障碍**: commandsFilter 注入 `aria-label`/`aria-haspopup`/`title`，annotateToolbar 注入 `role="menu"`/`role="menuitem"`
2. **P2 图标替换**: 12px 内联 SVG → antd `FontSizeOutlined` (16px)
3. **P2 Carbon 下拉菜单**: CSS 覆盖 `.w-md-editor-toolbar-child`（flat border-radius、阴影、焦点环）
4. **P1 触摸目标**: `@media (pointer: coarse)` 工具栏按钮和下拉菜单项 48px

## 测试

17 个 MarkdownEditor 测试全通过（12 原有 + 5 新增 group 测试）
