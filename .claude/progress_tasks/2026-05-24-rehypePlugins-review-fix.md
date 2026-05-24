# rehypePlugins.tsx 评审修复

**日期**: 2026-05-24
**关联评审**: rehypePlugins.tsx 五份评审（质量 5.8/10、架构 5.0/10、安全 3.5/10、UI 2.5/10、Committer 5.5/10）

## 修复内容

### 一、第三方库修复 — patch-package 补丁

**文件**: `patches/@uiw+react-markdown-preview+5.2.1.patch`

| 评审编号 | 级别 | 问题 | 修复 |
|----------|------|------|------|
| P0-1 (质量) | P0 | 正则 `/h(1|2|3|4|5|6)/` 未锚定，匹配 `thead` | `HEADING_TAGS` Set 精确匹配 |
| P0-2 (质量) | P0 | `as Element` 不安全类型断言 | `child?.type === 'element'` 类型守卫 |
| P0-3 (质量/SEC-01) | P0 | `data-code` 属性注入 XSS | `escapeHtmlAttr()` HTML 实体编码 |
| P2-3 (质量/SEC-05) | P2 | rewrite 回调无异常边界 | try-catch 包裹 |
| P3-2 (质量) | P3 | `index === null ? undefined : index` 冗长 | `index ?? undefined` |

### 二、MarkdownViewer 封装层加固

**文件**: `pages/components/MarkdownViewer.tsx`

| 评审编号 | 级别 | 问题 | 修复 |
|----------|------|------|------|
| C-03 (Committer/PERF-1) | P1 | 每次渲染创建新闭包触发管线重建 | React.memo 包裹 |
| UI-P1-03 (UI) | P1 | 复制按钮无 a11y（无 role/tabindex/aria-label） | rehypeRewrite 注入 ARIA 属性 |
| SEC-03 (安全) | P1 | 单代码块无长度限制 DOM 膨胀 | 100KB 上限，超长移除 data-code |
| UI-P2-04 (UI) | P2 | 标题锚点始终可见不符合 Carbon 规范 | CSS opacity + hover 显示 |

### 三、CSS a11y 样式

**文件**: `pages/styles/markdown-viewer.css`

- `.copied:focus-visible` — Carbon 2px primary 色聚焦环
- `.anchor` opacity + hover transition — 标题锚点 hover 时显示

## 测试结果

- MarkdownViewer 测试: 54 passed
- 前端构建: 成功
- 后端构建: 成功
