# Editor.common.tsx 质量评审

**文件**: `node_modules/@uiw/react-md-editor/nohighlight` → `Editor.common.tsx` + `Editor.factory.tsx` + `Context.tsx`
**日期**: 2026-05-26
**评审范围**: 上游库核心文件安全性 + 正确性 + React 最佳实践

## 概述

`Editor.common.tsx` 是 `@uiw/react-md-editor/nohighlight` 的入口文件（仅 7 行），核心逻辑在 `Editor.factory.tsx`（287 行）和 `Context.tsx`（39 行）中。项目通过 `pages/components/MarkdownEditor.tsx` 封装层隔离了大部分上游缺陷，但上游源码仍有 6 项未修补的 CRITICAL/HIGH 问题。

## 评审结果：WARNING 6.0/10

---

## CRITICAL (1)

### SEC-CTX-01: Reducer 无白名单校验——任意属性注入

**文件**: `Context.tsx:29,34-36`
**状态**: ⚠️ 未修补

```typescript
// Line 29: 索引签名允许任意键
[key: string]: any;

// Line 34-36: reducer 盲目合并所有 action 属性
export function reducer(state: ContextStore, action: ContextStore) {
  return { ...state, ...action };
}
```

**风险**: 恶意代码可注入 `__proto__`、`constructor` 或污染编辑器状态
**Wrapper 缓解**: ✅ 封装层不暴露 `ContextStore`，内部隔离
**修补方案**: 实现 Reducer 白名单过滤（仅合并已知键）

---

## HIGH (5)

### SEC-EF-01: setGroupPopFalse 原地突变 state.barPopup

**文件**: `Editor.factory.tsx:8-13`
**状态**: ⚠️ 未修补

```typescript
function setGroupPopFalse(data: Record<string, boolean> = {}) {
  Object.keys(data).forEach((keyname) => {
    data[keyname] = false; // ❌ 就地突变！
  });
  return data;
}
```

**风险**: 违反不可变性原则，React 并发模式下可能导致状态不一致
**修补方案**: 创建新对象而非修改输入

### SEC-EF-02: useMemo 副作用——13 处违规

**文件**: `Editor.factory.tsx:115,120,122,123,125,129,130,131,137,138,143,145,146`
**状态**: ⚠️ 未修补

**问题**: `useMemo` 用于 `dispatch` 状态更新（副作用），违反 React Hooks 规则：
- React 18 并发模式下渲染期间触发状态更新（非法）
- 依赖数组中包含 `state.*` 导致无限循环风险

**修补方案**: 全部替换为 `useEffect`

### SEC-EF-03: 事件监听器内存泄漏

**文件**: `Editor.factory.tsx:154-164`
**状态**: ⚠️ 未修补

```typescript
useMemo(() => {
  state.textareaWarp.addEventListener('mouseover', () => { active.current = 'text'; });
  state.textareaWarp.addEventListener('mouseleave', () => { active.current = 'preview'; });
  // ❌ 无 cleanup！每次 textareaWarp 变化累积新监听器
}, [state.textareaWarp]);
```

**风险**: 每次状态变化累积新监听器，永不清理
**修补方案**: 改用 `useEffect` + cleanup 函数

### SEC-EF-04: 初始化 useEffect 展开过时 state

**文件**: `Editor.factory.tsx:90-101`
**状态**: ⚠️ 未修补

```typescript
useEffect(() => {
  const stateInit: ContextStore = {};
  stateInit.container = container.current || undefined;
  stateInit.markdown = propsValue || '';
  stateInit.barPopup = {};
  dispatch({ ...state, ...stateInit }); // ❌ 展开整个过时 state
}, []);
```

**风险**: 初始化时展开的 `state` 是过时的，可能覆盖默认值
**修补方案**: 仅 dispatch 最小必要字段

### SEC-EF-05: textarea 非空断言崩溃

**文件**: `Editor.factory.tsx:222`
**状态**: ⚠️ 未修补

```typescript
const obj = new TextAreaCommandOrchestrator(state.textarea!); // ❌ 非空断言
```

**风险**: `state.textarea` 为 undefined 时崩溃
**修补方案**: 添加 `instanceof HTMLTextAreaElement` 运行时检查

---

## 已由 Wrapper 缓解的问题

| 缺陷 | Wrapper 位置 | 缓解方式 |
|------|-------------|---------|
| XSS via rehype-raw | MarkdownEditor.tsx:28-33 | nohighlight 变体 + DOMPurify |
| 命令执行漏洞 | MarkdownEditor.tsx:505-1180 | commandsFilter 防御性覆盖 |
| ARIA 无障碍缺失 | MarkdownEditor.tsx:291-426 | MutationObserver 注入 |
| 浏览器快捷键冲突 | MarkdownEditor.tsx:430-450 | keydown 拦截 |

---

## 修补计划

| 编号 | 级别 | 文件 | 修补方式 |
|------|------|------|---------|
| SEC-CTX-01 | CRITICAL | Context.tsx | Reducer 白名单过滤 |
| SEC-EF-01 | HIGH | Editor.factory.tsx | setGroupPopFalse 不可变实现 |
| SEC-EF-02 | HIGH | Editor.factory.tsx | useMemo → useEffect（13 处） |
| SEC-EF-03 | HIGH | Editor.factory.tsx | 事件监听器 useEffect + cleanup |
| SEC-EF-04 | HIGH | Editor.factory.tsx | 初始化仅 dispatch 最小字段 |
| SEC-EF-05 | MEDIUM | Editor.factory.tsx | textarea instanceof 检查 |

**修补方式**: 通过 pnpm patch 更新 `@uiw__react-md-editor@4.1.0.patch`
