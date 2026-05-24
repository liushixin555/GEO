# react-markdown-preview index.tsx UI 评审修复

**日期**: 2026-05-24
**评审文档**: tasks/review/react-markdown-preview.index.tsx.ui.md

## 修改文件
- pages/styles/markdown-viewer.css: 代码块 border + font-family + 防御性 .token.* Carbon 色板
- pages/components/MarkdownViewer.tsx: 导出 MarkdownErrorBoundary
- tests/pages/components/MarkdownViewer.test.tsx: +9 测试用例
- jest.config.ts: page 项目 ts-jest 添加 @testing-library/jest-dom 类型

## 测试结果
- 63 passed, 覆盖率 Stmts 96.51% / Branch 91.42% / Lines 98.66%
