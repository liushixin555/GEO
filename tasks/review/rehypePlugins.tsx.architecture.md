# 软件架构专家评审：@uiw/react-markdown-preview/src/rehypePlugins.tsx

**文件路径**: `@uiw/react-markdown-preview/src/rehypePlugins.tsx`
**评审角色**: 软件架构专家（模块边界 · 插件管线 · 组合模式 · 依赖架构 · SOLID · 版本演进 · 耦合分析）
**评审日期**: 2026-05-24
**评审版本**: @uiw/react-markdown-preview@5.2.0 (pnpm lock hash `89fce51d`)
**评审结论**: ⚠️ CONDITIONAL APPROVE（有条件通过 — 模块定位精准、工厂模式设计合理，但隐式契约耦合严重、OCP 缺失、安全职责边界模糊）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | rehype AST 重写行为工厂 + 默认插件清单，为 index.tsx 管线提供核心转换逻辑 |
| 代码行数 | 27 行（含 import 和空行） |
| 设计模式 | Factory Method（工厂方法）+ Higher-Order Function（高阶函数）+ Static Configuration（静态配置） |
| 外部依赖 | rehype-slug、rehype-autolink-headings、rehype-ignore、rehype-rewrite、hast |
| 内部依赖 | `./nodes/octiconLink`（锚点 SVG）、`./nodes/copy`（复制按钮元素） |
| 导出 | 2 个命名导出 — `rehypeRewriteHandle`（行为工厂）、`defaultRehypePlugins`（配置清单） |

### 源码

```typescript
import type { PluggableList } from 'unified';
import slug from 'rehype-slug';
import headings from 'rehype-autolink-headings';
import rehypeIgnore from 'rehype-ignore';
import { getCodeString, type RehypeRewriteOptions } from 'rehype-rewrite';
import type { Root, Element, RootContent } from 'hast';
import { octiconLink } from './nodes/octiconLink';
import { copyElement } from './nodes/copy';

export const rehypeRewriteHandle =
  (disableCopy: boolean, rewrite?: RehypeRewriteOptions['rewrite']) =>
  (node: Root | RootContent, index: number | null, parent: Root | Element | null) => {
    if (node.type === 'element' && parent && parent.type === 'root' && /h(1|2|3|4|5|6)/.test(node.tagName)) {
      const child = node.children && (node.children[0] as Element);
      if (child && child.properties && child.properties.ariaHidden === 'true') {
        child.properties = { class: 'anchor', ...child.properties };
        child.children = [octiconLink];
      }
    }
    if (node.type === 'element' && node.tagName === 'pre' && !disableCopy) {
      const code = getCodeString(node.children);
      node.children.push(copyElement(code));
    }
    rewrite && rewrite(node, index === null ? undefined : index, parent === null ? undefined : parent);
  };

export const defaultRehypePlugins: PluggableList = [slug, headings, rehypeIgnore];
```

### 模块在库架构中的位置

```
@uiw/react-markdown-preview 模块架构图：

┌──────────────────────────────────────────────────────────────────┐
│                        index.tsx / common.tsx                    │
│  [Facade 层] — 管线编排 + ref 转发                               │
│   ├── 组装 10 个 rehype 插件                                     │
│   ├── 引用 rehypeRewriteHandle ← 工厂调用                        │
│   ├── 引用 defaultRehypePlugins ← 展开合并                       │
│   └── 委托 preview.tsx 渲染                                      │
├──────────────────────────────────────────────────────────────────┤
│                   ★ rehypePlugins.tsx ★                          │
│  [行为配置层] — AST 转换逻辑 + 插件清单                           │
│   ├── rehypeRewriteHandle  → 标题锚点 + 复制按钮 + 用户回调       │
│   ├── defaultRehypePlugins → [slug, headings, ignore]            │
│   └── 依赖 nodes/ 子模块提供 UI 元素                             │
├──────────────────────────────────────────────────────────────────┤
│                        preview.tsx                               │
│  [渲染层] — ReactMarkdown + ref + 安全过滤                       │
│   ├── 接收组装后的 rehypePlugins                                  │
│   ├── pluginsFilter 过滤机制                                     │
│   ├── allowElement 安全守卫                                      │
│   └── useCopied 复制交互逻辑                                     │
├──────────────────────────────────────────────────────────────────┤
│                        Props.tsx                                 │
│  [契约层] — TypeScript 类型定义                                  │
│   ├── rehypeRewrite / disableCopy / rehypePlugins                │
│   └── pluginsFilter / skipHtml                                   │
└──────────────────────────────────────────────────────────────────┘
```

**架构定位**: `rehypePlugins.tsx` 是 Facade 层（index.tsx）和渲染层（preview.tsx）之间的**行为配置桥梁**，负责将"标题锚点"和"代码复制"两个产品功能需求转化为 rehype-rewrite 可执行的 AST 变换闭包。

---

## 二、架构维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 模块职责边界 | 7 | 双导出（行为 + 配置）职责清晰，但行为内部混合三个无关节奏的关注点 |
| 插件管线架构 | 5 | defaultRehypePlugins 是无配置的静态列表，与 rehypeRewriteHandle 存在隐式契约 |
| 组合模式设计 | 8 | 柯里化工厂模式精确匹配 rehype-rewrite API，闭包变量隔离正确 |
| 依赖架构 | 6 | 外部依赖均为 rehype 生态标准包，但 rehype-autolink-headings 存在深层隐式耦合 |
| SOLID 遵循 | 4 | SRP 部分违反、OCP 违反（无扩展点）、DIP 违反（硬编码具体实现） |
| 版本演进性 | 4 | 无配置接口，新增/修改功能需改动工厂函数内部逻辑 |
| 安全职责 | 3 | 无安全边界，data-code XSS 风险无任何防御层 |
| **综合评分** | **C+ / 6.0** | **工厂模式设计优秀（+1），但隐式契约和安全职责缺陷拉低整体分数** |

> **注**: C+ 级对应 6 分区间（核心模式正确但架构支撑不足），隐式契约耦合（-0.5）和安全职责缺失（-0.5）后为 5.0/10。

---

## 三、架构问题清单

### P1 — 严重问题（影响架构合理性和系统稳定性）

#### A-01: rehypeRewriteHandle 与 rehype-autolink-headings 的隐式契约耦合

**位置**: 第 13-18 行（标题锚点逻辑）vs `defaultRehypePlugins` 第 27 行（headings 插件）

**严重级别**: 🔴 严重

```
隐式契约链路分析：

┌────────────────────────────────────────────────────────────────┐
│  rehype-slug (defaultRehypePlugins[0])                         │
│   └→ 为 h1-h6 标题生成 id 属性                                 │
│       契约: 所有标题节点将被添加唯一 id                         │
│                                                                │
│  rehype-autolink-headings (defaultRehypePlugins[1])            │
│   └→ 为有 id 的标题包裹 <a aria-hidden="true" href="#id">     │
│       契约: 子元素第一个为 <a aria-hidden="true">              │
│                                                                │
│  rehypeRewriteHandle (L13-18)                                  │
│   └→ 检测 ariaHidden === 'true' → 替换为锚点 SVG 图标         │
│       假设: headings 已产生 ariaHidden 属性                     │
└────────────────────────────────────────────────────────────────┘

问题：三阶段依赖链完全隐式 — 无编译期检查、无运行时断言、无文档约束
```

**架构分析**:

| 变更场景 | 后果 | 可检测性 |
|---|---|---|
| 用户移除 `headings` 插件 | 标题锚点图标静默消失，无任何错误 | ❌ 运行时无感知 |
| 用户替换 `headings` 为 `headings({ behavior: 'wrap' })` | wrap 模式下 ariaHidden 属性在 `<a>` 上，但 child 位置可能不同 | ❌ 静默失效或误匹配 |
| `rehype-autolink-headings` 大版本升级改变 DOM 结构 | 标题锚点逻辑崩溃 | ❌ 无类型约束 |
| `rehype-slug` 未先执行（顺序打乱） | 无 id → headings 不生成链接 → 无 ariaHidden | ❌ 静默级联失效 |

**SOLID 评估**: **DIP 违反** — `rehypeRewriteHandle` 依赖 `rehype-autolink-headings` 的具体 DOM 输出结构（`ariaHidden === 'true'`），而非通过抽象接口解耦。

**目标架构** — 显式契约声明：

```typescript
interface HeadingAnchorContract {
  /** autolink-headings 插件生成的链接元素特征 */
  linkMarker: { ariaHidden: 'true'; position: 'first-child' };
  /** slug 插件必须在 autolink 之前执行 */
  slugBeforeAutolink: true;
}

// 或更实际的做法：rehypeRewriteHandle 不依赖上游的 DOM 产出，
// 而是自己完成标题锚点的完整注入（合并 slug + autolink 的职责）
```

---

#### A-02: 工厂函数内部三重职责违反 SRP — 无法独立演进

**位置**: 第 10-25 行

```typescript
export const rehypeRewriteHandle =
  (disableCopy: boolean, rewrite?: RehypeRewriteOptions['rewrite']) =>
  (node, index, parent) => {
    // 职责 1: 标题锚点图标注入 (L13-18) — 与 disableCopy/rewrite 无关
    // 职责 2: 代码块复制按钮注入 (L20-22) — 仅依赖 disableCopy
    // 职责 3: 用户自定义回调委托 (L24) — 仅依赖 rewrite
  };
```

**架构问题**:

```
变化频率分析：
┌────────────────────┬──────────────┬──────────────┬──────────────┐
│ 关注点             │ 变化触发     │ 变化频率     │ 耦合度       │
├────────────────────┼──────────────┼──────────────┼──────────────┤
│ 标题锚点图标       │ 产品需求     │ 低           │ 无外部依赖   │
│ 代码块复制按钮     │ disableCopy  │ 中           │ 依赖 props   │
│ 用户 rewrite 委托  │ rewrite prop │ 中           │ 依赖 props   │
└────────────────────┴──────────────┴──────────────┴──────────────┘

问题：三种不同变化频率的关注点被捆绑在同一个闭包中
     → disableCopy 变化时，标题锚点逻辑也被迫重建
     → 整个 rehypeRewriteHandle 闭包重建 → rehypePlugins 数组引用变更
     → index.tsx 中的管线重建 → unified 全量重解析
```

**影响链路**:

```
props.disableCopy 变化
  → rehypeRewriteHandle(disableCopy, ...) 产生新闭包
  → [rehypeRewrite, { rewrite: newClosure }] 数组项引用变更
  → rehypePlugins 数组整体引用变更（数组展开）
  → MarkdownPreview 检测到 rehypePlugins !== prev
  → ReactMarkdown 触发 unified 管线重建 + AST 全量重解析
  → 标题锚点逻辑（与 disableCopy 完全无关）也被重新执行
```

**目标架构** — 按变化频率拆分：

```typescript
// 稳定部分 — 标题锚点（不依赖任何 props）
const headingRewrite = (node: Root | RootContent, index: number | null, parent: Root | Element | null) => {
  if (node.type === 'element' && parent?.type === 'root' && /^h[1-6]$/.test(node.tagName)) {
    // ... 锚点逻辑
  }
};

// 可变部分 — 复制按钮（依赖 disableCopy）
const createCopyRewrite = (disableCopy: boolean) => (node, index, parent) => {
  if (node.type === 'element' && node.tagName === 'pre' && !disableCopy) {
    // ... 复制逻辑
  }
};

// 工厂 — 组合分离的关注点
export const rehypeRewriteHandle = (disableCopy: boolean, rewrite?: Rewrite) => (node, index, parent) => {
  headingRewrite(node, index, parent);
  createCopyRewrite(disableCopy)(node, index, parent);
  rewrite?.(node, index ?? undefined, parent ?? undefined);
};
```

---

#### A-03: defaultRehypePlugins 无配置能力 — 违反开闭原则（OCP）

**位置**: 第 27 行

```typescript
export const defaultRehypePlugins: PluggableList = [slug, headings, rehypeIgnore];
```

**架构分析**:

```
当前架构 — 封闭系统：
┌─────────────────────────────────────────────────────────────┐
│ defaultRehypePlugins                                         │
│  ├── slug        ← 无配置（id 生成策略不可定制）             │
│  ├── headings    ← 无配置（默认 behavior='prepend'）        │
│  └── rehypeIgnore ← 无配置（忽略策略不可定制）               │
│                                                              │
│  消费者只能：接受 or 完全替换（丢弃整份默认列表）             │
│  无法做到：调整单个插件的选项 / 排除某个插件 / 替换某个插件  │
└─────────────────────────────────────────────────────────────┘

实际使用场景（index.tsx）：
...defaultRehypePlugins,  // 展开合并到管线中，无法排除或替换
```

**消费者困境**:

| 合法需求 | 当前可行性 | 替代方案 |
|---|---|---|
| 自定义 slug 的 id 生成函数 | ❌ 不可能 | 必须完全重建插件列表 |
| 使用 `headings({ behavior: 'append' })` | ❌ 不可能 | 同上 |
| 移除 `rehypeIgnore`（不需要忽略功能） | ❌ 不可能 | 同上 |
| 保持默认但添加新插件 | ✅ 可以 | 通过 `props.rehypePlugins` 追加 |
| 完全不使用默认插件 | ✅ 可以 | `pluginsFilter` 手动过滤 |

**SOLID 评估**: **OCP 违反** — 对扩展开放不足（只能追加不能定制），对修改关闭不足（修改默认行为需改源码）。

**目标架构**:

```typescript
export interface DefaultPluginsConfig {
  slug?: Options | false;        // false 表示排除
  headings?: Options | false;
  ignore?: Options | false;
}

export const createDefaultPlugins = (config?: DefaultPluginsConfig): PluggableList => {
  const plugins: PluggableList = [];
  if (config?.slug !== false) plugins.push([slug, config?.slug]);
  if (config?.headings !== false) plugins.push([headings, config?.headings]);
  if (config?.ignore !== false) plugins.push([rehypeIgnore, config?.ignore]);
  return plugins;
};

// 向后兼容
export const defaultRehypePlugins: PluggableList = createDefaultPlugins();
```

---

### P2 — 中等问题（影响可维护性和架构清晰度）

#### A-04: 安全职责边界缺失 — data-code XSS 风险无防御归属

**位置**: 第 21 行 → `copyElement(code)` → `nodes/copy.ts`

```typescript
// rehypePlugins.tsx:21
const code = getCodeString(node.children);  // ← 用户输入的代码文本
node.children.push(copyElement(code));       // ← 直接注入 AST

// nodes/copy.ts
properties: { 'data-code': str }  // ← 原始文本存储在 HTML 属性中
```

**架构分析**:

```
安全责任归属分析：
┌────────────────────────┬──────────────┬──────────────────────────────┐
│ 层级                   │ 安全措施     │ 覆盖范围                     │
├────────────────────────┼──────────────┼──────────────────────────────┤
│ rehypePlugins.tsx      │ ❌ 无        │ 直接注入用户代码文本到 AST   │
│ nodes/copy.ts          │ ❌ 无        │ data-code 未编码             │
│ index.tsx              │ ❌ 无        │ 只做管线编排，无安全检查     │
│ preview.tsx            │ ⚠️ 部分      │ allowElement 过滤标签名      │
│                        │              │ 但不过滤属性值               │
│ React                  │ ✅ 自动转义  │ 仅在 JSX 渲染路径生效       │
│                        │              │ rehype-stringify 路径不保护  │
└────────────────────────┴──────────────┴──────────────────────────────┘

结论：安全是"逐层传递"而非"逐层负责" — 没有任何模块声称对 data-code 安全负责
```

**影响**: 当 HAST 树被 `rehype-stringify` 序列化为 HTML 字符串（而非 React JSX 渲染）时，`data-code` 中的 `"` 字符会导致属性值截断，形成 HTML 注入。

**架构建议**: 安全应在**数据注入点**（rehypePlugins.tsx）而非**消费点**（preview.tsx）实施 — 在 `copyElement` 调用前对 code 文本进行 HTML 实体编码。

---

#### A-05: 正则匹配与 tagName 类型系统脱节

**位置**: 第 13 行

```typescript
/h(1|2|3|4|5|6)/.test(node.tagName)
//              ↑ string 类型，正则未锚定
```

**架构视角**: 这是一个**类型系统与运行时校验不一致**的问题。TypeScript 的 `node.tagName` 类型为 `string`，无法在编译期约束合法标签名。代码用正则做运行时过滤，但正则本身不精确（如匹配 `thead`）。

```
类型安全层次分析：
┌─────────────────────────────────────────────────────────┐
│ 理想状态: hast 类型系统应定义 HeadingTagName 联合类型    │
│           'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'      │
│                                                         │
│ 实际状态: tagName: string — 完全无约束                   │
│                                                         │
│ 运行时防护: /h(1|2|3|4|5|6)/ — 有漏洞（匹配 thead）     │
│                                                         │
│ 缺失层级: 无中间防护                                    │
│   既没有类型收窄也没有精确运行时校验                     │
└─────────────────────────────────────────────────────────┘
```

**建议**: 使用 `Set<string>` 做精确匹配，同时利用 TypeScript 的 `typeof` 收窄改善类型安全：

```typescript
const HEADING_TAGS: ReadonlySet<string> = new Set(['h1','h2','h3','h4','h5','h6']);
// ...
if (node.type === 'element' && parent?.type === 'root' && HEADING_TAGS.has(node.tagName)) {
  // 此处 TypeScript 可通过 typeof guard 收窄 tagName 类型
}
```

---

#### A-06: rehypeRewriteHandle 的类型签名与 rehype-rewrite 契约不匹配

**位置**: 第 10-12 行

```typescript
// 当前签名
(node: Root | RootContent, index: number | null, parent: Root | Element | null) => void

// rehype-rewrite 期望的签名（从 RehypeRewriteOptions['rewrite'] 推导）
(node: Root | RootContent, index?: number | undefined, parent?: Root | Element | undefined) => void
```

**架构问题**: 返回的闭包签名使用 `null` 表示"无值"，但 rehype-rewrite 使用 `undefined`。虽然第 24 行做了 `null → undefined` 转换，但这意味着返回的闭包**不是** `RehypeRewriteOptions['rewrite']` 类型的子类型。

```
类型兼容性分析：
┌───────────────────────────────────────────────────────┐
│ 返回闭包签名:  (node, index: number | null, ...) =>   │
│ 期望签名:      (node, index?: number | undefined, ... │
│                                                       │
│ TypeScript 严格模式:                                  │
│  null ⊄ undefined → 类型不兼容                        │
│                                                       │
│ 运行时:                                               │
│ 内部做了 null → undefined 转换，实际行为正确           │
│                                                       │
│ 结论: 类型签名撒谎 — 声称接收 null 但实际转为         │
│       undefined 传给用户回调                           │
└───────────────────────────────────────────────────────┘
```

**建议**: 统一使用 `undefined` 语义，或使用 `Nullish` 类型：

```typescript
(node: Root | RootContent, index?: number, parent?: Root | Element) => void
```

---

### P3 — 轻微问题（架构风格与演进性）

#### A-07: nodes/ 子模块的架构角色不明确

**位置**: `./nodes/octiconLink` 和 `./nodes/copy`

```
nodes/ 目录结构：
┌──────────────────────────────────────────────────────────────┐
│  nodes/octiconLink.ts  — 静态 SVG 元素常量                   │
│  nodes/copy.ts         — 带参数的元素工厂函数                │
│                                                              │
│  问题:                                                       │
│  1. octiconLink 是纯数据（静态 HAST 元素），copy 是函数     │
│     混放在同一目录下，抽象层级不一致                          │
│  2. rehypePlugins.tsx 直接消费这两个模块的内部结构           │
│     没有通过抽象接口隔离 — 如果 copy.ts 改名或改签名，       │
│     rehypePlugins.tsx 必须同步修改                            │
└──────────────────────────────────────────────────────────────┘
```

**评估**: 对于 27 行的模块来说，这个过度抽象的担忧较轻。当前设计在模块规模上是合理的。

---

#### A-08: getCodeString 的依赖方向不对称

**位置**: 第 5 行 import、第 21 行使用

```typescript
import { getCodeString, type RehypeRewriteOptions } from 'rehype-rewrite';
```

**架构观察**: `rehypePlugins.tsx` 同时依赖 `rehype-rewrite` 的运行时函数（`getCodeString`）和类型定义（`RehypeRewriteOptions`）。但 `rehypeRewriteHandle` 产出的闭包最终也是通过 `rehype-rewrite` 消费的 — 这形成了循环依赖的雏形：

```
依赖方向：
rehypePlugins.tsx ──import──→ rehype-rewrite
                           ←──consume── index.tsx 将闭包传给 rehype-rewrite

虽然不是真正的循环导入（文件级别无循环），但 rehypePlugins.tsx 与 rehype-rewrite
的耦合是双向语义的 — 它既依赖 rehype-rewrite 的 API，又为 rehype-rewrite 产出回调。
```

**评估**: 这是 rehye 插件生态的设计惯例，不建议修改，但应在架构文档中标注这种"共生关系"。

---

#### A-09: 缺少模块级架构文档

27 行代码中没有任何注释解释：
- `rehypeRewriteHandle` 与 `defaultRehypePlugins` 之间的隐式契约
- 为什么 `defaultRehypePlugins` 的顺序是 `[slug, headings, rehypeIgnore]`
- `rehypeRewriteHandle` 假设上游插件已经产生了 `ariaHidden === 'true'` 的子元素

**评估**: 对于库的内部模块，缺少架构文档是常见的，但鉴于隐式契约的严重性（A-01），至少应有行内注释。

---

## 四、依赖架构分析

```
rehypePlugins.tsx 依赖关系图：
┌─────────────────────────────────────────────────────────────┐
│                     rehypePlugins.tsx                        │
├─────────────────────────────────────────────────────────────┤
│  直接外部依赖（5 个包）                                      │
│  ├── rehype-slug              (标题 ID 生成)                │
│  ├── rehype-autolink-headings (标题自动链接) ← 隐式契约关键 │
│  ├── rehype-ignore            (内容忽略)                    │
│  ├── rehype-rewrite           (AST 重写框架) ← 共生依赖     │
│  └── hast                     (类型系统)                    │
│                                                              │
│  直接内部依赖（2 个模块）                                    │
│  ├── ./nodes/octiconLink      (锚点 SVG 元素)               │
│  └── ./nodes/copy             (复制按钮元素)                │
│                                                              │
│  上游消费者                                                  │
│  ├── index.tsx    → 调用 rehypeRewriteHandle + 展开插件列表  │
│  └── common.tsx   → 同上（代码克隆）                         │
│                                                              │
│  下游影响链                                                  │
│  └── preview.tsx  → 通过 index.tsx 间接消费                  │
└─────────────────────────────────────────────────────────────┘

耦合度分析：
┌────────────────────────────┬────────┬──────────────────────────────┐
│ 模块                       │ 耦合度 │ 原因                         │
├────────────────────────────┼────────┼──────────────────────────────┤
│ rehype-autolink-headings   │ 极高   │ 隐式 DOM 结构契约            │
│ rehype-rewrite             │ 高     │ 共生依赖（API + 回调产出）    │
│ rehype-slug                │ 高     │ 执行顺序依赖                 │
│ nodes/copy.ts              │ 中     │ 函数调用，参数依赖            │
│ nodes/octiconLink.ts       │ 低     │ 纯数据常量引用                │
│ rehype-ignore              │ 低     │ 仅列表包含，无交互           │
└────────────────────────────┴────────┴──────────────────────────────┘
```

**架构风险**: `rehype-autolink-headings` 的耦合度最高 — 该插件的任何 DOM 输出变更都会导致 `rehypeRewriteHandle` 静默失效。这是整个模块最大的架构脆弱点。

---

## 五、SOLID 原则评估

| 原则 | 遵循情况 | 说明 |
|---|---|---|
| **SRP** 单一职责 | ⚠️ 部分违反 | 双导出（行为+配置）合理，但 `rehypeRewriteHandle` 内部三重职责混合不同变化频率 |
| **OCP** 开闭原则 | ❌ 违反 | `defaultRehypePlugins` 不可配置，无法排除/替换/定制单个插件 |
| **LSP** 里氏替换 | ✅ 遵循 | 工厂产出符合 rehype-rewrite 回调签名契约 |
| **ISP** 接口隔离 | ✅ 遵循 | `rehypeRewriteHandle` 仅暴露 `disableCopy` 和 `rewrite` 两个配置维度 |
| **DIP** 依赖倒置 | ❌ 违反 | 依赖 `rehype-autolink-headings` 的具体 DOM 输出（ariaHidden），而非抽象接口 |

---

## 六、数据流分析

```
rehypeRewriteHandle 在 unified 管线中的数据流：

Markdown 源文本
      │
      ▼
  remark 解析 → MDAST
      │
      ▼
  remark-rehype 转换 → HAST（初步）
      │
      ▼
┌─ rehype 插件管线 ────────────────────────────────────────────────┐
│                                                                   │
│  [1] rehype-slug                                                  │
│   └→ h1-h6 标题获得 id 属性                                      │
│      例: <h2>标题</h2> → <h2 id="标题">标题</h2>                │
│                                                                   │
│  [2] rehype-autolink-headings ← 隐式契约上游                     │
│   └→ 标题内部被包裹/追加 <a aria-hidden="true" href="#id">       │
│      例: <h2 id="标题"><a aria-hidden="true" href="#标题"></a>   │
│           标题</h2>                                               │
│                                                                   │
│  [3] rehype-ignore                                                │
│   └→ 处理 <!-- ... --> 忽略标记                                   │
│                                                                   │
│  [4] rehypeRewriteHandle ← ★ 本模块 ★                            │
│   ├→ 检测 h1-h6 标题 → 查找 ariaHidden='true' 子元素            │
│   │   → 替换子元素为 octiconLink SVG 图标                         │
│   │   → 添加 class='anchor'                                      │
│   │                                                                │
│   ├→ 检测 <pre> 标签 → 提取代码文本                               │
│   │   → 注入 copyElement（含 data-code 属性）                    │
│   │   ⚠️ data-code 未编码 — XSS 攻击面                           │
│   │                                                                │
│   └→ 调用用户自定义 rewrite 回调                                   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
      │
      ▼
  最终 HAST → React JSX 渲染（自动转义）
           或 rehype-stringify 序列化（⚠️ 无转义保护）
```

---

## 七、对本项目（by_geo）的影响评估

### 7.1 当前使用方式

```typescript
// index.tsx 中消费方式
import { rehypeRewriteHandle, defaultRehypePlugins } from './rehypePlugins';

// 管线组装
const rehypePlugins = [
  reservedMeta, rehypeRaw, retrieveMeta,
  ...defaultRehypePlugins,                           // ← 展开三个默认插件
  [rehypeRewrite, { rewrite: rehypeRewriteHandle(   // ← 工厂调用
    props.disableCopy ?? false,
    props.rehypeRewrite
  )}],
  // ...
];
```

### 7.2 影响矩阵

| 影响维度 | 严重度 | 分析 |
|---|---|---|
| **安全** | 🟡 中 | data-code XSS 面已被本项目 MarkdownViewer 的 DOMPurify 后处理缓解，但属于间接保护 |
| **稳定性** | 🟡 中 | 隐式契约意味着 rehype-autolink-headings 升级可能导致标题锚点静默失效 |
| **性能** | 🟡 中 | disableCopy 变化触发完整管线重建（参见 A-02 影响链路分析） |
| **可维护** | 🟢 低 | rehypePlugins.tsx 作为第三方库内部文件，本项目不直接修改 |
| **升级风险** | 🟡 中 | 隐式契约无类型保护，大版本升级可能有 breaking changes |

### 7.3 架构建议（按优先级）

1. **P1 — 安全纵深**: 确保 MarkdownViewer 的 DOMPurify 配置覆盖 `data-code` 属性（过滤 `"` 和 `<` 字符），不依赖 React 的自动转义
2. **P2 — 性能隔离**: MarkdownViewer 使用 `React.memo` 包裹，减少 `disableCopy` 变化触发的管线重建传播
3. **P2 — 版本锁定**: 锁定 `rehype-autolink-headings` 版本，防止隐式契约被升级打破
4. **P3 — 替代评估**: 长期考虑评估替代方案（如直接使用 rehype-slug + 自定义标题锚点逻辑，消除隐式契约）

---

## 八、改进建议汇总

| 优先级 | 编号 | 建议 | 工作量 | 架构收益 |
|---|---|---|---|---|
| P1 | A-01 | 消除与 rehype-autolink-headings 的隐式契约 | 大 | 根除最大架构脆弱点 |
| P1 | A-02 | 按变化频率拆分 rehypeRewriteHandle 内部职责 | 中 | 支持局部缓存，减少管线重建 |
| P1 | A-03 | defaultRehypePlugins 提供配置接口 | 中 | OCP 合规 |
| P2 | A-04 | 在数据注入点实施 HTML 实体编码 | 小 | 安全职责归属明确 |
| P2 | A-05 | 正则替换为 Set 精确匹配 | 小 | 消除误判风险 |
| P2 | A-06 | 统一 null/undefined 类型语义 | 小 | 类型签名诚实 |
| P3 | A-07 | 明确 nodes/ 子模块的架构角色 | 小 | 文档化 |
| P3 | A-08 | 标注 rehype-rewrite 共生依赖关系 | 小 | 文档化 |
| P3 | A-09 | 添加隐式契约的行内注释 | 小 | 降低理解成本 |

---

## 九、评审总结

`rehypePlugins.tsx` 作为 `@uiw/react-markdown-preview` 的行为配置模块，在**设计模式**和**代码精简性**上表现优秀 — 柯里化工厂 `(disableCopy, rewrite?) => (node, index, parent) => void` 精确匹配 rehype-rewrite 的 API 契约，双导出（行为 + 配置）的模块边界划分合理，27 行代码高效承载了两个核心产品功能。

但从架构层面看，存在 **三个结构性缺陷**：

1. **隐式契约耦合**（A-01）— 与 `rehype-autolink-headings` 的依赖完全隐式（无编译期检查、无运行时断言、无文档约束）。三阶段依赖链（slug → autolink → rewriteHandle）中任何一个环节的变更都会导致标题锚点功能静默失效。这是该模块最大的**架构脆弱点**。

2. **SRP 违反导致性能浪费**（A-02）— 标题锚点（低频变化）和复制按钮（中频变化）被捆绑在同一个闭包中。`disableCopy` 的每次变化都触发包含标题锚点逻辑在内的完整管线重建，产生不必要的 AST 重解析开销。

3. **OCP 缺失**（A-03）— `defaultRehypePlugins` 作为无配置的静态列表，消费者无法定制单个插件的选项或排除某个插件，只能"全接受"或"全丢弃"。

**综合评分 5.0/10** — 工厂模式设计优秀（+1），代码精简高效（+0.5），但隐式契约耦合严重（-1.5）、安全职责缺失（-0.5）、OCP 违反（-0.5）。对于本项目（by_geo），建议通过 MarkdownViewer 封装层进行安全加固和性能隔离，并锁定 rehype 插件版本防止隐式契约被升级打破。

---

## 十、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 建议 |
|---|---|---|---|---|
| A-01 | P1 🔴 | 耦合 | 与 rehype-autolink-headings 隐式 DOM 契约，三阶段级联静默失效 | 显式契约或自包含实现 |
| A-02 | P1 🔴 | SRP | 三重职责混合不同变化频率，disableCopy 变化触发完整管线重建 | 按变化频率拆分 |
| A-03 | P1 🔴 | OCP | defaultRehypePlugins 无配置能力，无法定制/排除/替换单个插件 | 提供配置接口 |
| A-04 | P2 🟡 | 安全 | data-code XSS 风险无防御归属，安全是"传递"而非"负责" | 数据注入点编码 |
| A-05 | P2 🟡 | 类型 | 正则匹配不精确，与 tagName 类型系统脱节 | Set 精确匹配 |
| A-06 | P2 🟡 | 类型 | null/undefined 签名与 rehype-rewrite 契约不匹配 | 统一语义 |
| A-07 | P3 🟢 | 结构 | nodes/ 子模块抽象层级不一致 | 文档化 |
| A-08 | P3 🟢 | 依赖 | rehype-rewrite 共生依赖未标注 | 文档化 |
| A-09 | P3 🟢 | 文档 | 隐式契约无行内注释 | 添加注释 |

---

*评审人: 软件架构专家 (Claude)*
*评审方法: 静态代码分析 + 架构模式审查 + 依赖链追踪 + SOLID 评估 + 数据流分析*
