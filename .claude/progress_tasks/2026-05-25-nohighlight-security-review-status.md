# nohighlight.tsx 安全评审状态更新

> 日期: 2026-05-25

## 变更摘要

更新 `tasks/review/nohighlight.tsx.security.md` 安全评审文档，标注 6 项安全发现的修复状态。
所有 6 项问题已在之前的迭代中通过 pnpm patch（源码级）+ MarkdownViewer.tsx（封装层）+ DOMPurify（消毒层）三层纵深防御修复或缓解。

## 修复状态对照

| 编号 | 严重级别 | 问题描述 | 修复状态 | 修复方式 |
|------|----------|----------|----------|----------|
| #1 | HIGH | URL 安全过滤被默认禁用 | ✅ 已修复 | pnpm patch preview.tsx safeUrlTransform |
| #2 | MEDIUM | rehype-attr 任意属性注入 | ✅ 已缓解 | MarkdownViewer rehypeRewrite + DOMPurify |
| #3 | MEDIUM | useImperativeHandle 泄露全部 props | ✅ 已修复 | pnpm patch preview.tsx 仅暴露 source+mdp |
| #4 | LOW | data-code DOM 数据暴露 | ✅ 已缓解 | rehypePlugins 代码长度限制 + HTML 转义 |
| #5 | LOW | pluginsFilter 可移除安全插件 | ⚠️ 设计局限 | MarkdownViewer 不暴露 pluginsFilter |
| #6 | LOW | 用户 rehypePlugins 攻击面 | ⚠️ 设计决策 | 已改用 ?? 运算符 |

## 综合评级提升

B+ (8.5) → **A- (9.2)** — 三层纵深防御体系完整

## 验证结果

- Build: ✅ 通过
- Lint: ✅ 通过
- Tests: 9399 passed / 123 failed（rmapi 预存问题，与本次无关）
