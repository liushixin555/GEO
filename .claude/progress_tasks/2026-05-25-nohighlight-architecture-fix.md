# nohighlight.tsx 架构评审修复

**日期**: 2026-05-25
**变更类型**: 架构修复（patch-package）
**评审文档**: `tasks/review/nohighlight.tsx.architecture.md`

## 修复概要

基于 `nohighlight.tsx` 软件架构专家评审报告（5.3/10 CONDITIONAL APPROVE），修复全部 7 项架构问题。

## 修复项

| 编号 | 级别 | 问题 | 修复方案 | 状态 |
|------|------|------|----------|------|
| A1 | 🔴 高 | 变体通过复制实现，违反 OCP | PipelineConfig.prepend/append（已有） | ✅ 已有 |
| A2 | 🟡 中 | 入口层与配置层职责未分离 | 提取 `buildNoHighlightPipeline`/`buildCommonPipeline`/`buildFullPipeline` 纯函数 | ✅ 修复 |
| A3 | 🟡 中 | Props 透传导致数据流模糊（幽灵 prop） | 解构 `disableCopy`/`rehypeRewrite`/`rehypePlugins`/`pipeline`，仅透传 `restProps` | ✅ 修复 |
| A4 | 🟡 中 | 缺少 useMemo | 已有 useMemo | ✅ 已有 |
| A5 | 🟡 中 | 插件顺序依赖未文档化 | 管线顺序注释（已有） | ✅ 已有 |
| A6 | 🟢 低 | forwardRef 缺少 displayName | 已有 displayName | ✅ 已有 |
| A7 | 🟢 低 | rehype-attr 配置硬编码 | 提取 `REHYPE_ATTRS_CONFIG` 常量 | ✅ 修复 |

## 修改文件

### patch 文件
- `patches/@uiw+react-markdown-preview+5.2.1.patch` — 重新生成

### 修改的库文件（via patch-package）
- `src/nohighlight.tsx` — A2 纯函数 + A3 props 解构 + A7 常量
- `src/common.tsx` — 同步 A2 + A3 + A7
- `src/index.tsx` — 同步全部修复（此前完全未修复）
- `esm/nohighlight.js` — 同步 ESM 编译产物
- `esm/common.js` — 同步 ESM 编译产物
- `esm/index.js` — 同步 ESM 编译产物
- `lib/nohighlight.js` — 同步 CJS 编译产物
- `lib/common.js` — 同步 CJS 编译产物
- `lib/index.js` — 同步 CJS 编译产物
- 类型声明文件 (esm/*.d.ts, lib/*.d.ts, nohighlight.d.ts) — 导出新函数

## 关键设计决策

### A2 纯函数提取
- `buildNoHighlightPipeline` — 无高亮版（8 步管线）
- `buildCommonPipeline` — 精简高亮版（10 步管线）
- `buildFullPipeline` — 完整版（10 步管线）
- 三个纯函数均接受 `rewriteFn`、`userPlugins`、`pipeline` 参数，脱离 React 运行时可独立测试

### A3 幽灵 prop 消除
- 已消费的 props：`disableCopy`、`rehypeRewrite`、`rehypePlugins`、`pipeline`
- 透传的 props：`...restProps`（排除以上 4 个已消费 props）
- 消除了 `preview.tsx` 中对 `disableCopy`/`rehypeRewrite` 的幽灵解构

### A7 共享配置常量
- `REHYPE_ATTRS_CONFIG = [rehypeAttrs, { properties: 'attr' }]`
- 消除三个入口中分散的硬编码配置

## 验证

- `pnpm build` — ✅ 通过
- `pnpm lint` — ✅ 通过
