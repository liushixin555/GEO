# Committer 审核报告修复 — Props.tsx

**日期**: 2026-05-24
**关联文档**: `tasks/review/Props.tsx.committer.md`

## 变更内容

### 1. 修复测试 mock 路径不匹配（P0 Bug）
- **问题**: 测试 mock `@uiw/react-markdown-preview/common`，但组件从 `@uiw/react-markdown-preview/nohighlight` 导入
- **影响**: Jest 无法拦截模块加载，ESM 语法错误导致 25 个测试全部无法运行
- **修复**: 将 mock 路径改为 `@uiw/react-markdown-preview/nohighlight`

### 2. 版本锁定策略（安全建议）
- **变更**: `package.json` 中 `@uiw/react-markdown-preview` 从 `^5.2.1` 改为 `~5.2.1`
- **目的**: 锁定 minor 版本，防止不兼容的 minor 版本自动升级

### 3. 主题自动同步（非阻塞改进）
- **变更**: MarkdownViewer 从 antd `theme.useToken()` 读取 `colorBgBase`，自动检测亮色/暗色主题
- **目的**: 当项目未来启用暗色主题时，MarkdownViewer 自动适配
- **测试**: 新增 3 个测试用例覆盖亮色/暗色/缺失场景

### 4. 测试覆盖率
- 28 个测试全部通过（原 25 + 新增 3）
- 语句覆盖率 95.74%，分支覆盖率 93.75%

## 审核报告前置条件完成状态

| # | 前置条件 | 状态 |
|---|---------|------|
| 1 | 创建 MarkdownViewer 封装组件 | ✅ 已有 |
| 2 | source 长度截断（≤ 1MB） | ✅ 已有 |
| 3 | 不暴露 rehypeRewrite/pluginsFilter/warpperElement | ✅ 已有 |
| 4 | react-markdown 版本 ≥ 9.0 | ✅ v10.1.0 |
| 5 | markdown-viewer.css 对齐 Carbon Design System | ✅ 已有 |
| 6 | a11y 属性 role="region" + aria-label | ✅ 已有 |
| 7 | 封装组件单元测试 | ✅ 28 用例 |

## 变更文件
- `pages/components/MarkdownViewer.tsx`
- `tests/pages/components/MarkdownViewer.test.tsx`
- `package.json`
- `pnpm-lock.yaml`
