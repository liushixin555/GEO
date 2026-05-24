# Props.tsx UI 评审修复记录

**日期**: 2026-05-24
**来源**: `tasks/review/Props.tsx.ui.md`（UI 专家评审，综合评分 4.1/10）

## 修复内容

在 `MarkdownViewer` 封装组件中修复 UI 评审发现的问题（Props.tsx 属第三方依赖不可直接修改）：

| 评审编号 | 优先级 | 修复措施 |
|---------|--------|---------|
| UI-P1-02 | P1 | `ariaLabel` / `role` 可配置化（默认值合理） |
| UI-P2-04 | P2 | 空状态使用 antd `Empty` 组件（替代原生 div） |
| UI-P2-05 | P2 | 添加 `onScroll`、`onClick`、`onKeyDown` 事件 props |
| UI-P3-03 | P3 | `forwardRef` + 命令式 API（`scrollToTop`、`scrollToAnchor`） |
| UI-P3-04 | P3 | 添加 `onMouseEnter` / `onMouseLeave`（不冒泡） |

## 涉及文件

- `pages/components/MarkdownViewer.tsx` — 组件改造
- `tests/pages/components/MarkdownViewer.test.tsx` — +12 测试用例

## 导出接口变更

新增 `MarkdownViewerRef` 类型导出，组件改用 `forwardRef`。
Props 新增：`ariaLabel`、`role`、`onScroll`、`onClick`、`onKeyDown`、`onMouseEnter`、`onMouseLeave`。

## 验证

- 48 个 MarkdownViewer 测试全部通过（TDD 红灯-绿灯）
- `pnpm build:page` 通过
- `pnpm test` 全量 4610/4669 通过（59 个失败为预存 rmapi 问题）
