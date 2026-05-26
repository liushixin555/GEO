# 2026-05-26 title.tsx 全面评审修复

## 变更概述
对 @uiw/react-md-editor/src/commands/title.tsx 及关联文件 title1-6.tsx 进行全面评审修复，涵盖架构/安全/UI/Committer 维度。

## 修复内容

### title.tsx 修复（核心文件）
| 问题编号 | 级别 | 修复内容 |
|----------|------|---------|
| P1-01 | HIGH | 消除循环依赖：移除 `heading1` 导入，`heading` 命令改为显式定义所有属性（name/keyCommand/shortcuts/prefix/suffix/buttonProps/execute/icon） |
| P2-04 | LOW | heading 命令不再 spread 继承 heading1，显式列出所有属性 |
| P3-01 | LOW | headingExecute 的 suffix 默认值从 `prefix` 改为 `''`（空字符串） |
| P3-02 | LOW | 为 executeCommand 中 selection 参数选择添加意图注释 |
| P2-02 | MEDIUM | `import type { ICommand, ... }` 仅类型导入 |
| P3-03 | LOW | 废弃注释补充版本信息 `@deprecated Since v4.0.0. Scheduled for removal in v5.0.0. @see heading` |

### title1.tsx 同步修复
| 修复内容 | 说明 |
|----------|------|
| `import type` | 仅类型依赖 |
| `prefix!` → `?? '# '` | 防御性空值合并 |
| `role="img" aria-hidden="true"` | 无障碍属性 |
| `fontFamily: "'IBM Plex Sans', sans-serif"` + `color: '#161616'` | Carbon Design 对齐 |
| "Heading 1" → "H1" | 简洁文本 |
| 废弃注释规范化 | `@deprecated Since v4.0.0. Use heading1 instead.` |

### title2.tsx 同步修复
与 title1.tsx 同规格，默认值 `?? '## '`，字号 16，文本 "H2"

### title4.tsx 同步修复
与 title1.tsx 同规格，默认值 `?? '#### '`，字号 14，文本 "H4"

### 修改范围
- src/*.tsx — title + title1 + title2 + title4（4 个源码文件）
- esm/*.js — title + title1 + title2 + title4（4 个 ESM 编译输出）
- lib/*.js — title + title1 + title2 + title4（4 个 CJS 编译输出）
- 共 12 个文件修改

### 验证结果
- `pnpm build:page` ✅
- `pnpm lint` ✅
- patch 应用验证 ✅（`npx patch-package` 两个包均 ✔）
