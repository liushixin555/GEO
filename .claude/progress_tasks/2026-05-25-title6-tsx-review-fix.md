# 2026-05-25 title6.tsx 评审修复

## 变更概述
根据 title6.tsx 架构评审、质量评审、安全评审、UI 评审、Committer 评审的评审结果，修复 `@uiw/react-md-editor@4.1.0` 包中 title6.tsx 的评审问题。

## 修复内容

### ARCH-1 / Q1 / S7 — 非空断言回退（Minor）
- **修复**: `prefix: state.command.prefix!` → `prefix: state.command.prefix ?? '###### '`
- **修复**: `suffix: state.command.suffix` → `suffix: state.command.suffix ?? ''`

### ARCH-2 / UI-8 — 图标无障碍属性缺失（Minor）
- **状态**: 已有 `role="img" aria-hidden="true"`（继承自之前的 patch）

### 新增修复 — import type 语义
- **修复**: `import { ICommand, ... } from './'` → `import type { ICommand, ... } from './'`

### 新增修复 — 图标样式对齐 title5.tsx 标杆
- **修复**: fontSize 12 → 11（与 H5 的 12px 形成视觉区分）
- **新增**: `fontFamily: "'IBM Plex Sans', sans-serif"`（对齐 Carbon Design System 字体）
- **新增**: `color: '#161616'`（对齐 Carbon ink 颜色）
- **修复**: "Heading 6" → "H6"（简洁文本格式，与 title5.tsx 的 "H5" 一致）

### UI-2 — H5/H6 视觉无区分（HIGH）
- **修复**: fontSize 从 12 改为 11，解决 H5/H6 在工具栏中视觉完全相同的问题

## 修改文件
- `patches/@uiw__react-md-editor@4.1.0.patch` — 通过 pnpm patch-commit 更新
  - `src/commands/title6.tsx` — 源文件修复
  - `esm/commands/title6.js` — 编译输出修复
  - `lib/commands/title6.js` — 编译输出修复
- `tasks/review/title6.tsx.committer.md` — 更新已修复检查项

## 验证结果
- `pnpm lint` ✅ 通过
- `pnpm build:api` ✅ 通过
- `pnpm test:api`（单文件测试）✅ 通过
- `pnpm build:page` ❌ 因 esbuild OOM 失败（服务器内存限制，非代码问题）

## 修复对齐度
修复后 title6.tsx 与 title5.tsx 标杆完全对齐：
| 维度 | title5.tsx | title6.tsx（修复后） | 状态 |
|------|-----------|---------------------|------|
| import type | ✅ | ✅ | 对齐 |
| headingExecute 导入源 | headingUtils | headingUtils | 对齐 |
| prefix 安全处理 | ?? '##### ' | ?? '###### ' | 对齐 |
| suffix 安全处理 | ?? '' | ?? '' | 对齐 |
| icon role/aria-hidden | ✅ | ✅ | 对齐 |
| icon fontFamily | IBM Plex Sans | IBM Plex Sans | 对齐 |
| icon color | #161616 | #161616 | 对齐 |
| icon fontSize | 12 | 11 | 差异化（H6<H5） |
| icon 文本 | H5 | H6 | 对齐 |
| 废弃注释 | 完整 | 完整 | 对齐 |
