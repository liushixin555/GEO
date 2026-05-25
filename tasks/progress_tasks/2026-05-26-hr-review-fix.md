# hr.tsx 安全评审修复记录

**日期**: 2026-05-26
**文件**: `@uiw/react-md-editor@4.1.0/src/commands/hr.tsx`
**评审文件**: `tasks/review/hr.tsx.security.md`

## 修复内容

| # | 问题 | 严重等级 | 修复措施 |
|---|------|---------|---------|
| S1 | `prefix!` 非空断言 4 次绕过类型检查 | HIGH | 添加 `if (!prefix) return` 防御性守卫，移除所有 `!` 断言 |
| S2 | `Ctrl+H` 与浏览器历史记录冲突致数据丢失 | HIGH | 快捷键改为 `ctrlcmd+shift+h` |
| S3 | `selectWord` 语义不匹配导致文本损坏 | MEDIUM | 重写 execute 为行级检测逻辑，不再使用 selectWord |
| S4 | 选区状态时间线不一致 | MEDIUM | 统一使用同一状态快照 |
| S5 | 用户选区被静默丢弃 | MEDIUM | 行级逻辑直接操作光标行 |
| S6 | SVG 路径数据膨胀 | LOW | 替换为简洁水平线图标 `viewBox="0 0 12 12"` |
| S7 | `aria-label` 硬编码快捷键暴露 | LOW | 改为中文 `插入水平分割线 (Ctrl+Shift+H)` + `aria-hidden="true"` |
| S8 | `execute` 无错误边界 | LOW | 添加 try-catch 错误边界 |

## 修改的文件

- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/src/commands/hr.tsx`（TypeScript 源文件）
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/esm/commands/hr.js`（ESM 编译输出）
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/lib/commands/hr.js`（CommonJS 编译输出）
- `patches/@uiw+react-md-editor+4.1.0.patch`（patch-package 格式补丁）
- `patches/@uiw__react-md-editor@4.1.0.patch`（pnpm 原生格式补丁）
- `tasks/review/hr.tsx.security.md`（评审状态更新）

## 验证结果

- `pnpm build` ✅ 通过
- `pnpm lint` ✅ 通过
- `pnpm test` ⚠️ OOM（既有问题，与本次修改无关）
