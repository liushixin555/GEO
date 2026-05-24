# 2026-05-25 issue.tsx 评审封装层修复

## 变更描述
根据 tasks/review/ 目录下 5 份评审报告（质量 6.9/10、架构 4.0/10、安全 7.2/10、UI 3.0/10、Committer APPROVE），在 MarkdownEditor.tsx 封装层添加 issue 命令的防御性覆盖。

## 评审问题修复清单
- ARCH-CRITICAL-1: # 前缀与 H1 标题语义碰撞 → 行首上下文检测
- SEC-S1/Q4: prefix! 非空断言 → 防御性检查
- SEC-S2: 无错误边界 → try-catch 包裹
- UI-P1: SVG 12px → 16px + aria-hidden + title
- UI-P3: 英文 buttonProps → 中文标注

## 变更文件
- `pages/components/MarkdownEditor.tsx` — commandsFilter 添加 issue 命令处理
- `tests/pages/components/MarkdownEditor.test.tsx` — 13 个新增测试
- `tasks/fix.Bug修复汇总.md` — fix030 记录

## 测试结果
- 59/59 MarkdownEditor 测试通过
- TypeScript 类型检查通过
- ESLint 无错误
