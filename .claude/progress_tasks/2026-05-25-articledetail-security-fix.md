# ArticleDetail.tsx 安全评审修复确认 + 全局 Token 迁移

**日期**: 2026-05-25
**关联评审**: tasks/review/ArticleDetail.tsx.security.md（D+ -> A）

## 修复确认

ArticleDetail.tsx 的 11 项安全漏洞（2 CRITICAL + 4 HIGH + 4 MEDIUM + 1 LOW）在之前的重构中已全部修复。
代码从 889 行单体组件重构为 hooks + components 模块化架构。

## 全局 Token 迁移（SEC-ART-02 扩展）

将 24 个页面文件从 localStorage.getItem(token) + axios 迁移到统一 apiClient。

### 验证
- pnpm build:page 通过
- pnpm build:api 通过
- pnpm lint 通过
- 仅 pages/lib/apiClient.ts 自身保留 localStorage.getItem(token)（正确，统一入口）
