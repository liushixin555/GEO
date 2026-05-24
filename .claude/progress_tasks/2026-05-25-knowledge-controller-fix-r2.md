# knowledge.controller.ts 第2轮安全修复

**日期**: 2026-05-25
**基于**: tasks/review/knowledge.controller.ts.md 质量评审报告

## 修复清单

| 编号 | 级别 | 问题 | 修复内容 |
|------|------|------|----------|
| C-1 | CRITICAL | expandKeywords 缺少 checkBaseAccess（越权漏洞） | 添加 userId/role + checkBaseAccess + 错误处理 |
| H-5 | HIGH | batchCreateKeywords 无数组长度上限 | 添加 keywords.length > 500 上限检查 |
| H-7 | HIGH | createDocument file_size 无类型校验 | 添加 typeof + 正数 + 有限数检查 |
| M-2 | MEDIUM | pageSize 可能为负数或零 | 9 处 Math.min 改为 Math.max(1, Math.min(...)) |
| M-5 | MEDIUM | toggleMinedKeywordsBatch selected 无类型校验 | 添加 typeof selected !== boolean 检查 |
| M-6 | MEDIUM | mineKeywords source_type 无白名单 | 添加 VALID_SOURCE_TYPES 白名单校验 |

## 验证结果

- 构建: pnpm build:api 通过
- Lint: pnpm lint 通过
- 测试: 7 套件 975 用例全通过
