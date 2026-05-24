# table.tsx 评审修复记录

**日期**: 2026-05-25
**文件**: `pages/components/MarkdownEditor.tsx`（封装层覆盖 `@uiw/react-md-editor` 的 `table` 命令）
**评审来源**: `tasks/review/table.tsx.md` / `table.tsx.architecture.md` / `table.tsx.security.md` / `table.tsx.ui.md` / `table.tsx.committer.md`

## 修复的问题

| # | 评审来源 | 严重度 | 问题 | 修复方式 |
|---|---------|--------|------|---------|
| 1 | QUALITY-M1/ARCH-H1 | HIGH | Toggle 移除分支为死代码（编辑后 `startsWith(prefix)` 必然失败） | 重写 execute 为纯模板插入，无 toggle 逻辑 |
| 2 | QUALITY-M2/ARCH-H1 | HIGH | `selectWord` 无法处理多行块级内容 | 完全跳过 selectWord，直接定位光标 |
| 3 | ARCH-H2 | HIGH | execute 圈复杂度 3（命令簇最高），双分支无抽象 | 简化为线性插入管道，圈复杂度 1 |
| 4 | QUALITY-L3/SEC-M1/ARCH-M2 | MEDIUM | 4 处非空断言 `prefix!` 掩盖运行时风险 | 入口处防御性检查 + try-catch |
| 5 | SEC-L2 | LOW | 选区范围未验证 | 添加 safeStart 边界校验 |
| 6 | SEC-L3 | LOW | 超长文本无 DoS 防护 | 添加 1MB 文本长度阈值 |
| 7 | UI-P2 | P2 | 无键盘快捷键 | 添加 `ctrlcmd+shift+t` |
| 8 | QUALITY-L4/SEC-L4/UI-P3 | LOW/P3 | SVG 缺少 `<title>` 和 `aria-hidden` | 替换为 16px 无障碍 SVG 图标 |
| 9 | UI-P3 | P3 | 英文标签硬编码（aria-label/title） | 中文 ARIA 标签 |
| 10 | UI-P3 | P3 | 模板占位文本英文（Header/Cell） | 中文模板（表头/内容） |

## 修改文件

- `pages/components/MarkdownEditor.tsx` — 添加 table 命令覆盖（commandsFilter + TOOLBAR_LABELS）
- `tests/pages/components/MarkdownEditor.test.tsx` — 添加 18 个 table 命令测试用例

## 测试结果

- 129 个测试全部通过（含新增 18 个 table 命令测试）
- 前端类型检查通过
- ESLint 通过
