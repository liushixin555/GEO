# useCopied.tsx Committer 评审修复

**日期**: 2026-05-26
**评审文件**: `tasks/review/useCopied.tsx.committer.md`
**关联文件**:
- `patches/@uiw__react-markdown-preview@5.2.1.patch` — pnpm patch 补丁（src/esm/lib 三版同步）
- `pages/styles/markdown-viewer.css` — CSS Carbon 覆盖（已有）
- `pages/components/MarkdownViewer.tsx` — 消费方组件（已有）

## 修复项

### Committer 评审 3 项阻塞（合并前必须完成）

| # | 问题 | 状态 | 说明 |
|---|------|------|------|
| 1 | `.copied.active` 背景色未对齐 Carbon | ✅ 已修复 | `var(--color-primary)` 覆盖 |
| 2 | `.copied` 圆角未强制为 0 | ✅ 已修复 | `border-radius: 0 !important` |
| 3 | 复制反馈无文字提示 | ✅ 已修复 | CSS `::after` + `--copy-text-copied: '已复制'` |

### Committer 评审 5 项建议改进（合并后排期）

| # | 问题 | 状态 | 说明 |
|---|------|------|------|
| 4 | 剪贴板操作无错误处理 | ✅ 已修复 | pnpm patch: try-catch + `.copy-failed` class + "复制失败" 文字反馈 |
| 5 | 缺少可访问性通知 | ✅ 已修复 | pnpm patch: `aria-label` 动态更新 + CSS `sr-only` + `aria-live="polite"` |
| 6 | 复制图标样式与 Carbon 不一致 | ✅ 已修复 | CSS: Carbon SVG 图标替代 GitHub Octicon |
| 7 | 反馈持续时长硬编码 2000ms | ⚠️ 上游限制 | 无法修改，CSS transition 部分缓解 |

### pnpm patch 源码修复（6项）

| 修复项 | 说明 |
|--------|------|
| 递归→迭代 `getParentElement` | `MAX_DOM_DEPTH=20` while 循环，防止深层 DOM 栈溢出 |
| 错误处理 | try-catch + `copy-failed` class + 红色错误反馈 |
| useCallback 稳定引用 | 消除每次渲染重建函数引用 |
| setTimeout 清理 | `timeoutRef` + cleanup 函数 clearTimeout |
| 防重复点击 | active/copy-failed 状态中不重复触发 |
| aria-live 动态通知 | `aria-label` 在 复制/成功/失败 状态间切换 |

## 验证

- `pnpm build` — 通过
- `pnpm lint` — 通过
- useCopied 测试 — 27 项全通过
- patch 已持久化到 `patches/@uiw__react-markdown-preview@5.2.1.patch`
