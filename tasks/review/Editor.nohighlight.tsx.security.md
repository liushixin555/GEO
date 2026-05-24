# 代码安全专家评审：@uiw/react-md-editor/src/Editor.nohighlight.tsx

**评审日期**: 2026-05-24
**评审人**: 代码安全专家（Claude）
**评审文件**: `node_modules/@uiw/react-md-editor/src/Editor.nohighlight.tsx`（含关联文件 `Editor.factory.tsx`、`Context.tsx`、`components/TextArea/index.nohighlight`、`@uiw/react-markdown-preview/nohighlight`）
**代码行数**: 7 行（组装层） + 287 行（传导自工厂函数）
**评分**: B-/7.0（安全评分，满分10）

---

## 评审摘要

该文件是 `@uiw/react-md-editor` 的**无语法高亮变体组装入口**，仅 7 行代码，职责是将 nohighlight 版策略组件注入 `createMDEditor` 工厂函数。文件本身零运行时逻辑、零直接安全缺陷，但通过组装关系**传导**了上游工厂函数和 MarkdownPreview 组件的全部安全问题。相比标准版 `Editor.tsx`，本变体的安全态势**显著优于标准版**——消除了 `rehype-raw`（HTML 注入 XSS）和 `rehype-prism-plus`（第三方依赖攻击面），但仍继承 **3 项 HIGH 级别风险**（ContextStore 状态注入 + useImperativeHandle 泄露 + URL 安全过滤绕过）和 **4 项 MEDIUM 级别风险**（useMemo 反模式 + 事件监听器泄漏 + rehype-attr 属性注入 + setGroupPopFalse 原地突变）。

---

## 源码全貌

```typescript
import MarkdownPreview from '@uiw/react-markdown-preview/nohighlight';
import TextArea from './components/TextArea/index.nohighlight';
import { createMDEditor } from './Editor.factory';

export type { RefMDEditor } from './Editor.factory';

export default createMDEditor({ MarkdownPreview, TextArea });
```

**安全角色**: 纯组装层——将安全的策略组件组合注入工厂，产出不含 Prism.js 的轻量编辑器。本文件不引入任何新的运行时安全风险。

---

## 发现列表

### #1 [HIGH] 传导自 Editor.factory — useImperativeHandle 泄露完整内部状态 + DOM 引用 + dispatch

**文件**: `Editor.factory.tsx:88`
**类型**: 信息泄露 / 权限提升
**严重性**: HIGH
**来源**: 传导性风险（上游工厂函数）

```typescript
useImperativeHandle(ref, () => ({ ...state, container: container.current, dispatch }));
```

**问题**: 通过 `ref` 暴露了组件的**全部内部状态**，包括 DOM 引用（`container`、`textarea`、`textareaWarp`）、`dispatch` 状态分发函数、`commands` 命令数组和 `markdown` 编辑内容。

攻击者可通过 ref 执行以下操作：

```typescript
const editorRef = useRef<RefMDEditor>(null);

// 窃取编辑内容
const content = editorRef.current?.markdown;

// 注入恶意命令到工具栏
editorRef.current?.dispatch({ commands: [maliciousCommand] });

// 直接操作 DOM 注入恶意元素
editorRef.current?.container?.appendChild(evilElement);

// 修改 textarea 值
editorRef.current?.textarea && (editorRef.current.textarea.value = '[](javascript:alert(1))');
```

**nohighlight 变体与标准版差异**: 无差异——两种变体均通过同一工厂函数创建，共享此缺陷。

**修复建议**: 仅暴露必要的只读 API：

```typescript
useImperativeHandle(ref, () => ({
  getMarkdown: () => state.markdown,
  setMarkdown: (value: string) => dispatch({ markdown: value }),
}));
```

---

### #2 [HIGH] 传导自 Context.tsx — ContextStore 索引签名允许状态注入

**文件**: `Context.tsx:29`
**类型**: 原型污染 / 状态注入
**严重性**: HIGH
**来源**: 传导性风险（上游 Context 模块）

```typescript
export interface ContextStore {
  // ... 明确字段 ...
  [key: string]: any;   // ← 任意键值对，无类型约束
}
```

**问题**: 结合 `reducer` 的简单展开合并策略 `{ ...state, ...action }`，任何持有 `dispatch` 引用的代码（通过 #1 的 ref 泄露、或通过 `components.preview` 回调）都可向全局状态注入任意属性：

- 注入 `container: null` 破坏内部逻辑
- 注入恶意 `commands` 数组在工具栏渲染时执行任意代码
- 注入 `textarea: evilElement` 替换 DOM 节点

**修复建议**: 移除索引签名，在 reducer 中增加 action 白名单过滤（详见 `Editor.factory.tsx.security.md #1`）。

---

### #3 [HIGH] 传导自 MarkdownPreview — URL 安全过滤默认禁用

**文件**: `@uiw/react-markdown-preview/preview.tsx:14,57`
**类型**: XSS（跨站脚本攻击）
**严重性**: HIGH
**来源**: 传导性风险（上游 MarkdownPreview 组件）

```typescript
// preview.tsx:14 — 默认 URL 转换函数直接返回原始 URL
const defaultUrlTransform: UrlTransform = (url) => url;
```

**问题**: `react-markdown` 内置的 URL 安全过滤器（阻止 `javascript:`、`data:`、`vbscript:` 等危险协议）被完全绕过。攻击者可构造：

```markdown
[点击领取奖励](javascript:alert(document.cookie))
```

在用户浏览器中执行任意 JavaScript。

**nohighlight 变体与标准版差异**: 无差异——两种变体使用相同的 `preview.tsx` 基类，风险等级相同。

**修复建议**: 在 `defaultUrlTransform` 中加入协议白名单过滤（详见 `nohighlight.tsx.security.md #1`）。

---

### #4 [MEDIUM] 传导自 Editor.factory — useMemo 滥用为副作用执行器

**文件**: `Editor.factory.tsx:115-148`
**类型**: React 语义违规 / 安全可预测性
**严重性**: MEDIUM
**来源**: 传导性风险（上游工厂函数）

```typescript
// 10+ 处 useMemo 被用于执行 dispatch 副作用
useMemo(
  () => propsValue !== state.markdown && dispatch({ markdown: propsValue || '' }),
  [propsValue, state.markdown],
);
```

**问题**: `useMemo` 的语义是纯函数计算缓存，此处用于执行副作用。React 18 并发模式下可能导致：
1. 同一 dispatch 被重复触发，产生无限循环
2. 多处依赖数组不完整（`eslint-disable` 压制警告），状态可能不同步
3. dispatch 时序不确定，可能导致 UI 状态不一致

**安全影响**: 在特定时序下可能渲染错误的 UI 状态（如意外切换到 preview 模式隐藏编辑区域），或导致状态静默丢失。

**修复建议**: 全部替换为 `useEffect`（详见 `Editor.factory.tsx.security.md #3`）。

---

### #5 [MEDIUM] 传导自 Editor.factory — 事件监听器泄漏

**文件**: `Editor.factory.tsx:154-164`
**类型**: 内存泄漏 / DoS 向量
**严重性**: MEDIUM
**来源**: 传导性风险（上游工厂函数）

```typescript
useMemo(() => {
  textareaDomRef.current = state.textareaWarp;
  if (state.textareaWarp) {
    state.textareaWarp.addEventListener('mouseover', () => { active.current = 'text'; });
    state.textareaWarp.addEventListener('mouseleave', () => { active.current = 'preview'; });
  }
}, [state.textareaWarp]);
```

**问题**: `useMemo` 无 cleanup 机制，每次 `textareaWarp` 变化时添加新监听器但旧监听器永不移除。匿名箭头函数导致 `removeEventListener` 无法匹配。长时间运行的 SPA 中事件监听器持续累积。

**修复建议**: 改用 `useEffect` + 具名函数 + cleanup（详见 `Editor.factory.tsx.security.md #5`）。

---

### #6 [MEDIUM] 传导自 MarkdownPreview — rehype-attr 允许任意 HTML 属性注入

**文件**: `@uiw/react-markdown-preview/nohighlight.tsx:19`
**类型**: 属性注入 / XSS 向量
**严重性**: MEDIUM
**来源**: 传导性风险（上游 MarkdownPreview 组件）

```typescript
[rehypeAttrs, { properties: 'attr' }],
```

**问题**: `rehype-attr` 插件允许通过 Markdown 代码块元信息注入任意 HTML 属性：

````markdown
```html attr="class='x' onmouseover='alert(1)'"
<div>test</div>
```
````

**nohighlight 缓解因素**: 由于本变体不引入 `rehype-raw`，代码块中的原始 HTML 不会被解析渲染。但 `rehype-attr` 仍可能影响非代码块元素，`rehypeRewriteHandle` 的 `copy` 功能将代码内容存储在 `data-code` 属性中存在潜在风险。

**修复建议**: 对 `rehypeAttrs` 注入的属性值增加白名单过滤（详见 `nohighlight.tsx.security.md #2`）。

---

### #7 [MEDIUM] 传导自 Editor.factory — setGroupPopFalse 原地突变对象

**文件**: `Editor.factory.tsx:8-13`
**类型**: 副作用突变 / 数据完整性
**严重性**: MEDIUM
**来源**: 传导性风险（上游工厂函数）

```typescript
function setGroupPopFalse(data: Record<string, boolean> = {}) {
  Object.keys(data).forEach((keyname) => {
    data[keyname] = false;   // ← 直接修改传入的 state.barPopup
  });
  return data;
}
```

**问题**: 直接修改 reducer 管理的状态对象属性，违反 React 不可变状态原则。快速连续点击场景下可能导致工具栏弹出/收起状态不一致。

**修复建议**: 改为不可变实现 `Object.fromEntries(Object.keys(data).map(k => [k, false]))`。

---

### #8 [LOW] 传导自 Editor.factory — props 扩散注入未过滤属性

**文件**: `Editor.factory.tsx:233`
**类型**: DOM 属性注入
**严重性**: LOW
**来源**: 传导性风险（上游工厂函数）

```typescript
<div ref={container} className={cls} {...other} onClick={containerClick} style={containerStyle}>
```

**问题**: `{...other}` 将 `MDEditorProps` 中未解构的所有属性直接扩散到容器 `div`，理论上可传入 `dangerouslySetInnerHTML` 或自定义事件处理器。

**修复建议**: 使用白名单过滤扩散属性。

---

### #9 [LOW] 传导自 Editor.factory — 滚动事件 dispatch 洪水

**文件**: `Editor.factory.tsx:189`
**类型**: 拒绝服务
**严重性**: LOW
**来源**: 传导性风险（上游工厂函数）

**问题**: 滚动事件频率可高达每秒 60+ 次，每次都调用 `dispatch` 触发完整状态更新和重渲染。可通过 JS 注入快速滚动触发 DoS。

**修复建议**: 使用 `requestAnimationFrame` 节流。

---

### #10 [INFO] 无 displayName 差异化 — 安全可观测性不足

**文件**: `Editor.factory.tsx:283`（传导至本模块）
**类型**: 可观测性
**严重性**: INFO

**问题**: `createMDEditor` 内部固定 `Editor.displayName = 'MDEditor'`，导致高亮版和无高亮版在 React DevTools 中显示相同名称，安全审计和调试时无法区分变体。

**建议**: 上游 `createMDEditor` 增加 `options.displayName` 参数。

---

## 与标准版 `Editor.tsx` 的安全差异对比

| 安全维度 | `Editor.tsx`（标准版） | `Editor.nohighlight.tsx`（本文件） | 差异说明 |
|---------|----------------------|----------------------------------|---------|
| **rehype-raw（HTML 注入）** | ❌ 无条件启用 | ✅ **未引入** | **本变体天然防御 HTML 注入 XSS** |
| **rehype-prism-plus（语法高亮）** | ❌ 引入第三方依赖 | ✅ **未引入** | 减少第三方依赖攻击面 |
| **URL 安全过滤** | ❌ 默认禁用 | ❌ 默认禁用 | 相同 — 继承自 `preview.tsx` |
| **rehype-attr 属性注入** | ⚠️ 存在 + rehype-raw 放大 | ⚠️ 存在但无 rehype-raw | 风险显著降低 |
| **useImperativeHandle 泄露** | ⚠️ 存在 | ⚠️ 存在 | 相同 — 继承自工厂函数 |
| **ContextStore 状态注入** | ⚠️ 存在 | ⚠️ 存在 | 相同 — 继承自 Context.tsx |
| **useMemo 反模式** | ⚠️ 存在 | ⚠️ 存在 | 相同 — 继承自工厂函数 |
| **事件监听器泄漏** | ⚠️ 存在 | ⚠️ 存在 | 相同 — 继承自工厂函数 |
| **Bundle 攻击面** | 较大（+Prism.js ~100KB） | **较小** | 更少代码 = 更小攻击面 |
| **综合安全等级** | C+ (5.8)¹ | **B- (7.0)** | **本变体安全性显著优于标准版** |

¹ 标准版预估评分，基于 `Editor.factory.tsx.security.md`（5.8）+ 标准 MarkdownPreview 额外的 `rehype-raw` 风险。

---

## 项目中的缓解措施

本项目 `MarkdownEditor.tsx` 对上游安全缺陷实施了以下缓解：

| 缓解措施 | 文件位置 | 针对的发现 | 有效性 |
|----------|---------|-----------|--------|
| **DOMPurify 消毒** | `MarkdownEditor.tsx:211-217` | #3 URL XSS, #6 属性注入 | ✅ 高 — 消毒提交内容 |
| **safeUrlTransform** | `MarkdownEditor.tsx:267` → `MarkdownViewer.tsx` | #3 URL 安全过滤 | ✅ 高 — 覆盖默认 pass-through |
| **SAFE_TAGS 白名单** | `MarkdownEditor.tsx:268-269` | #6 属性注入 | ✅ 高 — 限制允许的 HTML 标签 |
| **commandsFilter 移除 help** | `MarkdownEditor.tsx:229-234` | help 命令 Tabnabbing | ✅ 有效 |
| **内容长度限制 2MB** | `MarkdownEditor.tsx:61,202-204` | DoS | ✅ 有效 |
| **Error Boundary** | `MarkdownEditor.tsx:68-91` | 渲染崩溃 | ✅ 有效 |
| **组件卸载时清理事件监听器** | `MarkdownEditor.tsx:110-125` | #5 事件监听器泄漏 | ✅ 通过 DOM clone 移除匿名监听器 |
| **ref 隔离** | `MarkdownEditor.tsx:219-226` | #1 useImperativeHandle 泄露 | ✅ 仅暴露 `getSanitizedHTML`/`getRawMarkdown`/`focus` |
| **点击事件隔离** | `MarkdownEditor.tsx:238-240` | 事件冒泡到父组件 | ✅ 有效 |
| **ARIA 属性注入** | `MarkdownEditor.tsx:129-196` | 无障碍安全 | ✅ 有效 |

**评估**: 项目通过 `MarkdownEditor.tsx` 封装层对上游安全缺陷实施了**多层深度防御**。DOMPurify + safeUrlTransform + SAFE_TAGS 三重组合有效缓解了 XSS 向量（#3, #6）。ref 隔离解决了 useImperativeHandle 泄露（#1）。组件卸载清理缓解了事件监听器泄漏（#5）。

**⚠️ 注意**: 项目当前使用的是标准版 `@uiw/react-md-editor`（非 nohighlight），因此实际风险高于本变体。建议评估是否迁移至 nohighlight 变体以获得更好的安全基线。

---

## 评分明细

| 维度 | 得分 | 说明 |
|------|------|------|
| **本文件直接安全** | 10/10 | 7 行纯组装，零运行时逻辑，零直接安全缺陷 |
| **输入验证（传导）** | 4/10 | URL 无过滤（继承），但无 rehype-raw 故 HTML 注入面较小 |
| **状态安全（传导）** | 3/10 | ContextStore 索引签名 + 裸 dispatch + 原地突变 |
| **封装性（传导）** | 4/10 | ref/state/dispatch 泄露（项目 MarkdownEditor.tsx 已缓解） |
| **内存安全（传导）** | 5/10 | 事件监听器泄漏（项目已通过 DOM clone 缓解） |
| **XSS 防护** | 8/10 | 无 rehype-raw，XSS 面显著小于标准版（项目 DOMPurify 进一步加强） |
| **依赖安全** | 9/10 | 无 Prism.js 依赖，攻击面最小化 |
| **API 设计** | 5/10 | 工厂模式合理但暴露面过大 |
| **综合** | **7.0/10** | **B- 级 — 本变体安全基线显著优于标准版，但上游工厂函数问题仍在传导** |

---

## 修复优先级建议

| 优先级 | 发现编号 | 预估工作量 | 备注 |
|--------|---------|-----------|------|
| P0（立即修复） | #1 useImperativeHandle 最小化 | 低 | 仅暴露必要的只读 API |
| P0（立即修复） | #2 ContextStore 移除索引签名 | 中 | 接口重构 + reducer 白名单 |
| P0（立即修复） | #3 URL 安全过滤覆盖 | 低 | 修改 defaultUrlTransform 或消费方覆盖 |
| P1（本迭代） | #4 useMemo → useEffect | 中 | 10+ 处替换 |
| P1（本迭代） | #5 事件监听器改用 useEffect | 低 | 添加 cleanup |
| P1（本迭代） | #6 rehype-attr 属性过滤 | 低 | 属性白名单 |
| P2（下迭代） | #7 setGroupPopFalse 不可变 | 低 | 单函数修改 |
| P3（可选） | #8 props 白名单过滤 | 中 | |
| P3（可选） | #9 滚动 dispatch 节流 | 低 | |

**注意**: 以上修复建议均为第三方依赖包代码，需提交至上游 `@uiw/react-md-editor` 仓库或通过 fork 方式实施。在本项目层面，`MarkdownEditor.tsx` 封装层已提供有效缓解。

---

## 安全建议

### 1. 评估迁移至 nohighlight 变体

项目当前使用标准版 `@uiw/react-md-editor`，引入了 `rehype-raw` 和 `rehype-prism-plus` 的额外攻击面。建议评估是否可迁移至 nohighlight 变体：

```typescript
// 当前（标准版）
import MDEditor from '@uiw/react-md-editor';

// 建议（nohighlight 变体）
import MDEditor from '@uiw/react-md-editor/nohighlight';
```

**权衡**: 放弃代码块语法高亮，换取更小的攻击面和 bundle 体积（约减半）。

### 2. 保持现有安全封装层

`MarkdownEditor.tsx` 的多层防御（DOMPurify + safeUrlTransform + SAFE_TAGS + ref 隔离 + 事件清理）是对上游缺陷的有效缓解，建议持续维护。

---

## 免责声明

本评审仅针对代码安全层面，不涉及功能正确性、性能优化或架构设计。评审基于 2026-05-24 的代码快照，不保证对未来版本有效。该文件为第三方依赖包代码，修复建议需提交至上游仓库或通过 fork 方式实施。项目中使用该组件的代码应在上游修复前自行实施缓解措施。

---

*评审人: Claude 代码安全专家*
*评审工具: 静态安全分析 + 依赖链传导推演 + 项目缓解措施审计*
