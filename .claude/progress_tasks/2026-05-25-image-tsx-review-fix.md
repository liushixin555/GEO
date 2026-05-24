# image.tsx 评审修复记录

**日期**: 2026-05-25
**文件**: `pages/components/MarkdownEditor.tsx` (commandsFilter 中添加 image 命令覆盖)
**评审来源**: tasks/review/image.tsx.md / .architecture.md / .security.md / .ui.md / .committer.md

## 评审问题汇总

| 级别 | 问题 | 来源 | 状态 |
|------|------|------|------|
| P1 | 快捷键 Ctrl+K 违反行业惯例（应为插入链接） | UI-P1-01/QUAL-2.2 | ✅ 已修复→Ctrl+Shift+K |
| P1 | URL检测 `includes('http')` 误判+XSS注入 | SEC-S1/S2/UI-P1-04 | ✅ 已修复→正则白名单 |
| P1 | SVG 缺少 aria-hidden 无障碍不合规 | UI-P1-02/S7 | ✅ 已修复 |
| P1 | 图标 13px 远低于 Carbon 标准 16/20px | UI-P1-03 | ✅ 已修复→16px |
| P1 | prefix! 非空断言崩溃风险 | SEC-S3/QUAL-2.4/UI-P2-01 | ✅ 已修复→api直接操作 |
| P1 | URL分支缺少re-select与link.tsx不一致 | QUAL-2.1/ARCH-2.1 | ✅ 已修复→重写execute |
| P2 | alt文本Markdown注入特殊字符未转义 | SEC-S4 | ✅ 已修复→转义[[\]()!\\] |
| P2 | 选区越界数据损坏 | SEC-S6 | ✅ 已修复→Math.max/min |
| P2 | 无错误处理 | QUAL-2.8 | ✅ 已修复→try-catch |
| P2 | 英文ARIA/buttonProps不中文化 | UI-P3-04/S9 | ✅ 已修复→中文 |
| P3 | 无图片上传集成 | UI-P3-03 | 📋 后续迭代 |
| P3 | 无操作反馈(message) | UI-P2-02 | 📋 后续迭代 |
| P3 | 占位符url无自动选中引导 | UI-P2-03 | 📋 后续迭代 |

## 修改文件

1. `pages/components/MarkdownEditor.tsx` — commandsFilter 添加 image 命令覆盖（~60行）
2. `tests/pages/components/MarkdownEditor.test.tsx` — 添加 16 个 image 命令测试用例

## 测试结果

- 48/48 测试通过（MarkdownEditor.test.tsx）
- 150/150 组件测试全部通过
- 前端类型检查通过
- ESLint 检查通过
