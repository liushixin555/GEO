# hr.tsx Committer 审核专家评审

**文件**: `@uiw/react-md-editor@4.1.0/src/commands/hr.tsx`
**评审日期**: 2026-05-26

## 评审结论

✅ **APPROVE** — 8.0/10

## 前序评审

| 评审类型 | 评分 | 结论 |
|---------|------|------|
| 架构评审 | 5.0/10 | CONDITIONAL APPROVE |
| 安全评审 | 6.5/10 | APPROVE |
| UI 评审 | 3.2→7.0/10 | ACCEPT |
| Committer 评审 | 5.0→8.0/10 | APPROVE |

## P1 修复验证

### P1-1: 快捷键冲突 ✅ 已修复
- **问题**: `ctrlcmd+h` 与浏览器历史记录冲突
- **修复**: `shortcuts: 'ctrlcmd+shift+h'`
- **验证**: src/hr.tsx + esm/hr.js + lib/hr.js + 所有 .pnpm 副本均已同步

### P1-2: SVG 图标 ✅ 已修复
- **问题**: SVG 渲染字母 "HR" 而非水平线
- **修复**: 替换为简洁水平线 `viewBox="0 0 12 12"` + `d="M1,5.5 L11,5.5 L11,6.5 L1,6.5 Z"`
- **验证**: 所有 3 个入口（src/esm/lib）+ 8 个 .pnpm 副本均已同步

## 安全评审修复（S1-S8）✅ 全部已修复

| # | 问题 | 修复措施 | 状态 |
|---|------|---------|------|
| S1 | `prefix!` 非空断言 ×4 | 添加 `if (!prefix) return` 防御性守卫 | ✅ |
| S2 | Ctrl+H 快捷键冲突 | 改为 `ctrlcmd+shift+h` | ✅ |
| S3 | selectWord 语义不匹配 | 重写为行级检测逻辑 | ✅ |
| S4 | 选区状态时间线不一致 | 统一使用同一状态快照 | ✅ |
| S5 | 用户选区被静默丢弃 | 行级逻辑直接操作光标行 | ✅ |
| S6 | SVG 路径数据膨胀 | 替换为简洁水平线图标 | ✅ |
| S7 | aria-label 硬编码英文 | 改为中文 + `aria-hidden="true"` | ✅ |
| S8 | execute 无错误边界 | 添加 try-catch | ✅ |

## 修改的文件

- `node_modules/@uiw/react-md-editor/src/commands/hr.tsx`（TypeScript 源文件）
- `node_modules/@uiw/react-md-editor/esm/commands/hr.js`（ESM 编译输出）
- `node_modules/@uiw/react-md-editor/lib/commands/hr.js`（CommonJS 编译输出）
- `patches/@uiw+react-md-editor+4.1.0.patch`（patch-package 格式补丁）
- `patches/@uiw__react-md-editor@4.1.0.patch`（pnpm 原生格式补丁）
- 8 个 `.pnpm` 内部副本全部同步

## 验证结果

- `pnpm build` ✅ 通过
- `pnpm lint` ✅ 通过
- `pnpm test:api` ✅ 9839/9896 通过（57 失败均为 rmapi 既有问题，与本次修复无关）
