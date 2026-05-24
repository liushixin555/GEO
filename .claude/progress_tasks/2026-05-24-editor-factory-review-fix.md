# Editor.factory.tsx 评审修复 — 封装层加固

**日期**: 2026-05-24
**任务**: 根据 5 份专家评审报告（架构/质量/安全/UI/Committer），修复 Editor.factory.tsx 评审问题

## 变更内容

### MarkdownEditor.tsx 封装层加固
- REQ-4: 新增 MarkdownEditorErrorBoundary（antd Empty 组件），防止渲染崩溃白屏
- REQ-6: 容器添加 role="application" + aria-label，拖拽条添加 role="separator" + aria-orientation
- REQ-2: 组件卸载时清理 textareaWarp DOM 和容器 ref 引用
- OPT-5: handleContainerClick stopPropagation 防止点击冒泡到 antd Form
- 工具栏 ARIA 从每次渲染 useEffect 改为 MutationObserver + cleanup

### markdown-editor.css 补充
- [role="application"]:focus-within 焦点环
- 拖拽条 cursor/touch-action/focus-visible 样式

## 涉及文件
- `pages/components/MarkdownEditor.tsx`
- `pages/styles/markdown-editor.css`
- `tasks/fix.Editor.factory评审修复.md`

## 验证
- TypeScript 类型检查通过
- 74 个 MarkdownViewer 测试通过
