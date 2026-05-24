# Props.tsx 架构修复 — patch-package 补丁

**日期**: 2026-05-24
**任务**: 根据 Props.tsx.architecture.md 评审报告修复 `@uiw/react-markdown-preview` 的类型定义

## 修复项

| 评审编号 | 问题 | 修复措施 |
|---------|------|---------|
| P1-1 | Ref 接口继承 Props（ISP/OCP 违反） | `MarkdownPreviewRef` 移除 `extends MarkdownPreviewProps`，仅保留 `mdp` |
| P1-2 | WrapperElement 泄漏 React 内部类型 | `DetailedHTMLProps` 替换为 `HTMLAttributes` |
| P1-3 | WrapperElement 类型重复（DRY 违反） | 提取 `WrapperElementProps` 类型别名 + `ColorMode` 类型 |
| P2-1 | 隐式 React 全局依赖 | 添加 `import type { CSSProperties, HTMLAttributes, RefObject, UIEvent, MouseEvent } from 'react'` |
| P2-3 | pluginsFilter 参数命名不一致 | `plugin` → `plugins`，`type` → `phase` |
| P3-2 | data-color-mode 缺少 'auto' | 添加 `'auto'` 到 ColorMode 联合类型 |

## 变更文件

- `patches/@uiw+react-markdown-preview+5.2.1.patch` — patch-package 补丁（新增）
- `package.json` — 添加 `patch-package` 依赖 + 更新 postinstall 脚本
- `node_modules/@uiw/react-markdown-preview/src/Props.tsx` — 源文件修复
- `node_modules/@uiw/react-markdown-preview/esm/Props.d.ts` — ESM 类型声明修复
- `node_modules/@uiw/react-markdown-preview/lib/Props.d.ts` — CJS 类型声明修复

## 验证结果

- TypeScript 类型检查: ✅ 通过
- 前端构建: ✅ 通过
- MarkdownViewer 测试: 25/25 ✅ 通过
