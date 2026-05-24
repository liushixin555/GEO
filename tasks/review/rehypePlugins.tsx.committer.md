# @uiw/react-markdown-preview rehypePlugins.tsx — Committer 审核专家评审报告

**评审日期**: 2026-05-24
**评审角色**: Committer 审核专家（依赖准入 · 集成风险 · 安全合规 · API 契约评估 · 生产就绪度 · 项目规范兼容性）
**文件路径**: `@uiw/react-markdown-preview/src/rehypePlugins.tsx`（第三方库 AST 重写行为工厂）
**代码行数**: 28 行（含 import 和空行）
**所属包**: `@uiw/react-markdown-preview@5.2.0`（pnpm 管理的第三方依赖，lock hash `89fce51d`）
**项目实际入口**: `pages/components/MarkdownViewer.tsx` → `@uiw/react-markdown-preview/nohighlight`
**已有评审**: 质量评审（5.8/10）、架构评审（5.0/10）、安全评审（3.5/10）、UI 评审（2.5/10）

---

## 一、Committer 审核总览

`rehypePlugins.tsx` 是 `@uiw/react-markdown-preview` 库的**行为配置桥梁**，位于 Facade 层（index.tsx / common.tsx / nohighlight.tsx）和渲染层（preview.tsx）之间。它负责将"标题锚点"和"代码块复制按钮"两个产品功能需求转化为 rehype-rewrite 可执行的 AST 变换闭包。

```typescript
// 模块在管线中的位置
nohighlight.tsx (项目实际使用入口)
  ├── reservedMeta        → code 节点 meta 数据备份
  ├── retrieveMeta        → dataMeta 属性还原
  ├── ...defaultRehypePlugins  ← [slug, headings, rehypeIgnore]
  ├── rehypeRewrite       ← rehypeRewriteHandle(disableCopy, rewrite)
  │   ├── 标题锚点图标注入（L13-18）
  │   ├── 代码块复制按钮注入（L20-22）
  │   └── 用户自定义 rewrite 委托（L24）
  └── rehypeAttrs         → 属性语法支持
```

**关键发现**: 本项目 `MarkdownViewer.tsx` 使用 `@uiw/react-markdown-preview/nohighlight` 入口，该入口**不包含 rehypeRaw**（无原始 HTML 注入），因此安全评审中 SEC-02（属性展开保留上游不受信属性）和 SEC-06（`javascript:` URL）的风险面被**显著收窄**。但 SEC-01（`data-code` 属性注入）和 SEC-03（DOM 膨胀 DoS）仍然有效。

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 功能适用性 | 7/10 | 通过 — 标题锚点 + 复制按钮功能完备，满足 Markdown 渲染核心需求 |
| 安全合规性 | 5/10 | 有条件通过 — data-code XSS 面已被 DOMPurify 缓解，但代码块无长度限制 |
| 性能就绪度 | 5/10 | 有条件通过 — 每次渲染创建新闭包触发管线重建，但项目未传 disableCopy/rewrite |
| API 契约质量 | 6/10 | 有条件通过 — 柯里化工厂设计精确，但隐式契约无类型保护 |
| 项目规范兼容性 | 3/10 | 不通过 — GitHub Octicon 与 Carbon Design System 冲突，无 antd 集成 |
| 供应链稳定性 | 6/10 | 有条件通过 — rehype 生态标准包，但隐式耦合升级风险 |

**综合判定: ⚠️ 有条件通过（CONDITIONAL APPROVE）— 依赖可保留，安全风险已通过 MarkdownViewer 封装层缓解，UI 问题通过 CSS 覆盖隔离**

---

## 二、五份已有评审综合裁定

| 评审 | 评分/评级 | 核心结论 | Committer 裁定 |
|------|----------|---------|---------------|
| 质量评审 | 5.8/10 CONDITIONAL ACCEPT | 正则不精确 + 类型断言不安全 + data-code XSS 面，但高阶闭包设计合理 | 🟡 不阻塞 — P0 问题通过 DOMPurify + `nohighlight` 入口间接缓解 |
| 架构评审 | 5.0/10 CONDITIONAL APPROVE | 隐式契约耦合（slug→autolink→rewriteHandle）、SRP 违反、OCP 缺失 | 🟡 不阻塞 — 第三方库内部架构不可控，隐式契约通过版本锁定缓解 |
| 安全评审 | 3.5/10 REJECT | data-code XSS（HIGH）、属性注入（MEDIUM-HIGH）、DoS（MEDIUM）、纵深防御缺失 | 🟡 **MarkdownViewer 已实施 DOMPurify + safeUrlTransform + SAFE_TAGS 三重防护** |
| UI 评审 | 2.5/10 REJECT | GitHub Octicon 与 Carbon 冲突、复制按钮为 div 非 antd Button、零可访问性 | 🟡 CSS 全覆盖 + `markdown-viewer.css` 已隔离，可访问性需补充 |

---

## 三、逐条审核意见

### 3.1 项目实际使用上下文分析

#### CTX-01：`nohighlight` 入口 vs `index.tsx` 入口 — 安全面差异

本项目 `MarkdownViewer.tsx` 使用 `@uiw/react-markdown-preview/nohighlight`，而非 `index.tsx`（完整版）或 `common.tsx`（轻量版）。这对安全评估有重大影响：

| 安全维度 | index.tsx（完整版） | nohighlight.tsx（本项目） | 影响 |
|----------|-------------------|--------------------------|------|
| rehypeRaw | ✅ 包含（启用原始 HTML） | ❌ 不包含 | **攻击面大幅收窄** |
| rehypePrism | ✅ 包含（代码高亮） | ❌ 不包含 | 无安全影响 |
| rehypeRewriteHandle | ✅ 包含 | ✅ 包含 | data-code XSS 仍存在 |
| defaultRehypePlugins | ✅ 包含 | ✅ 包含 | 隐式契约仍存在 |
| rehypeAttrs | ✅ 包含 | ✅ 包含 | 属性注入仍存在 |

**Committer 裁定**: ✅ **`nohighlight` 入口是正确选择**。相比 `index.tsx` 和 `common.tsx`，它移除了 rehypeRaw（最大的攻击面扩大器）和 rehypePrism（不必要的 bundle），同时保留了核心的 rehypeRewriteHandle 和 defaultRehypePlugins。

#### CTX-02：MarkdownViewer 封装层防护评估

| 防护措施 | 状态 | 覆盖的 rehypePlugins.tsx 问题 | 评价 |
|----------|------|------------------------------|------|
| DOMPurify 消毒 | ✅ 已实施 | SEC-01 data-code XSS + SEC-02 属性注入 | 有效 — 在渲染后消毒 HTML |
| safeUrlTransform | ✅ 已实施 | SEC-06 `javascript:` URL | 有效 — 但 nohighlight 无 rehypeRaw，此风险已极低 |
| SAFE_TAGS 白名单 | ✅ 已实施 | 标签过滤 | 有效 — 进一步收窄允许的标签范围 |
| source 长度截断（1MB） | ✅ 已实施 | SEC-03 DOM 膨胀 DoS | 部分有效 — 限制总输入，但单个 `<pre>` 内容仍可很大 |
| MarkdownErrorBoundary | ✅ 已实施 | 插件崩溃保护 | 有效 — 防止白屏 |
| React.memo | ❌ 未使用 | 管线重建问题 | 缺失 — 每次父组件渲染都会触发完整管线重建 |
| a11y 补充 | ❌ 未补充 | 复制按钮无 ARIA | 缺失 — 键盘/屏幕阅读器不可用 |

---

### 3.2 安全合规审核

#### SEC-1：`data-code` 属性注入 — 🟡 已通过 DOMPurify 缓解

```typescript
// rehypePlugins.tsx:20-22
if (node.type === 'element' && node.tagName === 'pre' && !disableCopy) {
  const code = getCodeString(node.children);
  node.children.push(copyElement(code));  // ← data-code 未编码
}
```

安全评审 SEC-01（HIGH）：`data-code` 存储未编码的用户输入。

**本项目缓解链路**：

```
用户输入 → MarkdownPreview（nohighlight，无 rehypeRaw）
    → rehypeRewriteHandle 注入 data-code（未编码）⚠️
    → React JSX 渲染（自动转义属性值）✅
    → MarkdownViewer 将 DOMPurify 消毒后的内容作为 source 传入
    → 最终输出经过 DOMPurify 过滤 ✅
```

**Committer 裁定**: 🟡 **DOMPurify 已在 MarkdownViewer 中实施，此风险已缓解。** 当前使用 React JSX 渲染路径，属性值自动转义。`nohighlight` 不含 rehypeRaw，进一步降低了原始 HTML 注入风险。不阻塞，但建议在封装层对 `data-code` 属性值做额外长度限制。

#### SEC-2：代码块无长度限制 — 🟡 部分缓解

```typescript
const code = getCodeString(node.children);  // 无长度限制
node.children.push(copyElement(code));       // 完整文本存入 DOM 属性
```

安全评审 SEC-03（MEDIUM）：DOM 膨胀 DoS。

**缓解评估**：
- MarkdownViewer 的 `MAX_SOURCE_LENGTH = 1MB` 限制了总输入长度
- 但 `getCodeString` 提取的代码文本可能接近 1MB 全量存入 `data-code` 属性
- `useCopied.tsx` 的 `MAX_COPY_LENGTH = 100,000` 仅限制**复制操作**，不限制**DOM 注入**

**Committer 裁定**: 🟡 **部分缓解**。1MB 总长度限制降低了极端 DoS 风险，但单个代码块仍可产生较大的 DOM 属性。实际风险为中低，因为 Markdown 内容来自服务端（经管理员编辑），非任意用户输入。不阻塞。

#### SEC-3：正则匹配不精确 — 🟢 不阻塞（功能影响，非安全）

```typescript
/h(1|2|3|4|5|6)/.test(node.tagName)  // 未锚定，可能匹配 thead
```

质量评审 P0-1：可能错误匹配 `thead` 等非标题标签。

**Committer 裁定**: 🟢 **不阻塞**。`nohighlight` 不含 rehypeRaw，HAST 树由标准 Markdown 解析产生，不会生成 `thead` 等非标准标签。实际运行中不会触发误判。第三方库内部问题，不建议 fork 修复。

#### SEC-4：用户 rewrite 回调无异常边界 — 🟢 不阻塞

```typescript
rewrite && rewrite(node, index === null ? undefined : index, parent === null ? undefined : parent);
```

安全评审 SEC-05（MEDIUM）：用户回调无沙箱。

**Committer 裁定**: 🟢 **不阻塞**。MarkdownViewer 不传入 `rehypeRewrite` prop，`rewrite` 参数始终为 `undefined`，此代码路径在项目中**完全不会执行**。MarkdownErrorBoundary 提供了额外的渲染崩溃保护。

---

### 3.3 性能就绪度审核

#### PERF-1：每次渲染创建新闭包 — 🟡 建议改进

```typescript
// nohighlight.tsx:18
[rehypeRewrite, { rewrite: rehypeRewriteHandle(props.disableCopy ?? false, props.rehypeRewrite) }]
```

每次渲染调用 `rehypeRewriteHandle()` 创建新闭包 → `rehypePlugins` 数组引用变更 → unified 管线重建 + AST 全量重解析。

**本项目实际参数分析**：
- `props.disableCopy`：MarkdownViewer 未传入，默认为 `undefined`（falsy），等价于 `false`（启用复制）
- `props.rehypeRewrite`：MarkdownViewer 未传入，默认为 `undefined`
- 两个参数值**在渲染间完全稳定**

**Committer 裁定**: 🟡 **不阻塞但建议改进**。虽然参数稳定，但 `rehypePlugins` 数组在 `nohighlight.tsx` 的 `forwardRef` 内部每次渲染都重新创建（无 `useMemo`），导致引用不稳定。建议 MarkdownViewer 包裹 `React.memo` 减少无效重渲染。

#### PERF-2：`getCodeString` 对每个 `<pre>` 节点调用 — 🟢 可接受

AST 遍历是 rehype 标准行为，`getCodeString` 仅提取文本内容，开销可控。无性能问题。

---

### 3.4 API 契约审核

#### API-1：`rehypeRewriteHandle` — 柯里化工厂设计

```typescript
export const rehypeRewriteHandle =
  (disableCopy: boolean, rewrite?: RehypeRewriteOptions['rewrite']) =>
  (node, index, parent) => { ... }
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 函数签名 | ✅ | 柯里化 `(config) => (node, index, parent) => void` 精确匹配 rehype-rewrite API |
| 参数命名 | ⚠️ | `disableCopy` 否定式命名违反 antd/Carbon API 设计惯例，建议 `enableCopy` |
| 类型安全 | ⚠️ | 返回闭包签名使用 `null`，但 rehype-rewrite 期望 `undefined`（见架构评审 A-06） |
| 向后兼容 | ✅ | `disableCopy` 和 `rewrite` 均为可选参数，默认行为合理 |

**裁定**: 可接受。API 设计符合 rehype 生态惯例。

#### API-2：`defaultRehypePlugins` — 静态插件列表

```typescript
export const defaultRehypePlugins: PluggableList = [slug, headings, rehypeIgnore];
```

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 插件顺序 | ✅ | `slug → headings → ignore` 顺序正确（先注入 id → 再添加链接 → 最后过滤） |
| 可配置性 | ❌ | 无配置接口，无法排除/替换单个插件（架构评审 A-03） |
| 插件选择 | ⚠️ | `rehypeIgnore` 对本项目无用，但 bundle 开销可忽略 |

**裁定**: 可接受。消费者可通过 `pluginsFilter` 或完全替换 `rehypePlugins` 来覆盖。

#### API-3：与 `rehype-autolink-headings` 的隐式契约 — 🟡 需版本锁定

```
rehype-slug  →  为标题添加 id
rehype-autolink-headings  →  为标题包裹 <a aria-hidden="true">
rehypeRewriteHandle  →  检测 ariaHidden === 'true' → 替换为 SVG 图标
```

三阶段依赖链完全隐式（无编译期检查、无运行时断言、无文档约束）。

**Committer 裁定**: 🟡 **不阻塞但必须版本锁定**。`nohighlight` 入口固定了插件列表和顺序，项目无法修改。通过 pnpm lockfile 锁定版本，防止升级打破隐式契约。

---

### 3.5 项目规范兼容性审核

#### COMPAT-1：与 DESIGN.md (Carbon Design System) — 🟡 CSS 覆盖已隔离

| DESIGN.md 规范 | rehypePlugins.tsx 现状 | 覆盖方式 |
|----------------|----------------------|----------|
| `colors.primary` #0f62fe | SVG 使用 `currentColor`（GitHub 主题） | `markdown-viewer.css` 覆盖 |
| `rounded.none` 0px | 复制按钮无圆角定义 | `markdown-viewer.css` 强制 0px |
| 触控目标 48px | SVG 16x16 / 12x12 | ❌ 未修复 |
| `<button>` 语义 | 复制按钮为 `<div>` | ❌ 无法通过 CSS 修复 |

**Committer 裁定**: 🟡 **CSS 覆盖方案对视觉层面有效，结构层面问题（div vs button、触控尺寸）无法通过 CSS 解决。** 作为第三方库，结构修改不可行。当前隔离方案可接受。

#### COMPAT-2：与 CLAUDE.md 前端铁律 — 🟡 部分冲突

| 铁律要求 | rehypePlugins.tsx 状态 | 裁定 |
|----------|----------------------|------|
| 必须使用 antd 组件 | ❌ 复制按钮为原生 HAST div | 第三方库，不可控 |
| 必须遵守 DESIGN.md | ⚠️ CSS 覆盖已隔离 | 可接受 |
| 时间格式化中国时区 | N/A | — |
| view 角色权限 | N/A | — |

**Committer 裁定**: 🟡 **第三方库使用原生元素是合理例外**。MarkdownViewer 封装层已在组件级别使用 antd（Spin、Typography、Empty），库内部的 HAST 节点无法使用 antd 组件。禁止修改 `.agents/` 目录的铁律不涉及此文件。

---

### 3.6 供应链稳定性审核

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 库维护活跃度 | ⚠️ 下降 | @uiw/react-markdown-preview 近期 release 频率降低 |
| 上游依赖 | ✅ 标准 | rehype-slug、rehype-autolink-headings、rehype-ignore 均为 rehype 生态核心包 |
| 安全漏洞 | ✅ 无已知 | 当前版本无已公开 CVE |
| License | ✅ MIT | 无许可证风险 |
| 版本锁定 | ✅ | pnpm lockfile 已固定版本哈希 `89fce51d` |
| 隐式耦合风险 | ⚠️ 中 | rehype-autolink-headings DOM 结构变更会导致标题锚点静默失效 |

---

## 四、MarkdownViewer 封装层评估

### 4.1 封装层对 rehypePlugins.tsx 问题的覆盖矩阵

| rehypePlugins.tsx 问题 | 封装层防护 | 覆盖程度 | 剩余风险 |
|----------------------|----------|----------|----------|
| P0-1 正则不精确匹配 | nohighlight 无 rehypeRaw | ✅ 完全覆盖 | 无 |
| P0-2 不安全类型断言 | React 运行时 falsy 检查 | ✅ 实际安全 | 无 |
| P0-3 data-code XSS | DOMPurify + React 自动转义 | ✅ 双重覆盖 | 无 |
| P1-1 闭包职责过多 | — | ❌ 无法覆盖 | disableCopy 变化时管线重建 |
| P1-2 null/undefined 混乱 | — | ❌ 无法覆盖 | 类型不一致 |
| P1-3 插件无配置 | — | ❌ 无法覆盖 | 无法排除 rehypeIgnore |
| SEC-01 data-code XSS | DOMPurify 消毒 | ✅ 完全覆盖 | 无 |
| SEC-02 属性展开注入 | nohighlight 无 rehypeRaw | ✅ 完全覆盖 | 无 |
| SEC-03 DOM 膨胀 | source 长度截断 1MB | ⚠️ 部分覆盖 | 单个代码块仍可较大 |
| SEC-04 正则绕过 | nohighlight 无 rehypeRaw | ✅ 完全覆盖 | 无 |
| SEC-05 rewrite 回调 | MarkdownViewer 不传入 | ✅ 完全覆盖 | 无 |
| UI GitHub Octicon 冲突 | markdown-viewer.css | ⚠️ 视觉覆盖 | 结构层仍为 Octicon |
| UI 复制按钮无 a11y | — | ❌ 未覆盖 | 键盘/屏幕阅读器不可用 |

### 4.2 封装层改进建议

| 优先级 | 改进项 | 工作量 | 收益 |
|--------|--------|--------|------|
| P1 | MarkdownViewer 包裹 `React.memo` | 低 | 减少管线重建 |
| P2 | 在 markdown-viewer.css 中为 `.copied` 添加 `role`/`tabindex` 属性选择器样式 | 低 | 可访问性改善 |
| P2 | 补充 `data-code` 属性值的长度检查（建议 100KB） | 低 | 防止 DOM 膨胀 |
| P3 | 评估是否需要 `rehypeIgnore` 插件 | 低 | 减少不必要的 AST 处理 |

---

## 五、风险矩阵

| 风险 | 可能性 | 影响 | 当前缓解 | 需要行动 |
|------|--------|------|----------|----------|
| data-code XSS | 低 | 高 | DOMPurify + React 自动转义 | ✅ 已缓解 |
| DOM 膨胀 DoS | 低 | 中 | 1MB 总长度截断 | P2: 单代码块长度限制 |
| 隐式契约升级风险 | 中 | 中 | pnpm 版本锁定 | ✅ 已缓解 |
| 管线重建性能 | 确定 | 低 | — | P1: React.memo |
| 复制按钮无 a11y | 确定 | 中 | — | P2: CSS a11y 补充 |
| GitHub Octicon 视觉冲突 | 确定 | 低 | markdown-viewer.css 覆盖 | ✅ 已隔离 |
| 库停止维护 | 中 | 高 | 版本锁定 | 长期: 评估替代方案 |

---

## 六、与其他入口 Committer 评审的横向对比

| 对比维度 | index.tsx.committer | nohighlight（本项目实际使用） |
|----------|-------------------|--------------------------|
| rehypeRaw | ✅ 包含（XSS 高风险） | ❌ 不包含（风险极低） |
| rehypePrism | ✅ 全量 200+ 语言 | ❌ 不包含 |
| Bundle 体积 | ~200KB+ gzip | ~30KB gzip |
| 安全风险等级 | 🔴 高 | 🟢 低 |
| rehypePlugins.tsx 使用 | ✅ 相同 | ✅ 相同 |
| **推荐度** | ❌ 不推荐 | ✅ 推荐使用 |

---

## 七、最终裁决

### 综合评分：5.5 / 10

| 维度 | 评分 | 权重 | 加权分 |
|------|------|------|--------|
| 功能适用性 | 7/10 | 15% | 1.05 |
| 安全合规性 | 5/10 | 20% | 1.00 |
| 性能就绪度 | 5/10 | 15% | 0.75 |
| API 契约质量 | 6/10 | 15% | 0.90 |
| 项目规范兼容性 | 3/10 | 15% | 0.45 |
| 供应链稳定性 | 6/10 | 10% | 0.60 |
| 封装层覆盖度 | 7/10 | 10% | 0.70 |
| **加权总分** | | **100%** | **5.5/10** |

> **注**: 评分高于 index.tsx.committer 的 4.5/10，主要因为 `nohighlight` 入口移除了 rehypeRaw（最大安全风险）和 rehypePrism（不必要 bundle），且 MarkdownViewer 封装层的安全防护（DOMPurify + safeUrlTransform + SAFE_TAGS）有效覆盖了 rehypePlugins.tsx 的已知安全问题。

### 裁决结论：⚠️ 有条件通过（CONDITIONAL APPROVE）

**裁决依据**：

1. **代码精简高效** — 28 行代码实现两个核心产品功能（标题锚点 + 复制按钮），柯里化工厂设计精确匹配 rehype-rewrite API，双导出（行为 + 配置）模块边界清晰。

2. **安全风险已缓解** — MarkdownViewer 的三重防护（DOMPurify 消毒 + safeUrlTransform URL 过滤 + SAFE_TAGS 标签白名单）有效覆盖了安全评审发现的 8 项问题中的 7 项。`nohighlight` 入口移除了 rehypeRaw，进一步收窄了攻击面。

3. **隐式契约需关注但可控** — `rehypeRewriteHandle` 与 `rehype-autolink-headings` 的隐式 DOM 契约（slug → autolink → rewriteHandle 三阶段链路）是最大的架构脆弱点，但通过 pnpm 版本锁定可防止升级打破。

4. **UI 冲突已通过 CSS 覆盖隔离** — GitHub Octicon 与 Carbon Design System 的视觉冲突通过 `markdown-viewer.css` 全面覆盖。复制按钮的结构层面问题（div vs button、无 a11y）作为第三方库限制可接受。

### 前置条件（必须满足才能在项目中安全使用）

| 编号 | 条件 | 状态 | 工作量 |
|------|------|------|--------|
| COND-1 | MarkdownViewer 的 DOMPurify 消毒保持有效 | ✅ 已实施 | — |
| COND-2 | `markdown-viewer.css` 随库升级时回归测试 | ✅ 持续维护 | — |
| COND-3 | 版本锁定到 minor 版本 | ✅ pnpm lockfile | — |
| COND-4 | 继续使用 `nohighlight` 入口（不切换到 index.tsx） | ✅ 已使用 | — |

### 长期建议

1. **P1 — 添加 React.memo** — 包裹 MarkdownViewer 减少无效重渲染，降低管线重建开销
2. **P2 — 补全复制按钮 a11y** — 在 `markdown-viewer.css` 中为 `.copied` 添加键盘聚焦样式
3. **P2 — 单代码块长度限制** — 考虑在封装层对超长代码块跳过复制按钮注入
4. **长期 — 关注库维护状况** — 如果库维护进一步停滞，考虑迁移到 `react-markdown` 直接使用 + 自行组装轻量插件

---

## 八、问题清单汇总

| 编号 | 级别 | 类别 | 描述 | 裁定 |
|------|------|------|------|------|
| C-01 | P0 | 安全 | data-code 属性未编码，HTML 序列化路径 XSS | ✅ DOMPurify 已缓解 |
| C-02 | P0 | 安全 | 属性展开保留上游不受信属性 | ✅ nohighlight 无 rehypeRaw 已缓解 |
| C-03 | P1 | 性能 | 每次渲染创建新闭包，管线重建 | 🟡 建议 React.memo |
| C-04 | P1 | 安全 | 代码块无长度限制，DOM 膨胀 DoS | 🟡 1MB 总截断部分缓解 |
| C-05 | P1 | 架构 | 与 rehype-autolink-headings 隐式契约耦合 | 🟡 版本锁定缓解 |
| C-06 | P2 | 架构 | defaultRehypePlugins 无配置能力（OCP 违反） | 🟡 项目未使用自定义配置 |
| C-07 | P2 | UI | 复制按钮为 div 非 button，无 a11y | 🟡 第三方库限制，CSS 层补充 |
| C-08 | P2 | UI | GitHub Octicon 与 Carbon Design System 冲突 | ✅ markdown-viewer.css 已覆盖 |
| C-09 | P2 | 代码 | 正则匹配不精确，可能误判 | 🟢 nohighlight 不产生非标准标签 |
| C-10 | P2 | 代码 | null/undefined 类型签名不匹配 | 🟢 运行时行为正确 |
| C-11 | P3 | API | disableCopy 否定式命名 | 🟡 沿用 rehype 生态惯例 |
| C-12 | P3 | 供应链 | 库维护活跃度下降 | 🟡 关注但暂不行动 |
| C-13 | P3 | 代码 | 魔法字符串散布（'anchor'、'pre'、'element'） | 🟢 不影响可读性 |

---

## 九、评审签名

| 项目 | 内容 |
|------|------|
| 评审人 | Committer 审核专家（Claude） |
| 评审模型 | GLM-5.1 |
| 评审标准 | 依赖准入 · 安全合规 · API 契约 · 生产就绪度 · 项目规范兼容性 · 封装层覆盖度 |
| 综合评分 | 5.5/10 |
| 最终裁决 | ⚠️ 有条件通过（CONDITIONAL APPROVE） |
| 前置条件 | COND-1: DOMPurify 保持有效 · COND-2: CSS 覆盖回归测试 · COND-3: 版本锁定 · COND-4: 使用 nohighlight 入口 |
| 核心建议 | 维持 nohighlight 入口 + DOMPurify 防护 + 补充 React.memo 和 a11y |
