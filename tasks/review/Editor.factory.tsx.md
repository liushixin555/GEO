# 软件架构专家评审：Editor.factory.tsx

**文件**: `@uiw/react-md-editor/src/Editor.factory.tsx`
**评审角色**: 软件架构专家
**评审日期**: 2026-05-24
**评审结论**: ❌ 架构存在重大缺陷（CRITICAL）——工厂函数设计合理但内部实现严重违背单一职责原则，状态管理架构过度集中化，组件职责边界模糊，缺乏可测试性设计

---

## 一、架构概览

### 1.1 组件角色定位

`Editor.factory.tsx` 是 `@uiw/react-md-editor` 的核心工厂模块，采用 **工厂模式 + 依赖注入** 创建可配置的 Markdown 编辑器组件：

```
createMDEditor({ MarkdownPreview, TextArea })
        │
        ▼
  InternalMDEditor (forwardRef)
        │
        ├── EditorContext.Provider   ← 状态分发层
        ├── ToolbarVisibility ×2     ← 工具栏（顶部+底部）
        ├── TextAreaComponent        ← 文本编辑区
        ├── PreviewComponent         ← 预览区
        └── DragBar                  ← 高度拖拽调节
```

### 1.2 架构特征

| 架构属性 | 现状 | 评价 |
|---|---|---|
| 设计模式 | 工厂模式 + 依赖注入 | ✅ 合理——允许注入不同的预览和文本区实现 |
| 状态管理 | 单一 `useReducer` 管理全部状态 | ❌ 过度集中——13+ 状态字段由一个 reducer 管理 |
| 组件粒度 | 单个 250 行 forwardRef 组件 | ❌ 过大——混合了滚动同步、命令过滤、事件代理等职责 |
| 通信机制 | Context + useImperativeHandle | ⚠️ Context 作为全局状态总线，暴露面过大 |
| 可测试性 | 无抽象层、无依赖注入点（工厂参数除外） | ❌ 无法对内部逻辑进行单元测试 |

---

## 二、架构问题分析

### A1 [CRITICAL] — 巨型组件：严重违反单一职责原则

**位置**: 行 28-274，`InternalMDEditor` 整体

`InternalMDEditor` 是一个 **246 行** 的 `forwardRef` 组件，同时承担了至少 **6 种不同职责**：

| # | 职责 | 涉及行 | 应抽取为 |
|---|---|---|---|
| 1 | **状态初始化与同步** | 68-101, 115-148 | 自定义 Hook `useEditorState` |
| 2 | **命令/工具栏过滤** | 62-67 | 工具函数或自定义 Hook `useFilteredCommands` |
| 3 | **滚动同步** | 150-191 | 自定义 Hook `useScrollSync` |
| 4 | **预览渲染** | 193-210 | 独立组件 `EditorPreview` |
| 5 | **变更事件代理** | 216-230 | 自定义 Hook 或 HOC |
| 6 | **布局与样式计算** | 103-113, 212-213 | 工具函数 |

**架构影响**:
- 无法独立测试滚动同步逻辑、命令过滤逻辑、变更代理逻辑
- 任何职责变更都需要理解整个 246 行函数
- 渲染路径中所有逻辑耦合在同一次执行流中，无法按职责优化

**建议重构**:

```typescript
// 抽取为独立 Hooks
function useEditorState(props) { /* 状态初始化 + props→state 同步 */ }
function useFilteredCommands(commands, extraCommands, filter) { /* 命令过滤 */ }
function useScrollSync(textareaRef, previewRef, enabled) { /* 双向滚动同步 */ }

// 主组件只负责组装
const InternalMDEditor = forwardRef((props, ref) => {
  const state = useEditorState(props);
  const { cmds, extraCmds } = useFilteredCommands(...);
  useScrollSync(textareaRef, previewRef, enableScroll);
  // ... 仅保留 JSX 布局
});
```

---

### A2 [CRITICAL] — 状态管理过度集中化：单一 Reducer 的"上帝对象"

**位置**: 行 68-83

```typescript
let [state, dispatch] = useReducer(reducer, {
  markdown: propsValue,       // 内容数据
  preview: previewType,       // UI 模式
  components,                 // 组件注入
  height,                     // 布局尺寸
  minHeight,                  // 布局尺寸
  highlightEnable,            // 功能开关
  tabSize,                    // 编辑器配置
  defaultTabEnable,           // 编辑器配置
  scrollTop: 0,               // 滚动位置
  scrollTopPreview: 0,        // 滚动位置
  commands: cmds,             // 工具栏命令
  extraCommands: extraCmds,   // 工具栏命令
  fullscreen,                 // UI 模式
  barPopup: {},               // UI 弹出状态
});
```

**问题**: 13+ 个状态字段被塞入单一 reducer，但这些状态属于 **4 个完全不同的关注域**：

```
┌──────────────────────────────────────────────────┐
│                单一 Reducer（上帝对象）              │
├──────────────┬───────────────┬──────────┬────────┤
│  内容域       │  UI/布局域     │  配置域    │ 交互域  │
│  markdown    │  preview      │ tabSize  │ barPopup│
│  scrollTop   │  height       │ defaultTab│        │
│  scrollTop   │  minHeight    │ highlight │        │
│   Preview    │  fullscreen   │ commands  │        │
│              │  components   │ extraCmds │        │
└──────────────┴───────────────┴──────────┴────────┘
```

**架构影响**:
- 每次 `dispatch` 都触发 **整个 Context 消费者** 的重渲染——即使只改了 `scrollTop`
- Props 同步逻辑（10 处 `useMemo` 中的 dispatch）本质上是在手动实现一个 **双向绑定的 props→state 同步器**，而这恰恰是 React 不需要的——受控组件模式可以直接使用 props
- `scrollTop`/`scrollTopPreview` 这种高频变化的状态不应该和低频变化的配置放在同一个状态树中

**建议**: 按关注域拆分状态，或至少使用 `useMemo` 对 Context value 做精细化拆分：

```typescript
// 方案一：多 Context 拆分
const EditorConfigContext = createContext(...);  // 低频：tabSize, highlight, commands
const EditorUIContext = createContext(...);      // 中频：preview, fullscreen, height
const EditorDataContext = createContext(...);    // 高频：markdown, scrollTop

// 方案二：使用 React 18+ 的 useSyncExternalStore
// 或将滚动位置移出 Context，仅用 ref 管理
```

---

### A3 [MAJOR] — Props→State 同步机制架构反模式

**位置**: 行 115-148

整个文件用了 **10 个 `useMemo`** 来将 props 变化同步到内部 state：

```typescript
useMemo(() => propsValue !== state.markdown && dispatch({ markdown: propsValue || '' }), [propsValue, state.markdown]);
useMemo(() => previewType !== state.preview && dispatch({ preview: previewType }), [previewType]);
// ... 8 more
```

**架构诊断**: 这是经典的 **"派生状态反模式"（Derived State Anti-Pattern）**。

React 官方文档明确指出："当 props 可以作为组件的唯一数据源时，不需要将 props 复制到 state"。

**为什么这是一个架构问题而非简单的代码问题**:
1. **双向数据源冲突**: `markdown` 同时存在于 `props.value` 和 `state.markdown`，产生了"谁才是真实数据源"的歧义
2. **竞态风险**: props 更新和 dispatch 是异步的，可能出现短暂的不一致
3. **性能劣化**: 每次同步都触发一次额外的 dispatch→re-render 链

**建议**: 重新设计状态架构——

```typescript
// 受控模式：直接使用 props
// 非受控模式：仅在内部维护 state
// 用一个 flag 区分，而非两者混用
const isControlled = props.value !== undefined;
const markdown = isControlled ? props.value : state.markdown;
```

---

### A4 [MAJOR] — Context 通信架构过度暴露内部实现

**位置**: 行 88, 232

```typescript
// useImperativeHandle 暴露了整个 state
useImperativeHandle(ref, () => ({ ...state, container: container.current, dispatch }));

// Context Provider 也传递了整个 state
<EditorContext.Provider value={{ ...state, dispatch }}>
```

**问题**:
1. `useImperativeHandle` 将内部状态全部暴露给父组件——包括 `barPopup`、`scrollTop`、`textarea` 等纯内部实现细节。这违反了 **封装原则**，也导致无法在不破坏外部使用者的前提下重构内部状态结构
2. `dispatch` 被暴露到 Context 中，任何子组件都可以 dispatch 任意 action——这是 **无约束的状态变异通道**，缺少 action 类型的类型安全校验
3. `container: container.current` 在 ref callback 中可能为 null，但 TypeScript 类型签名要求 `HTMLDivElement`，存在类型安全漏洞

**建议**:
```typescript
// 对外暴露最小化接口
useImperativeHandle(ref, () => ({
  getMarkdown: () => state.markdown,
  setMarkdown: (v: string) => dispatch({ markdown: v }),
  getContainer: () => container.current,
}));

// Context 拆分为只读数据层 + 受控 action 层
```

---

### A5 [MAJOR] — 滚动同步架构：关注点耦合导致不可复用

**位置**: 行 150-191

滚动同步逻辑被直接嵌入主组件中，包含：
- `active` ref 追踪鼠标悬浮区域
- `initScroll` ref 控制首次滚动方向
- `textareaDomRef` ref 持有文本区 DOM
- `previewRef` ref 持有预览 DOM
- `handleScroll` 函数计算比例缩放

**架构问题**: 这段逻辑有约 40 行，与编辑器其他逻辑完全无关，是一个纯粹的 **"双容器滚动比例同步"** 算法。将其耦合在编辑器中意味着：
- 无法在其他场景复用（如 diff 视图、对照翻译等）
- 无法独立测试滚动同步算法
- 滚动同步的任何变更都可能影响编辑器核心渲染

**建议**: 抽取为独立的 `useScrollSync` Hook：

```typescript
function useScrollSync(
  elementA: RefObject<HTMLElement>,
  elementB: RefObject<HTMLElement>,
  options?: { enabled?: boolean; scale?: boolean }
) {
  // ... 独立实现
}
```

---

### A6 [MAJOR] — 事件监听器生命周期管理缺失

**位置**: 行 154-163

```typescript
useMemo(() => {
  textareaDomRef.current = state.textareaWarp;
  if (state.textareaWarp) {
    state.textareaWarp.addEventListener('mouseover', () => { active.current = 'text'; });
    state.textareaWarp.addEventListener('mouseleave', () => { active.current = 'preview'; });
  }
}, [state.textareaWarp]);
```

**架构问题**:
1. 在 `useMemo` 中注册事件监听器——`useMemo` 不是生命周期 Hook，React 不保证其执行的时机和次数
2. **没有 `removeEventListener` 清理**——每次 `textareaWarp` 变化时，旧 DOM 元素上的监听器永远不会被移除
3. 随着组件生命周期，可能累积大量孤儿监听器

**根因**: 缺乏统一的事件管理架构。事件监听器的注册/注销应该与 DOM 元素的生命周期绑定，而非依赖 `useMemo` 的执行时机。

---

### A7 [MINOR] — 工厂模式的类型安全性损失

**位置**: 行 20-26

```typescript
export function createMDEditor<
  TMarkdownPreview extends PreviewComponent,
  TTextArea extends TextAreaComponent,
>(options: { MarkdownPreview: TMarkdownPreview; TextArea: TTextArea }) {
  const PreviewComponent = MarkdownPreview as React.ComponentType<any>;
  const TextAreaComponent = TextArea as React.ComponentType<any>;
```

**问题**: 泛型参数 `TMarkdownPreview` 和 `TTextArea` 被声明但立即通过 `as` 断言为 `React.ComponentType<any>`，泛型信息完全丢失。这意味着：
- 返回的 `Editor.Markdown` 的类型虽然名义上是 `TMarkdownPreview`，但实际内部使用时已无类型约束
- `PreviewComponent` 和 `TextAreaComponent` 接收的 props 是 `any`，失去了对注入组件 props 的编译时校验

**建议**: 使用泛型约束保持类型流：
```typescript
// 定义注入组件必须满足的最小 props 接口
interface PreviewProps { source: string; onScroll?: (...args: any[]) => void; }
interface TextAreaProps { onChange?: (...args: any[]) => void; prefixCls?: string; }
// 然后用泛型保持类型传递
```

---

### A8 [MINOR] — 组件扩展点设计不完整

**位置**: 行 203

```typescript
const preview = components?.preview && components?.preview(state.markdown || '', state, dispatch);
if (preview && React.isValidElement(preview)) {
  mdPreview = (/* ... */);
}
```

**架构观察**: 文件提供了 `components.preview` 和 `components.textarea` 两个扩展点，但：
1. **扩展点不对称**: `preview` 接收 `(markdown, state, dispatch)`，而 `textarea` 通过 `renderTextarea` prop 传入，接口不一致
2. **缺少 Toolbar 扩展点**: 虽然可以通过 `commands`/`extraCommands` 添加命令按钮，但无法替换整个 Toolbar 组件
3. **缺少 DragBar 扩展点**: 高度调节条完全硬编码，无法自定义或替换

**建议**: 统一扩展点模型——使用 render props 或 component injection 模式，并确保所有可替换的子组件都有对应的扩展点。

---

## 三、架构评分

| 架构维度 | 评分 (1-10) | 说明 |
|---|---|---|
| **设计模式选择** | 7 | 工厂模式 + 依赖注入是合理的——允许灵活组合不同预览和文本区实现 |
| **单一职责** | 2 | 246 行巨型组件承担 6+ 职责，无法独立演进 |
| **状态管理架构** | 3 | 单一 reducer 管理 13+ 字段，关注域混杂，Context 消费者过度重渲染 |
| **封装性** | 3 | useImperativeHandle 暴露全部内部状态，Context 暴露裸 dispatch |
| **可测试性** | 2 | 所有逻辑内嵌在组件闭包中，无纯函数可独立测试，无依赖注入点 |
| **可复用性** | 3 | 滚动同步、命令过滤等逻辑耦合在主组件中，无法被其他场景复用 |
| **扩展性** | 5 | 扩展点存在但不完整、不对称；泛型类型安全性被断言丢弃 |
| **关注点分离** | 2 | 滚动、状态同步、事件代理、渲染布局全部耦合在同一函数体 |
| **性能架构** | 3 | 高频状态(滚动)与低频状态(配置)共享 Context，全树重渲染不可避免 |
| **错误边界** | 1 | 无 Error Boundary，Markdown 渲染失败将导致整个编辑器崩溃 |
| **综合评分** | **3.1 / 10** | |

---

## 四、推荐重构方案

### 4.1 目标架构

```
createMDEditor({ MarkdownPreview, TextArea })
    │
    ▼
MDEditor (组装层) ─── forwardRef
    │
    ├── useEditorState()      ← 状态管理 Hook（受控/非受控统一）
    ├── useFilteredCommands() ← 命令过滤 Hook
    ├── useScrollSync()       ← 滚动同步 Hook
    │
    ├── EditorConfigContext   ← 低频配置 Context
    ├── EditorUIContext       ← 中频 UI Context
    ├── EditorDataContext     ← 高频数据 Context
    │
    ├── ToolbarVisibility     ← 工具栏
    ├── EditorContent         ← 内容区（组合 TextArea + Preview）
    │   ├── TextAreaComponent
    │   └── EditorPreview     ← 独立预览组件
    └── DragBar               ← 拖拽条
```

### 4.2 优先级排序

| 优先级 | 重构项 | 影响 | 工作量 |
|---|---|---|---|
| P0 | 将 `useMemo` 副作用替换为 `useEffect` 或直接使用 props | 修复 React 契约违规 | 中 |
| P1 | 拆分为 3-4 个自定义 Hook | 解耦职责，恢复可测试性 | 中 |
| P1 | 按关注域拆分 Context（至少拆出滚动位置） | 减少不相关组件的重渲染 | 中 |
| P2 | 受控/非受控模式统一 | 消除派生状态反模式 | 大 |
| P2 | 精简 `useImperativeHandle` 暴露面 | 改善封装性 | 小 |
| P3 | 统一扩展点模型 | 提升可扩展性一致性 | 中 |
| P3 | 补充 Error Boundary | 防止渲染错误级联崩溃 | 小 |

---

## 五、架构风险矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| React 并发模式导致 `useMemo` 副作用行为不稳定 | 高 | 高 | P0 优先修复 |
| 大文档编辑时高频 dispatch 导致界面卡顿 | 中 | 高 | 拆分 Context + 滚动位置用 ref |
| 状态同步竞态导致 props 与 state 不一致 | 中 | 中 | 重构为受控组件模式 |
| `barPopup` 暴露导致外部代码直接依赖内部实现 | 低 | 高 | 精简 ref 暴露面 |
| 事件监听器泄漏导致内存增长 | 高 | 中 | 移入 useEffect + cleanup |

---

## 六、总结

`Editor.factory.tsx` 的 **工厂模式 + 依赖注入** 顶层设计是合理的——允许注入不同的 `MarkdownPreview` 和 `TextArea` 实现，提供了必要的灵活性。但实现层面存在严重的架构退化：

1. **单一组件承载过多职责**（状态管理、滚动同步、命令过滤、事件代理、渲染布局）
2. **状态管理过度集中化**（13+ 字段共享单一 reducer 和 Context）
3. **派生状态反模式**（10 处 useMemo→dispatch 手动同步 props 到 state）
4. **封装边界模糊**（useImperativeHandle 暴露全部内部实现）

这些问题相互叠加，导致组件 **无法独立测试、无法局部优化、无法安全重构**。建议按 4.2 的优先级排序逐步重构，首先修复 `useMemo` 副作用和状态拆分，恢复组件的基本健康度。
