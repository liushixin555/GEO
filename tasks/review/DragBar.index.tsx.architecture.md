# 软件架构专家评审：@uiw/react-md-editor DragBar/index.tsx

**文件路径**: `@uiw/react-md-editor/src/components/DragBar/index.tsx`
**评审角色**: 软件架构专家（模块边界 · 事件架构 · 组合模式 · 依赖架构 · SOLID · 状态管理 · 耦合分析）
**评审日期**: 2026-05-25
**评审版本**: @uiw/react-md-editor@4.1.0
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 组件职责边界清晰，但事件架构存在根本性缺陷，闭包陈旧导致动态 props 场景下行为异常，受控/非受控状态混合模式违反单一数据源原则）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | Markdown 编辑器底部的可拖拽分割条，用于调整编辑器高度 |
| 代码行数 | 86 行（含空行与 import） |
| 设计模式 | 受控组件（高度由父组件持有）+ 命令式事件绑定（document 级监听） |
| 外部依赖 | React（useEffect, useMemo, useRef） |
| 内部依赖 | `IProps`（父类型，提供 `prefixCls`）、`index.less`（样式） |
| 导出 | 默认导出 `DragBar` + 命名导出 `IDragBarProps` |
| 组件性质 | 纯展示/交互组件，无业务逻辑，无副作用（除 DOM 事件绑定外） |

### 源码

```typescript
import React, { useEffect, useMemo, useRef } from 'react';
import { type IProps } from '../../Types';
import './index.less';

export interface IDragBarProps extends IProps {
  height: number;
  maxHeight: number;
  minHeight: number;
  onChange: (value: number) => void;
}

const DragBar: React.FC<IDragBarProps> = (props) => {
  const { prefixCls, onChange } = props || {};
  const $dom = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ height: number; dragY: number }>();
  const heightRef = useRef(props.height);

  useEffect(() => {
    if (heightRef.current !== props.height) {
      heightRef.current = props.height;
    }
  }, [props.height]);

  function handleMouseMove(event: Event) {
    if (dragRef.current) {
      const clientY =
        (event as unknown as MouseEvent).clientY || (event as unknown as TouchEvent).changedTouches[0]?.clientY;
      const newHeight = dragRef.current.height + clientY - dragRef.current.dragY;
      if (newHeight >= props.minHeight && newHeight <= props.maxHeight) {
        onChange && onChange(dragRef.current.height + (clientY - dragRef.current.dragY));
      }
    }
  }
  function handleMouseUp() {
    dragRef.current = undefined;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    $dom.current?.removeEventListener('touchmove', handleMouseMove);
    $dom.current?.removeEventListener('touchend', handleMouseUp);
  }
  function handleMouseDown(event: Event) {
    event.preventDefault();
    const clientY =
      (event as unknown as MouseEvent).clientY || (event as unknown as TouchEvent).changedTouches[0]?.clientY;
    dragRef.current = {
      height: heightRef.current,
      dragY: clientY,
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    $dom.current?.addEventListener('touchmove', handleMouseMove, { passive: false });
    $dom.current?.addEventListener('touchend', handleMouseUp, { passive: false });
  }

  useEffect(() => {
    if (document) {
      $dom.current?.addEventListener('touchstart', handleMouseDown, { passive: false });
      $dom.current?.addEventListener('mousedown', handleMouseDown);
    }
    return () => {
      if (document) {
        $dom.current?.removeEventListener('touchstart', handleMouseDown);
        document.removeEventListener('mousemove', handleMouseMove);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const svg = useMemo(
    () => (
      <svg viewBox="0 0 512 512" height="100%">
        <path
          fill="currentColor"
          d="M304 256c0 26.5-21.5 48-48 48s-48-21.5-48-48 21.5-48 48-48 48 21.5 48 48zm120-48c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48zm-336 0c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48z"
        />
      </svg>
    ),
    [],
  );
  return (
    <div className={`${prefixCls}-bar`} ref={$dom}>
      {svg}
    </div>
  );
};

export default DragBar;
```

---

## 二、架构维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 模块职责边界 | 8 | 单一职责明确：仅负责拖拽调整高度，不含业务逻辑 |
| 接口设计（契约） | 5 | Props 扩展 IProps 引入不必要的耦合；onChange 类型声明必填但运行时短路检查矛盾 |
| 事件架构 | 3 | 命令式事件绑定与声明式 React 模式冲突；mouse/touch 事件绑定层级不一致；闭包陈旧导致架构性缺陷 |
| 状态管理 | 4 | 受控/非受控混合：height 由父组件控制但通过 heightRef 双重缓存；dragRef 既是临时状态又是通信管道 |
| 依赖架构 | 6 | 依赖精简（仅 React + IProps），但 IProps 契约过宽，组件实际仅使用 prefixCls |
| SOLID 遵循 | 4 | SRP 通过；OCP 违反（边界值逻辑硬编码不可扩展）；DIP 部分违反（直接依赖 document 全局对象） |
| 可替换性/可测试性 | 3 | 命令式 DOM 事件绑定难以 mock；函数闭包嵌套在组件内部无法独立测试 |
| **综合评分** | **4.8 / 10** | **职责边界清晰加分，但事件架构和状态管理的根本性问题严重拖低总分** |

---

## 三、架构层面问题清单

### P1 — 严重问题（影响架构合理性和运行时行为）

#### A-01: 事件架构根本性缺陷 — 声明式框架中的命令式反模式

**位置**: L24–L53（事件处理函数）+ L55–L67（useEffect 事件注册）

**问题描述**: 该组件采用了一种"半命令式、半声明式"的混合事件架构：

1. **注册阶段（L55–L67）**: 使用 `useEffect(() => { ... }, [])` 在组件挂载时命令式注册 `mousedown`/`touchstart`
2. **拖拽阶段（L49–L52）**: 在 `handleMouseDown` 内部动态向 `document` 注册 `mousemove`/`mouseup`
3. **清理阶段（L34–L40）**: 在 `handleMouseUp` 内部手动移除所有监听器

这种架构在 React 声明式编程模型中是反模式，原因如下：

- **闭包陈旧**: `useEffect` 的 `[]` 依赖数组意味着 `handleMouseDown` 等函数永远引用首次渲染时的闭包。`props.minHeight`、`props.maxHeight`、`onChange` 的更新不会传播到事件处理器
- **注册/清理不对称**: `useEffect` cleanup 只清理 `mousedown`/`touchstart` 和 `mousemove`，但遗漏了 `mouseup` 和 `touchmove`/`touchend`
- **生命周期冲突**: 若组件在拖拽过程中被卸载（路由切换），`handleMouseMove`/`handleMouseUp` 的闭包引用已失效的 ref

**架构影响**: 这不是简单的 bug，而是架构选型问题。在 React 中处理拖拽应优先考虑以下模式：

| 方案 | 优势 | 劣势 |
|------|------|------|
| `useRef` 持有最新 props | 最小改动，兼容当前结构 | 仍为命令式，不符合 React 范式 |
| 自定义 Hook `useDrag` | 抽离拖拽逻辑，职责分离 | 需要重构 |
| Pointer Events + `onPointerDown` | 完全声明式，React 原生事件委托 | 需要浏览器兼容性考量 |
| 第三方库（如 `@dnd-kit`） | 久经考验，无障碍内置 | 引入外部依赖 |

**修复建议**:

```typescript
// 方案一：最小改动 — useRef 持有最新 props
const propsRef = useRef(props);
propsRef.current = props;

function handleMouseMove(event: Event) {
  if (dragRef.current) {
    const clientY = extractClientY(event);
    const newHeight = dragRef.current.height + clientY - dragRef.current.dragY;
    const { minHeight, maxHeight, onChange } = propsRef.current;
    if (newHeight >= minHeight && newHeight <= maxHeight) {
      onChange?.(newHeight);
    }
  }
}
```

```typescript
// 方案二：架构级重构 — 自定义 Hook
function useDragResize(config: {
  minHeight: number;
  maxHeight: number;
  height: number;
  onChange: (value: number) => void;
}) {
  const configRef = useRef(config);
  configRef.current = config;
  // ... 封装拖拽状态机
  return { onMouseDown, onTouchStart };
}
```

---

#### A-02: 受控/非受控混合状态 — 违反单一数据源原则

**位置**: L16（heightRef）+ L18–L22（同步 useEffect）

**问题描述**: 组件声明为受控模式（height 完全由父组件通过 props 传入），但内部引入了 `heightRef` 作为 props.height 的影子副本：

```
props.height → heightRef.current（同步 useEffect 负责对齐）
                       ↑
            handleMouseDown 读取此值作为拖拽起点
```

这种设计产生了两个问题：

1. **数据流双向**: props 是正向数据流，但 heightRef 创建了一条旁路数据通道。拖拽开始时 `handleMouseDown` 读取的是 `heightRef.current` 而非 `props.height`，在闭包陈旧的背景下这两个值可能不一致
2. **同步 useEffect 的必要性存疑**: 如果解决了 A-01 的闭包问题，直接读取 props 即可，`heightRef` 和同步 useEffect 完全多余

**架构影响**: 在 React 单向数据流架构中，这种"受控 + 内部缓存"的混合模式增加了理解成本，且在闭包陈旧的条件下会产生数据不一致。

**修复建议**: 解决 A-01 后，移除 `heightRef` 和同步 useEffect，在 `handleMouseDown` 中直接使用 `propsRef.current.height`。

---

#### A-03: 事件绑定层级不一致 — Mouse 与 Touch 的架构分裂

**位置**: L49–L52 vs L56–L58

**问题描述**: 鼠标事件和触摸事件采用了完全不同的绑定架构：

| 事件类型 | 注册时机 | 绑定目标 | 清理时机 |
|----------|----------|----------|----------|
| mousedown | useEffect 挂载时 | `$dom.current`（元素级） | useEffect cleanup |
| touchstart | useEffect 挂载时 | `$dom.current`（元素级） | useEffect cleanup |
| mousemove | handleMouseDown 内动态 | `document`（全局级） | handleMouseUp 内 |
| mouseup | handleMouseDown 内动态 | `document`（全局级） | handleMouseUp 内 |
| touchmove | handleMouseDown 内动态 | `$dom.current`（元素级） | handleMouseUp 内 |
| touchend | handleMouseDown 内动态 | `$dom.current`（元素级） | handleMouseUp 内 |

**架构问题**:

1. **mousemove/mouseup 绑定 document** — 正确做法，因为鼠标可能移出元素范围
2. **touchmove/touchend 绑定 $dom.current** — 错误做法，触摸事件在 touchstart 目标元素上触发，通常不需要绑定到 document，但如果手指移出元素区域可能导致事件丢失
3. **useEffect cleanup 不完整** — 只清理了 `mousemove`（document 级），遗漏了 `mouseup`（document 级），以及 `touchmove`/`touchend`（元素级）

**修复建议**: 统一使用 Pointer Events API，所有动态事件绑定到 `document`，cleanup 中完整移除所有动态注册的监听器：

```typescript
// 统一使用 Pointer Events
useEffect(() => {
  const el = $dom.current;
  if (!el) return;

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    el.setPointerCapture(e.pointerId);  // 自动保证 pointermove/up 在此元素触发
    dragRef.current = { height: propsRef.current.height, dragY: e.clientY };
  };
  const onPointerMove = (e: PointerEvent) => { /* ... */ };
  const onPointerUp = () => { /* ... */ };

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);

  return () => {
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
  };
}, []);
```

---

### P2 — 中等问题（影响架构可维护性和扩展性）

#### A-04: Props 接口设计 — 契约不精确

**位置**: L5–L10

**问题描述**: `IDragBarProps extends IProps`，而 `IProps` 包含 `prefixCls`、`className`、`style` 等属性，但组件实际仅使用了 `prefixCls`。`className` 和 `style` 被声明但从未使用，这意味着：

1. 调用方传入 `className` 或 `style` 期望生效，但组件静默忽略
2. 接口承诺了不属于组件职责的能力（`IProps` 可能还包含其他不相关的属性）

**修复建议**: 定义精确的 Props 接口，仅声明组件真正使用的属性：

```typescript
export interface IDragBarProps {
  prefixCls: string;
  height: number;
  maxHeight: number;
  minHeight: number;
  onChange: (value: number) => void;
}
```

---

#### A-05: onChange 类型契约与运行时行为矛盾

**位置**: L9（类型声明 `(value: number) => void`）vs L30（`onChange && onChange(...)`）

**问题描述**: TypeScript 类型声明 `onChange` 为必填的 `(value: number) => void`，但运行时代码使用 `onChange && onChange(...)` 进行短路检查，暗示 `onChange` 可能为 undefined。这是类型契约与运行时行为的不一致。

**架构影响**: 调用方根据类型声明认为 onChange 必传，但组件代码暗示它可选。这种不一致会让未来的维护者困惑。

**修复建议**: 统一契约——要么改为 `onChange?: (value: number) => void`（可选），要么移除运行时检查（`onChange(newHeight)`）。

---

#### A-06: 组件不可测试的架构 — 逻辑与渲染耦合

**位置**: 整个组件

**问题描述**: 拖拽逻辑（状态机、事件处理、边界检查）直接嵌入在 React FC 内部，无法独立于 DOM 进行单元测试。若要测试拖拽计算逻辑，必须模拟完整的 DOM 环境（jsdom）和事件系统。

**架构影响**: 违反关注点分离原则。拖拽计算（纯逻辑：`newHeight = startHeight + deltaY`，边界 clamp）与 DOM 事件绑定应该分离。

**修复建议**: 提取纯逻辑函数和自定义 Hook：

```typescript
// 纯逻辑 — 可独立测试
function clampHeight(newHeight: number, min: number, max: number): number | null {
  return newHeight >= min && newHeight <= max ? newHeight : null;
}

// 自定义 Hook — 封装拖拽状态机
function useDragResize(config: DragConfig) { /* ... */ }

// 组件 — 仅负责渲染
const DragBar: React.FC<IDragBarProps> = (props) => {
  const dragHandlers = useDragResize(props);
  return <div {...dragHandlers}>{svgMemo}</div>;
};
```

---

#### A-07: SSR 兼容性架构缺失

**位置**: L56, L61

**问题描述**: `if (document)` 检查暗示作者考虑了 SSR，但这种检查方式不完整：

1. `document` 存在不意味着 DOM API 可用（某些环境的 polyfill 可能不完整）
2. 组件的其他部分（`useRef<HTMLDivElement>`、SVG 渲染）同样依赖浏览器环境，但未做任何保护
3. `if (document)` 是 falsy 检查，在 Node.js 中 `document` 是 `undefined`，但 `typeof document` 检查更标准

**架构建议**: 既然组件明确依赖 DOM 事件和 ref，应明确声明不支持 SSR，移除 `if (document)` 检查。若确实需要 SSR 兼容，应使用 `typeof document !== 'undefined'` 并在组件级别使用 `dynamic import` + `ssr: false`。

---

### P3 — 轻微问题（架构改进建议）

#### A-08: SVG 组件未抽取为独立模块

**位置**: L68–L78

**问题描述**: SVG 图标通过 `useMemo` 内联在组件中。虽然 `useMemo` 避免了不必要的重渲染，但 SVG 作为一个静态资源，更适合抽取为独立的常量或子组件：

```typescript
// 独立文件：DragHandleIcon.tsx
export const DragHandleIcon = () => (
  <svg viewBox="0 0 512 512" height="100%">
    <path fill="currentColor" d="..." />
  </svg>
);
```

**架构收益**: 图标可复用、可独立替换、可独立测试。

---

#### A-09: 样式依赖通过副作用导入 — 隐式耦合

**位置**: L3（`import './index.less'`）

**问题描述**: 样式文件通过 `import` 副作用导入，这是 CSS Modules/CommonJS 时代的做法。在现代 bundler 架构中：

1. 样式与组件的关联是隐式的，TypeScript 无法验证 CSS 类名是否正确
2. 无法支持 CSS-in-JS、Tailwind 等替代方案
3. 打包时需要额外配置 Less loader

**架构建议**: 考虑将样式通过 props 注入（如 `styles` prop），或使用 CSS Modules 显式关联。

---

#### A-10: 缺少 `React.memo` 包裹 — 不必要的重渲染

**位置**: 整个组件

**问题描述**: DragBar 的渲染输出仅依赖 `prefixCls`，但父组件重渲染时 DragBar 也会重渲染。虽然 SVG 已被 `useMemo` 缓存，但外层 `<div>` 仍会重新创建 VNode。

**修复建议**: 使用 `React.memo` 包裹，或使用 `export default React.memo(DragBar)`。

---

## 四、架构模式评价

### 4.1 组件模式分析

| 模式 | 当前状态 | 评价 |
|------|----------|------|
| 受控组件 | height 由父组件通过 props + onChange 管理 | ✅ 正确的设计决策 |
| Ref 用于 DOM 操作 | `$dom` 用于事件绑定 | ✅ 合理 |
| Ref 用于临时状态 | `dragRef` 存储拖拽起始状态 | ✅ 合理（拖拽状态不需要触发重渲染） |
| Ref 用于缓存 props | `heightRef` 缓存 props.height | ⚠️ 受控组件中不应有此模式 |
| 命令式事件绑定 | `addEventListener` / `removeEventListener` | ❌ 应优先使用 React 声明式事件 |

### 4.2 数据流分析

```
┌──────────────────────────────────────────────────────────────┐
│                        父组件                                │
│  height (state) ──props──→ DragBar                           │
│  onChange ←──callback── DragBar                              │
│  minHeight/maxHeight ──props──→ DragBar                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                      DragBar 内部                             │
│                                                              │
│  props.height ──sync useEffect──→ heightRef.current          │
│  handleMouseDown ←── 读取 heightRef.current（非 props.height）│
│  handleMouseMove ←── 读取 props.minHeight/maxHeight（陈旧闭包）│
│  handleMouseMove ──onChange()──→ 父组件更新 height            │
│                                                              │
│  问题: 数据流路径分裂                                         │
│    props.height → heightRef → handleMouseDown（路径 A）       │
│    props.minHeight/maxHeight → handleMouseMove（路径 B，陈旧）│
└──────────────────────────────────────────────────────────────┘
```

**问题**: 数据流路径分裂——拖拽起点通过 `heightRef` 获取，边界检查通过 `props` 获取但受闭包限制。这种分裂在动态 props 场景下会产生不一致。

### 4.3 事件生命周期分析

```
组件挂载
  │
  ├── useEffect 注册 mousedown/touchstart → $dom
  │
  ▼
用户 mousedown
  │
  ├── handleMouseDown
  │     ├── 记录 dragRef = { height: heightRef.current, dragY: clientY }
  │     ├── 注册 mousemove/mouseup → document
  │     └── 注册 touchmove/touchend → $dom
  │
  ▼
拖拽中 mousemove
  │
  ├── handleMouseMove（闭包陈旧！props 可能已更新）
  │     ├── 计算 newHeight
  │     ├── 边界检查（使用陈旧的 props.minHeight/maxHeight）
  │     └── onChange（使用陈旧的 onChange 引用）
  │
  ▼
用户 mouseup
  │
  ├── handleMouseUp
  │     ├── 清除 dragRef
  │     ├── 移除 mousemove/mouseup ← document
  │     └── 移除 touchmove/touchend ← $dom
  │
  ▼
组件卸载
  │
  ├── useEffect cleanup
  │     ├── 移除 mousedown/touchstart ← $dom
  │     ├── 移除 mousemove ← document
  │     └── ⚠️ 遗漏 mouseup ← document
  │              ⚠️ 遗漏 touchmove/touchend ← $dom（若拖拽中卸载）
```

**问题**: cleanup 不完整 + 拖拽中卸载的事件泄漏。

---

## 五、SOLID 评价

| 原则 | 遵循情况 | 说明 |
|------|----------|------|
| **S** — 单一职责 | ✅ 通过 | 组件仅负责拖拽调整高度 |
| **O** — 开闭原则 | ❌ 违反 | 边界检查逻辑（min/max）硬编码在 handleMouseMove 中，无法通过配置扩展（如自定义 clamp 函数、 snapping 行为） |
| **L** — 里氏替换 | N/A | 无继承关系 |
| **I** — 接口隔离 | ⚠️ 部分违反 | `IDragBarProps extends IProps` 引入了组件不需要的属性 |
| **D** — 依赖倒置 | ❌ 违反 | 直接依赖 `document` 全局对象和具体 DOM API；若要测试或 SSR 需修改组件代码 |

---

## 六、安全性评价

| 检查项 | 状态 | 说明 |
|--------|------|------|
| XSS 风险 | ✅ 安全 | 无 `dangerouslySetInnerHTML`，无用户输入注入 |
| DOM 注入 | ✅ 安全 | 仅通过 React ref 绑定事件，无 innerHTML |
| 事件注入 | ✅ 安全 | 事件处理器不涉及用户可控字符串拼接 |
| 内存泄漏 | ⚠️ 风险 | 拖拽中卸载可能泄漏事件监听器（见 A-03） |

---

## 七、可访问性架构评价

| 检查项 | 状态 | WAI-ARIA 规范 | 说明 |
|--------|------|---------------|------|
| 语义化角色 | ❌ 缺失 | `role="separator"` | 拖拽条在 ARIA 规范中应为 separator 角色 |
| 方向标注 | ❌ 缺失 | `aria-orientation="horizontal"` | 标注拖拽方向 |
| 当前值 | ❌ 缺失 | `aria-valuenow` | 当前高度值 |
| 值范围 | ❌ 缺失 | `aria-valuemin` / `aria-valuemax` | 最小/最大高度 |
| 键盘操作 | ❌ 缺失 | 方向键调整 | WAI-ARIA separator 要求支持键盘调整值 |
| 触控目标 | ⚠️ 不足 | WCAG 2.1 §2.5.8 | 10px 高度不满足 44×44px 最小触控目标要求 |

**架构建议**: 可访问性不应是后补的 add-on，应在组件接口设计阶段就纳入。建议 Props 接口增加 `aria-label`/`aria-labelledby` 属性支持。

---

## 八、与上下游组件的耦合分析

### 8.1 上游依赖（被依赖方）

| 依赖项 | 类型 | 耦合程度 | 说明 |
|--------|------|----------|------|
| `IProps`（Types.ts） | 接口继承 | 中等 | 组件仅使用 `prefixCls`，但继承了完整 IProps 契约 |
| `index.less` | 副作用导入 | 紧耦合 | 样式通过隐式 import 关联 |

### 8.2 下游消费者（依赖方）

| 消费者 | 耦合方式 | 说明 |
|--------|----------|------|
| 父编辑器组件 | Props 传递 + onChange 回调 | 标准受控组件模式，耦合合理 |

### 8.3 横向依赖

| 依赖项 | 类型 | 说明 |
|--------|------|------|
| `document`（全局对象） | 环境依赖 | 违反依赖倒置原则，SSR 不可用 |
| `window.event`（隐式） | 环境依赖 | TouchEvent/MouseEvent 依赖浏览器环境 |

---

## 九、重构路线图

### 阶段一：安全修复（紧急，不影响外部接口）

1. 引入 `propsRef` 持有最新 props，解决闭包陈旧（A-01）
2. 移除 `heightRef` 和同步 useEffect（A-02）
3. 补全 useEffect cleanup 中遗漏的事件移除（A-03）
4. 修复重复计算：`onChange(newHeight)` 而非重新计算（对应质量评审 H-02）

### 阶段二：接口优化（小版本更新）

1. 精简 Props 接口，移除不必要的 IProps 继承（A-04）
2. 统一 onChange 类型契约与运行时行为（A-05）
3. 添加 ARIA 属性支持（可访问性）

### 阶段三：架构重构（大版本更新）

1. 提取自定义 Hook `useDragResize`（A-06）
2. 迁移到 Pointer Events API，统一事件处理（A-03 完整方案）
3. SVG 图标抽取为独立组件（A-08）
4. 添加 `React.memo` 优化（A-10）

---

## 十、综合评价

### 优势

1. **职责单一**: DragBar 只做一件事——拖拽调整高度，这是最突出的架构优势
2. **受控模式正确**: 高度状态由父组件持有，符合 React 单向数据流
3. **依赖精简**: 仅依赖 React 核心Hooks和内部类型，无多余外部依赖
4. **代码简洁**: 86 行代码完成完整的拖拽功能，阅读成本低

### 核心问题

1. **事件架构是最大短板**: 命令式事件绑定 + 闭包陈旧 + 注册/清理不对称，三者相互关联形成系统性问题
2. **状态管理混合**: heightRef 的引入使得受控组件的设计意图被部分架空
3. **可测试性差**: 逻辑与 DOM 耦合，无法对拖拽计算进行独立的纯函数测试
4. **可访问性完全缺失**: 从架构层面就没有考虑无障碍支持

### 最终判定

> **综合评分: 4.8 / 10 — CONDITIONAL APPROVE**
>
> DragBar 在组件职责划分上是正确的（单一职责、受控模式），但在事件架构上存在根本性设计缺陷。闭包陈旧问题不仅是 bug，更是"在声明式框架中使用命令式事件绑定"这一架构选型的必然结果。建议优先修复阶段一的安全问题，并在下一个大版本中完成事件架构的重构（迁移到 Pointer Events + 自定义 Hook）。
