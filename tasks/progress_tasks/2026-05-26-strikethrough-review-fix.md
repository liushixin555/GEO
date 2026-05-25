# strikeThrough.tsx 安全/UI/架构评审修复

**日期**: 2026-05-26
**关联评审文件**: `tasks/review/strikeThrough.tsx.md`

## 修复内容

基于安全/架构/UI/Committer 四份评审报告，修复 @uiw/react-md-editor@4.1.0 的 strikeThrough 命令：

| 编号 | 级别 | 问题 | 修复方式 |
|------|------|------|---------|
| S1/S2 | MEDIUM | `prefix!` 非空断言 | 防御性检查 + 类型收窄 |
| S3 | LOW | execute 无 try-catch | 添加 try-catch 错误边界 |
| S5 | LOW | SVG `data-name` 信息泄露 | 移除 `data-name` 属性 |
| S6/U2 | INFO/HIGH | aria-label/title 英文硬编码 | 改为中文 |
| U3 | MEDIUM | 快捷键表示法不一致 | 统一为 `Ctrl+Shift+X` 格式 |
| U4 | MEDIUM | SVG 缺 aria-hidden | 添加 `aria-hidden="true"`，移除 `role="img"` |
| P3-LOW-02 | LOW | `state1` 命名不语义化 | 重命名为 `selectedState` |

## 修复文件

- `patches/@uiw+react-md-editor+4.1.0.patch` — 新增 strikeThrough diff 段
- `patches/@uiw__react-md-editor@4.1.0.patch` — 同上
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/src/commands/strikeThrough.tsx` — TypeScript 源文件
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/esm/commands/strikeThrough.js` — ESM 编译版
- `node_modules/.pnpm_patches/@uiw/react-md-editor@4.1.0/lib/commands/strikeThrough.js` — CommonJS 编译版

## 验证结果

- `pnpm build` — 通过
- `pnpm lint` — 通过
- `pnpm test` — OOM 崩溃（与本次修改无关）
