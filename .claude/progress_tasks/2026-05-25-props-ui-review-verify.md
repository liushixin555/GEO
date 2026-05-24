# Props.tsx UI 评审验证（2026-05-25）

## 任务

基于 `tasks/review/Props.tsx.ui.md`（UI 专家评审，综合评分 4.1/10），验证所有 UI 评审修复项在项目代码中是否已完整实现。

## 验证结果

### P1 严重问题（全部已修复）

- UI-P1-01 `data-color-mode` 缺 auto → ✅ MarkdownViewer colorMode='auto' + useSystemColorMode hook
- UI-P1-02 无 a11y props → ✅ ariaLabel/role/tabIndex/rehypeRewrite ARIA 注入
- UI-P1-03 warpperElement 弃用属性 → ✅ 仅使用正确 wrapperElement

### P2 中等问题（全部已修复）

- UI-P2-01 wrapperElement 类型过复杂 → ✅ 简化为 { 'data-color-mode': resolvedColorMode }
- UI-P2-02 disableCopy 否定式命名 → ✅ 不暴露第三方 prop
- UI-P2-03 source 命名模糊 → ✅ 封装层使用 content 映射到 source
- UI-P2-04 缺加载/错误/空状态 → ✅ loading/error/emptyText + antd 组件
- UI-P2-05 事件不完整 → ✅ onClick/onKeyDown/onMouseEnter/onMouseLeave
- UI-P2-06 prefixCls 泄漏 → ✅ 封装层不暴露

### P3 轻微问题（关键项已修复）

- UI-P3-03 Ref 暴露全部 Props → ✅ 仅暴露 scrollToTop() + scrollToAnchor()
- UI-P3-04 onMouseOver → ✅ 使用不冒泡的 onMouseEnter/onMouseLeave

### Carbon Design System CSS 覆盖（全部已实现）

- 链接色/圆角/字体/字间距/暗色模式/响应式/WCAG 焦点全覆盖

### 供应链确认

- react-markdown: 10.1.0 ✅
- @uiw/react-markdown-preview: ~5.2.1 ✅
- dompurify: ^3.4.5 ✅

## 构建和测试验证

- pnpm build: ✅ 通过
- pnpm lint: ✅ 通过
- MarkdownViewer 测试: 79/79 通过

## 结论

Props.tsx UI 评审（4.1/10）中所有 P1/P2 项均已在 MarkdownViewer.tsx 和 markdown-viewer.css 中实现。无需额外代码修改。
