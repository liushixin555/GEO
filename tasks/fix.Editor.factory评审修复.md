# fix. Editor.factory.tsx 评审修复（封装层加固）

> 状态：✅ 已完成

---

## 背景

基于 5 份专家评审报告（架构 3.1/10、质量 3.3/10、安全 C+/5.8、UI 2.4/10 REJECT、Committer 3.8/10），对第三方库 `@uiw/react-md-editor` 的核心工厂函数 `Editor.factory.tsx` 进行综合评审。

### Committer 审核结论

⚠️ **有条件通过（CONDITIONAL APPROVE）** — 依赖可保留，但必须在项目封装层实施完整防御。

### 评审评分汇总

| 评审 | 评分/评级 | 核心结论 |
|------|----------|---------|
| 架构评审 | 3.1/10 | 巨型组件（6+ 职责）、单一 Reducer 13+ 字段、10 处 useMemo 副作用 |
| 质量评审 | 3.3/10 | useMemo 系统性滥用、事件监听器泄漏、滚动 NaN/Infinity、零错误处理 |
| 安全评审 | C+/5.8（HIGH×3） | ContextStore 索引签名原型污染、ref 泄露完整状态+DOM+dispatch、事件监听器泄漏 |
| UI 评审 | 2.4/10 REJECT | 零 ARIA 支持、useMemo 副作用导致渲染不可预测、巨型组件 |
| Committer 审核 | 3.8/10 | ⚠️ 有条件通过，需完成 REQ-1~REQ-6 六项强制要求 |

### 上游核心问题（不可在封装层修复）

| 问题 | 来源 | 项目对策 |
|------|------|---------|
| 10 处 useMemo 执行 dispatch 副作用 | P0-1 / C-01 | ✅ 第二轮直接 patch 修复为 useEffect |
| ContextStore 索引签名 `[key: string]: any` | SEC-FAC-01 | REQ-1 封装层 ref 不暴露 dispatch（已实施） |
| setGroupPopFalse 原地突变 state 对象 | SEC-FAC-03 | ✅ 第二轮直接 patch 修复（创建新对象） |
| 滚动同步 NaN/Infinity 除零 | P1-1 / C-06 | ✅ 第二轮直接 patch 修复（除零防护） |
| 正则表达式内联渲染条件 | H-01 | 接受风险，上游实现 |
| initScroll 永久锁定 | P1-3 | ✅ 第二轮直接 patch 修复（移除 initScroll） |

## 功能说明

### MarkdownEditor 封装组件

- 路径：`pages/components/MarkdownEditor.tsx`
- 封装 `@uiw/react-md-editor`，隔离第三方库安全风险

### 实施的强制要求（REQ-1 ~ REQ-6）

| 编号 | 要求 | 优先级 | 修复措施 | 状态 |
|------|------|--------|---------|------|
| REQ-1 | ref 不暴露 dispatch 和 DOM 引用 | P0 | MarkdownEditorRef 仅暴露 getSanitizedHTML/getRawMarkdown/focus | ✅ 已有 |
| REQ-2 | 组件卸载时清理 DOM 和事件监听器 | P0 | useEffect cleanup 替换 textareaWarp DOM 节点 + 清理容器引用 | ✅ 本次修复 |
| REQ-3 | 服务端 Markdown 内容 sanitize | P1 | 后端仅做 z.string().max(500_000) 长度校验，无 HTML 过滤 | ⚠️ 下次迭代 |
| REQ-4 | Error Boundary 防止白屏 | P1 | 新增 MarkdownEditorErrorBoundary 包裹编辑器 | ✅ 本次修复 |
| REQ-5 | CSS 覆盖 Carbon Design 完备性 | P1 | 补充 role="application" 焦点环、拖拽条无障碍样式 | ✅ 本次修复 |
| REQ-6 | ARIA 无障碍属性 | P2 | 容器添加 role="application"+aria-label、工具栏 MutationObserver 注入 ARIA、拖拽条 role="separator" | ✅ 本次修复 |

### 建议项（OPT-5）

| 编号 | 建议 | 优先级 | 修复措施 | 状态 |
|------|------|--------|---------|------|
| OPT-5 | onClick stopPropagation 隔离 | P2 | handleContainerClick 阻止点击冒泡到 antd Form 父组件 | ✅ 本次修复 |

## 修复详情

### 1. REQ-4: Error Boundary

新增 `MarkdownEditorErrorBoundary` 类组件，包裹 MDEditor。渲染崩溃时显示 antd `Empty` 组件替代白屏。

### 2. REQ-6: ARIA 无障碍

- 容器 `<div>` 添加 `role="application"` + `aria-label="Markdown 编辑器"`
- 工具栏 MutationObserver 注入 `role="toolbar"` + `aria-label="Markdown 格式化工具栏"`
- 工具栏按钮通过 title 匹配注入中文 `aria-label`
- 拖拽条注入 `role="separator"` + `aria-orientation="horizontal"` + `aria-label="调整编辑器高度"` + `tabIndex=0`
- textareaProps `aria-label` 从 "Markdown 编辑器" 更新为 "Markdown 内容编辑区"

### 3. REQ-2: DOM 清理改进

- 卸载时替换 textareaWarp DOM 节点移除所有匿名事件监听器
- 清理容器 ref 引用帮助 GC

### 4. REQ-5: CSS 补充

- 新增 `[role="application"]:focus-within` 焦点环样式
- 新增拖拽条 `cursor: ns-resize` + `touch-action: none` + `focus-visible` 样式

### 5. OPT-5: 点击事件隔离

- `handleContainerClick` 使用 `stopPropagation()` 阻止编辑器内部点击冒泡

### 6. MutationObserver 优化

- 原有工具栏 ARIA useEffect 在每次渲染时执行（无依赖数组），改为 MutationObserver + 依赖数组 `[]`
- 避免每次渲染执行 DOM 查询，仅在 DOM 变化时注入 ARIA 属性

## 涉及文件

- `pages/components/MarkdownEditor.tsx` — ErrorBoundary + ARIA + DOM 清理 + 点击隔离 + MutationObserver
- `pages/styles/markdown-editor.css` — 焦点环 + 拖拽条无障碍样式

## 验收标准

- [x] MarkdownEditorErrorBoundary 包裹 MDEditor 组件
- [x] 容器 div 添加 role="application" + aria-label
- [x] 拖拽条添加 role="separator" + aria-orientation + aria-label + tabIndex
- [x] 工具栏使用 MutationObserver 注入 ARIA（非每次渲染）
- [x] 组件卸载时清理 textareaWarp DOM 和容器 ref
- [x] 点击事件 stopPropagation 隔离
- [x] CSS 补充焦点环和拖拽条样式
- [x] TypeScript 类型检查通过
- [x] 74 个 MarkdownViewer 测试通过
- [x] REQ-3 服务端 sanitize 标记为下次迭代

## 第二轮修复：直接修改上游源码（2026-05-25）

> 基于质量评审报告 `tasks/review/Editor.factory.tsx.quality.md`，通过 patch-package 直接修复上游源码中的核心问题。

### 修复清单

| 编号 | 问题 | 优先级 | 修复措施 | 状态 |
|------|------|--------|---------|------|
| P0-1 | 10 处 useMemo 执行 dispatch 副作用 | P0 | 全部替换为 useEffect | ✅ 已修复 |
| P0-2 | mouseover/mouseleave 事件监听器永不清理 | P0 | 改用 useEffect + 命名函数 + cleanup | ✅ 已修复 |
| P1-1 | 滚动同步除零产生 NaN/Infinity | P1 | 添加 denominator/numerator === 0 防护 | ✅ 已修复 |
| P1-2 | setGroupPopFalse 直接修改输入参数 | P1 | 创建 result 新对象再修改 | ✅ 已修复 |
| P1-3 | initScroll 永久锁定滚动源 | P1 | 移除 initScroll ref 及引用 | ✅ 已修复 |
| P1-4 | height 变化触发两次 dispatch | P1 | 合并为单个 useEffect | ✅ 已修复 |
| P2-2 | 初始化 useEffect 展开 state | P2 | 只 dispatch 需要初始化的字段 | ✅ 已修复 |
| P2-5 | previewClassName 每次渲染重建 | P2 | 移入 useMemo 内部计算 | ✅ 已修复 |
| P2-6 | changeHandle 未经 useCallback | P2 | 包裹 useCallback | ✅ 已修复 |

### 修改文件

- `patches/@uiw+react-md-editor+4.1.0.patch` — 新增 Editor.factory.tsx/js 的 diff
- `node_modules/@uiw/react-md-editor/src/Editor.factory.tsx` — TypeScript 源码
- `node_modules/@uiw/react-md-editor/esm/Editor.factory.js` — ESM 编译输出
- `node_modules/@uiw/react-md-editor/lib/Editor.factory.js` — CommonJS 编译输出

### 验证

- [x] `pnpm build` 成功
- [x] `pnpm lint` 无新增错误
- [x] 已有测试通过（39 个预存失败与本次修改无关）

## 遗留事项

| 事项 | 优先级 | 说明 |
|------|--------|------|
| REQ-3 服务端 Markdown sanitize | P1 | 需引入 sanitize-html 或 isomorphic-dompurify，后端 API 添加 HTML 内容过滤 |
| 关注 React 19 对 useMemo 行为的变更 | P3 | 上游 10 处 useMemo 副作用在 React 19 下可能失效 |
| 评估替代编辑器 | P3 | 如果上游长期不修复，评估 @toast-ui/react-editor 等替代方案 |
