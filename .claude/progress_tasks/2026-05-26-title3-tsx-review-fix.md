# 2026-05-26 title3.tsx 架构评审修复

## 变更概述
对 @uiw/react-md-editor/src/commands/title3.tsx 进行架构评审修复，补齐 title1/2/4 已修复但 title3 遗漏的三项问题。

## 修复内容

### title3.tsx 修复（三层同步：src/esm/lib）
| 问题编号 | 级别 | 修复内容 |
|----------|------|---------|
| P2-02 | MEDIUM | `import` → `import type { ICommand, ExecuteState, TextAreaTextApi }` |
| P2-03 | MEDIUM | 添加 `role="img" aria-hidden="true"` + IBM Plex Sans + Carbon ink #161616 + "Heading 3"→"H3" |
| P2-01 | MEDIUM | 废弃注释规范化：`@deprecated Since v4.0.0. Use heading3 instead. Scheduled for removal in v5.0.0. @see heading3` |

### 修改范围
- src/title3.tsx — 源码
- esm/title3.js — ESM 编译输出
- lib/title3.js — CJS 编译输出
- 共 3 个文件修改 + patch 更新

### 验证结果
- `pnpm build:page` ✅
- `pnpm lint` ✅
- `pnpm test` — 10288 passed（83 suites），25 failed 为预存在问题
- `npx patch-package` ✅ patch 生成成功
