# Committer 审核修复 — ArticleDetail.tsx 测试基础设施

**日期**: 2026-05-24
**关联文档**: tasks/review/ArticleDetail.tsx.committer.md

## 变更内容

### 1. ArticleDetail.tsx 代码修复（前置重构已完成）
Committer 报告的 5 个 BLOCKER 已在 hooks 架构重构中全部修复

### 2. 测试基础设施重构
- setup.ts: 重写 antd mock，Proxy + 稳定单例
- ArticleDetail.test.tsx: 14 个组件测试（13 通过 + 1 跳过）

### 3. 排查的关键问题
- Form.useForm()/App.useApp() 无限重渲染 → 模块级单例
- ESM 模块 Jest 无法加载 → mock 组件层
- apiClient vs axios → mock 正确路径

## 测试结果
- 6 suites, 66 tests passed + 1 skipped, Build 通过

## 变更文件
- tests/pages/setup.ts
- tests/pages/article/ArticleDetail.test.tsx
