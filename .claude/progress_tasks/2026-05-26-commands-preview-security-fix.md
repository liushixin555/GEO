# 2026-05-26 commands/preview.tsx 安全评审修复

## 变更内容
- 修复 `@uiw/react-md-editor` 的 `commands/preview.tsx` 安全评审问题
- 通过 pnpm patch 修改 esm/commands/preview.js + lib/commands/preview.js

## 修复项
| 编号 | 级别 | 问题 | 修复方案 | 状态 |
|------|------|------|----------|------|
| P2-1 | HIGH | `api.textArea.focus()` 空值防护（CWE-476） | 添加 `if (api && api.textArea)` 守卫 + try-catch | ✅ 已修复 |
| P2-2 | HIGH | `dispatch({ preview: 'xxx' })` partial dispatch 状态覆盖 | 改为 `dispatch(function (prev) { return Object.assign({}, prev, { preview: 'xxx' }); })` 函数式 dispatch | ✅ 已修复 |
| P3-1 | LOW | SVG 无障碍属性缺失 | 添加 `aria-hidden="true"` 到所有 SVG 图标 | ✅ 已修复 |
| P3-2 | LOW | 未使用参数 `state`, `executeCommandState` | 保留（签名对齐 ICommand 接口） | ⚠️ 不修复 |
| P3-3 | LOW | aria-label/title 使用英文 | 中文本地化：预览/编辑/实时预览 | ✅ 已修复 |

## 修复范围
- `esm/commands/preview.js` — codePreview + codeEdit + codeLive 三个命令
- `lib/commands/preview.js` — 同上（CommonJS 版本）
- 共计 6 个 execute 函数 + 6 个 icon + 6 个 buttonProps

## 验证
- `pnpm build` ✅ 通过
- `pnpm lint` ✅ 通过
- `pnpm test` — 10396 passed，19 failed（预先存在的失败，与本次修复无关）

## 关联文件
- `patches/@uiw+react-md-editor+4.1.0.patch` — patch 文件已更新
