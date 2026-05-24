# list.tsx 评审问题修复记录

**日期**: 2026-05-25
**文件**: `@uiw/react-md-editor@4.1.0/src/commands/list.tsx`
**依据**: 5份评审报告（质量/安全/架构/UI/Committer）

## 修复清单

### P1-HIGH 修复（2项）

| # | 问题 | 修复方案 | 行号 |
|---|------|---------|------|
| 1 | checkedList 回调忽略 item/index 参数，无法 toggle `- [x]` 已勾选项 | 回调增加 `startsWith('- [x] ')` / `startsWith('- [ ] ')` 检测 | L106-109 |
| 2 | `prefix!` 非空断言无运行时保护 | 改为 `const prefix = state.command.prefix; if (!prefix) return;` | L12-13 |

### P2-MEDIUM 修复（4项）

| # | 问题 | 修复方案 | 行号 |
|---|------|---------|------|
| 3 | Remove 分支 state/state1 混用 | `state.text` → `state1.text`（L28, L33） | L28, L33 |
| 4 | 快捷键不支持 macOS Cmd 键 | `ctrl+shift+*` → `ctrlcmd+shift+*`（三个命令统一） | L53, L75, L94 |
| 5 | `Array(n+1).join('\n')` 晦涩 | 改用 `'\n'.repeat(n)` | L18, L21 |
| 6 | Ctrl+Shift+C 与浏览器 DevTools 冲突 | 重映射为 `ctrlcmd+shift+5` | L94 |

### P3-LOW 修复（3项）

| # | 问题 | 修复方案 | 行号 |
|---|------|---------|------|
| 7 | unorderedList SVG 缺 `role="img"` | 补充 `role="img"` | L60 |
| 8 | 不必要的模板字符串 `${modifiedText}` | 改为直接传 `modifiedText` | L39 |
| 9 | 三个 SVG 缺 `aria-hidden="true"` | 统一添加 `aria-hidden="true"` | L60, L79, L98 |

## 注意事项

- 文件位于 `node_modules/` 中，修改不会持久化（`npm install` 后丢失）
- 正确的持久化方式：通过本项目的 MarkdownEditor 封装层覆盖命令配置
- 本次修复为评审验证目的，展示所有评审问题的修复方案
