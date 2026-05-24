# react-markdown-preview index.tsx 架构评审修复

**日期**: 2026-05-24
**评审文档**: tasks/review/react-markdown-preview.index.tsx.architecture.md

## 修复内容

基于架构评审 A-01（每次渲染重建管线）的深层优化：

1. allowElement 内联箭头函数 -> useCallback([], []) 稳定引用
2. wrapperElement 内联对象字面量 -> useMemo([resolvedColorMode]) 仅在主题变化时重建

## 修改文件

- pages/components/MarkdownViewer.tsx: allowElement useCallback + wrapperElement useMemo
- tests/pages/components/MarkdownViewer.test.tsx: +7 架构修复测试
- tasks/fix.MarkdownViewer评审修复.md: 第五轮评审修复记录

## 测试结果

- 74 passed (MarkdownViewer 全部用例)
- 构建通过
