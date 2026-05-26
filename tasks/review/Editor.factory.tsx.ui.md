# 软件 UI 专家评审：@uiw/react-md-editor Editor.factory.tsx

**文件路径**: `@uiw/react-md-editor/src/Editor.factory.tsx`
**评审角色**: 软件 UI 专家（视觉设计 · 交互体验 · 无障碍 · 设计系统合规 · 组件 API 用户体验 · 响应式 · Carbon Design System 一致性）
**评审日期**: 2026-05-24
**评审版本**: @uiw/react-md-editor@4.1.0
**评审结论**: ⛔ **REJECT** — 存在 6 项 CRITICAL 问题、5 项 HIGH 问题、4 项 MEDIUM 问题；`useMemo` 副作用反模式、零 ARIA 支持、巨型组件架构从根本上违背现代 UI 组件设计原则

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | `createMDEditor` 工厂函数，组装 MarkdownPreview + TextArea 组件，生成完整的 MDEditor 组件 |
| 代码行数 | 287 行 |
| 设计模式 | 工厂模式 + forwardRef + useReducer + Context Provider |
| UI 渲染职责 | 完整的编辑器 UI 布局（工具栏 + 编辑区 + 预览区 + 拖拽条），6+ 职责集于单一组件 |
| CSS 依赖 | `index.less`（GitHub 风格，~150 行）、`Toolbar/index.less`、`DragBar/index.less`、`TextArea/index.less` |
| 导出 | `createMDEditor` 工厂函数 + `RefMDEditor` 类型 |
| 内部组件 | `InternalMDEditor`（forwardRef，~245 行 JSX + 逻辑） |

---

## 二、UI 维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 视觉设计合规（Carbon DS） | 1.5 | 完全不遵循 Carbon——GitHub 风格 CSS、无 design token 出口、颜色/字体/圆角/阴影全面冲突 |
| 交互体验（UX） | 4.0 | 滚动同步可用但边界条件处理差；`useMemo` 副作用导致渲染不可预测 |
| 无障碍（a11y） | 0.5 | 零 ARIA 属性、零 label 关联、零焦点管理、零键盘导航 |
| 组件架构（UI 结构） | 2.0 | 287 行巨型组件承担 6+ UI 职责，无法独立测试/覆盖样式 |
| 组件 API 用户体验 | 5.0 | Props 设计直观但缺少主题/无障碍/响应式出口 |
| 响应式行为 | 2.0 | 无任何响应式逻辑，移动端完全不可用 |
| 代码质量（UI 相关） | 2.5 | `useMemo` 执行副作用、ref 未清理事件监听器、containerClick 无 debounce |
| **综合评分** | **2.4 / 10** | |

---

## 三、CRITICAL 问题（6 项）

### C-01. `useMemo` 执行副作用 — UI 渲染行为不可预测

**位置**: 第 89、115-149 行（共 10 处）

```tsx
// 第 115-118 行
useMemo(
  () => propsValue !== state.markdown && dispatch({ markdown: propsValue || '' }),
  [propsValue, state.markdown],
);

// 第 120 行
useMemo(() => previewType !== state.preview && dispatch({ preview: previewType }), [previewType]);

// 第 89 行
useMemo(() => (enableScrollRef.current = enableScroll), [enableScroll]);
```

**UI 问题分析**:

这是本文件最严重的反模式。`useMemo` 的语义是"计算并缓存值"，React 文档明确禁止在其中执行副作用。实际后果：

1. **渲染顺序不可控**: React 可能在同一次渲染中多次调用 `useMemo`（如 concurrent mode），导致同一 `dispatch` 被触发多次，UI 状态闪烁
2. **Strict Mode 双重渲染**: React 18 Strict Mode 下 `useMemo` 被调用两次（开发模式），导致 `dispatch` 被触发两次，编辑器初始化时可能出现双次状态更新
3. **`enableScrollRef` 赋值是副作用**: 第 89 行通过 `useMemo` 给 ref 赋值，这是纯副作用，完全误用了 `useMemo`
4. **`state.markdown` 在依赖数组中**: 第 117 行的依赖数组包含 `state.markdown`，当 `dispatch` 更新 `state.markdown` 后会再次触发 `useMemo`，形成"更新→触发→再更新"的循环

**对比规范做法**:

```tsx
// 正确：使用 useEffect 处理 props → state 同步
useEffect(() => {
  if (propsValue !== state.markdown) {
    dispatch({ markdown: propsValue || '' });
  }
}, [propsValue]);
```

**对本项目的影响**: 在文章编辑页面（`ArticleDetail.tsx`）中，大文档的 props 更新可能导致不可预测的编辑器行为——光标跳动、滚动位置重置、内容闪烁。

---

### C-02. 零 ARIA 支持 — 完全无法用于无障碍场景

**位置**: 全文件（231-273 行 JSX 渲染区域）

```tsx
// 第 231-273 行 — 完整的 JSX 渲染
<EditorContext.Provider value={{ ...state, dispatch }}>
  <div ref={container} className={cls} {...other} onClick={containerClick} style={containerStyle}>
    <ToolbarVisibility ... />
    <div className={`${prefixCls}-content`}>
      {/(edit|live)/.test(state.preview || '') && <TextAreaComponent ... />}
      {/(live|preview)/.test(state.preview || '') && mdPreview}
    </div>
    {visibleDragbar && !state.fullscreen && <DragBar ... />}
    <ToolbarVisibility ... />
  </div>
</EditorContext.Provider>
```

**缺失项**:

| WCAG 准则 | 要求 | 当前状态 | 影响 |
|---|---|---|---|
| 1.3.1 信息与关系 (A) | 容器需 `role="application"` | ❌ 缺失 | 屏幕阅读器无法识别富文本编辑区域 |
| 4.1.2 名称、角色、值 (A) | 编辑区需 `aria-label` | ❌ 缺失 | 屏幕阅读器无法标识输入区域用途 |
| 1.3.1 工具栏标注 (A) | 工具栏需 `role="toolbar"` + `aria-label` | ❌ 缺失 | 工具栏对辅助技术不可见 |
| 2.4.7 焦点可见 (AA) | 焦点元素需可见的 focus ring | ❌ 缺失 | 键盘用户无法定位焦点 |
| 1.4.3 对比度 (AA) | UI 文本对比度 ≥ 4.5:1 | ⚠️ 未验证 | 可能不满足最低对比度 |
| 2.1.1 键盘可操作 (A) | 所有功能可键盘操作 | ❌ 拖拽条不可 | 部分功能键盘不可达 |
| 4.1.1 解析 (A) | ARIA 属性语法正确 | ❌ 无 ARIA | 不适用 |

**本文件比 `Context.tsx` 和 `Editor.common.tsx` 更严重**——因为本文件直接渲染 DOM 节点，是 ARIA 属性应该被挂载的位置。287 行 JSX 中没有任何一个 `role`、`aria-*`、`tabIndex` 属性。

---

### C-03. 事件监听器无清理 — UI 行为泄漏

**位置**: 第 154-163 行

```tsx
useMemo(() => {
  textareaDomRef.current = state.textareaWarp;
  if (state.textareaWarp) {
    state.textareaWarp.addEventListener('mouseover', () => {
      active.current = 'text';
    });
    state.textareaWarp.addEventListener('mouseleave', () => {
      active.current = 'preview';
    });
  }
}, [state.textareaWarp]);
```

**UI 问题分析**:

1. **事件监听器永不移除**: 每次 `state.textareaWarp` 变化时，在新的 DOM 元素上注册 `mouseover` 和 `mouseleave` 监听器，但从不调用 `removeEventListener`。如果 textareaWrap DOM 节点被替换（React 重渲染），旧节点上的监听器成为幽灵监听器
2. **`useMemo` 再次被误用**: DOM 事件注册是纯副作用，应使用 `useEffect`
3. **箭头函数匿名监听器**: 由于使用匿名箭头函数，即使想移除也做不到（`removeEventListener` 需要相同引用）

**内存泄漏路径**:

```
组件挂载 → textareaWarp 赋值 → 注册 mouseover/mouseleave
   ↓
React 重渲染 → textareaWarp 更新 → 注册新的 mouseover/mouseleave（旧的无法移除）
   ↓
N 次重渲染后 → 2N 个事件监听器累积
```

**对本项目的影响**: 在文章编辑页面长时间使用编辑器时，可能累积大量幽灵监听器，导致滚动同步行为异常（`active.current` 被多个监听器竞争修改）。

---

### C-04. 巨型组件架构 — 6+ UI 职责集中于单一组件

**位置**: 第 28-274 行（`InternalMDEditor` 函数体）

287 行的 `InternalMDEditor` 承担了以下 UI 职责：

| 职责 | 行数 | 应拆分为 |
|---|---|---|
| Props 解析与默认值 | 30-61 (31行) | `useEditorProps` hook |
| 状态初始化 + 同步 | 68-101 (33行) | `useEditorState` hook |
| Props → State 同步（10 处 useMemo） | 115-149 (34行) | `usePropsSync` hook |
| 滚动同步逻辑 | 154-191 (37行) | `useScrollSync` hook |
| 预览区渲染逻辑 | 193-210 (17行) | `<EditorPreview>` 组件 |
| 主渲染 JSX | 231-273 (42行) | 应拆分为多个子组件 |

**UI 架构问题**:

1. **无法独立覆盖样式**: 所有 CSS class 生成逻辑（第 103-113 行）集中在一个函数中，消费者无法只覆盖部分区域的 class
2. **无法独立测试**: 滚动同步逻辑、事件处理、渲染逻辑耦合在一起，无法编写独立的单元测试
3. **与 Carbon/antd 模式冲突**: Carbon Design System 的组件遵循"单一职责"原则——一个组件负责一个 UI 关注点。287 行的巨型组件违反此原则
4. **Context Provider 包含过宽**: 第 232 行 `value={{ ...state, dispatch }}` 将所有状态暴露给所有 Consumer，任何一个状态变化都导致整棵子树重渲染

---

### C-05. `useImperativeHandle` 泄露完整状态 — 封装边界破坏

**位置**: 第 88 行

```tsx
useImperativeHandle(ref, () => ({ ...state, container: container.current, dispatch }));
```

**UI 问题分析**:

1. **暴露 `dispatch` 给消费者**: 消费者可以通过 `ref.dispatch({ markdown: '<script>alert(1)</script>' })` 绕过所有 props 校验和 `onChange` 回调，直接注入内容到编辑器。这是一个安全隐患
2. **暴露完整内部状态**: `{ ...state }` 展开了所有内部状态（包括 `barPopup`、`scrollTop`、`commands` 等实现细节），消费者可以随意修改
3. **无类型约束的命令式 API**: `RefMDEditor` 继承自 `ContextStore`（包含 `[key: string]: any` 索引签名），命令式 API 完全无类型安全
4. **与 antd `ref` 模式冲突**: antd 组件通过 `ref` 暴露精简的命令式 API（如 `Input.ref.focus()`、`Form.ref.validateFields()`），而非暴露整个内部状态

**对比规范做法**:

```tsx
// antd Input 的 ref 设计
useImperativeHandle(ref, () => ({
  focus: () => textareaRef.current?.focus(),
  blur: () => textareaRef.current?.blur(),
  getMarkdown: () => state.markdown,
  setMarkdown: (v: string) => dispatch({ markdown: v }),
}));
```

---

### C-06. 滚动同步实现存在边界缺陷 — UI 行为异常

**位置**: 第 166-191 行

```tsx
const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'text' | 'preview') => {
  // ...
  const scale =
    (textareaDom.scrollHeight - textareaDom.offsetHeight) / (previewDom.scrollHeight - previewDom.offsetHeight);
  if (e.target === textareaDom && active.current === 'text') {
    previewDom.scrollTop = textareaDom.scrollTop / scale;
  }
  // ...
  dispatch({ scrollTop });
};
```

**UI 问题分析**:

1. **除零风险**: 当 `previewDom.scrollHeight - previewDom.offsetHeight === 0`（预览区内容不足一屏）时，`scale` 为 `Infinity`，导致 `textareaDom.scrollTop / Infinity = 0`，预览区永远滚动到顶部
2. **每次滚动触发 dispatch**: 第 189 行 `dispatch({ scrollTop })` 在每次滚动事件中被调用。滚动事件触发频率极高（通常 60fps），大量 dispatch 可能导致 UI 卡顿
3. **`active.current` 状态竞争**: `mouseover`/`mouseleave` 事件异步更新 `active.current`，在快速切换编辑区/预览区时，滚动同步的方向判断可能错误
4. **不支持触控**: 滚动同步仅通过 `onScroll` 事件工作，触控设备的惯性滚动可能导致同步延迟或跳跃

---

## 四、HIGH 问题（5 项）

### H-01. 正则表达式渲染条件 — 脆弱的 UI 切换逻辑

**位置**: 第 242、253 行

```tsx
{/(edit|live)/.test(state.preview || '') && <TextAreaComponent ... />}
{/(live|preview)/.test(state.preview || '') && mdPreview}
```

**UI 问题分析**:

1. **正则匹配意外值**: 如果 `state.preview` 为任何包含 `edit`、`live`、`preview` 子串的字符串（如 `editable`），正则都会匹配成功，导致意外的 UI 元素显示
2. **无 fallback 处理**: 如果 `state.preview` 为意外值（如 `undefined`、`null`、空字符串），两个条件都不匹配，编辑器显示空白
3. **TypeScript 不提供类型收窄**: 正则表达式 `test` 无法收窄 `state.preview` 的类型，后续代码无法从中获益

**对比规范做法**:

```tsx
// 正确：使用精确值匹配
const showEditor = state.preview === 'edit' || state.preview === 'live';
const showPreview = state.preview === 'live' || state.preview === 'preview';
```

---

### H-02. `containerClick` 无条件关闭所有弹窗 — 粗暴的 UI 交互

**位置**: 第 213 行

```tsx
const containerClick = () => dispatch({ barPopup: { ...setGroupPopFalse(state.barPopup) } });
```

**UI 问题分析**:

1. **关闭所有弹窗**: `setGroupPopFalse` 将所有 `barPopup` 键设为 `false`，不考虑用户当前操作的上下文。如果用户在弹窗内点击（如选择标题级别），点击事件冒泡到容器后弹窗被关闭
2. **无事件目标判断**: 没有检查 `e.target` 是否在弹窗内部，导致弹窗内的有效交互也被取消
3. **无动画过渡**: 直接 `dispatch` 状态变更，弹窗瞬间消失，不符合 Carbon Design System 的过渡要求（fade/slide 动画）

---

### H-03. 初始化 dispatch 传播完整 state — 性能浪费

**位置**: 第 90-101 行

```tsx
useEffect(() => {
  const stateInit: ContextStore = {};
  if (container.current) {
    stateInit.container = container.current || undefined;
  }
  stateInit.markdown = propsValue || '';
  stateInit.barPopup = {};
  if (dispatch) {
    dispatch({ ...state, ...stateInit });
  }
}, []);
```

**UI 问题分析**:

1. **`...state` 展开**: 将完整的 `useReducer` 初始状态（包含 `commands`、`extraCommands` 等大对象）重新 dispatch 一次，触发所有 Context Consumer 重渲染
2. **仅覆盖 3 个字段**: 实际只需更新 `container`、`markdown`、`barPopup`，但却将所有初始状态重复推送
3. **ESLint disable 注释**: `// eslint-disable-next-line react-hooks/exhaustive-deps` 屏蔽了依赖数组警告，隐藏了潜在的依赖遗漏问题

---

### H-04. `handleScroll` 在渲染函数内创建闭包 — 可能捕获过期 state

**位置**: 第 166-191 行（`handleScroll` 定义）、第 194 行（传递给 JSX）

```tsx
const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'text' | 'preview') => {
  // ...
  dispatch({ scrollTop });
};

const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>) => handleScroll(e, 'preview');
```

**UI 问题分析**:

1. **每次渲染重建**: `handleScroll` 和 `handlePreviewScroll` 在每次渲染时重新创建，导致预览组件的 `onScroll` prop 每次都是新引用，可能触发子组件不必要重渲染
2. **`useMemo` 依赖引用**: 第 195-202 行 `useMemo` 的依赖数组 `[previewClassName, previewOptions, state.markdown]` 不包含 `handlePreviewScroll`，但实际上 `handlePreviewScroll` 的闭包捕获了 `dispatch` 和 `enableScrollRef`，如果这些引用变化，缓存的 JSX 中的 `onScroll` 仍指向旧闭包

---

### H-05. `onHeightChange` 在 `useMemo` 中调用 — 可能导致无限循环

**位置**: 第 138-141 行

```tsx
useMemo(
  () => height !== state.height && onHeightChange && onHeightChange(state.height, height, state),
  [height, onHeightChange, state],
);
```

**UI 问题分析**:

1. **`state` 在依赖数组中**: 第 141 行将整个 `state` 对象作为依赖，state 的任何变化都会触发此 `useMemo`。如果 `onHeightChange` 回调触发了父组件的 state 更新（如更新高度 prop），则形成：`height prop 变化 → useMemo → onHeightChange → 父组件 setState → height prop 变化` 的无限循环
2. **`state` 引用每次都不同**: `useReducer` 返回的 state 在每次 dispatch 后都是新对象引用，即使实际值未变，`useMemo` 也会重新计算

---

## 五、MEDIUM 问题（4 项）

### M-01. BEM 命名与 Carbon/antd 不一致

**位置**: 第 31、103-113、193、241、244、257 行

```tsx
const prefixCls = 'w-md-editor';
// 生成的 class：
// w-md-editor、w-md-editor-rtl、w-md-editor-show-live、w-md-editor-fullscreen、
// w-md-editor-preview、w-md-editor-content、w-md-editor-input
```

**UI 问题分析**:

| 维度 | 本组件 | Carbon/antd 惯例 |
|---|---|---|
| 前缀 | `w-md-editor` | antd 使用 `ant-` 前缀 |
| 命名风格 | 全小写 + 连字符 | antd 使用 `ant-{component}-{element}` |
| 状态修饰 | `-show-live`、`-fullscreen` | antd 使用 `ant-btn-primary`、`ant-btn-disabled` |
| 方向 | `w-md-editor-rtl` | antd 使用 `ant-rtl` 全局 class |

`prefixCls` 可配置但本项目的封装层未覆盖此 prop，导致 CSS 选择器依赖于 `w-md-editor` 前缀，增加了样式覆盖的脆弱性。

---

### M-02. `wmde-markdown-var` 硬编码 class

**位置**: 第 105 行

```tsx
const cls = [
  className,
  'wmde-markdown-var',  // ← 硬编码
  direction ? `${prefixCls}-${direction}` : null,
  prefixCls,
  // ...
].filter(Boolean).join(' ').trim();
```

`wmde-markdown-var` 是 CSS 变量作用域 class，硬编码为 `wmde-` 前缀而非使用 `prefixCls`。这意味着即使消费者传入自定义 `prefixCls`，这个 class 仍然是 `wmde-markdown-var`，导致 CSS 变量查找可能失败。

---

### M-03. `DragBar` 高度传递使用 `as` 类型断言

**位置**: 第 258 行

```tsx
<DragBar
  height={state.height as number}
  maxHeight={maxHeight!}
  minHeight={minHeight!}
  onChange={dragBarChange}
/>
```

**UI 问题分析**:

`state.height` 类型为 `React.CSSProperties['height']`（可能是 `string | number`），通过 `as number` 强制断言为 `number`。如果 `state.height` 实际为 `'100%'`（字符串，来自第 212 行的 fallback），传给 `DragBar` 的高度值类型不匹配，可能导致拖拽条渲染异常。

---

### M-04. `components?.preview` 运行时类型检查不一致

**位置**: 第 203-210 行

```tsx
const preview = components?.preview && components?.preview(state.markdown || '', state, dispatch);
if (preview && React.isValidElement(preview)) {
  mdPreview = (
    <div className={previewClassName} ref={previewRef} onScroll={handlePreviewScroll}>
      {preview}
    </div>
  );
}
```

**UI 问题分析**:

1. **条件短路不可靠**: `components?.preview && components?.preview(...)` 在 `components.preview` 返回 falsy 值（如 `null`、`0`、`""`）时会短路，但 `components?.preview` 返回 `0` 或 `""` 在某些场景下可能是合法的自定义渲染结果
2. **覆盖 `useMemo` 缓存**: `mdPreview` 在第 195 行被 `useMemo` 缓存，但第 205-210 行的条件可能覆盖它，使 `useMemo` 的缓存失效。这种"先缓存再覆盖"的模式破坏了 `useMemo` 的优化目的
3. **`onScroll` 不一致**: 条件分支中的 `<div>` 使用 `onScroll={handlePreviewScroll}`（第 206 行），而 `useMemo` 分支中的 `<PreviewComponent>` 使用 `{...previewOptions} onScroll={handlePreviewScroll}`（第 198 行），两个分支的 onScroll 传递方式不同

---

## 六、DESIGN.md 合规性分析

### 6.1 颜色体系 — 完全不合规

**DESIGN.md 要求**: IBM Blue (#0f62fe) 品牌色，Charcoal (#161616) 文字，白 (#ffffff) 画布。

**实际行为**: 本文件通过 `prefixCls` + CSS class 委托给 `index.less`（GitHub 风格），无任何 Carbon 颜色 token 的引用或出口。

| 设计元素 | DESIGN.md | 本文件处理方式 | 合规 |
|---|---|---|---|
| 品牌色 | `#0f62fe` | 无提及，委托 CSS | ❌ |
| 文字色 | `#161616` | 无提及，委托 CSS | ❌ |
| 画布色 | `#ffffff` | 无提及，委托 CSS | ❌ |
| 表面色 | `#f4f4f4` | 无提及，委托 CSS | ❌ |
| 强调色 | 仅 IBM Blue | 无提及，委托 CSS | ❌ |

### 6.2 字体 — 完全不合规

**DESIGN.md 要求**: IBM Plex Sans（正文）/ IBM Plex Mono（代码），16px/400/1.50。

**实际行为**: 本文件无任何字体设置，完全依赖 CSS。`index.less` 使用系统字体栈。

### 6.3 圆角 — 完全不合规

**DESIGN.md 要求**: `rounded.none` (0px)。

**实际行为**: 无圆角控制出口，委托 CSS（默认 3px）。

### 6.4 间距 — 完全不合规

**DESIGN.md 要求**: 4px 基准网格。

**实际行为**: 无间距控制出口。硬编码值如 `height = 200`（第 38 行）、`maxHeight = 1200`（第 47 行）、`minHeight = 100`（第 48 行）不遵循 4px 网格。

| 硬编码值 | 值 | 4px 对齐 | 建议值 |
|---|---|---|---|
| 默认高度 | 200 | ✅ 200/4=50 | 200 |
| 最大高度 | 1200 | ✅ 1200/4=300 | 1200 |
| 最小高度 | 100 | ✅ 100/4=25 | 100 |

间距硬编码值恰好对齐 4px 网格（纯巧合），但本文件不提供任何让消费者对齐的机制。

---

## 七、与 antd 组件规范对比

### 7.1 组件 API 对比

| API 维度 | antd 组件 | Editor.factory.tsx | 合规 |
|---|---|---|---|
| 主题定制 | `ConfigProvider` + token | 无，仅 `prefixCls` | ❌ |
| 国际化 | `ConfigProvider` + locale | 无 i18n 出口 | ❌ |
| 受控/非受控 | 双模式支持 | 仅受控模式 | ⚠️ |
| 无障碍 | 内置 ARIA + keyboard nav | 零 ARIA | ❌ |
| 尺寸变体 | `size: 'small' \| 'middle' \| 'large'` | 仅 `height` 数字 | ❌ |
| 状态变体 | `status: 'error' \| 'warning'` | 无 | ❌ |
| 前后缀 | `addonBefore` / `addonAfter` | 无 | ❌ |
| ref API | 精简命令式方法 | 暴露完整 state + dispatch | ❌ |

### 7.2 React 模式对比

| 模式 | antd/React 最佳实践 | Editor.factory.tsx | 问题 |
|---|---|---|---|
| 状态同步 | `useEffect` | `useMemo`（10 处） | C-01 |
| 事件监听 | `useEffect` + cleanup | `useMemo` + 无 cleanup | C-03 |
| ref 暴露 | `useImperativeHandle` 精简 API | 展开完整 state | C-05 |
| Context 值 | `useMemo` 缓存对象 | `{ ...state, dispatch }` 每次新引用 | C-04 |
| 条件渲染 | 精确值匹配 | 正则表达式 | H-01 |

---

## 八、响应式行为评审

### 8.1 响应式能力 — 完全缺失

本文件不包含任何响应式逻辑：

1. **无媒体查询**: 无 CSS `@media` 断点
2. **无容器查询**: 无 CSS `@container` 查询
3. **无 JS 窗口检测**: 无 `window.matchMedia` 或 `ResizeObserver`
4. **无自适应模式切换**: `live` 模式在窄屏下编辑区和预览区各 50% 宽度，无法使用

**响应式失败场景**:

| 屏幕宽度 | 模式 | 预期行为 | 实际行为 |
|---|---|---|---|
| < 320px | live | 单列（编辑或预览） | 50/50 分栏，每侧 < 160px |
| 320-672px | live | 单列自动切换 | 50/50 分栏，每侧 < 336px |
| 672-1056px | live | 40/60 分栏 | 50/50 分栏 |
| > 1056px | live | 50/50 分栏 | ✅ 可用 |

### 8.2 触摸设备支持

| 交互 | 鼠标 | 触摸 | 状态 |
|---|---|---|---|
| 工具栏按钮 | ✅ | ⚠️ 触摸目标过小 | H-02（继承自 Editor.common） |
| 拖拽条 | ✅ | ❌ 仅 mouse 事件 | 不可用 |
| 滚动同步 | ✅ | ⚠️ 惯性滚动不同步 | 部分可用 |
| 编辑区 | ✅ | ✅ | 正常 |

---

## 九、暗色/亮色模式评审

### 9.1 颜色模式

本文件不直接处理颜色模式，但通过 `wmde-markdown-var` class（第 105 行）激活 CSS 变量作用域。颜色模式的控制委托给父元素：

```tsx
// 本项目的做法（MarkdownEditor.tsx 封装层）
<div data-color-mode="light" className="markdown-editor-wrapper">
  <MDEditor ... />
</div>
```

**问题**: 编辑器内部没有验证 `data-color-mode` 是否正确设置，如果消费者忘记设置，CSS 变量可能回退到默认值（部分 `undefined`），导致 UI 渲染异常。

---

## 十、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 行号 | 影响 |
|---|---|---|---|---|---|
| C-01 | CRITICAL | 代码质量 | `useMemo` 执行副作用（10 处 dispatch + 1 处 ref 赋值） | 89,115-149 | 渲染不可预测、Strict Mode 双触发、潜在无限循环 |
| C-02 | CRITICAL | 无障碍 | 零 ARIA 属性、零 label、零焦点管理 | 231-273 | 屏幕阅读器完全不可用 |
| C-03 | CRITICAL | 内存/行为 | 事件监听器注册无清理 | 154-163 | 内存泄漏、滚动同步竞争 |
| C-04 | CRITICAL | 架构 | 287 行巨型组件 6+ 职责 | 28-274 | 无法独立测试/覆盖样式 |
| C-05 | CRITICAL | 安全/封装 | `useImperativeHandle` 泄露完整 state + dispatch | 88 | 外部可绕过校验直接注入内容 |
| C-06 | CRITICAL | 交互 | 滚动同步除零风险 + 高频 dispatch | 166-191 | 预览区滚动异常、UI 卡顿 |
| H-01 | HIGH | 逻辑 | 正则表达式渲染条件匹配不精确 | 242,253 | 意外值导致空白或双显示 |
| H-02 | HIGH | 交互 | `containerClick` 无条件关闭所有弹窗 | 213 | 弹窗内点击被取消、无动画过渡 |
| H-03 | HIGH | 性能 | 初始化 dispatch 传播完整 state | 90-101 | 不必要的全组件树重渲染 |
| H-04 | HIGH | 性能 | `handleScroll` 每次渲染重建闭包 | 166-194 | 子组件不必要重渲染 |
| H-05 | HIGH | 稳定性 | `onHeightChange` 在 useMemo 中调用，`state` 在依赖中 | 138-141 | 潜在无限循环 |
| M-01 | MEDIUM | 命名 | BEM 命名与 Carbon/antd 不一致 | 31,103-113 | CSS 选择器脆弱 |
| M-02 | MEDIUM | 硬编码 | `wmde-markdown-var` 未使用 `prefixCls` | 105 | 自定义 prefixCls 时 CSS 变量失效 |
| M-03 | MEDIUM | 类型 | `state.height as number` 强制断言 | 258 | 字符串高度值导致拖拽异常 |
| M-04 | MEDIUM | 逻辑 | `components?.preview` 条件覆盖 `useMemo` 缓存 | 203-210 | useMemo 优化失效 |

---

## 十一、对本项目（by_geo）的 UI 建议

### P0 — 建议立即处理

1. **在 `MarkdownEditor.tsx` 封装层注入 ARIA 标注**:
   ```tsx
   <MDEditor
     textareaProps={{ 'aria-label': 'Markdown 内容编辑区' }}
     // ...
   />
   ```
   通过 `useEffect` 在 mount 后为工具栏容器添加 `role="toolbar"` + `aria-label`

2. **为 `markdown-editor.css` 添加 focus-visible 规则**:
   ```css
   .markdown-editor-wrapper :focus-visible {
     outline: 2px solid var(--color-primary) !important;
     outline-offset: -2px !important;
   }
   ```

### P1 — 建议下个迭代处理

3. **添加 `onScroll` throttle**: 在封装层使用 `useRef` + `requestAnimationFrame` 节流滚动同步，避免高频 dispatch
4. **响应式模式切换**: 监听窗口宽度，< 672px 时自动切换为 `'edit'` 模式
5. **ErrorBoundary 包裹**: 在 `MarkdownEditor.tsx` 中添加错误边界，防止上游组件崩溃影响页面

### P2 — 可纳入技术债

6. **监控 `@uiw/react-md-editor` 版本更新**: 当前版本 4.1.0 的 `useMemo` 副作用问题在上游修复前无法解决
7. **考虑替代方案**: 如果上游长期不修复 CRITICAL 问题，评估 fork 或替换为其他 Markdown 编辑器

---

## 十二、评审总结

`Editor.factory.tsx` 是 `@uiw/react-md-editor` 的核心渲染引擎，287 行代码承担了编辑器的全部 UI 构建职责。

**核心矛盾**:

1. **`useMemo` 反模式**（C-01）是本文件最根本的设计错误——10 处 `useMemo` 被用来执行副作用（dispatch 调用），违反 React 基本语义，导致渲染行为不可预测。这不仅是代码质量问题，而是 **UI 行为正确性**问题
2. **零无障碍支持**（C-02）使编辑器在法律合规场景（如政府网站无障碍法规）下完全不可用
3. **巨型组件架构**（C-04）使得所有 UI 关注点（布局、滚动、主题、事件）纠缠在一起，消费者无法在不修改源码的情况下修复任何单一问题

**正面评价**:

- `createMDEditor` 工厂模式允许注入自定义的 `MarkdownPreview` 和 `TextArea` 组件，提供了有限的扩展性
- 滚动同步的思路（比例映射）是正确的，只是实现存在边界缺陷
- `prefixCls` 可配置，为 CSS 覆盖提供了基本的钩子
- `commandsFilter` prop 允许过滤工具栏命令，提供了 UI 定制的出口

**综合评分 2.4/10** — 作为编辑器的 UI 核心渲染层，本文件存在系统性的 React 反模式（`useMemo` 副作用）和完全缺失的无障碍支持。287 行的巨型组件架构使问题难以通过封装层修复。建议本项目在 `MarkdownEditor.tsx` 封装层中尽可能隔离这些缺陷，同时关注上游版本更新或考虑替代方案。

---

*软件 UI 专家评审完成 — 2026-05-24*
