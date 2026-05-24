# 软件质量专家评审：preview.tsx

**文件**: `@uiw/react-markdown-preview/src/preview.tsx`
**评审角色**: 软件质量专家（ISO 25010 / Clean Code / SOLID / 安全视角）
**评审日期**: 2026-05-24
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 存在安全隐患与性能缺陷）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | `@uiw/react-markdown-preview` 核心预览组件，渲染 Markdown 为 HTML |
| 代码行数 | 64 行 |
| 组件类型 | `React.forwardRef` 函数组件 |
| 依赖项 | `react-markdown`, `remark-gfm`, `rehype-raw`, `remark-github-blockquote-alert` |
| 自定义 Hook | `useCopied` — 代码块复制功能 |
| 导出 | 默认导出（forwardRef 组件） |

---

## 二、质量评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 安全性 | 3 | `defaultUrlTransform` 完全禁用 URL 消毒，`allowElement` 白名单过宽 |
| 可读性 | 6 | 解构清晰，但 `skipHtml` 语义反转令人困惑 |
| 性能 | 4 | 插件数组每渲染重建，`useImperativeHandle` 依赖整个 props |
| 可维护性 | 5 | 与 Props.tsx 的 `warpperElement` typo 持续耦合 |
| React 最佳实践 | 4 | Ref 暴露全部 props，缺乏 memoization |
| 类型安全 | 6 | 解构类型正确但 `customProps` 缺少显式类型 |
| **综合评分** | **4.7 / 10** | |

---

## 三、问题清单

### P1 — 严重问题（安全性与正确性）

#### P1-1：`defaultUrlTransform` 完全禁用 URL 消毒 — XSS 风险

```typescript
// 第 14 行
const defaultUrlTransform: UrlTransform = (url) => url;
```

**问题**: React Markdown v9+ 内置了 `urlTransform` 用于过滤危险 URL 协议（`javascript:`, `data:`, `vbscript:` 等）。此代码将 URL 消毒函数替换为直接返回原始 URL 的透传函数，**完全绕过了 React Markdown 的 XSS 防护层**。

注释引用了 issue #607，说明这是为解决某个兼容性问题而引入的妥协，但该妥协的代价是**安全性的全面降级**。

**攻击向量示例**:
```markdown
[点击领取](javascript:alert(document.cookie))
![img](data:text/html,<script>alert(1)</script>)
```

**风险等级**: 高 — 任何接受用户输入作为 Markdown source 的场景都面临存储型 XSS 风险。

**建议**: 保留 URL 协议白名单过滤，仅放行安全协议：
```typescript
const defaultUrlTransform: UrlTransform = (url) => {
  const parsed = new URL(url, 'https://example.com');
  if (['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) {
    return url;
  }
  return '';
};
```

---

#### P1-2：`skipHtml` 属性语义反转 — 逻辑混乱

```typescript
// 第 23 行：默认值 skipHtml = true（语义："跳过 HTML"）
skipHtml = true,

// 第 46-48 行：skipHtml 为 true 时不加载 rehype-raw
if (!skipHtml) {
  rehypePlugins.push(raw);
}

// 第 56 行：传入 ReactMarkdown 时取反！
skipHtml={!skipHtml}
```

**问题**: 属性名 `skipHtml` 的语义与实际行为完全相反：
- `skipHtml = true`（默认）：用户以为"跳过 HTML"，但 ReactMarkdown 收到 `skipHtml: false`（不跳过），HTML 文本节点被保留
- `skipHtml = false`：用户以为"不跳过 HTML"（即渲染 HTML），但 ReactMarkdown 收到 `skipHtml: true`（跳过 HTML），同时加载了 rehype-raw

整个逻辑形成一个反直觉的三方交互：props 解构 → rehype-raw 条件加载 → ReactMarkdown `skipHtml` 取反。维护者需要同时理解三处代码才能推断最终行为。

**风险等级**: 高 — 极易在修改时引入 bug，新开发者几乎不可能正确理解该逻辑。

**建议**: 重命名为语义明确的属性：
```typescript
// 使用 allowHtml 替代 skipHtml，消除双重否定
allowHtml = false,  // 默认不允许 HTML

// 逻辑变为
if (allowHtml) {
  rehypePlugins.push(raw);
}

// ReactMarkdown 传入
skipHtml={!allowHtml}
```

---

#### P1-3：`allowElement` 白名单过宽 — 允许危险 HTML 标签

```typescript
// 第 43 行
return /^[A-Za-z0-9]+$/.test(element.tagName);
```

**问题**: 正则 `/^[A-Za-z0-9]+$/` 只检查标签名是否为纯字母数字，允许所有标准 HTML 标签通过，包括：
- `form`, `input`, `button`, `textarea`, `select` — 可用于钓鱼攻击
- `iframe`, `object`, `embed` — 可嵌入外部恶意内容
- `base` — 可劫持页面所有相对 URL
- `meta`, `link` — 可修改页面行为
- `svg` — 可包含内联脚本（虽然 React 会过滤 `<script>` 但 SVG 有多种攻击向量）

当 `skipHtml = false`（即加载了 rehype-raw）时，这些标签都会被渲染。

**风险等级**: 高 — 与 P1-1 叠加形成多重 XSS 攻击面。

**建议**: 使用标签黑名单或白名单：
```typescript
const DANGEROUS_TAGS = new Set([
  'script', 'iframe', 'object', 'embed', 'form', 'input',
  'button', 'textarea', 'select', 'base', 'meta', 'link',
  'svg', 'math', 'applet',
]);

allowElement: (element, index, parent) => {
  if (other.allowElement) {
    return other.allowElement(element, index, parent);
  }
  return !DANGEROUS_TAGS.has(element.tagName.toLowerCase());
},
```

---

### P2 — 中等问题（性能与 React 最佳实践）

#### P2-1：`useImperativeHandle` 依赖整个 props 对象 — 每次渲染都重建

```typescript
// 第 34 行
useImperativeHandle(ref, () => ({ ...props, mdp }), [mdp, props]);
```

**问题**: 依赖数组包含 `props` 对象引用。由于 React 每次渲染都会创建新的 props 对象（即使所有属性值相同），`useImperativeHandle` 的比较函数永远判定为"已变更"，导致每次渲染都执行回调重建 ref 值。这完全抵消了 `useImperativeHandle` 的性能优化目的。

此外，通过 ref 暴露整个 props 对象违反了 React 的信息隐藏原则。调用者通过 `ref.current` 可以读取到所有 props（包括 `source`、`className` 等），绕过了 React 的单向数据流。

**建议**: 仅暴露必要的命令式 API：
```typescript
useImperativeHandle(ref, () => ({ mdp }), [mdp]);
```

---

#### P2-2：插件数组每渲染重建 — ReactMarkdown 无谓重计算

```typescript
// 第 37-49 行 — 每次渲染都执行
const rehypePlugins: PluggableList = [...(other.rehypePlugins || [])];
// ...
const remarkPlugins = [remarkAlert, ...(other.remarkPlugins || []), gfm];
```

**问题**: `rehypePlugins` 和 `remarkPlugins` 在每次渲染时重新创建为新数组引用。ReactMarkdown（基于 unified 引擎）会在插件列表引用变更时重新初始化整个 Markdown 处理管线，包括 AST 解析、所有 rehype/remark 插件的重新执行。对于大型 Markdown 文档，这会导致明显的性能退化。

`customProps` 对象（L38-45）也有同样问题。

**建议**: 使用 `useMemo` 缓存插件列表：
```typescript
const rehypePlugins = useMemo(() => {
  const plugins: PluggableList = [...(other.rehypePlugins || [])];
  if (!skipHtml) plugins.push(raw);
  return plugins;
}, [other.rehypePlugins, skipHtml]);

const remarkPlugins = useMemo(
  () => [remarkAlert, ...(other.remarkPlugins || []), gfm],
  [other.remarkPlugins]
);
```

---

#### P2-3：`useCopied` 未检查 `disableCopy` — 事件监听器泄漏

```typescript
// 第 22 行：disableCopy 属性已解构
disableCopy = false,

// 第 36 行：useCopied 无条件调用，未传入 disableCopy
useCopied(mdp);
```

**问题**: 虽然 `rehypePlugins.tsx` 中的 `rehypeRewriteHandle` 接收 `disableCopy` 并在禁用时不注入复制按钮 DOM 节点，但 `useCopied` hook 仍然无条件地在容器上注册了 click 事件监听器。当 `disableCopy = true` 时：
- 事件监听器仍然附加 → 内存浪费
- 每次点击仍然触发 `findCopyTarget` 查询 → CPU 浪费
- 若未来代码变更意外恢复了复制按钮 DOM，安全阀缺失

**建议**: 将 `disableCopy` 传入 hook：
```typescript
useCopied(mdp, disableCopy);

// useCopied 内部
export function useCopied(container: React.RefObject<HTMLDivElement>, disabled: boolean) {
  useEffect(() => {
    if (disabled) return;  // 禁用时跳过事件监听
    // ...
  }, [container, handle, disabled]);
}
```

---

### P3 — 轻微问题（代码风格与健壮性）

#### P3-1：`className` 拼接可能产生多余空格

```typescript
// 第 35 行
const cls = `${prefixCls || ''} ${className || ''}`;
```

**问题**: 当 `prefixCls` 或 `className` 为空字符串时，结果会包含前导、尾随或连续空格（如 `"wmde-markdown  "`, `" wmde-markdown"`）。虽然浏览器 CSS 解析器会容忍多余空格，但这在 `document.querySelector` 等精确匹配场景下可能导致问题。

**建议**: 使用数组过滤 + join：
```typescript
const cls = [prefixCls, className].filter(Boolean).join(' ');
```

---

#### P3-2：`wrapperElement` 合并顺序依赖弃用属性

```typescript
// 第 50 行
const wrapperProps = { ...warpperElement, ...wrapperElement };
```

**问题**: `warpperElement`（拼写错误）在前，`wrapperElement` 在后，后者覆盖前者。虽然逻辑正确（新版属性覆盖旧版），但这种"先展开弃用属性，再展开正式属性"的模式使弃用属性在每次渲染时都被创建和展开，即使为 `undefined`。

**建议**: 条件合并：
```typescript
const wrapperProps = wrapperElement || warpperElement || {};
```

---

#### P3-3：缺少 React 错误边界

**问题**: 如果 ReactMarkdown 或任何 rehype/remark 插件抛出异常（如 malformed Markdown 输入、插件兼容性问题），整个组件树将崩溃，无 graceful degradation。对于一个 Markdown 渲染组件，用户输入不可控，错误边界是必要的防线。

**建议**: 在外层包裹 ErrorBoundary 或在父组件中提供。

---

#### P3-4：CSS 副作用导入

```typescript
// 第 9 行
import './styles/markdown.less';
```

**问题**: 直接导入 `.less` 文件假设消费者的构建管线支持 Less 预处理。如果消费者使用纯 CSS 或 Sass 方案，此导入会导致构建失败。这是组件库中常见的"构建工具泄漏"问题。

---

#### P3-5：`source || ''` 回退位置过晚

```typescript
// 第 60 行
children={source || ''}
```

**问题**: `source` 在第 21 行解构后为 `string | undefined`，直到第 60 行才回退为空字符串。如果未来在 L21-L59 之间添加了对 `source` 的引用（如长度检查），将面对 `undefined` 而非空字符串。

**建议**: 在解构时立即回退：
```typescript
const { source = '', ... } = props;
```

---

## 四、性能分析

```
渲染开销分析（每次 render）：
┌─────────────────────────────────────────┬────────────────┬──────────────┐
│ 操作                                     │ 当前行为        │ 优化后行为    │
├─────────────────────────────────────────┼────────────────┼──────────────┤
│ rehypePlugins 数组创建                   │ 每次新建        │ useMemo 缓存 │
│ remarkPlugins 数组创建                   │ 每次新建        │ useMemo 缓存 │
│ customProps 对象创建                     │ 每次新建        │ useMemo 缓存 │
│ useImperativeHandle 回调执行             │ 每次执行        │ 仅 mdp 变更  │
│ useCopied 事件监听（disableCopy=true）    │ 始终附加        │ 条件跳过     │
│ ReactMarkdown AST 重新解析               │ 可能触发        │ 缓存后避免   │
└─────────────────────────────────────────┴────────────────┴──────────────┘
```

对于大型 Markdown 文档（>10KB），未缓存的插件数组可能导致 50-200ms 的无谓重解析。

---

## 五、安全性分析

```
攻击面评估：
┌──────────────────────────────┬──────────┬────────────────────────────────┐
│ 攻击向量                      │ 风险等级  │ 当前防护状态                     │
├──────────────────────────────┼──────────┼────────────────────────────────┤
│ javascript: URL XSS          │ 高       │ ❌ 已禁用（defaultUrlTransform） │
│ data: URL XSS                │ 高       │ ❌ 已禁用                       │
│ 危险 HTML 标签                │ 高       │ ❌ 白名单过宽                   │
│ Markdown 注入 → HTML 注入     │ 中       │ ⚠️ 依赖 rehype-raw 配置         │
│ 插件供应链攻击                 │ 低       │ — 超出本文件范围                 │
└──────────────────────────────┴──────────┴────────────────────────────────┘
```

**结论**: 本文件是组件库安全链中最薄弱的环节。三个安全问题（P1-1 URL 消毒禁用、P1-2 语义混乱、P1-3 标签白名单过宽）叠加后，在"用户输入 → Markdown 渲染"场景下可构成完整攻击链。

---

## 六、与 Props.tsx 评审的关联

本文件评审与 `Props.tsx.quality.md` 评审存在紧密关联：

| Props.tsx 问题 | 在 preview.tsx 中的体现 |
|---|---|
| `warpperElement` 拼写错误 | L29 解构、L50 合并，继续传播 typo |
| `MarkdownPreviewRef` 暴露全部 Props | L34 `useImperativeHandle` 将 props 全部暴露 |
| `source` 可选但无默认值 | L60 `source \|\| ''` 晚回退 |
| `pluginsFilter` 参数名不当 | L58 正确使用但继承了类型层面的命名问题 |

---

## 七、改进建议汇总

| 优先级 | 建议 | 工作量 | 收益 |
|---|---|---|---|
| P1 | 恢复 URL 协议白名单过滤 | 小 | 消除 XSS 攻击面 |
| P1 | `skipHtml` 重命名为 `allowHtml`，消除双重否定 | 小 | 消除逻辑混乱 |
| P1 | `allowElement` 增加危险标签黑名单 | 小 | 防止危险 HTML 渲染 |
| P2 | `useMemo` 缓存插件数组和 customProps | 小 | 避免大型文档无谓重解析 |
| P2 | `useImperativeHandle` 仅暴露 `mdp` | 小 | 符合 React 最佳实践 |
| P2 | `useCopied` 接收 `disableCopy` 参数 | 小 | 消除禁用时的无效事件监听 |
| P3 | className 拼接使用 `filter(Boolean).join(' ')` | 小 | 消除多余空格 |
| P3 | `source` 解构时设置默认值 | 小 | 提升健壮性 |

---

## 八、评审总结

`preview.tsx` 作为 `@uiw/react-markdown-preview` 的核心渲染组件，功能完整且代码简洁（64 行），Markdown 渲染管线（remark → rehype → React）配置正确。但在**安全性**、**性能**和**React 最佳实践**三个维度存在明显不足。

最突出的问题是：
1. **`defaultUrlTransform` 完全禁用 URL 消毒** — 为解决兼容性问题牺牲了安全基线，在用户输入渲染场景下构成 XSS 风险
2. **`skipHtml` 语义反转** — 属性名与实际行为相反，三处代码交互形成逻辑迷宫，维护成本极高
3. **`allowElement` 标签白名单过宽** — 与 P1-1 叠加后，几乎没有任何 HTML 标签过滤
4. **插件数组每次渲染重建** — 对大型 Markdown 文档有可感知的性能影响

**综合评分 4.7/10** — 功能正确但安全防护和性能优化严重不足。建议在下一个 minor 版本中优先修复 P1 安全问题，并在 P2 性能优化中引入 `useMemo` 缓存。

---

*软件质量专家评审完成 — 2026-05-24*
