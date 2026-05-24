# Context.tsx 评审修复记录

**日期**: 2026-05-24
**关联评审**: tasks/review/Context.tsx.{quality,architecture,security,ui,committer}.md
**综合评分**: 3.4/10（5份评审）

## 修复策略

Context.tsx 是 `@uiw/react-md-editor@4.1.0` 第三方库内部文件，不可直接修改。
采用 Committer 评审裁定的方案：创建项目级封装组件隔离所有已知缺陷。

## MC-1：封装组件（P0 已完成）

- **新增**: `pages/components/MarkdownEditor.tsx`
- 严格接口 `MarkdownEditorProps`（无 any）
- antd Form.Item 兼容（value + onChange）
- ref 不暴露编辑器内部 DOM 引用
- forwardRef + useImperativeHandle 暴露 `getSanitizedHTML()` / `getRawMarkdown()` / `focus()`

## MC-2：安全防护（P0 已完成）

- 复用 `MarkdownViewer.tsx` 的 `safeUrlTransform` + `SAFE_TAGS`
- 通过 DOMPurify 对提交内容消毒（`getSanitizedHTML()`）
- 2MB 内容长度截断防止 DoS
- previewOptions 传入安全过滤，预览区 XSS 防护
- 外部无法访问编辑器内部 DOM 引用

## MC-3：样式对齐（P1 已完成）

- **新增**: `pages/styles/markdown-editor.css`
- 工具栏、编辑区、预览区全面覆盖 Carbon Design System：
  - IBM Plex Sans 字体
  - IBM Plex Mono 代码字体
  - CSS 变量引用 (--color-ink, --color-hairline, --color-primary 等)
  - 圆角 0（Carbon flat-square 风格）
  - 无 box-shadow（Carbon 卡片风格）

## MC-4：类型安全（P1 已完成）

- `MarkdownEditorProps` 接口无 any
- `MarkdownEditorRef` 接口无 any
- `EditorPreviewMode` 精确字面量联合类型
- 所有回调参数类型明确
- DOMPurify 返回值类型安全

## 重构

- `ArticleContentEditor.tsx` 从直接使用 `MDEditor` 改为使用 `MarkdownEditor` 封装组件
- 移除了 `safeUrlTransform` 和 `SAFE_TAGS` 的直接导入（封装组件内部处理）
- `pages/components/index.ts` 新增 MarkdownEditor 导出

## 隔离的缺陷清单

| 缺陷 | 严重性 | 隔离措施 |
|------|--------|---------|
| [key: string]: any 索引签名 | P0 | 封装层不导出 ContextStore |
| Reducer 无 Action 区分 | P0 | 封装层提供 onChange 回调 |
| DOM 引用暴露在 Context | P1 | ref 内部隔离，不暴露 |
| dispatch 混入 state | P1 | 封装层提供受控 value/onChange |
| 零主题支持 | P0 | CSS 变量覆盖 Carbon 样式 |
| 默认值不完整 | P2 | 封装层提供安全默认值 |
