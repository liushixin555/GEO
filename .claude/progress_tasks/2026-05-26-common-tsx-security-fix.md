# common.tsx 安全评审修复

**日期**: 2026-05-26
**评审文件**: `tasks/review/common.tsx.security.md`
**修复范围**: @uiw/react-markdown-preview 第三方库 patch

## 修复项

### H-1 [HIGH]: rehypeRaw 无条件包含
- **问题**: rehypeRaw 始终在管线中，即使 skipHtml=true（默认）也解析 HTML
- **修复**: `...(props.skipHtml === false ? [rehypeRaw] : [])` 条件化
- **文件**: common.tsx + esm/common.js + lib/common.js

### H-2 [HIGH]: 双重 rehype-raw 执行
- **问题**: common.tsx 包含 rehypeRaw + preview.tsx 在 skipHtml=false 时也 push raw
- **修复**: preview.tsx 添加 `hasRaw` 去重检查
- **文件**: preview.tsx + esm/preview.js + lib/preview.js

### L-2 [LOW]: useMemo 依赖数组缺少 skipHtml
- **问题**: skipHtml 变化时管线不更新
- **修复**: 依赖数组添加 `props.skipHtml`

## 不修复项（ACCEPTED RISK）
- M-1: rehypePlugins 注入 — MarkdownViewer 不传入自定义插件
- M-2: pipeline.prepend 前置 — MarkdownViewer 不使用 pipeline
- L-1: rehypeAttrs 属性注入 — DOMPurify FORBID_ATTR 纵深防御

## 修改文件
- `patches/@uiw+react-markdown-preview+5.2.1.patch`（重新生成）

## 验证
- pnpm build ✅
- pnpm lint ✅
- MarkdownViewer 测试: 122/122 ✅
- rehypePlugins 测试: 23/23 ✅
