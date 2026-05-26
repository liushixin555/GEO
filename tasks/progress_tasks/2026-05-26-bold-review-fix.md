# bold.tsx 安全评审修复记录

**日期**: 2026-05-26
**关联评审**: tasks/review/bold.tsx.md
**修复文件**:
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/src/commands/bold.tsx`
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/esm/commands/bold.js`
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/lib/commands/bold.js`
- `patches/@uiw+react-md-editor+4.1.0.patch`
- `patches/@uiw__react-md-editor@4.1.0.patch`

## 修复项

### S1 — MEDIUM: prefix 非空断言绕过类型契约
- **修复**: 移除 `state.command.prefix!` 非空断言，改为防御性检查 `if (!prefix) return;`

### S2 — MEDIUM: executeCommand undefined 污染风险
- **修复**: 与 S1 联动修复，prefix 经防御性检查后才传入 selectWord/executeCommand

### S3 — LOW: SVG 图标 role="img" 改为 aria-hidden="true"
- **修复**: 移除 `role="img"`，改为 `aria-hidden="true"`，避免屏幕阅读器重复播报

### S6 — INFO: buttonProps 英文改为中文
- **修复**: `'aria-label': '添加加粗 (Ctrl+B)'`，快捷键表示从 `ctrl + b` 改为安全化 `Ctrl+B`

### 通用修复: try-catch 错误边界
- **修复**: 整个 execute 函数体包裹在 try-catch 中，命令执行失败不会崩溃编辑器

## 验证
- `pnpm build` ✅ 通过
- `pnpm lint` ✅ 通过
