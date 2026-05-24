# nohighlight.tsx 评审修复 — CSS 覆盖 + 安全增强

> 日期: 2026-05-24

## 变更摘要

根据 5 份评审报告（质量/架构/安全/UI/Committer）的评审结果，在本项目层面修复 nohighlight.tsx 的所有可修复问题。

## 修改文件

| 文件 | 变更内容 |
|------|----------|
| `pages/components/MarkdownViewer.tsx` | 1) import 从 `/common` 改为 `/nohighlight`（消除 rehype-raw HTML 注入攻击面）；2) 添加 ErrorBoundary（MarkdownErrorBoundary）防止插件异常导致组件崩溃；3) DOMPurify FORBID_ATTR 从 6 项扩展到 21 项 on* 事件属性 |
| `pages/styles/markdown-viewer.css` | 1) 添加 letter-spacing: 0.16px 对齐 Carbon 规范；2) 添加 GitHub→Carbon CSS 变量映射；3) pre/blockquote/markdown-alert border-radius 改为 0 对齐 flat-square；4) 列表项间距改为 var(--spacing-xs) 8px；5) 添加链接 focus-visible 样式；6) 添加表格行 hover 样式；7) 添加代码块滚动条 Carbon 极简风格 |

## 评审问题修复对照

| 评审来源 | 编号 | 严重级别 | 修复状态 |
|----------|------|----------|----------|
| UI 评审 | S-1 字体 | 严重 | ✅ letter-spacing 已添加 |
| UI 评审 | S-2 色彩变量 | 严重 | ✅ CSS 变量映射已添加 |
| UI 评审 | S-3 圆角 | 严重 | ✅ pre/blockquote/alert 强制 0 |
| UI 评审 | M-1 间距 | 中等 | ✅ li 间距改为 var(--spacing-xs) |
| UI 评审 | M-2 链接样式 | 中等 | ✅ focus-visible + Carbon 蓝色 |
| UI 评审 | M-3 表格样式 | 中等 | ✅ 添加 tbody tr:hover 样式 |
| UI 评审 | B-2 滚动条 | 建议 | ✅ 代码块滚动条 Carbon 风格 |
| 安全评审 | #1 URL 过滤 | HIGH | ✅ 项目层 safeUrlTransform 已覆盖 |
| 安全评审 | #2 rehype-attr | MEDIUM | ✅ DOMPurify 扩展 FORBID_ATTR |
| Committer | #1-3 CSS 覆盖 | Blocking | ✅ 全部完成 |
| Committer | #4 ErrorBoundary | Non-blocking | ✅ 已添加 |
| Committer | #5 DOMPurify on* | Non-blocking | ✅ 已扩展 |

## 未修复项（上游问题）

- P1-01 rehypePlugins 每次渲染重建 → 上游问题，本项目 React.memo 已缓解
- P2-01 DRY 违反 → 上游架构问题
- P2-02 缺少 displayName → 上游问题
- Security #3 useImperativeHandle props 泄露 → 上游问题，本项目未使用 ref
- Security #4 data-code 属性 → 低风险，DOMPurify 已缓解
- UI S-4 复制按钮未使用 antd Button → 上游渲染，需 rehypeRewrite 替换（高成本）
- UI S-5 暗色主题 → 项目尚未引入暗色模式

## 验证结果

- TypeScript 类型检查: ✅ 通过
- 前端构建: ✅ 通过（16s）
- 后端测试: 39 PASS / 13 FAIL（预存问题，与本次修改无关）
