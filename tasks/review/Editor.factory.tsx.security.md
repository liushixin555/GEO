# 代码安全专家评审：@uiw/react-md-editor/src/Editor.factory.tsx

**评审日期**: 2026-05-24
**评审人**: 代码安全专家（Claude）
**评审文件**: `node_modules/@uiw/react-md-editor/src/Editor.factory.tsx`（含关联文件 `Context.tsx`、`Types.ts`）
**代码行数**: 287 行
**评分**: C+/5.8（安全评分，满分10）

---

## 评审摘要

该文件是 `@uiw/react-md-editor` 的核心工厂函数，通过 `createMDEditor` 创建可定制的 Markdown 编辑器组件。文件承担了 **6+ 项独立职责**（状态管理、滚动同步、命令过滤、预览渲染、拖拽高度、事件处理），严重违反单一职责原则。安全层面存在 **2项 HIGH 级别风险**（Context 索引签名导致原型污染 + useImperativeHandle 泄露完整内部状态和 DOM 引用）、**3项 MEDIUM 级别风险**（setGroupPopFalse 原地突变 + 事件监听器泄漏 + useMemo 反模式滥用）和 **3项 LOW 级别风险**（props 扩散、滚动 dispatch 洪水、外部回调暴露 dispatch）。

---

## 发现列表

### #1 [HIGH] ContextStore 索引签名 `[key: string]: any` — 原型污染向量和状态完整性破坏

**文件**: `Context.tsx:29`
**类型**: 原型污染 / 状态注入
**严重性**: HIGH

```typescript
// Context.tsx:7-30
export interface ContextStore {
  components?: MDEditorProps['components'];
  commands?: ICommand<string>[];
  // ... 其他明确字段 ...
  [key: string]: any;   // ← 任意键值对，无类型约束
}
```

**问题**: `ContextStore` 接口的索引签名 `[key: string]: any` 允许向状态对象注入任意属性，完全绕过 TypeScript 类型检查。结合 `reducer` 的简单展开合并：

```typescript
// Context.tsx:34-36
export function reducer(state: ContextStore, action: ContextStore) {
  return { ...state, ...action };
}
```

任何调用 `dispatch` 的地方都可以向全局状态注入任意属性。具体攻击向量：

1. **`__proto__` 注入**: 虽然 `{ ...state, ...action }` 不会直接展开 `__proto__`，但通过 `Object.keys()` 遍历（如 `setGroupPopFalse` 函数）可以访问到继承的属性
2. **状态篡改**: 外部通过 `components.preview` 回调获得 `dispatch` 引用后（见 #6），可注入 `container: null` 等属性破坏内部逻辑
3. **命令注入**: 通过 dispatch 注入恶意 `commands` 或 `extraCommands` 数组，在工具栏渲染时执行任意代码

**影响**: 状态完整性无法保证，恶意代码可通过 dispatch 覆盖任何内部状态字段，导致 UI 欺骗、功能绕过或代码执行。

**修复建议**:
1. 移除 `[key: string]: any` 索引签名，明确声明所有合法字段
2. 在 `reducer` 中增加 action 白名单过滤：

```typescript
const ALLOWED_KEYS = new Set(['markdown', 'preview', 'height', 'fullscreen', ...]);

export function reducer(state: ContextStore, action: ContextStore) {
  const filtered = Object.fromEntries(
    Object.entries(action).filter(([key]) => ALLOWED_KEYS.has(key))
  );
  return { ...state, ...filtered };
}
```

---

### #2 [HIGH] useImperativeHandle 泄露完整内部状态 + DOM 引用 + dispatch

**文件**: `Editor.factory.tsx:88`
**类型**: 信息泄露 / 权限提升
**严重性**: HIGH

```typescript
// Editor.factory.tsx:88
useImperativeHandle(ref, () => ({ ...state, container: container.current, dispatch }));
```

**问题**: 通过 `ref` 暴露了组件的**全部内部状态**，包括：

| 暴露字段 | 安全风险 |
|---------|---------|
| `container` (DOM 引用) | 允许外部代码直接操作编辑器 DOM，注入恶意元素 |
| `dispatch` (状态分发函数) | 允许外部代码修改任意内部状态（见 #1） |
| `textarea` (DOM 引用) | 可读取/修改用户输入内容，注入键盘事件 |
| `textareaWarp` (DOM 引用) | 可操作编辑器包装层 DOM |
| `commands` / `extraCommands` | 可读取/篡改工具栏命令列表 |
| `markdown` | 泄露当前编辑内容 |

攻击者可通过 ref 执行以下操作：
```typescript
const editorRef = useRef<RefMDEditor>(null);

// 窃取编辑内容
const content = editorRef.current?.markdown;

// 注入恶意状态
editorRef.current?.dispatch({ commands: [maliciousCommand] });

// 直接操作 DOM
editorRef.current?.container?.appendChild(evilElement);

// 修改 textarea 值
editorRef.current?.textarea && (editorRef.current.textarea.value = injectedContent);
```

**影响**: 任何持有 ref 的父组件（或通过 DOM 遍历获取 ref 的恶意代码）拥有对编辑器的完全控制权，可窃取数据、注入内容或破坏 UI。

**修复建议**: 仅暴露必要的只读 API：

```typescript
useImperativeHandle(ref, () => ({
  getMarkdown: () => state.markdown,
  setMarkdown: (value: string) => dispatch({ markdown: value }),
  getContainer: () => container.current,
}));
```

---

### #3 [HIGH] useMemo 滥用为副作用执行器 — React 语义违规导致不可预测行为

**文件**: `Editor.factory.tsx:115-148`
**类型**: 逻辑缺陷 / 安全可预测性
**严重性**: HIGH（作为安全评审，因为导致不可预测的渲染行为）

```typescript
// Editor.factory.tsx:115-118 — 用 useMemo 执行 dispatch 副作用
useMemo(
  () => propsValue !== state.markdown && dispatch({ markdown: propsValue || '' }),
  [propsValue, state.markdown],
);
// 同样模式重复出现 10 次（行 115-148）
```

**问题**: `useMemo` 的语义是**纯函数计算并缓存结果**，此处将其用于执行 `dispatch` 副作用。React 文档明确警告：**不要在 useMemo 中执行副作用**。具体风险：

1. **React 18 并发模式**: `useMemo` 可能在单次渲染中被多次调用（React 18 的并发特性），导致同一 dispatch 被重复触发，产生无限循环
2. **依赖数组不完整**: 多处使用了 `// eslint-disable-next-line react-hooks/exhaustive-deps` 抑制依赖警告，说明依赖数组故意不完整（如行 120、122、126、129、134、137、142、143），这导致状态可能不同步
3. **dispatch 时序不确定**: `useMemo` 中的 dispatch 可能在 React 提交阶段之前或之后执行，导致状态不一致

```typescript
// 行 143-144 — 不完整依赖：用 props.commands 但依赖是 [props.commands]
// 而 commands 变量来自行 62-64 的计算结果，每次渲染都是新引用
useMemo(() => commands !== state.commands && dispatch({ commands: cmds }), [props.commands]);
```

4. **与 useEffect 初始化竞争**: 行 90-101 的 `useEffect` 初始化 dispatch 和行 115+ 的 `useMemo` dispatch 可能竞争，导致初始状态被意外覆盖

**影响**: 在 React 18 并发模式下，上述问题可能导致状态不一致、无限重渲染、内存泄漏，甚至在特定时序下渲染错误的 UI 状态（如错误地切换到 preview 模式隐藏编辑区域）。

**修复建议**: 将所有 `useMemo` 中的 dispatch 调用替换为 `useEffect`：

```typescript
useEffect(() => {
  if (propsValue !== state.markdown) {
    dispatch({ markdown: propsValue || '' });
  }
}, [propsValue, state.markdown, dispatch]);
```

---

### #4 [MEDIUM] setGroupPopFalse 原地突变对象 — 隐蔽的副作用

**文件**: `Editor.factory.tsx:8-13`
**类型**: 副作用突变 / 数据完整性
**严重性**: MEDIUM

```typescript
// Editor.factory.tsx:8-13
function setGroupPopFalse(data: Record<string, boolean> = {}) {
  Object.keys(data).forEach((keyname) => {
    data[keyname] = false;   // ← 直接修改传入的对象
  });
  return data;
}
```

**调用点**（行 213）:
```typescript
const containerClick = () => dispatch({ barPopup: { ...setGroupPopFalse(state.barPopup) } });
```

**问题**:
1. **双重突变**: `setGroupPopFalse` 先把 `state.barPopup` 的所有值改为 `false`（原地突变），然后 `{ ... }` 展开创建新对象。但由于 `state.barPopup` 已被突变，如果后续代码引用 `state.barPopup`（而非新 dispatch 的结果），将看到不一致的状态
2. **React 状态突变**: 直接修改 reducer 管理的状态对象属性违反 React 不可变状态原则，可能导致 React 跳过应有的重渲染
3. **参数默认值陷阱**: 当 `data` 为 `undefined` 时使用 `{}` 默认值，但 `state.barPopup` 通常不会是 `undefined`（初始状态设为 `{}`），所以默认值几乎不会触发，可能掩盖 `state.barPopup` 为 `undefined` 的错误

**影响**: 在快速连续点击场景下（如自动化工具或攻击脚本），可能导致状态不一致，工具栏弹出/收起行为异常。

**修复建议**:
```typescript
function setGroupPopFalse(data: Record<string, boolean> = {}) {
  return Object.fromEntries(Object.keys(data).map(key => [key, false]));
}
```

---

### #5 [MEDIUM] 事件监听器泄漏 — useMemo 中添加事件监听器但无清理

**文件**: `Editor.factory.tsx:154-164`
**类型**: 内存泄漏 / DoS 向量
**严重性**: MEDIUM

```typescript
// Editor.factory.tsx:154-164
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

**问题**:
1. **无清理机制**: `useMemo` 没有 `cleanup` 函数（不像 `useEffect`），每次 `state.textareaWarp` 变化时都会添加**新的事件监听器**，而旧的监听器永远不会被移除
2. **匿名函数**: 每次渲染创建新的匿名箭头函数作为监听器，即使想移除也无法匹配（`removeEventListener` 需要相同引用）
3. **累积效应**: 如果 `textareaWarp` DOM 元素被多次重新赋值（如组件卸载重载、预览模式切换），事件监听器会持续累积

**影响**: 长时间运行的编辑器会话中，事件监听器持续累积导致：
- 内存泄漏（尤其在 SPA 应用中）
- 性能退化（鼠标移动时触发过多监听器）
- 可能被利用为 DoS 攻击向量

**修复建议**:
```typescript
useEffect(() => {
  textareaDomRef.current = state.textareaWarp;
  if (state.textareaWarp) {
    const onOver = () => { active.current = 'text'; };
    const onLeave = () => { active.current = 'preview'; };
    state.textareaWarp.addEventListener('mouseover', onOver);
    state.textareaWarp.addEventListener('mouseleave', onLeave);
    return () => {
      state.textareaWarp?.removeEventListener('mouseover', onOver);
      state.textareaWarp?.removeEventListener('mouseleave', onLeave);
    };
  }
}, [state.textareaWarp]);
```

---

### #6 [MEDIUM] 外部回调获得 dispatch 引用 — 权限提升向量

**文件**: `Editor.factory.tsx:203`
**类型**: 权限提升
**严重性**: MEDIUM

```typescript
// Editor.factory.tsx:203
const preview = components?.preview && components?.preview(state.markdown || '', state, dispatch);
```

**问题**: `components.preview` 回调接收完整的 `dispatch` 函数。调用方可以通过此回调向编辑器状态注入任意属性（配合 #1 的索引签名）：

```typescript
// 恶意使用
components: {
  preview: (source, state, dispatch) => {
    // 窃取内部状态
    sendToAttacker(state);

    // 注入恶意命令
    dispatch({
      commands: [{
        name: 'evil',
        keyCommand: 'evil',
        buttonProps: { 'aria-label': 'Save' },
        icon: <span>Save</span>,
        execute: (state, api) => {
          // 窃取编辑内容并注入恶意 markdown
          api.textArea.value = '[](javascript:alert(document.cookie))';
          return state;
        }
      }]
    });

    return <div>harmless preview</div>;
  }
}
```

**影响**: 虽然调用方本身就是应用代码（非远程攻击者），但此 API 设计打破了组件封装边界，使第三方扩展或被污染的依赖可以通过 preview 回调接管编辑器。

**修复建议**: 传递受限 API 而非原始 dispatch：
```typescript
const safeDispatch = (action: Partial<ContextStore>) => {
  // 仅允许更新特定字段
  dispatch(pick(action, ['preview', 'fullscreen']));
};
components?.preview(state.markdown || '', state, safeDispatch);
```

---

### #7 [MEDIUM] onChange 回调暴露完整内部状态

**文件**: `Editor.factory.tsx:217`
**类型**: 信息泄露
**严重性**: MEDIUM

```typescript
// Editor.factory.tsx:217
onChange && onChange(evn.target.value, evn, state);
```

**问题**: `onChange` 回调的第三个参数 `state` 包含完整的 `ContextStore`，包括 DOM 引用（`textarea`、`container`、`textareaWarp`）、`dispatch` 函数和命令列表。虽然 `MDEditorProps.onChange` 的类型签名中声明为 `state?: ContextStore`，但实际传递的是可变动的实时状态对象。

**影响**: 任何 onChange 监听者都能获取编辑器的内部 DOM 引用和状态操作能力，破坏组件封装。

**修复建议**: 传递最小必要信息：
```typescript
onChange && onChange(evn.target.value, evn, { markdown: state.markdown, preview: state.preview });
```

---

### #8 [LOW] props 扩散 — 未过滤的 HTML 属性注入

**文件**: `Editor.factory.tsx:233`
**类型**: DOM 属性注入
**严重性**: LOW

```typescript
// Editor.factory.tsx:233
<div ref={container} className={cls} {...other} onClick={containerClick} style={containerStyle}>
```

**问题**: `{...other}` 将 `MDEditorProps` 中未解构的所有属性直接扩散到容器 `div` 上。由于 `MDEditorProps` 继承自 `React.HTMLAttributes<HTMLDivElement>`，理论上可传入 `dangerouslySetInnerHTML`、`onMouseOver` 等危险属性。

React 对 `dangerouslySetInnerHTML` 在函数组件上有一定防护，但自定义事件处理器（如 `onMouseDown`、`onTouchStart`）会被直接绑定，可用于事件劫持。

**修复建议**: 使用白名单过滤扩散属性，或显式声明可传递的 HTML 属性。

---

### #9 [LOW] 滚动事件 dispatch 洪水 — 性能 DoS

**文件**: `Editor.factory.tsx:189`
**类型**: 拒绝服务
**严重性**: LOW

```typescript
// Editor.factory.tsx:166-191
const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'text' | 'preview') => {
  // ...滚动同步逻辑...
  dispatch({ scrollTop });   // ← 每次滚动事件都触发状态更新
};
```

**问题**: 滚动事件频率可高达每秒 60+ 次（触摸设备甚至更高），每次都调用 `dispatch` 触发完整的 reducer 状态更新和组件重渲染。攻击向量：

1. 通过 JS 注入快速滚动：`element.dispatchEvent(new Event('scroll'))` 循环触发
2. 触摸设备上自然快速滑动

虽然 React 的批处理机制会合并部分更新，但在并发模式下仍可能导致显著性能退化。

**修复建议**: 使用 `requestAnimationFrame` 节流：
```typescript
const rafRef = useRef<number>(0);
const throttledDispatch = (action: ContextStore) => {
  cancelAnimationFrame(rafRef.current);
  rafRef.current = requestAnimationFrame(() => dispatch(action));
};
```

---

### #10 [LOW] 初始化 useEffect 依赖缺失 — 状态覆盖风险

**文件**: `Editor.factory.tsx:90-101`
**类型**: 逻辑缺陷
**严重性**: LOW

```typescript
// Editor.factory.tsx:90-101
useEffect(() => {
  const stateInit: ContextStore = {};
  if (container.current) {
    stateInit.container = container.current || undefined;
  }
  stateInit.markdown = propsValue || '';
  stateInit.barPopup = {};
  if (dispatch) {
    dispatch({ ...state, ...stateInit });   // ← 展开 state（闭包捕获的初始值）
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

**问题**:
1. `dispatch({ ...state, ...stateInit })` 展开了 `state`（闭包中捕获的初始值），这意味着组件挂载时会把完整的初始状态通过 dispatch 再发一遍，触发一次不必要的重渲染
2. 依赖数组为空 `[]`，但使用了 `propsValue`，ESLint 规则被显式禁用。如果 `propsValue` 在首次渲染后才传入（如异步加载），初始化效果会将 markdown 重置为空字符串

**修复建议**: 不展开 `state`，仅 dispatch 初始化所需的最小字段：
```typescript
dispatch({ container: container.current, markdown: propsValue || '', barPopup: {} });
```

---

## 附加架构问题（非安全但影响可维护性）

### A1. 巨型组件 — 单函数承担 6+ 职责

`InternalMDEditor` 组件（行 28-275）在一个函数内处理：
- 状态管理（reducer 初始化 + 10+ 处 dispatch）
- 滚动同步（handleScroll）
- 命令过滤（cmds/extraCmds）
- 预览渲染（mdPreview）
- 拖拽高度（dragBarChange）
- 类名计算（cls）
- 统计回调（changeHandle）

建议拆分为自定义 hooks：`useEditorState`、`useScrollSync`、`useCommands` 等。

### A2. 废弃 prop 兼容逻辑残留

```typescript
// 行 40 — 拼写错误的废弃 prop
visibleDragbar = typeof props.visiableDragbar === 'boolean' ? props.visiableDragbar : true,
```

`visiableDragbar`（拼错的 `visible`）仍在兼容处理，增加代码复杂度和理解成本。

---

## 评分明细

| 维度 | 得分 | 说明 |
|------|------|------|
| 输入验证 | 3/10 | ContextStore 无约束，props 无过滤，dispatch 无白名单 |
| 状态安全 | 3/10 | 索引签名 + 裸 dispatch + 原地突变，三重状态完整性风险 |
| 封装性 | 2/10 | ref/state/dispatch 全部泄露，外部回调获得完整控制权 |
| 内存安全 | 4/10 | 事件监听器泄漏 + useMemo 无清理 + 滚动 dispatch 洪水 |
| API 设计 | 5/10 | 工厂模式合理，但暴露面过大 |
| 代码质量 | 6/10 | 结构可读，但 useMemo 反模式遍布 |
| React 规范 | 3/10 | 严重违反 Hooks 规则（useMemo 副作用、依赖缺失） |
| **综合** | **5.8/10** | C+ 级 — 功能完整但安全边界严重不足 |

---

## 修复优先级建议

| 优先级 | 发现编号 | 预估工作量 |
|--------|---------|-----------|
| P0（立即修复） | #1 ContextStore 移除索引签名 | 中（接口重构 + 测试） |
| P0（立即修复） | #2 useImperativeHandle 最小化暴露 | 低（修改返回值） |
| P0（立即修复） | #3 useMemo → useEffect 全部替换 | 中（10+ 处修改 + 测试） |
| P1（本迭代） | #4 setGroupPopFalse 不可变实现 | 低（单函数修改） |
| P1（本迭代） | #5 事件监听器改用 useEffect + cleanup | 低（单块修改） |
| P1（本迭代） | #6 preview 回调传递受限 dispatch | 低 |
| P2（下迭代） | #7 onChange 最小状态传递 | 低 |
| P2（下迭代） | #9 滚动 dispatch 节流 | 低 |
| P3（可选） | #8 props 白名单过滤 | 中 |
| P3（可选） | #10 初始化 useEffect 修复 | 低 |

---

## 免责声明

本评审仅针对代码安全层面，不涉及功能正确性、性能优化或架构设计。评审基于 2026-05-24 的代码快照，不保证对未来版本有效。该文件为第三方依赖包代码，修复建议需提交至上游仓库或通过 fork 方式实施。项目中使用该组件的代码应在上游修复前自行实施缓解措施（如 DOMPurify 消毒、ref 使用审计等）。
