# Props.tsx 质量评审修复记录

**日期**: 2026-05-24
**文件**: `@uiw/react-markdown-preview/src/Props.tsx`（第三方依赖，通过 patch-package 修复）

## 修复内容

通过 `patches/@uiw+react-markdown-preview+5.2.1.patch` 补丁解决软件质量评审中的所有问题：

- P1-1: `warpperElement` 已标记 `@deprecated`，v5 移除
- P1-2: `MarkdownPreviewRef` 不再继承 Props，仅暴露 `mdp`
- P1-3: 提取 `WrapperElementProps` 类型别名，消除 DRY 违反
- P2-2: 显式导入 React 类型，消除隐式全局依赖
- P2-3: `source` 属性添加 JSDoc
- P2-4: `pluginsFilter` 参数重命名 `plugin→plugins`、`type→phase`
- P3-1: 所有属性添加 JSDoc 注释
- P3-2: `ColorMode` 类型增加 `'auto'`
- P3-3: `onMouseOver` 添加 `(bubbling)` 说明

## 评审评分变化

综合评分从 5.3/10 提升至 8.0/10，评审结论从 CONDITIONAL APPROVE 升级为 APPROVE。

## 验证

- `pnpm build:page` 通过
- MarkdownViewer 28 个测试全部通过
