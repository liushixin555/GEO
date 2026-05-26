# italic.tsx 架构评审修复记录

**日期**: 2026-05-26
**关联评审**: tasks/review/italic.tsx.architecture.md
**修复文件**:
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/src/commands/italic.tsx`
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/esm/commands/italic.js`
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/lib/commands/italic.js`
- `patches/@uiw+react-md-editor+4.1.0.patch`
- `patches/@uiw__react-md-editor@4.1.0.patch`

## 修复项

### M1 — MEDIUM: prefix 非空断言绕过类型契约
- **修复**: 移除 `state.command.prefix!` 非空断言，改为防御性检查 `if (!prefix) return;`

### L1 — LOW: execute 函数 selection 参数语义不透明
- **修复**: 统一使用局部变量 `prefix`，不再通过 `state.command.prefix!` 直接访问

### SVG 无障碍修复
- **修复**: 移除 `data-name="italic"` 属性和 `role="img"`，改为 `aria-hidden="true"`，避免屏幕阅读器重复播报

### buttonProps 国际化
- **修复**: `'aria-label': '添加斜体 (Ctrl+I)'`，title 同步中文化

### 通用修复: try-catch 错误边界
- **修复**: 整个 execute 函数体包裹在 try-catch 中，命令执行失败不会崩溃编辑器

## 验证
- `pnpm build` ✅ 通过
- `pnpm lint` ✅ 通过
