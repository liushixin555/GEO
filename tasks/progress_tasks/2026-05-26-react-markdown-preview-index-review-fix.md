# 修复记录：react-markdown-preview index.tsx UI评审修复

**日期**: 2026-05-26
**关联评审**: `tasks/review/react-markdown-preview.index.tsx.ui.md`
**修复文件**: `patches/@uiw+react-markdown-preview+5.2.1.patch`

## 修复概要

对 `@uiw/react-markdown-preview` 的 `index.tsx`（主入口）应用 UI 评审修复，覆盖所有 6 个入口文件（ESM/CJS x index/common/nohighlight）。

## 修复内容

### 性能修复
- **UI-P2-01**: 插件数组使用 `useMemo` 稳定化，避免每次渲染重建
- **UI-P3-01**: `rehypeRewriteHandle` 闭包使用 `useMemo` 稳定化

### 渲染管线修复
- **UI-P2-03**: forwardRef 中强制 `skipHtml: true`，阻止 preview.tsx 重复添加 rehype-raw
- **A-02**: 提取 `buildCommonPipeline` 纯函数，渲染管线与组件逻辑分离
- **A-07**: 提取 `REHYPE_ATTRS_CONFIG` 共享常量

### 开发体验修复
- **UI-P2-04**: 添加 `displayName = 'MarkdownPreviewHighlighted'`
- **A-03**: 添加 `PipelineConfig`（prepend/append），支持 OCP 扩展

### Props 类型修复
- `src/Props.tsx`: 添加 `PipelineConfig` 接口 + `pipeline` 属性
- `MarkdownPreviewRef`: 收窄为仅暴露 `mdp` 引用

## 修改文件列表

| 文件 | 说明 |
|---|---|
| `src/index.tsx` | TypeScript 源码修复 |
| `src/Props.tsx` | PipelineConfig 类型添加 |
| `esm/index.js` | ESM 主入口编译 |
| `esm/common.js` | ESM common 入口（已有，同步更新） |
| `esm/nohighlight.js` | ESM nohighlight 入口 |
| `lib/index.js` | CJS 主入口编译 |
| `lib/common.js` | CJS common 入口编译 |
| `lib/nohighlight.js` | CJS nohighlight 入口编译 |
| `patches/@uiw+react-markdown-preview+5.2.1.patch` | patch 文件重新生成 |

## 验证

- `pnpm build`: ✅ 通过
- `pnpm lint`: ✅ 通过
- `pnpm test`: ⚠️ OOM（预存环境问题）
