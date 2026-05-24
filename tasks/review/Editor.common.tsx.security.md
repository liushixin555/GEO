# 安全评审：@uiw/react-md-editor/src/Editor.common.tsx

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP Top 10 2021 / CWE / 前端安全标准视角）
**文件路径**: `@uiw/react-md-editor@4.1.0/src/Editor.common.tsx`
**代码行数**: 7 行（直接），287 行（上游工厂），49 行（Markdown 渲染组件）
**关联文件**: `Editor.factory.tsx`, `Context.tsx`, `components/TextArea/Markdown.common.tsx`, `pages/components/MarkdownEditor.tsx`（项目封装层）
**安全评级**: 🟡 B-（上游存在 3 项 HIGH、2 项 MEDIUM 级安全隐患，项目封装层已部分缓解）

---

## 1. 安全总体评级：🟡 B-

`Editor.common.tsx` 本身仅有 7 行代码，职责是将 "common" 变体的依赖组件注入工厂函数。但其构建的组件树中存在 **`dangerouslySetInnerHTML` 无消毒渲染、事件监听器泄漏可被利用、Context 索引签名破坏类型安全** 等安全问题。值得庆幸的是，本项目已通过 `MarkdownEditor.tsx` 封装层实施了 DOMPurify 消毒、URL 白名单、内容长度限制等防御措施，使实际风险降低至可控水平。

| 安全域 | 评分 | 状态 |
|--------|------|------|
| XSS 防御（XSS Protection） | 3/10（上游）/ 7/10（封装后） | ⚠️ 上游 `dangerouslySetInnerHTML` 无消毒，封装层已拦截 |
| 注入防护（Injection） | 4/10 | ⚠️ Markdown.common.tsx 仅转义 `<&"`，不处理事件属性 |
| 类型安全（Type Safety） | 2/10 | 🔴 `[key: string]: any` 索引签名破坏整条类型链 |
| 资源管理（Resource Management） | 4/10 | ⚠️ 事件监听器注册无清理，长时间使用可导致内存泄漏 |
| DOM 引用安全（DOM Reference） | 3/10 | ⚠️ `useImperativeHandle` 暴露 dispatch，允许外部操纵内部状态 |
| 依赖安全（Dependency Security） | 6/10 | ⚠️ rehype-prism-plus 代码执行，rehype 未做沙箱隔离 |
| 封装层防御（Mitigation） | 8/10 | ✅ DOMPurify + URL 白名单 + 内容长度限制 + 标签白名单 |

---

## 2. 漏洞清单（按 OWASP Top 10 2021 映射）

### SEC-MD-01: 🟠 HIGH — `dangerouslySetInnerHTML` 渲染未经消毒的 HTML

**OWASP**: A03:2021 — Injection
**CWE**: CWE-79 (Stored XSS)
**位置**: `Markdown.common.tsx:45-48`

```tsx
return React.createElement('div', {
  className: 'wmde-markdown-color',
  dangerouslySetInnerHTML: { __html: mdStr || '' },
});
```

**攻击链分析**:

`Markdown.common.tsx` 是编辑区的"语法高亮预览"组件，它将用户输入的 Markdown 文本通过 `html2Escape()` 转义后用 `dangerouslySetInnerHTML` 渲染。`html2Escape()` 实现如下：

```tsx
function html2Escape(sHtml: string) {
  return sHtml.replace(
    /[<&"]/g,
    (c: string) => (({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }) as Record<string, string>)[c],
  );
}
```

**问题分析**:

| 因素 | 分析 |
|------|------|
| 转义范围 | 仅转义 `<`、`>`、`&`、`"`，未覆盖 `'`（单引号） |
| rehype 管道 | `mdStr` 先经 `html2Escape()` 转义，再经 `rehype().use(rehypePrism)` 处理后输出 HTML |
| rehype 副作用 | rehype 管道可能重新引入 HTML 元素，绕过初始转义 |
| 高亮路径 | `highlightEnable=true`（默认）时，经 rehype-prism-plus 处理后的 HTML 可能包含新的标签属性 |

**攻击向量**:

1. **rehype 输出不可控**: rehype-prism-plus 可能在代码高亮处理中引入新 HTML 元素，这些元素未经二次消毒直接通过 `dangerouslySetInnerHTML` 注入 DOM
2. **CSS 注入**: 虽然转义了 `<>` 阻断了标签注入，但 rehype 输出可能包含 `style` 属性，可用于 CSS 数据窃取
3. **闭合绕过**: 如果 rehype 处理中产生不完整的 HTML 片段，可能导致后续内容被解析为标签

**缓解因素**: 本项目的 `MarkdownEditor.tsx` 封装层通过 `previewOptions.allowElement` 白名单过滤了预览区域的标签，但此防护**不覆盖编辑区的高亮渲染路径**。

**修复方案**:

```tsx
// 在 rehype 处理后增加消毒步骤
import DOMPurify from 'dompurify';

if (highlightEnable) {
  try {
    mdStr = rehype()
      .data('settings', { fragment: true })
      .use(rehypePrism, { ignoreMissing: true })
      .processSync(mdStr)
      .toString();
    // 消毒 rehype 输出
    mdStr = DOMPurify.sanitize(mdStr, {
      ALLOWED_TAGS: ['pre', 'code', 'span'],
      ALLOWED_ATTR: ['class'],
    });
  } catch (error) {}
}
```

---

### SEC-MD-02: 🟠 HIGH — Context 索引签名破坏类型安全，允许注入任意状态

**OWASP**: A04:2021 — Insecure Design
**CWE**: CWE-922 (Insecure Storage of Sensitive Information)
**位置**: `Context.tsx:29`

```tsx
export interface ContextStore {
  // ... 类型安全的字段定义
  [key: string]: any;   // ← 索引签名：允许任意键值对
}
```

**攻击链分析**:

```tsx
// Context.tsx 的 reducer 实现
export function reducer(state: ContextStore, action: ContextStore) {
  return { ...state, ...action };   // ← 无任何校验，直接合并
}
```

`[key: string]: any` 索引签名导致以下安全后果：

| 攻击路径 | 描述 |
|----------|------|
| 原型污染 | `dispatch({ __proto__: { polluted: true } })` 可能污染对象原型链 |
| 内部状态篡改 | 任何消费 `EditorContext` 的子组件可注入任意状态字段 |
| dispatch 自引用 | `useImperativeHandle` 将 `dispatch` 暴露给外部，外部可直接 `ref.dispatch({ 任意字段 })` 操纵内部状态 |
| 类型安全瓦解 | TypeScript 编译器无法检测非法字段赋值，任何 `dispatch({})` 调用都是合法的 |

**利用场景**:

```tsx
// 通过 ref 暴露的 dispatch 操纵内部状态
const editorRef = useRef<RefMDEditor>(null);

// 攻击者可通过 ref 调用 dispatch 修改任意内部状态
editorRef.current?.dispatch?.({
  markdown: '<img src=x onerror="alert(1)">',  // 注入恶意内容
  preview: 'preview',                           // 强制切换到预览模式
  fullscreen: true,                             // 强制全屏
});
```

**缓解因素**: 本项目的 `MarkdownEditor.tsx` 未暴露 `ref` 的 `dispatch`（仅暴露 `getSanitizedHTML`/`getRawMarkdown`/`focus`），且不导出 `RefMDEditor` 类型。但直接使用 `@uiw/react-md-editor` 的其他代码路径可能利用此漏洞。

**修复方案**:

```tsx
// 1. 移除索引签名，使用联合类型 Action
type EditorAction =
  | { type: 'SET_MARKDOWN'; markdown: string }
  | { type: 'SET_PREVIEW'; preview: PreviewType }
  | { type: 'SET_HEIGHT'; height: number }
  // ... 其他合法 Action
  ;

// 2. Reducer 使用类型安全的 Action
export function reducer(state: ContextStore, action: EditorAction) {
  switch (action.type) {
    case 'SET_MARKDOWN': return { ...state, markdown: action.markdown };
    // ... 其他 case
    default: return state;  // 拒绝未知 Action
  }
}
```

---

### SEC-MD-03: 🟠 HIGH — `useImperativeHandle` 暴露 dispatch 和全部内部状态

**OWASP**: A01:2021 — Broken Access Control
**CWE**: CWE-284 (Improper Access Control)
**位置**: `Editor.factory.tsx:88`

```tsx
useImperativeHandle(ref, () => ({ ...state, container: container.current, dispatch }));
```

**问题分析**:

| 暴露项 | 安全影响 |
|--------|----------|
| `...state`（全部状态） | 泄露内部实现细节（barPopup、scrollTop 等），攻击者可据此构造状态注入 |
| `container`（DOM 引用） | 允许外部直接操作编辑器 DOM，可注入恶意子节点 |
| `dispatch`（状态分发器） | 允许外部绕过组件 props 直接操纵内部状态，破坏组件封装边界 |
| `textarea`（textarea DOM 引用） | 允许外部读取/修改编辑器内容，可用于键盘监听注入 |

**利用场景**:

```tsx
// 通过 container DOM 引用直接操作 DOM
const container = editorRef.current?.container;
if (container) {
  // 注入恶意脚本标签（绕过 dangerouslySetInnerHTML 限制）
  const script = document.createElement('script');
  script.textContent = 'alert(document.cookie)';
  container.appendChild(script);
}
```

**缓解因素**: 本项目的 `MarkdownEditor.tsx` 使用自定义 `MarkdownEditorRef` 接口，仅暴露 `getSanitizedHTML`、`getRawMarkdown`、`focus` 三个安全方法，不暴露 `dispatch` 或 DOM 引用。

---

### SEC-MD-04: 🟡 MEDIUM — 事件监听器泄漏可被利用进行 DoS 或事件劫持

**OWASP**: A05:2021 — Security Misconfiguration
**CWE**: CWE-775 (Unrestricted Resource Consumption)
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

**问题分析**:

| 因素 | 分析 |
|------|------|
| 无清理函数 | `useMemo` 不支持 cleanup，每次 `textareaWarp` 变化都追加新监听器 |
| 累积效应 | 长时间使用或频繁 re-render 导致监听器堆积，消耗内存 |
| React 18 并发模式 | StrictMode 下 useEffect/useMemo 可能多次执行，加速监听器泄漏 |
| 闭包捕获 | 箭头函数捕获 `active` 引用，旧监听器仍持有过期的 ref 引用 |

**攻击场景**: 在长时间运行的编辑会话中（如文章编辑页面），如果 `textareaWarp` DOM 引用频繁变化，每次变化都会新增 2 个事件监听器。在极端情况下可导致：
1. 内存持续增长，最终导致浏览器标签页崩溃（DoS）
2. 旧监听器中的闭包引用可能导致不可预期的行为

**修复方案**:

```tsx
// 使用 useEffect 替代 useMemo，并添加清理函数
useEffect(() => {
  const el = state.textareaWarp;
  if (!el) return;
  const onOver = () => { active.current = 'text'; };
  const onLeave = () => { active.current = 'preview'; };
  el.addEventListener('mouseover', onOver);
  el.addEventListener('mouseleave', onLeave);
  return () => {
    el.removeEventListener('mouseover', onOver);
    el.removeEventListener('mouseleave', onLeave);
  };
}, [state.textareaWarp]);
```

---

### SEC-MD-05: 🟡 MEDIUM — `help` 命令使用 `window.open` 打开外部链接，无 noopener 保护

**OWASP**: A01:2021 — Broken Access Control
**CWE**: CWE-1021 (Improper Restriction of Rendered UI Layers)
**位置**: `commands/help.tsx:17`

```tsx
window.open('https://www.markdownguide.org/basic-syntax/', '_blank', 'noreferrer');
```

**问题分析**:

| 因素 | 分析 |
|------|------|
| noreferrer | ✅ 已配置，阻止新页面获取 referrer 信息 |
| noopener | ❌ 缺失，新页面可通过 `window.opener` 访问原页面 |
| 硬编码 URL | ✅ 硬编码安全域名，不可被注入篡改 |
| 可执行性 | 攻击者无法修改此 URL，风险较低 |

**风险**: 如果 `markdownguide.org` 被攻陷，恶意页面可通过 `window.opener.location` 将原页面重定向到钓鱼网站（Tabnabbing 攻击）。

**修复方案**:

```tsx
// 添加 noopener
window.open('https://www.markdownguide.org/basic-syntax/', '_blank', 'noopener,noreferrer');
```

---

### SEC-MD-06: 🟢 LOW — Toolbar 按钮属性透传，可被 `commandsFilter` 注入恶意属性

**OWASP**: A04:2021 — Insecure Design
**CWE**: CWE-20 (Improper Input Validation)
**位置**: `Editor.factory.tsx:63-67`, `Toolbar/index.tsx:97-109`

```tsx
// 工厂中通过 commandsFilter 过滤命令
const cmds = commands
  .map((item) => (commandsFilter ? commandsFilter(item, false) : item))
  .filter(Boolean) as ICommand[];

// Toolbar 中透传 buttonProps 到按钮元素
React.createElement('button', {
  type: 'button',
  ...item.buttonProps,    // ← 直接透传用户可控的 props
  onClick: (evn) => { /* ... */ },
}, item.icon);
```

**问题分析**: `buttonProps` 类型为 `React.ButtonHTMLAttributes<HTMLButtonElement> | null`，可通过 `commandsFilter` 注入任意 HTML 属性。但此攻击需要应用层代码配合（传入恶意 commands），不构成远程攻击向量。

---

## 3. 攻击面总览

```
┌──────────────────────────────────────────────────────────────────┐
│              Editor.common.tsx 组件树攻击面                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Editor.common.tsx (7行, 纯组装入口)                               │
│    └── Editor.factory.tsx (createMDEditor)                        │
│          │                                                        │
│          ├── Context.tsx                                          │
│          │    └── [key:string]:any  ──→  类型安全瓦解 SEC-MD-02    │
│          │                                                        │
│          ├── useImperativeHandle                                  │
│          │    └── 暴露 dispatch+DOM  ──→  控制流劫持 SEC-MD-03    │
│          │                                                        │
│          ├── Markdown.common.tsx                                  │
│          │    └── dangerouslySetInnerHTML  ──→  XSS SEC-MD-01    │
│          │                                                        │
│          ├── 事件监听器 (useMemo)                                   │
│          │    └── 无清理函数  ──→  内存泄漏/DoS SEC-MD-04          │
│          │                                                        │
│          └── commands/help.tsx                                    │
│               └── window.open  ──→  Tabnabbing SEC-MD-05         │
│                                                                  │
│  ┌────────────────────────────────────────────┐                   │
│  │  项目封装层 MarkdownEditor.tsx（防御层）     │                   │
│  │    ├── DOMPurify 消毒     ✅ 缓解 SEC-MD-01  │                   │
│  │    ├── URL 白名单         ✅ 缓解注入攻击     │                   │
│  │    ├── 内容长度限制 2MB   ✅ 缓解 DoS        │                   │
│  │    ├── SAFE_TAGS 白名单   ✅ 缓解标签注入     │                   │
│  │    ├── 自定义 Ref 接口    ✅ 缓解 SEC-MD-03  │                   │
│  │    └── 隐藏 dispatch      ✅ 缓解 SEC-MD-02  │                   │
│  └────────────────────────────────────────────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. 项目封装层防御评估

本项目的 `pages/components/MarkdownEditor.tsx` 已实施以下安全防御：

| 防御措施 | 目标漏洞 | 有效状态 | 备注 |
|----------|----------|----------|------|
| DOMPurify 消毒 | SEC-MD-01 (XSS) | ✅ 有效 | 仅覆盖预览区，不覆盖编辑区高亮渲染 |
| `previewOptions.allowElement` 白名单 | SEC-MD-01 (标签注入) | ✅ 有效 | 仅限预览区域的 Markdown 渲染 |
| `safeUrlTransform` URL 白名单 | URL 注入 | ✅ 有效 | 覆盖预览区的链接和图片 |
| `MAX_CONTENT_LENGTH = 2MB` | DoS | ✅ 有效 | 限制编辑器内容长度 |
| 自定义 `MarkdownEditorRef` 接口 | SEC-MD-03 (dispatch 暴露) | ✅ 有效 | 不暴露 dispatch 和 DOM 引用 |
| `readOnly` 支持 | 内容篡改 | ✅ 有效 | 防止未授权编辑 |

**未覆盖的风险**:
1. 编辑区高亮渲染路径（`Markdown.common.tsx` 的 `dangerouslySetInnerHTML`）不受 `previewOptions` 控制
2. `help` 命令的 `window.open` 缺少 `noopener`
3. 事件监听器泄漏是运行时问题，封装层无法缓解

---

## 5. 修复优先级矩阵

| 优先级 | 漏洞 ID | 标题 | 工作量 | 封装层缓解 | 上游修复建议 |
|--------|---------|------|--------|------------|------------|
| P1 🟠 | SEC-MD-01 | dangerouslySetInnerHTML 无消毒 | S | 部分缓解（预览区已覆盖，编辑区未覆盖） | rehype 输出后增加 DOMPurify 消毒 |
| P1 🟠 | SEC-MD-02 | Context 索引签名破坏类型安全 | M | 已缓解（不暴露 dispatch） | 移除 `[key:string]:any`，引入类型安全 Action |
| P1 🟠 | SEC-MD-03 | useImperativeHandle 过度暴露 | S | 已缓解（自定义 Ref 接口） | 收缩暴露面，仅暴露安全的公共 API |
| P2 🟡 | SEC-MD-04 | 事件监听器泄漏 | S | 无法缓解 | useMemo → useEffect + cleanup |
| P2 🟡 | SEC-MD-05 | window.open 缺少 noopener | S | 无法缓解 | 添加 noopener 参数 |
| P3 🟢 | SEC-MD-06 | buttonProps 透传 | S | 风险极低 | 增加 buttonProps 白名单过滤 |

---

## 6. 安全加固建议

### 6.1 项目层面（在本项目封装层中实施）

| 编号 | 建议 | 理由 |
|------|------|------|
| FIX-1 | 考虑通过 `hideToolbar={true}` 或 `commandsFilter` 移除 `help` 命令 | 消除 `window.open` 的 Tabnabbing 风险 |
| FIX-2 | 在组件卸载时手动清理 editorRef 对应 DOM 上的事件监听器 | 缓解上游事件监听器泄漏 |
| FIX-3 | 对编辑区（非预览区）的高亮渲染路径增加 DOMPurify 消毒 | 完整覆盖 XSS 防护（需 fork 或 patch 上游库） |
| FIX-4 | 在 React 18 StrictMode 下做长时间编辑的回归测试 | 验证 useMemo 副作用在并发模式下的行为 |

### 6.2 上游层面（向 @uiw/react-md-editor 提 Issue/PR）

1. **SEC-MD-01**: rehype 处理后增加 DOMPurify 消毒步骤
2. **SEC-MD-02**: 移除 `[key: string]: any`，引入 discriminated union Action 类型
3. **SEC-MD-03**: 收缩 `useImperativeHandle` 暴露面，不暴露 dispatch 和内部 DOM 引用
4. **SEC-MD-04**: 将事件注册从 `useMemo` 迁移到 `useEffect`，添加清理函数
5. **SEC-MD-05**: `window.open` 添加 `noopener` 参数

---

## 7. 统计汇总

| 指标 | 数值 |
|------|------|
| 目标文件行数 | 7 |
| 上游工厂行数 | 287 |
| Markdown 渲染行数 | 49 |
| 安全漏洞数 | 6 |
| CRITICAL | 0 |
| HIGH | 3 |
| MEDIUM | 2 |
| LOW | 1 |
| OWASP 覆盖 | A01, A03, A04, A05 |
| CWE 覆盖 | CWE-20, CWE-79, CWE-284, CWE-775, CWE-922, CWE-1021 |
| 项目封装层缓解数 | 5/6（编辑区高亮 XSS 未完全覆盖） |

**评审结论**: 上游库存在 3 项 HIGH 级安全隐患（XSS 无消毒、类型安全破坏、API 过度暴露），但本项目 `MarkdownEditor.tsx` 封装层已实施了有效的纵深防御（DOMPurify + URL 白名单 + 自定义 Ref 接口 + 内容长度限制），将实际可利用风险降至可控水平。建议持续关注上游版本更新，并考虑移除 `help` 命令以消除 Tabnabbing 风险。

**风险等级**: ⚠️ 中等风险（上游有隐患，项目封装层已部分缓解，建议加固残余风险点）
