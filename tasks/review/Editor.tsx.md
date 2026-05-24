# 软件架构专家评审：Editor.tsx

**文件**: `@uiw/react-md-editor/src/Editor.tsx` (v4.1.0)
**关联核心文件**: `Editor.factory.tsx`（287行）、`Context.tsx`（39行）、`Types.ts`（156行）、`components/TextArea/factory.tsx`（121行）
**评审角色**: 软件架构专家
**评审日期**: 2026-05-24
**评审结论**: ✅ APPROVE 7.8/10（工厂模式设计优雅、关注点分离清晰，但存在若干工程化改进空间）

---

## 一、架构定位与上下文

### 1.1 模块在包中的角色

`Editor.tsx` 是 `@uiw/react-md-editor` 库的**核心编辑器入口**，仅 8 行代码，通过工厂模式将 Markdown 预览组件和文本区域组件注入到编辑器工厂中，生成最终的 `MDEditor` 组件。

```
┌─────────────────────────────────────────────────────────────────────┐
│                    @uiw/react-md-editor v4.1.0                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     Editor.tsx (入口层)                       │   │
│  │                                                              │   │
│  │  import MarkdownPreview ──┐                                  │   │
│  │  import TextArea ─────────┤──→ createMDEditor() → MDEditor   │   │
│  │  export type RefMDEditor   │                                  │   │
│  └────────────────────────────┼─────────────────────────────────┘   │
│                               │                                     │
│  ┌────────────────────────────┼─────────────────────────────────┐   │
│  │               Editor.factory.tsx (工厂层, 287行)              │   │
│  │                            ▼                                  │   │
│  │  createMDEditor({ MarkdownPreview, TextArea })               │   │
│  │    ├── forwardRef<RefMDEditor, MDEditorProps>                │   │
│  │    ├── useReducer(reducer, initialState)                     │   │
│  │    ├── EditorContext.Provider                                │   │
│  │    ├── ToolbarVisibility (x2)                                │   │
│  │    ├── TextAreaComponent (编辑区)                            │   │
│  │    ├── PreviewComponent (预览区)                             │   │
│  │    ├── DragBar (拖拽调整高度)                                │   │
│  │    └── ScrollSync (滚动同步)                                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐    │
│  │  Context.tsx (状态层) │  │  Types.ts (契约层, 156行)        │    │
│  │  ├── reducer()       │  │  ├── MDEditorProps (30+ 属性)    │    │
│  │  ├── EditorContext   │  │  ├── Statistics                  │    │
│  │  ├── ContextStore    │  │  ├── ICommand (命令接口)          │    │
│  │  └── PreviewType     │  │  └── components (可替换组件)     │    │
│  └──────────────────────┘  └──────────────────────────────────┘    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                components/TextArea/ (文本区域层)              │   │
│  │                                                              │   │
│  │  index.tsx ──→ createTextArea({ Markdown, useMinHeight })    │   │
│  │       │                                                      │   │
│  │       ├── factory.tsx — 工厂函数，创建 TextArea 组件         │   │
│  │       ├── Markdown.tsx — 语法高亮层                          │   │
│  │       ├── Textarea.tsx — 原生 textarea 封装                  │   │
│  │       ├── handleKeyDown.ts — 键盘事件处理                    │   │
│  │       └── shortcuts.ts — 快捷键映射                          │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Editor.tsx 源码（8行完整代码）

```typescript
import MarkdownPreview from '@uiw/react-markdown-preview';
import TextArea from './components/TextArea/';
import { createMDEditor } from './Editor.factory';

export type { RefMDEditor } from './Editor.factory';

export default createMDEditor({ MarkdownPreview, TextArea });
```

### 1.3 工厂注入的依赖关系

```
Editor.tsx
  ├── MarkdownPreview ← @uiw/react-markdown-preview (外部依赖)
  │     └── 用于编辑器的实时预览渲染
  ├── TextArea ← ./components/TextArea/ (内部模块)
  │     └── createTextArea({ Markdown, useMinHeight: true })
  │           ├── Markdown ← 语法高亮层 (CodeMirror/Monaco-like)
  │           └── useMinHeight: true ← 最小高度约束
  └── createMDEditor ← ./Editor.factory (核心工厂)
        └── 闭包捕获 MarkdownPreview + TextArea，生成 forwardRef 组件
```

---

## 二、架构模式分析

### 2.1 工厂模式（Factory Pattern） — 优秀

`createMDEditor` 是一个**泛型工厂函数**，通过泛型约束保留注入组件的类型信息：

```typescript
export function createMDEditor<
  TMarkdownPreview extends PreviewComponent,
  TTextArea extends TextAreaComponent,
>(options: { MarkdownPreview: TMarkdownPreview; TextArea: TTextArea }) {
```

**设计亮点**：

1. **依赖注入（DI）**: MarkdownPreview 和 TextArea 作为可替换的依赖项注入，不硬编码在工厂内部。这使库可以通过不同入口提供不同变体（完整版/nohighlight版）而无需修改工厂代码。

2. **类型保留**: 泛型 `<TMarkdownPreview, TTextArea>` 确保注入组件的类型信息不会在工厂内部丢失，`Editor.Markdown` 静态属性保留了 `TMarkdownPreview` 的原始类型。

3. **闭包隔离**: 工厂函数通过闭包捕获 `MarkdownPreview` 和 `TextArea`，每个调用 `createMDEditor` 产生的编辑器组件拥有独立的组件引用，避免不同变体间的交叉污染。

**三层工厂链**：

```
Editor.tsx       → createMDEditor({ MarkdownPreview, TextArea })
TextArea/index.tsx → createTextArea({ Markdown, useMinHeight: true })
                   ↓
              最终生成的组件层级:
              MDEditor
                ├── PreviewComponent (来自 MarkdownPreview)
                ├── TextAreaComponent (来自 TextArea factory)
                │     ├── MarkdownComponent (语法高亮)
                │     └── Textarea (原生 textarea)
                ├── ToolbarVisibility (工具栏)
                └── DragBar (拖拽条)
```

### 2.2 状态管理模式 — 良好

采用 `useReducer` + `React Context` 的经典模式：

```typescript
// Context.tsx
export function reducer(state: ContextStore, action: ContextStore) {
  return { ...state, ...action };
}
export const EditorContext = React.createContext<ContextStore>({ markdown: '' });
```

**分析**：

- **reducer 极简**: `reducer` 使用对象展开 `{ ...state, ...action }` 实现 shallow merge，本质上是一个"全量覆盖"的 reducer。优点是简单直观，任何 `dispatch({ key: value })` 都能更新状态；缺点是缺乏 action type 约束，无法在 reducer 中实现条件逻辑或副作用。

- **ContextStore 索引签名**: `[key: string]: any` 允许任意属性注入，牺牲了类型安全换取灵活性。

- **状态粒度适中**: 管理 markdown 文本、预览模式、全屏、高度、滚动位置、命令列表、弹出状态等 ~20 个状态字段，粒度在单个 `useReducer` 中尚属合理。

### 2.3 命令模式（Command Pattern） — 优秀

```typescript
// ICommand 接口（commands/index.ts）
export interface ICommand<T = string> {
  name?: T;
  keyCommand?: string;
  buttonContent?: ReactNode;
  iconName?: string;
  shortcuts?: string;
  render?: (command: ICommand, disabled: boolean, executeCommand: ExecuteCommandState) => ReactNode;
  execute?: (state: TextState, api: TextAreaTextApi, dispatch: React.Dispatch<ContextStore>) => void;
}
```

命令模式将每个工具栏操作（加粗、斜体、标题、链接等）封装为独立的 `ICommand` 对象，支持：
- **自定义命令**: 消费方可创建自定义命令并注入到 `commands` 或 `extraCommands` 数组
- **命令过滤**: `commandsFilter` 允许过滤或修改任何命令
- **命令编排**: `TextAreaCommandOrchestrator` 封装了 textarea 的选区管理和文本操作

### 2.4 组件替换模式 — 良好

通过 `components` prop 支持运行时组件替换：

```typescript
components?: {
  textarea?: ITextAreaProps['renderTextarea'];
  toolbar?: ICommand['render'];
  preview?: (source: string, state: ContextStore, dispatch: React.Dispatch<ContextStore>) => JSX.Element;
};
```

这为消费方提供了在不 fork 库的情况下定制编辑器各部分的能力。

---

## 三、架构问题分析

### A1 — 🟡 中等：useMemo 滥用替代 useEffect，语义不明确

**严重级别**: 🟡 中
**影响范围**: Editor.factory.tsx 第 115-148 行

**现状**: 工厂函数中存在大量用 `useMemo` 模拟副作用（`useEffect`）的用法：

```typescript
// Editor.factory.tsx:115-117
useMemo(
  () => propsValue !== state.markdown && dispatch({ markdown: propsValue || '' }),
  [propsValue, state.markdown],
);
// eslint-disable-next-line react-hooks/exhaustive-deps
useMemo(() => previewType !== state.preview && dispatch({ preview: previewType }), [previewType]);
useMemo(() => tabSize !== state.tabSize && dispatch({ tabSize }), [tabSize]);
useMemo(() => highlightEnable !== state.highlightEnable && dispatch({ highlightEnable }), [highlightEnable]);
useMemo(() => autoFocus !== state.autoFocus && dispatch({ autoFocus: autoFocus }), [autoFocus]);
useMemo(() => autoFocusEnd !== state.autoFocusEnd && dispatch({ autoFocusEnd: autoFocusEnd }), [autoFocusEnd]);
useMemo(() => fullscreen !== state.fullscreen && dispatch({ fullscreen: fullscreen }), [fullscreen]);
useMemo(() => height !== state.height && dispatch({ height: height }), [height]);
useMemo(() => commands !== state.commands && dispatch({ commands: cmds }), [props.commands]);
useMemo(() => extraCommands !== state.extraCommands && dispatch({ extraCommands: extraCmds }), [props.extraCommands]);
```

共 **10 个 useMemo** 被用作"条件触发 dispatch"的机制。

**问题分析**:

1. **语义违规**: `useMemo` 的设计意图是"缓存计算结果"，这里被用作"响应依赖变化执行副作用"。React 文档明确指出 `useMemo` 不保证在每次渲染时都执行回调，React 保留在内存充足时跳过 memoization 的权利。

2. **返回值未使用**: 每个 useMemo 的回调都返回 `void`（或 `false`），返回值从未被使用。这本身就说明用错了 API。

3. **竞态风险**: `useMemo` 的执行时机在 React 渲染阶段（render phase），而 `dispatch` 触发状态更新。在 React 18 并发模式下，渲染阶段的状态更新可能导致" tearing "（状态不一致）。

4. **条件 dispatch 模式**: `propsValue !== state.markdown && dispatch(...)` 在条件为 false 时不执行 dispatch，看似高效，但这意味着状态同步依赖于"不等于"判断的正确性。如果 `propsValue` 和 `state.markdown` 都为 `undefined`，条件为 false，dispatch 不执行——这通常是正确的，但也可能隐藏 bug。

**架构建议**:

```typescript
// 方案一：使用 useEffect（语义正确）
useEffect(() => {
  if (propsValue !== state.markdown) {
    dispatch({ markdown: propsValue || '' });
  }
}, [propsValue]);

// 方案二（更优）：在 reducer 中同步 props（消除 useEffect）
function reducer(state: ContextStore, action: ContextStore & { _propsSync?: Partial<MDEditorProps> }) {
  if (action._propsSync) {
    return { ...state, ...action._propsSync };
  }
  return { ...state, ...action };
}
```

---

### A2 — 🟡 中等：Reducer 缺乏 action 类型约束，状态更新无边界保护

**严重级别**: 🟡 中
**影响范围**: Context.tsx 第 34-36 行

**现状**:

```typescript
export function reducer(state: ContextStore, action: ContextStore) {
  return { ...state, ...action };
}
```

`ContextStore` 接口包含 ~20 个字段，且带有索引签名 `[key: string]: any`。任何 `dispatch({ anyKey: anyValue })` 都会被接受，没有 action type 约束、没有字段验证、没有不变量保护。

**问题分析**:

1. **无 action type**: 无法区分"用户输入触发"和"props 同步触发"的状态更新，调试困难。

2. **`[key: string]: any` 索引签名**: 这个签名迫使所有已知属性的类型必须兼容 `any`，削弱了 TypeScript 对 ContextStore 的类型检查能力。

3. **无状态不变量**: 如 `height` 应为正数、`preview` 应为枚举值、`tabSize` 应为正整数等，这些约束全部丢失。

**架构建议**:

```typescript
// 区分 action 类型
type EditorAction =
  | { type: 'SET_MARKDOWN'; markdown: string }
  | { type: 'SET_PREVIEW'; preview: PreviewType }
  | { type: 'SET_HEIGHT'; height: CSSProperties['height'] }
  | { type: 'SYNC_PROPS'; payload: Partial<ContextStore> }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'SET_SCROLL'; scrollTop: number };

function reducer(state: ContextStore, action: EditorAction): ContextStore {
  switch (action.type) {
    case 'SET_MARKDOWN': return { ...state, markdown: action.markdown };
    case 'SYNC_PROPS': return { ...state, ...action.payload };
    // ...
    default: return state;
  }
}
```

---

### A3 — 🟡 中等：Props 解构存在已废弃属性兼容，增加了认知负担

**严重级别**: 🟡 中
**影响范围**: Editor.factory.tsx 第 40 行

**现状**:

```typescript
visibleDragbar = typeof props.visiableDragbar === 'boolean' ? props.visiableDragbar : true,
```

`visiableDragbar`（拼写错误，应为 `visible`）是一个已废弃的属性，Types.ts 中标注了 `@deprecated`：

```typescript
/**
 * @deprecated use {@link MDEditorProps.visibleDragbar}
 */
visiableDragbar?: boolean;
```

**问题**: 废弃属性通过三层三元表达式处理（`typeof` → 取值 → 默认值），增加了代码理解的认知负担。这个兼容逻辑应该在入口处一次性处理，而非在工厂内部。

**建议**: 在入口处或独立适配器中处理废弃属性映射：

```typescript
function adaptDeprecatedProps(props: MDEditorProps): MDEditorProps {
  const { visiableDragbar, visibleDragbar, ...rest } = props;
  return { ...rest, visibleDragbar: visibleDragbar ?? visiableDragbar ?? true };
}
```

---

### A4 — 🟡 中等：滚动同步机制存在内存泄漏风险

**严重级别**: 🟡 中
**影响范围**: Editor.factory.tsx 第 154-164 行

**现状**:

```typescript
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

**问题分析**:

1. **事件监听器未移除**: 每次 `state.textareaWarp` 变化时（理论上只变化一次），添加新的事件监听器，但从未调用 `removeEventListener`。虽然 `textareaWarp` 的 DOM 元素在组件卸载时会被 GC 回收（连同其事件监听器），但如果 `textareaWarp` 在组件生命周期内发生变化，旧的监听器会泄漏。

2. **再次误用 useMemo**: 监听器注册是副作用，应使用 `useEffect` 并返回 cleanup 函数。

**架构建议**:

```typescript
useEffect(() => {
  const el = state.textareaWarp;
  if (!el) return;

  const onMouseOver = () => { active.current = 'text'; };
  const onMouseLeave = () => { active.current = 'preview'; };

  el.addEventListener('mouseover', onMouseOver);
  el.addEventListener('mouseleave', onMouseLeave);

  return () => {
    el.removeEventListener('mouseover', onMouseOver);
    el.removeEventListener('mouseleave', onMouseLeave);
  };
}, [state.textareaWarp]);
```

---

### A5 — 🟡 中等：初始状态通过 useEffect 注入，存在一帧延迟

**严重级别**: 🟡 中
**影响范围**: Editor.factory.tsx 第 90-101 行

**现状**:

```typescript
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**问题**: `useEffect` 在组件首次渲染**之后**执行，意味着：
1. 首次渲染时 `state.markdown` 是 `useReducer` 初始化时的 `propsValue`，但 `state.container` 为 `null`（ref 尚未赋值）
2. `useEffect` 触发后，`dispatch` 更新状态，导致**第二次渲染**
3. 第二次渲染才是"完整"状态

虽然对用户几乎不可感知，但这是一个架构异味（code smell）——初始化不应依赖副作用。

**建议**: 使用 `useReducer` 的惰性初始化（lazy initializer）：

```typescript
const [state, dispatch] = useReducer(reducer, null, () => ({
  markdown: propsValue,
  preview: previewType,
  components,
  height,
  minHeight,
  highlightEnable,
  tabSize,
  defaultTabEnable,
  scrollTop: 0,
  scrollTopPreview: 0,
  commands: cmds,
  extraCommands: extraCmds,
  fullscreen,
  barPopup: {},
  container: undefined,
}));
```

---

### A6 — 🟢 低：类型断言丢失了注入组件的精确类型

**严重级别**: 🟢 低
**影响范围**: Editor.factory.tsx 第 25-26 行

**现状**:

```typescript
const PreviewComponent = MarkdownPreview as React.ComponentType<any>;
const TextAreaComponent = TextArea as React.ComponentType<any>;
```

工厂函数虽然声明了泛型 `<TMarkdownPreview, TTextArea>`，但立即将它们断言为 `React.ComponentType<any>`，丢弃了精确类型信息。

**影响**: 在工厂内部无法获得注入组件的 props 类型约束。但由于这些组件仅在 JSX 中使用（`<PreviewComponent {...} />`），且 props 由工厂自身构建，实际风险有限。

---

### A7 — 🟢 低：导出结构存在 barrel file 模式的 tree-shaking 风险

**严重级别**: 🟢 低
**影响范围**: index.tsx 第 1-19 行

**现状**:

```typescript
export { headingExecute } from './commands/title';
export * from './commands/';
export * from './commands/group';
export * from './utils/markdownUtils';
export * from './utils/InsertTextAtPosition';
export * from './Editor';
export * from './Context';
export * from './Types';
```

7 个 `export *` 重导出语句构成了经典的 barrel file 模式。虽然现代 bundler（Vite/Rollup）对 `export *` 的 tree-shaking 支持较好，但在某些配置下可能导致整个模块图被拉入。

---

### A8 — 🟢 低：`handleScroll` 每次渲染重新创建

**严重级别**: 🟢 低
**影响范围**: Editor.factory.tsx 第 166-191 行

`handleScroll` 函数在每次渲染时创建新闭包，引用了 `textareaDomRef`、`previewRef`、`active`、`enableScrollRef` 等 ref。由于 `handleScroll` 被传给 `PreviewComponent` 的 `onScroll` prop（通过 `useMemo` 包裹），实际上不会引起子组件重渲染，但如果 `PreviewComponent` 使用了 `React.memo` 且比较 `onScroll`，理论上可能导致 memo 失效。

**建议**: 使用 `useCallback` 包裹。

---

## 四、架构评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| **关注点分离** | 9 | 入口层(Editor.tsx) / 工厂层(Factory) / 状态层(Context) / 命令层(commands) 职责清晰 |
| **开闭原则** | 8 | 通过工厂注入和 components prop 实现扩展，无需修改核心代码 |
| **DRY 原则** | 8 | 三层工厂链避免重复，命令模式各命令独立 |
| **类型安全** | 6 | 泛型设计优秀但被 `any` 断言削弱，ContextStore 索引签名降低安全性 |
| **状态管理** | 6 | reducer 过于简单，缺乏 action type 约束和不变量保护 |
| **数据流清晰度** | 7 | Props → State 同步通过 useMemo 模拟，语义不明确 |
| **可测试性** | 7 | 工厂函数可独立测试，但 useMemo 副作用模式增加了测试复杂度 |
| **可扩展性** | 9 | 命令模式 + 组件替换 + 工厂注入，三层扩展点设计优秀 |
| **性能设计** | 6 | useMemo 误用、事件监听泄漏、双次渲染等存在优化空间 |
| **API 设计** | 9 | Props 接口丰富且文档完善，废弃属性处理得当 |
| **综合架构评分** | **7.8 / 10** | |

---

## 五、对本项目（by_geo）的架构影响评估

### 5.1 当前使用方式

本项目通过 `@uiw/react-md-editor/nohighlight` 使用无高亮变体。该变体通过 `Editor.nohighlight.tsx` 调用相同的 `createMDEditor` 工厂，注入无高亮版的 `MarkdownPreview` 和 `TextArea`。

### 5.2 工厂模式的隔离效果

工厂模式确保了本项目使用的 nohighlight 变体与完整版变体完全隔离：

```
完整版入口 (index.tsx):
  createMDEditor({ MarkdownPreview(含 rehype-raw + prism), TextArea(含高亮) })

本项目使用的 nohighlight 入口:
  createMDEditor({ MarkdownPreview(无 rehype-raw, 无 prism), TextArea(无高亮) })
```

共享的 `Editor.factory.tsx` 代码是同一份，但闭包捕获的依赖不同，行为自然隔离。这是工厂模式的核心优势。

### 5.3 已识别风险的缓解评估

| 风险 | 对本项目影响 | 缓解状态 |
|---|---|---|
| useMemo 滥用导致 dispatch 语义错误 | 低（功能上正确，仅语义不当） | ⚠️ 无法控制，但不影响功能 |
| 事件监听器泄漏 | 低（textareaWarp 仅设置一次） | ✅ 影响可忽略 |
| 双次渲染（useEffect 初始化） | 低（用户不可感知） | ✅ 可接受 |
| ContextStore 索引签名 `[key: string]: any` | 无（类型检查为开发时关注点） | ✅ 无运行时影响 |
| rehype-raw XSS 风险 | 无（nohighlight 变体不包含 rehype-raw） | ✅ 变体隔离天然防御 |

### 5.4 建议

1. **短期**: 维持现有 `nohighlight` 入口，工厂模式的隔离效果已足够
2. **中期**: 关注 `@uiw/react-md-editor` v5.x 版本，若库方修复 useMemo 滥用和事件泄漏问题可考虑升级
3. **长期**: 若编辑器需求变得复杂（如协同编辑、自定义快捷键），考虑评估替代方案（如 Milkdown、Tiptap）或基于工厂模式创建自定义编辑器

---

## 六、总结

### 核心发现

`Editor.tsx` 虽仅 8 行代码，却体现了三个重要的架构决策：

1. **工厂模式作为核心扩展机制** — 通过 `createMDEditor` 将 MarkdownPreview 和 TextArea 作为可替换依赖注入，使库能够以零代码修改提供多个变体（完整版/nohighlight/common），这是整个包最优秀的架构设计。

2. **三层工厂链** — `Editor.tsx → createMDEditor` 和 `TextArea/index.tsx → createTextArea` 形成嵌套工厂，每层工厂负责不同粒度的组件组合，关注点分离清晰。

3. **命令模式作为行为扩展机制** — `ICommand` 接口 + `TextAreaCommandOrchestrator` 提供了工具栏行为的可插拔扩展，消费方可自定义命令而无需理解编辑器内部实现。

### 主要架构缺陷

最大的工程化问题是 **useMemo 的系统性滥用**（10 处），将副作用伪装为计算缓存，违反了 React Hooks 的语义契约。这在当前 React 17/18 的实现中不会导致功能问题，但在 React 19+ 并发模式全面铺开时，可能成为隐患来源。

### 优先级建议

| 优先级 | 编号 | 建议 | 收益 |
|---|---|---|---|
| 🟡 中 | A1 | 将 10 个 useMemo 替换为 useEffect | 语义正确，React 19 兼容 |
| 🟡 中 | A2 | 引入 typed action，移除 `[key: string]: any` | 状态更新可追踪、可调试 |
| 🟡 中 | A4 | 事件监听器改用 useEffect + cleanup | 消除内存泄漏风险 |
| 🟡 中 | A5 | 改用 useReducer 惰性初始化 | 消除双次渲染 |
| 🟢 低 | A3 | 废弃属性在入口处统一适配 | 降低工厂内部认知负担 |
| 🟢 低 | A6 | 减少类型断言，保留泛型精度 | 提升类型安全 |
| 🟢 低 | A7 | 减少 barrel file 重导出 | 优化 tree-shaking |
| 🟢 低 | A8 | handleScroll 包裹 useCallback | 防止潜在 memo 失效 |
