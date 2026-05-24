# link.tsx 评审修复记录

**日期**: 2026-05-25
**文件**: `pages/components/MarkdownEditor.tsx` (commandsFilter 中添加 link 命令覆盖)
**评审来源**: tasks/review/link.tsx.md / .architecture.md / .security.md / .ui.md / .committer.md

## 评审问题汇总

| 级别 | 问题 | 来源 | 状态 |
|------|------|------|------|
| P1 | 快捷键 Ctrl+L 与浏览器地址栏冲突+非行业标准 | UI-P1-01/QUAL-M2 | ✅ 已修复→Ctrl+K |
| P1 | SVG data-name="italic" 复制粘贴错误 | QUAL-H1/UI-P1-02 | ✅ 已修复→antd LinkOutlined |
| P1 | URL分支空链接文本[](url) WCAG 2.4.4 违规 | UI-P1-03/C-01 | ✅ 已修复→提取域名作默认链接文本 |
| P1 | javascript: URL穿透渲染层XSS | SEC-S1 | ✅ 已修复→URL方案白名单过滤 |
| P1 | SVG 缺少 aria-hidden 无障碍不合规 | UI-P2-04 | ✅ 已修复→antd图标自带 |
| P1 | 图标 12px 低于 Carbon 标准 16px | UI-P1-04 | ✅ 已修复→16px antd图标 |
| P2 | URL检测 includes('http') 误判/漏判 | QUAL-M2/SEC-S5/UI-P2-01 | ✅ 已修复→正则检测 |
| P2 | prefix! 非空断言崩溃风险 | SEC-S2/QUAL-M1/UI-P2-02 | ✅ 已修复→重写execute无prefix依赖 |
| P2 | 英文ARIA/buttonProps不中文化 | UI-P3-03 | ✅ 已修复→中文 |
| P2 | 无错误处理 | QUAL-M3 | ✅ 已修复→try-catch |
| P3 | 占位符无视觉引导 | UI-P2-03 | 📋 后续迭代 |
| P3 | 魔法字符串未提取常量 | UI-P3-02 | ✅ 已在重写中消除 |

## 修改文件

1. `pages/components/MarkdownEditor.tsx` — commandsFilter 添加 link 命令覆盖（~50行）+ Ctrl+L浏览器拦截

## 测试结果

- MarkdownEditor.test.tsx 通过
- 前端 TypeScript 编译通过
- ESLint 检查通过
