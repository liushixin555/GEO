# skills.controller.ts 安全评审修复验证

**日期**: 2026-05-25
**评审文件**: tasks/review/skills.controller.security.md

## 本次修改文件

- apis/utils/skill-md.util.ts — 使用 js-yaml 替代正则表达式解析 YAML frontmatter（C-4 ReDoS 修复）

## 修复状态

14项问题中13项已在之前重构中修复，本次修复最后一项 C-4（parseSkillMd ReDoS）。

## 验证

- pnpm build:api ✅
- pnpm lint ✅
- skills 测试 419 passed ✅
