# Editor.common.tsx 软件架构专家评审报告

**文件**: `@uiw/react-md-editor/src/Editor.common.tsx` (7 行)
**评审日期**: 2026-05-24
**评审角色**: 软件架构专家
**综合评分**: **7.7 / 10**（设计模式优秀，上游工厂实现存在架构隐患）

---

## 一、源码全貌

```tsx
// Editor.common.tsx — 依赖注入组装入口，共 7 行
import MarkdownPreview from '@uiw/react-markdown-preview/common';
import TextArea from './components/TextArea/index.common';
import { createMDEditor } from './Editor.factory';

export type { RefMDEditor } from './Editor.factory';

export default createMDEditor({ MarkdownPreview, TextArea });
```

**架构角色**: 本文件是 `@uiw/react-md-editor` 库的 **轻量变体组装入口**，职责是将 "common" 版本的依赖组件注入工厂函数，产出最终的 `MDEditor` 组件。

**消费链路**:
```
index.common.tsx → Editor.common.tsx → Editor.factory.tsx (createMDEditor)
                                          ├── MarkdownPreview (common)
                                          └── TextArea (common)
```

---

## 二、架构模式分析

### 2.1 核心模式：工厂 + 依赖注入（评分：9/10）

本文件体现了经典的 **抽象工厂 + 依赖注入（DI）** 模式：

```
┌──────────────────────────────────────────────────────┐
│                 Editor.factory.tsx                    │
│  ┌──────────────────────────────────────────────┐    │
│  │  createMDEditor<TPreview, TTextArea>()        │    │
│  │    ↳ 工厂函数（泛型，接收可替换组件）          │    │
│  │                                               │    │
│  │  InternalMDEditor = forwardRef(287行核心逻辑)  │    │
│  └──────────────────────────────────────────────┘    │
│                       ▲ 注入                          │
│                       │                               │
│  ┌──────────┐  ┌──────────┐                          │
│  │ Preview  │  │ TextArea │   ← 可替换的依赖组件      │
│  └──────────┘  └──────────┘                          │
└──────────────────────────────────────────────────────┘
         ▲                    ▲
    Editor.common.tsx    Editor.tsx（标准版）
    注入 common 变体     注入完整版变体
```

**模式优势**:
- **开闭原则（OCP）**: 无需修改 `Editor.factory.tsx` 即可创建新变体
- **依赖倒置（DIP）**: 工厂依赖抽象的 `React.ComponentType<any>`，不绑定具体实现
- **单一职责（SRP）**: 本文件仅负责"组装"，不包含任何业务逻辑
- **可测试性**: 可注入 Mock 组件进行隔离测试

**模式不足**:
- 工厂内部立即将泛型断言为 `React.ComponentType<any>`（第25-26行），**泛型约束仅存在于签名层面**，运行时类型信息完全丢失
- 缺少依赖注入容器/配置机制，注入方式硬编码

### 2.2 双入口分层架构（评分：8/10）

库的入口层设计为两条组装路径：

| 入口文件 | Preview 来源 | TextArea 来源 | 打包体积 | 适用场景 |
|---|---|---|---|---|
| `Editor.tsx` | `@uiw/react-markdown-preview` | `./components/TextArea/` | 较大 | 需要完整功能 |
| `Editor.common.tsx` | `@uiw/react-markdown-preview/common` | `./components/TextArea/index.common` | 较小 | 仅需轻量渲染 |

这种分层策略的架构意义：

1. **Tree-shaking 友好**: "common" 变体可能排除 highlight.js 等大型依赖，减少 bundle size
2. **渐进增强**: 消费者可在 common 版本基础上逐步引入完整功能
3. **同构支持**: common 变体更适合 SSR 场景（避免浏览器特有 API）

**不足**: 缺少架构决策记录（ADR），开发者难以判断应选择哪个入口。

### 2.3 模块边界与耦合度（评分：7/10）

依赖关系图：

```
Editor.common.tsx
  ├── @uiw/react-markdown-preview/common  (外部依赖)
  ├── ./components/TextArea/index.common   (内部依赖)
  └── ./Editor.factory                     (核心工厂)
        ├── ./components/Toolbar/
        ├── ./components/DragBar/
        ├── ./commands/
        ├── ./Context
        └── ./Types
```

**耦合分析**:
- **传入耦合（Afferent）**: `index.common.tsx` 是唯一消费者，耦合度极低 ✅
- **传出耦合（Efferent）**: 直接依赖 3 个模块，间接依赖 6+ 个模块，传出耦合中等 ⚠️
- **数据耦合**: 仅通过参数传递组件引用，无共享状态耦合 ✅

**风险点**: 本文件对 `Editor.factory` 的 `createMDEditor` 函数签名形成强耦合——如果工厂的参数结构变更，本文件必须同步修改。

---

## 三、上游工厂架构评审

本文件完全委托给 `Editor.factory.tsx`，工厂的架构质量直接决定运行时表现。

### 3.1 P0 级架构缺陷

#### ARCH-1: `useMemo` 被滥用作副作用执行器

**位置**: `Editor.factory.tsx:115-148`

```tsx
// 10 处 useMemo 用于执行 dispatch 副作用
useMemo(
  () => propsValue !== state.markdown && dispatch({ markdown: propsValue || '' }),
  [propsValue, state.markdown],
);
```

**架构违规**:
- React 的 `useMemo` 语义是 **纯值计算缓存**，不应包含副作用
- React 18 并发模式可能多次执行或跳过 `useMemo`，导致状态不一致
- 正确的架构应使用 `useEffect`（异步）或 `useSyncExternalStore`（同步外部状态）

**影响**: 本项目使用 React 18，开发模式 StrictMode 下可能出现双重 dispatch 导致闪烁。

#### ARCH-2: 事件监听器生命周期未管理

**位置**: `Editor.factory.tsx:154-163`

```tsx
useMemo(() => {
  textareaDomRef.current = state.textareaWarp;
  if (state.textareaWarp) {
    state.textareaWarp.addEventListener('mouseover', () => { active.current = 'text'; });
    state.textareaWarp.addEventListener('mouseleave', () => { active.current = 'preview'; });
  }
}, [state.textareaWarp]);
```

**架构违规**:
- 违反 **资源获取即初始化（RAII）** 原则——有注册无清理
- `useMemo` 不是管理副作用生命周期的正确 Hook
- DOM 元素引用变化时旧监听器泄漏，累积导致内存增长

**应然架构**:
```tsx
useEffect(() => {
  const el = state.textareaWarp;
  if (!el) return;
  const onOver = () => { active.current = 'text'; };
  const onLeave = () => { active.current = 'preview'; };
  el.addEventListener('mouseover', onOver);
  el.addEventListener('mouseleave', onLeave);
  return () => { el.removeEventListener('mouseover', onOver); el.removeEventListener('mouseleave', onLeave); };
}, [state.textareaWarp]);
```

### 3.2 P1 级架构缺陷

#### ARCH-3: 状态管理架构——无 Action 类型区分的 Reducer

**位置**: `Context.tsx` 被工厂引用

```tsx
// Context.tsx
export function reducer(state: ContextStore, action: ContextStore) {
  return { ...state, ...action };
}
```

**架构问题**:
- 单一 `ContextStore` 既充当 State 又充当 Action，违反 **Flux/Redux 架构的基本约定**
- 无法追踪状态变更原因（无 action type），调试困难
- 与 React DevTools 集成时无法显示有意义的 action 名称
- 结合 `[key: string]: any` 索引签名，完全丧失类型安全

#### ARCH-4: `useImperativeHandle` 暴露过宽的 API 表面

**位置**: `Editor.factory.tsx:88`

```tsx
useImperativeHandle(ref, () => ({ ...state, container: container.current, dispatch }));
```

**架构违规**:
- 违反 **接口隔离原则（ISP）**——暴露了 20+ 个内部状态字段
- 暴露 `dispatch` 允许外部直接操纵内部状态，破坏封装边界
- 状态字段（如 `barPopup`、`scrollTop`）属于实现细节，不应成为公共 API

### 3.3 P2 级架构异味

#### ARCH-5: 组件内部状态同步机制散乱

工厂文件中有 **10 处 `useMemo`** 分别同步不同的 props 到内部 state：

```
propsValue → state.markdown     (line 115)
previewType → state.preview     (line 120)
tabSize → state.tabSize         (line 122)
highlightEnable → ...           (line 124)
autoFocus → ...                 (line 129)
autoFocusEnd → ...              (line 130)
fullscreen → ...                (line 131)
height → ...                    (line 137)
commands → ...                  (line 143)
extraCommands → ...             (line 145)
```

**架构异味**: 这种"props → state 逐字段同步"模式是 **反模式**，应考虑：
- 如果 state 完全由 props 派生 → 直接使用 props（受控组件）
- 如果需要内部管理 → 使用 `useReducer` + 单一 `useEffect` 同步

#### ARCH-6: 滚动同步算法缺少边界防护

**位置**: `Editor.factory.tsx:175-178`

```tsx
const scale = (textareaDom.scrollHeight - textareaDom.offsetHeight) /
              (previewDom.scrollHeight - previewDom.offsetHeight);
```

当 `previewDom.scrollHeight === previewDom.offsetHeight` 时 `scale` 为 `Infinity`，导致 `scrollTop * Infinity = NaN`。

---

## 四、架构视图

### 4.1 组件架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    本项目（by_geo）                           │
│                                                              │
│  MarkdownEditor（封装组件）                                   │
│    ↳ pages/components/MarkdownEditor/                        │
│         ├── 使用 @uiw/react-md-editor（common 入口）          │
│         └── 添加项目特定的样式和配置                           │
│                                                              │
└───────────────────────────┬─────────────────────────────────┘
                            │ import
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            @uiw/react-md-editor@4.1.0                        │
│                                                              │
│  index.common.tsx                                            │
│    └── Editor.common.tsx  ◄──── 本次评审目标                 │
│          └── Editor.factory.tsx (createMDEditor)             │
│                ├── Context.tsx (状态管理)                     │
│                ├── Types.ts (类型定义)                        │
│                ├── commands/ (工具栏命令)                     │
│                ├── components/                               │
│                │    ├── TextArea/ (输入区域)                  │
│                │    ├── Toolbar/ (工具栏)                     │
│                │    └── DragBar/ (拖拽条)                     │
│                └── MarkdownPreview (预览区域)                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 数据流架构

```
用户输入
   │
   ▼
TextArea.onChange
   │
   ├──→ onChange(value, event, state) ──→ 项目回调
   │
   ├──→ textareaProps.onChange ──→ 原生回调
   │
   └──→ dispatch({ markdown: value }) ──→ Context Store
                                            │
                              ┌─────────────┤
                              ▼             ▼
                         TextArea       MarkdownPreview
                         (编辑区)        (预览区)
                              │             │
                              └─ 滚动同步 ──┘
```

---

## 五、架构评分矩阵

| 维度 | 评分 | 说明 |
|---|---|---|
| **设计模式选型** | 9.0/10 | 工厂 + DI 是 React 组件库的最佳实践，本文件实现精准 |
| **模块职责划分** | 9.5/10 | 7 行代码，单一职责（组装），零越界 |
| **依赖管理** | 8.0/10 | 依赖方向正确，但缺少版本锁定和降级策略 |
| **类型架构** | 7.0/10 | 泛型签名良好但工厂内部 `any` 断言破坏类型链 |
| **状态管理架构** | 5.0/10 | 无 Action 区分的 Reducer + `useMemo` 副作用，架构缺陷严重 |
| **生命周期管理** | 5.5/10 | 事件监听器泄漏，资源获取无配对释放 |
| **API 设计** | 6.5/10 | `useImperativeHandle` 暴露过宽，废弃属性未清理 |
| **可扩展性** | 8.5/10 | DI 模式天然支持扩展，`components` prop 允许自定义渲染 |
| **综合评分** | **7.7/10** | |

---

## 六、对本项目的架构建议

### 6.1 封装层防御（优先级 P0）

由于上游工厂的 `useMemo` 副作用和事件监听器泄漏问题，建议在本项目的 `MarkdownEditor` 封装组件中增加防御：

| 编号 | 建议 | 理由 |
|---|---|---|
| DEF-1 | 封装组件卸载时手动清理 DOM 引用 | 防止事件监听器泄漏导致的内存泄漏 |
| DEF-2 | 避免在短时间内频繁切换 `preview` 模式 | `useMemo` 副作用在并发模式下可能批量触发 |
| DEF-3 | 对 `onChange` 回调做 debounce 处理 | 防止快速输入时过多的 re-render |
| DEF-4 | 将 Markdown 内容在提交前做服务端 sanitize | 不依赖前端 `rehype-sanitize`，深度防御 |

### 6.2 版本升级策略（优先级 P1）

- 关注 `@uiw/react-md-editor` 的 4.2+ 版本更新日志
- 特别关注 `useMemo` → `useEffect` 的重构和事件监听器修复
- 升级前在 React 18 StrictMode 下做回归测试

### 6.3 备选方案评估

若上游长期不修复架构缺陷，可考虑：

| 方案 | 成本 | 收益 |
|---|---|---|
| Fork 并修复关键问题 | 中 | 完全掌控，可针对性修复 |
| 迁移至其他 Markdown 编辑器（如 `@toast-ui/editor`） | 高 | 更成熟的架构，但需重写集成代码 |
| 维持现状 + 防御性封装 | 低 | 风险可控，但技术债累积 |

---

## 七、结论

`Editor.common.tsx` 本身是一个架构设计优秀的模块入口文件——以极简的 7 行代码精确实现了 **工厂组装 + 依赖注入** 的设计意图，完美遵循单一职责原则。

然而其委托的核心工厂 `Editor.factory.tsx` 存在多处架构缺陷：`useMemo` 副作用滥用（违反 React Hooks 语义）、事件监听器泄漏（违反 RAII 原则）、以及无 Action 区分的 Reducer（违反 Flux 架构约定）。这些问题的根源在于工厂试图用单一组件承担过多的状态管理职责（287 行），缺少进一步的内部分层。

**对本项目的实际影响**：中等。在文章编辑的典型使用场景下（非长时间连续使用），内存泄漏和状态不一致的风险较低。但仍建议在封装层做防御性处理。

**评审结论**: ✅ 通过（附架构改进建议）

**风险等级**: ⚠️ 低风险（有条件接受——需在封装层做防御）
