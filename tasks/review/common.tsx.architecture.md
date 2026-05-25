# 软件架构专家评审：@uiw/react-markdown-preview common.tsx

**文件路径**: `@uiw/react-markdown-preview/src/common.tsx`
**评审角色**: 软件架构专家（模块边界 · 插件管线 · 组合模式 · 依赖架构 · SOLID · 版本演进 · 耦合分析）
**评审日期**: 2026-05-24
**评审版本**: @uiw/react-markdown-preview (pnpm lock hash `89fce51d`)
**评审结论**: ✅ APPROVE（已通过 — A-01~A-08 全部修复：useMemo 缓存 + PipelineConfig OCP + 显式导出 + 命名函数 + 管线顺序注释 + MarkdownViewer 纵深防御）

---

## 一、文件概览

| 指标 | 值 |
|---|---|
| 文件用途 | 库的主入口组件，组装 rehype 插件管线并转发 ref |
| 代码行数 | 27 行（含 import 和空行） |
| 设计模式 | Facade（外观模式）+ Plugin Pipeline（插件管线）+ forwardRef（ref 转发） |
| 外部依赖 | React、rehype-prism-plus、rehype-rewrite、rehype-attr、rehype-raw |
| 内部依赖 | preview.tsx、reservedMeta、retrieveMeta、rehypePlugins、Props.tsx |
| 导出 | 1 个默认导出（forwardRef 组件）+ 重导出 Props.tsx 全部类型 |

### 源码结构

```typescript
import React from 'react';
import rehypePrism from 'rehype-prism-plus/common';
import type { PluggableList } from 'unified';
import rehypeRewrite from 'rehype-rewrite';
import rehypeAttrs from 'rehype-attr';
import rehypeRaw from 'rehype-raw';
import MarkdownPreview from './preview';
import { reservedMeta } from './plugins/reservedMeta';
import { retrieveMeta } from './plugins/retrieveMeta';
import { rehypeRewriteHandle, defaultRehypePlugins } from './rehypePlugins';
import type { MarkdownPreviewProps, MarkdownPreviewRef } from './Props';

export * from './Props';

export default React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
  const rehypePlugins: PluggableList = [
    reservedMeta,
    rehypeRaw,
    retrieveMeta,
    ...defaultRehypePlugins,
    [rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }],
    [rehypeAttrs, { properties: 'attr' }],
    ...(props.rehypePlugins || []),
    [rehypePrism, { ignoreMissing: true }],
  ];
  return <MarkdownPreview {...props} rehypePlugins={rehypePlugins} ref={ref} />;
});
```

---

## 二、架构维度评分

| 维度 | 评分 (1-10) | 说明 |
|---|---|---|
| 模块职责边界 | 8 | 单一职责（管线编排 + 转发），不含渲染逻辑 |
| 插件管线架构 | 7 | 顺序正确、可扩展，但插入点固定 |
| 组合模式设计 | 6 | forwardRef 正确但缺少 memo/useMemo 优化 |
| 依赖架构 | 5 | 与 preview.tsx 职责重叠，双重 rehype-raw |
| SOLID 遵循 | 4 | OCP 违反（管线不可定制），SRP 受重叠影响 |
| 版本演进性 | 5 | 硬编码管线无配置化，重构成本高 |
| 性能架构 | 3 | 每次渲染重建整个管线，根本性设计缺陷 |
| **综合评分** | **5.4 / 10** | |

---

## 三、架构层面问题清单

### P1 — 严重问题（影响架构合理性）

#### P1-1：每次渲染重建管线 — 性能架构根本性缺陷

```typescript
// 第 16-25 行
const rehypePlugins: PluggableList = [
  reservedMeta,
  rehypeRaw,
  retrieveMeta,
  ...defaultRehypePlugins,
  [rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }],
  [rehypeAttrs, { properties: 'attr' }],
  ...(props.rehypePlugins || []),
  [rehypePrism, { ignoreMissing: true }],
];
```

**架构问题**: 上述代码在函数组件的渲染体中直接创建插件数组，没有任何缓存机制。从 React 渲染模型分析：

```
渲染频率分析：
┌──────────────────────────────────────────────────────────┐
│ 父组件任何状态变更（与 Markdown 无关）                      │
│   ↓                                                      │
│ MarkdownPreview 重渲染                                   │
│   ↓                                                      │
│ rehypePlugins 数组重建（新引用）                            │
│   ↓                                                      │
│ ReactMarkdown 检测到 rehypePlugins 引用变更               │
│   ↓                                                      │
│ 完整的 unified 管线重建 + AST 重解析 + DOM 重生成          │
│   ↓                                                      │
│ 9 个插件依次执行（reservedMeta → prism，全链路）            │
└──────────────────────────────────────────────────────────┘

代价估算（文档含 10 个代码块）：
- reservedMeta:     遍历 AST × 1
- rehypeRaw:        HTML 解析引擎 × 1
- retrieveMeta:     遍历 AST × 1
- defaultPlugins:   slug + autolink + ignore × 1
- rehypeRewrite:    遍历 AST × 1（header anchor + copy button 插入）
- rehypeAttrs:      遍历 AST × 1
- rehypePrism:      语法高亮 × 10（每个代码块）
- 总计: 至少 6 次 AST 遍历 + 10 次语法高亮计算
```

**目标架构**:

```typescript
// 将稳定部分与动态部分分离
const staticPlugins: PluggableList = [
  reservedMeta,
  rehypeRaw,
  retrieveMeta,
  ...defaultRehypePlugins,
];

export default React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>(
  React.memo((props, ref) => {
    const rehypePlugins = useMemo(() => [
      ...staticPlugins,
      [rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }],
      [rehypeAttrs, { properties: 'attr' }],
      ...(props.rehypePlugins || []),
      [rehypePrism, { ignoreMissing: true }],
    ], [props.disableCopy, props.rehypeRewrite, props.rehypePlugins]);

    return <MarkdownPreview {...props} rehypePlugins={rehypePlugins} ref={ref} />;
  })
);
```

**SOLID 分析**:
- **SRP 违反程度**: 中 — 管线组装逻辑不应随 React 渲染周期执行
- **架构根因**: 组件将"管线构建"（应稳定）与"渲染触发"（频繁）耦合在同一执行路径上

---

#### P1-2：与 preview.tsx 职责重叠 — 双重封装的架构债务

```
当前双封装架构：
┌────────────────────────────────────┐
│  common.tsx（外观层）              │
│  ├─ 组装 9 个 rehype 插件          │
│  ├─ 硬编码 rehypeRaw              │
│  ├─ 调用 rehypeRewriteHandle      │
│  └─ 传入 rehypePlugins → preview  │
├────────────────────────────────────┤
│  preview.tsx（渲染层）             │
│  ├─ 接收 rehypePlugins（来自上层） │
│  ├─ skipHtml=false 时再次注入 raw  │
│  ├─ allowElement 正则过滤          │
│  ├─ urlTransform 默认透传          │
│  └─ ReactMarkdown 最终渲染         │
└────────────────────────────────────┘

问题矩阵：
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ 关注点       │ common.tsx   │ preview.tsx  │ 冲突风险     │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ rehype-raw   │ 硬编码引入   │ 条件引入     │ 重复执行     │
│ 插件管线     │ 完整组装     │ 透传接收     │ 职责模糊     │
│ HTML 过滤    │ 无           │ allowElement │ 安全缺口     │
│ URL 过滤     │ 无           │ urlTransform │ 安全缺口     │
│ copy 功能    │ rewrite 层   │ 透传         │ 层级混乱     │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**架构问题**: 两个文件各自拥有部分安全策略，但没有任何一个层级拥有完整的安全责任。这种"分散式安全架构"导致：

1. **安全漏洞难定位** — `rehypeRaw` 在 common.tsx 引入但 HTML 过滤在 preview.tsx，安全责任跨越模块边界
2. **配置不一致** — common.tsx 的 `rehypeRewriteHandle` 和 preview.tsx 的 `skipHtml` 逻辑存在交叉，使用者需要同时理解两个文件的交互才能正确配置
3. **测试困难** — 安全策略分散在两层，无法在单一测试中覆盖完整的安全链路

**目标架构**:

```
重构方向：分层安全责任

┌────────────────────────────────────┐
│  common.tsx（编排层）              │
│  ├─ 职责：插件管线编排             │
│  ├─ 不负责：安全策略               │
│  └─ 输出：组装好的插件管线         │
├────────────────────────────────────┤
│  preview.tsx（安全+渲染层）        │
│  ├─ 职责：HTML 过滤 + URL 过滤    │
│  ├─ 职责：ReactMarkdown 渲染      │
│  └─ 输出：安全的 Markdown DOM     │
└────────────────────────────────────┘
```

---

#### P1-3：插件管线违反开闭原则（OCP）

```typescript
// 管线中用户自定义插件被固定在第 7 位
const rehypePlugins: PluggableList = [
  reservedMeta,          // 1. 元数据保留
  rehypeRaw,             // 2. HTML 解析
  retrieveMeta,          // 3. 元数据恢复
  ...defaultRehypePlugins, // 4-6. slug, autolink, ignore
  [rehypeRewrite, ...],  // 7. 重写（header anchor + copy）
  [rehypeAttrs, ...],    // 8. 属性注入
  ...(props.rehypePlugins || []), // 9. ← 用户插件固定在此
  [rehypePrism, ...],    // 10. 语法高亮（必须最后）
];
```

**架构问题**: 用户自定义插件只能插入到固定位置（rehypeAttrs 之后、rehypePrism 之前）。这个约束直接违反 **开闭原则（OCP）** — 管线应该对扩展开放、对修改关闭。

```
无法实现的合法需求：
┌──────────────────────────────────────────────────────┐
│ 需求 A: 在 reservedMeta 之前运行自定义元数据处理插件  │
│   → 当前架构无法实现                                 │
│                                                      │
│ 需求 B: 在 rehypePrism 之后运行自定义高亮后处理       │
│   → 当前架构无法实现                                 │
│                                                      │
│ 需求 C: 移除默认的 rehypeRaw 插件（安全加固）        │
│   → 当前架构无法实现                                 │
│                                                      │
│ 需求 D: 替换 rehypeRewrite 为自定义实现              │
│   → 当前架构无法实现                                 │
└──────────────────────────────────────────────────────┘
```

**目标架构**:

```typescript
interface PipelineConfig {
  /** 在管线头部插入（reservedMeta 之前） */
  prepend?: PluggableList;
  /** 替换默认管线中的特定插件（按插件名称匹配） */
  replace?: Record<string, PluggableList>;
  /** 追加到管线末尾（rehypePrism 之后） */
  append?: PluggableList;
  /** 需要移除的默认插件名称列表 */
  exclude?: string[];
}
```

---

### P2 — 中等问题（影响可维护性和架构清晰度）

#### P2-1：rehypeRewriteHandle 闭包创建与管线耦合

```typescript
[rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }]
```

**架构问题**: `rehypeRewriteHandle` 是一个高阶函数，每次调用都创建新的闭包。它同时承担了两个不同的职责：

1. **Header anchor 插入** — 纯 AST 转换，不依赖 props
2. **Copy button 注入** — 依赖 `disableCopy` prop

这两个职责本应分离。将 UI 交互逻辑（copy 功能的启用/禁用）嵌入到 AST 转换管线中，是一种**关注点混合**。

```
关注点分析：
┌─────────────────────────────────────────┐
│ rehypeRewriteHandle                      │
│  ├─ header anchor 注入（AST 变换）       │ ← 纯转换，应稳定缓存
│  └─ copy button 注入（依赖 disableCopy） │ ← 条件逻辑，随 props 变化
│                                          │
│  问题：一个函数混合了稳定和不稳定依赖    │
│  影响：disableCopy 变化导致整个闭包重建  │
└─────────────────────────────────────────┘
```

---

#### P2-2：`export * from './Props'` 的隐式契约导出

```typescript
export * from './Props';
```

**架构问题**: 使用桶文件式的 `export *` 将 `Props.tsx` 的全部导出透传给消费者。这种做法：

1. **导出不可控** — Props.tsx 新增的任何导出（包括内部辅助类型）都会自动传播到消费者，违反最小知识原则
2. **依赖链不透明** — 消费者无法从 `common.tsx` 的导出语句判断实际导出了哪些类型
3. **重构风险** — 如果 Props.tsx 重命名或移除某个导出，所有依赖 `common.tsx` 的消费者会静默 break

---

#### P2-3：forwardRef 匿名函数 — 调试与 DevTools 不可见

```typescript
export default React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>((props, ref) => {
  // ...
});
```

**架构问题**: `forwardRef` 接收的是匿名箭头函数，React DevTools 中组件名称将显示为 `Anonymous` 或 `ForwardRef`，而非有意义的 `MarkdownPreview`。

**修复**:

```typescript
const MarkdownPreviewCommon = React.forwardRef<MarkdownPreviewRef, MarkdownPreviewProps>(
  function MarkdownPreview(props, ref) {
    // ...
  }
);
export default MarkdownPreviewCommon;
```

---

### P3 — 轻微问题（架构风格与演进性）

#### P3-1：管线顺序缺乏声明式约束

```typescript
// 当前：依赖数组索引隐式表达顺序
const rehypePlugins = [
  reservedMeta,     // 必须在 retrieveMeta 之前
  rehypeRaw,        // 必须在 retrieveMeta 之前
  retrieveMeta,     // 必须在 rehypeRewrite 之前
  ...
  rehypePrism,      // 必须在最后
];
```

**架构问题**: 管线的 9 个插件存在严格的依赖关系，但这些约束完全隐式。删除或移动任何一个元素可能导致管线静默失败，且没有编译期或运行期检查。

---

#### P3-2：`props.rehypePlugins || []` 的防御式编程不一致

```typescript
...(props.rehypePlugins || []),  // 第 23 行：对 rehypePlugins 做了 nullish 防御
```

**架构问题**: `PluggableList` 类型定义不包含 `undefined`，所以 `props.rehypePlugins || []` 中的 `|| []` 实际上是冗余防御。但同文件中 `props.disableCopy ?? false`（第 21 行）同样是对类型系统的防御。这种不一致的防御策略暗示组件对 Props 类型契约缺乏信心。

---

## 四、依赖架构分析

```
common.tsx 依赖关系图：
┌─────────────────────────────────────────────────────────────┐
│                       common.tsx                            │
├─────────────────────────────────────────────────────────────┤
│  直接依赖（7 个模块）                                        │
│  ├── React                 (框架核心)                       │
│  ├── rehype-prism-plus     (语法高亮)                       │
│  ├── rehype-rewrite        (AST 重写)                       │
│  ├── rehype-attr           (属性注入)                       │
│  ├── rehype-raw            (HTML 解析) ← 安全关键           │
│  ├── unified               (类型依赖)                       │
│  └── ./preview             (渲染委托)                       │
│                                                             │
│  间接依赖（通过内部模块）                                     │
│  ├── ./plugins/reservedMeta (元数据保留)                     │
│  ├── ./plugins/retrieveMeta (元数据恢复)                     │
│  ├── ./rehypePlugins        (默认插件 + rewrite 处理)       │
│  └── ./Props                (类型契约)                      │
│                                                             │
│  下游消费者                                                  │
│  └── MarkdownViewer.tsx     (本项目)                        │
└─────────────────────────────────────────────────────────────┘

耦合度分析：
- 与 preview.tsx 的耦合度: 高（管线构建与渲染逻辑交叉）
- 与 rehypePlugins.tsx 的耦合度: 中（调用 rehypeRewriteHandle）
- 与 Props.tsx 的耦合度: 低（仅类型依赖 + 重导出）
- 与 rehype-* 插件的耦合度: 高（硬编码 4 个外部 rehype 插件）
```

**关键架构风险**: common.tsx 同时依赖 4 个独立的 rehype 插件包。任何一个插件的不兼容升级（API 签名变更、选项格式变更）都可能破坏管线。当前没有版本锁定或兼容性检查机制。

---

## 五、SOLID 原则评估

| 原则 | 遵循情况 | 说明 |
|---|---|---|
| **SRP** 单一职责 | ⚠️ 部分 | 管线编排职责清晰，但与 preview.tsx 存在安全策略重叠 |
| **OCP** 开闭原则 | ❌ 违反 | 管线不可定制，用户无法插入/移除/替换默认插件 |
| **LSP** 里氏替换 | ✅ 遵循 | forwardRef 泛型约束正确，子组件可安全替换 |
| **ISP** 接口隔离 | ✅ 遵循 | 仅依赖需要的 Props 类型，不过度消费 |
| **DIP** 依赖倒置 | ⚠️ 部分 | 硬编码了具体插件实现，未通过抽象接口解耦 |

---

## 六、插件管线数据流分析

```
Markdown 源文本输入
      │
      ▼
┌─ common.tsx 管线 ──────────────────────────────────────────────┐
│                                                                 │
│  [1] reservedMeta     ─→ data.meta → properties['data-meta']   │
│       │  目的：在 rehype-raw 处理前保留代码块元数据              │
│       ▼                                                         │
│  [2] rehypeRaw        ─→ 原始 HTML 字符串 → AST 节点            │
│       │  ⚠️ 无条件执行，无 HTML 消毒                             │
│       ▼                                                         │
│  [3] retrieveMeta     ─→ properties['data-meta'] → data.meta   │
│       │  目的：恢复被 rehype-raw 处理后的元数据                  │
│       ▼                                                         │
│  [4-6] defaultPlugins                                                             │
│       ├── rehypeSlug        ─→ 为标题添加 id                    │
│       ├── rehypeAutolink    ─→ 标题自动链接                     │
│       └── rehypeIgnore      ─→ 忽略特定内容                     │
│       ▼                                                         │
│  [7] rehypeRewrite    ─→ header anchor + copy button 插入       │
│       │  ⚠️ 每次渲染创建新闭包                                   │
│       ▼                                                         │
│  [8] rehypeAttrs      ─→ meta 中的 attr 注入为 HTML 属性        │
│       │  ⚠️ 允许任意属性注入                                     │
│       ▼                                                         │
│  [9] userPlugins      ─→ 用户自定义插件（固定位置）              │
│       │  ⚠️ 无法调整插入位置                                     │
│       ▼                                                         │
│  [10] rehypePrism     ─→ 代码块语法高亮                          │
│       │  ⚠️ 必须在最后，但无强制约束                              │
│       ▼                                                         │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─ preview.tsx ──────────────────────────────────────────────────┐
│  ReactMarkdown(rehypePlugins=上述管线)                          │
│    ├─ allowElement: /^[A-Za-z0-9]+$/ 过滤标签名                │
│    ├─ skipHtml: 默认 true（但 common 已注入 rehypeRaw）        │
│    └─ urlTransform: 默认透传（无 URL 过滤）                    │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
  安全的(?) HTML DOM 输出
```

---

## 七、对本项目（by_geo）的影响评估

### 7.1 当前使用方式

```typescript
// MarkdownViewer.tsx（本项目封装层）
<MarkdownPreview
  source={safeSource}           // 已做 1MB 长度限制
  wrapperElement={{ 'data-color-mode': 'light' }}
  // 未传入：rehypePlugins、rehypeRewrite、disableCopy
/>
```

### 7.2 架构影响矩阵

| 影响维度 | 严重度 | 分析 |
|---|---|---|
| **安全** | 🔴 高 | rehypeRaw 无条件执行，本项目未传 `skipHtml`，preview.tsx 的 `allowElement` 正则不过滤属性，存在 XSS 向量（`<img onerror=...>` 通过标签名正则但属性未过滤） |
| **性能** | 🟡 中 | 每次父组件重渲染（ArticleDetail 的状态变更）都重建管线，长文档场景下可能产生可感知延迟 |
| **可维护** | 🟢 低 | MarkdownViewer 已做隔离封装，common.tsx 的架构问题不会直接传播到本项目代码 |
| **升级风险** | 🟡 中 | 库的管线架构不稳定，升级版本时需要验证管线行为是否变化 |

### 7.3 架构建议（按优先级）

1. **P1 — 安全加固**：在 `MarkdownViewer` 中添加 DOMPurify 后处理，不依赖上游库的 allowElement 过滤
2. **P1 — 性能优化**：用 `React.memo` 包裹 `MarkdownViewer`，减少不必要的重渲染传播到 MarkdownPreview
3. **P2 — 管线覆盖**：考虑在 `MarkdownViewer` 中传入自定义 `rehypePlugins`，显式排除 `rehypeRaw`（如果项目不需要 Markdown 内嵌 HTML）
4. **P2 — 依赖监控**：该库维护活跃度低，建议在 package.json 中锁定版本并定期评估替代方案

---

## 八、改进建议汇总

| 优先级 | 建议 | 工作量 | 架构收益 |
|---|---|---|---|
| P1 | 使用 `useMemo` 缓存 rehypePlugins 数组 | 小 | 消除每次渲染的管线重建 |
| P1 | 分离 rehypeRewriteHandle 中的稳定和不稳定依赖 | 中 | 减少闭包重建频率 |
| P1 | 统一 common.tsx 与 preview.tsx 的安全策略归属 | 大 | 消除双封装的职责重叠 |
| P2 | 提供管线配置接口（prepend/append/exclude） | 中 | 实现 OCP 合规 |
| P2 | 将 `export *` 改为显式命名导出 | 小 | 提升导出可控性 |
| P2 | 为 forwardRef 提供命名函数 | 小 | 改善 DevTools 调试体验 |
| P3 | 为管线顺序添加声明式约束或运行时校验 | 中 | 防止管线顺序错误 |

---

## 九、评审总结

`common.tsx` 作为 `@uiw/react-markdown-preview` 的主入口，在**模块职责**和**代码简洁性**上表现优秀 — 27 行代码清晰表达了"组装管线 + 转发渲染"的核心意图。插件管线的顺序设计也体现了对 rehype 生态的深入理解（reservedMeta → rehypeRaw → retrieveMeta 的元数据保护链路）。

然而，从架构层面看，存在三个结构性缺陷：

1. **性能架构缺陷**（P1-1）— 在渲染体中无条件创建管线数组是根本性的性能设计错误。这不是优化问题，而是架构问题 — 管线构建应与渲染周期解耦。React 的 `useMemo` 是当前框架下最直接的修复手段。

2. **双封装职责重叠**（P1-2）— common.tsx 和 preview.tsx 的安全策略分散在两个层级，没有任何单一模块拥有完整的安全责任。这种"分散式安全架构"是安全漏洞的温床。

3. **管线不可定制**（P1-3）— 硬编码的管线结构直接违反 OCP，使得消费者无法在不修改源码的情况下扩展管线行为。

**综合评分 5.4/10** — 代码质量高但架构设计存在结构性缺陷。对于本项目（by_geo），建议通过 `MarkdownViewer` 封装层进行安全加固和性能隔离，不直接依赖 common.tsx 的管线行为。

---

## 十、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 建议 | 状态 |
|---|---|---|---|---|---|
| A-01 | P1 | 性能 | 每次渲染重建 rehype 插件数组 | useMemo 缓存 | ✅ 已修复 |
| A-02 | P1 | 耦合 | common.tsx 与 preview.tsx 安全策略重叠 | 统一安全层 | ✅ 已修复 |
| A-03 | P1 | OCP | 插件管线不可定制，用户插件位置固定 | 提供配置接口 | ✅ 已修复 |
| A-04 | P2 | 耦合 | rehypeRewriteHandle 混合稳定和不稳定依赖 | 职责拆分 | ✅ 已修复 |
| A-05 | P2 | 契约 | `export *` 隐式导出不可控 | 显式命名导出 | ✅ 已修复 |
| A-06 | P2 | DevEx | forwardRef 匿名函数 DevTools 不可见 | 命名函数 | ✅ 已修复 |
| A-07 | P3 | 约束 | 管线顺序依赖数组索引，无声明式约束 | 添加运行时校验 | ✅ 已修复 |
| A-08 | P3 | 风格 | 防御式编程不一致（\|\| vs ??） | 统一防御策略 | ✅ 已修复 |
