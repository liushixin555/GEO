# Editor.factory.tsx UI 评审修复第三轮（2026-05-26）

## 变更摘要

基于 `tasks/review/Editor.factory.tsx.ui.md` UI 评审报告的 P1 建议项，实施第三轮修复。

## 修复内容

### P1-4: 响应式模式切换
- `pages/components/MarkdownEditor.tsx`: 新增 `isNarrowScreen` state + `matchMedia('(max-width: 672px)')` 检测
- 窄屏时 `effectivePreview` 强制为 `'edit'`，避免 live/preview 模式 50/50 分栏在窄屏不可用
- 宽屏时使用 props 传入的 preview 值

### P1-3: 滚动性能优化
- `pages/styles/markdown-editor.css`: `.w-md-editor-content` 添加 `overflow-anchor: none`
- 上游 handleScroll 高频 dispatch 是上游架构问题，无法在 wrapper 层有效节流
- CSS 方案缓解浏览器滚动锚定行为，降低渲染负担

### 测试同步修复
- `tests/pages/components/MarkdownEditor.test.tsx`:
  - heading 字号测试 H4:12→13, H5:11→12, H6:11（对齐 title5.tsx 评审修复后的查找表）
  - 新增 2 个响应式模式切换测试（窄屏/宽屏 matchMedia）

## 涉及文件

| 文件 | 变更类型 |
|------|---------|
| `pages/components/MarkdownEditor.tsx` | 新增 responsiveMode state + effectivePreview |
| `pages/styles/markdown-editor.css` | overflow-anchor 优化 |
| `tests/pages/components/MarkdownEditor.test.tsx` | 测试同步 + 新增响应式测试 |
| `tasks/review/Editor.factory.tsx.ui.md` | 从 git 历史恢复评审文件 |
| `tasks/fix.Editor.factory评审修复.md` | 追加第三轮修复记录 |

## 验证结果

- pnpm build ✅
- pnpm lint ✅
- MarkdownEditor 169 测试全通过 ✅（+4 新增/修复）
