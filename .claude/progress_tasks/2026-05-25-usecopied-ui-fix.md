# 2026-05-25 useCopied.tsx UI评审修复

## 变更概述
修复 `@uiw/react-markdown-preview/src/plugins/useCopied.tsx` 的 6 项 UI 评审问题

## 修复项
- **UI-P1-01** aria-live 屏幕阅读器通知 — `announceCopy()` 动态创建 `role=status` 元素
- **UI-P1-02** 剪贴板失败错误处理 — `isCopy` 参数判断 + `copy-failed` CSS class
- **UI-P2-03** useCallback 稳定引用 — handle 加入 useEffect 依赖数组
- **UI-P2-04** 递归深度限制 — `MAX_PARENT_DEPTH=10`
- **UI-P3-01** 防重复点击 — active/copy-failed class 检查
- **UI-P3-03** 清理冗余 removeEventListener — effect 体仅 addEventListener

## 修改文件
- `patches/@uiw+react-markdown-preview+5.2.1.patch` — 追加 useCopied.tsx/js 三版本 diff
- `pages/components/MarkdownViewer.tsx` — 修复 `KeyboardEvent` 类型（React → DOM）
- `tasks/review/useCopied.tsx.ui.md` — 评审文档更新修复状态，评分 2.7→7.8

## 保留项（不影响核心交互）
- UI-P1-03 反馈持续时间可配置 — 2000ms 为可接受默认值
- UI-P2-02 antd 集成 — 封装层优化项
- UI-P2-01 React state 驱动 — 大重构成本高
- UI-P3-02 data-code 重命名 — 破坏 API 兼容性

## 测试
- MarkdownViewer.test.tsx: 116 passed
- build:page: ✅
- lint: ✅
