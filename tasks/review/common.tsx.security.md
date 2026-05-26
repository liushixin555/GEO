# @uiw/react-markdown-preview/src/common.tsx — 代码安全专家评审报告

**评审日期**: 2026-05-26
**评审角色**: 代码安全专家（XSS 防御 + HTML 注入 + 插件管线安全 + DoS 防护 + 纵深防御）
**文件路径**: `node_modules/.pnpm_patches/@uiw/react-markdown-preview@5.2.1/src/common.tsx`
**代码行数**: 53 行（1 个导出组件）
**关联文件**: `preview.tsx` + `rehypePlugins.tsx` + `Props.tsx` + `pages/components/MarkdownViewer.tsx`
**前置评审**: 架构评审 A-01~A-08（已修复）、质量评审 Q-01~Q-08（已修复）

---

## 一、评审范围

`common.tsx` 是 `@uiw/react-markdown-preview`（带语法高亮版本）的入口组件，组装 10 步 rehype 插件管线并传递给 `MarkdownPreview`（preview.tsx）：

| 管线步骤 | 插件 | 功能 |
|----------|------|------|
| 1 | `pipeline.prepend` | 用户自定义前缀插件 |
| 2 | `reservedMeta` | 保留代码块元数据 |
| 3 | `rehypeRaw` | HTML 解析（**安全关注点**） |
| 4 | `retrieveMeta` | 恢复代码块元数据 |
| 5 | `defaultRehypePlugins` | slug + headings + ignore |
| 6 | `rehypeRewrite` | AST 重写（锚点 + 复制按钮） |
| 7 | `rehypeAttrs` | 属性转换（**安全关注点**） |
| 8 | `props.rehypePlugins` | 用户自定义插件 |
| 9 | `rehypePrism` | 语法高亮 |
| 10 | `pipeline.append` | 用户自定义后缀插件 |

---

## 二、安全问题清单

### HIGH 级别

#### H-1: rehypeRaw 无条件包含 — skipHtml=true 时仍解析 HTML

**位置**: `common.tsx:39`

**问题描述**: `rehypeRaw`（rehype-raw）始终被包含在插件管线中，无论 `skipHtml` prop 值如何。preview.tsx 中 `skipHtml` 默认为 `true`（不渲染 HTML），但 common.tsx 在管线步骤 3 无条件添加了 `rehypeRaw`，导致 HTML 始终被解析到 AST 中。

```typescript
// 当前代码 — rehypeRaw 无条件包含
const rehypePlugins: PluggableList = useMemo(() => [
  ...(props.pipeline?.prepend ?? []),
  reservedMeta,
  rehypeRaw,  // ← 始终包含，即使 skipHtml=true
  retrieveMeta,
  ...
], [...]);
```

**影响**:
1. 违反最小权限原则 — 即使消费者明确要求不渲染 HTML，HTML 仍被解析
2. 增加攻击面 — rehypeRaw 解析恶意 HTML 到 AST，后续插件可能不安全地处理
3. 与 preview.tsx 的 skipHtml 语义矛盾

**修复建议**: 根据 `props.skipHtml` 条件化 `rehypeRaw`，仅在 `skipHtml === false` 时包含。

---

#### H-2: 双重 rehype-raw 执行 — skipHtml=false 时管线和 preview.tsx 各添加一次

**位置**: `common.tsx:39` + `preview.tsx:61-63`

**问题描述**: 当 `skipHtml=false` 时，common.tsx 在管线步骤 3 添加 `rehypeRaw`，preview.tsx 又在 rehypePlugins 末尾 push `raw`，导致 rehype-raw 对同一 AST 执行两次。

```typescript
// preview.tsx — skipHtml=false 时也添加 raw
if (!skipHtml) {
  rehypePlugins.push(raw);  // ← 与 common.tsx 的 rehypeRaw 重复
}
```

**影响**:
1. 双重 HTML 解析可能导致 AST 结构异常，绕过安全过滤
2. 性能损耗 — 对每个 HTML 节点执行两次解析
3. Q-04 已识别但仅修复了 nohighlight 入口，common.tsx 仍有此问题

**修复建议**: preview.tsx 添加去重检查，若 rehypePlugins 已包含 rehype-raw 则不重复添加。

---

### MEDIUM 级别

#### M-1: props.rehypePlugins 允许注入任意 AST 处理器

**位置**: `common.tsx:44`

**问题描述**: 用户通过 `props.rehypePlugins` 传入的插件在步骤 8 被注入管线，位于 rehypeRewrite（安全过滤）之后、rehypePrism 之前。这些插件可修改 AST 中已被安全过滤的节点，重新注入危险内容。

```typescript
...(props.rehypePlugins ?? []),  // ← 用户插件可修改已过滤 AST
```

**影响**: 恶意或错误的用户插件可在安全过滤后重新注入 XSS payload。

**修复建议**: 文档层面已在 Props.tsx SEC-MD-04 中标注风险。代码层面，MarkdownViewer 未传入自定义 rehypePlugins（安全）。此为 ACCEPTED RISK。

---

#### M-2: pipeline.prepend 在安全插件之前执行

**位置**: `common.tsx:37`

**问题描述**: `pipeline.prepend` 插件在步骤 1 执行，先于 reservedMeta（步骤 2）和 rehypeRaw（步骤 3），可以修改原始 AST 结构。

```typescript
...(props.pipeline?.prepend ?? []),  // ← 在所有安全处理之前执行
```

**影响**: prepend 插件可注入节点绕过后续安全过滤。

**修复建议**: 文档层面已标注。MarkdownViewer 未使用 pipeline（安全）。此为 ACCEPTED RISK。

---

### LOW 级别

#### L-1: rehypeAttrs 可通过代码块元数据注入属性

**位置**: `common.tsx:43`

**问题描述**: `[rehypeAttrs, { properties: 'attr' }]` 将代码块元数据中的 attr 字段转换为 HTML 属性。恶意元数据可注入 `onclick`、`onerror` 等事件处理器属性。

```typescript
[rehypeAttrs, { properties: 'attr' }],  // ← 元数据 → HTML 属性，无过滤
```

**影响**: 若 MarkdownViewer 的 DOMPurify 纵深防御失效，此为攻击向量。

**修复建议**: MarkdownViewer 的 DOMPurify 配置已 `FORBID_ATTR` 所有 `on*` 事件属性（S4 修复），形成纵深防御。此为 ACCEPTED RISK。

---

#### L-2: useMemo 依赖数组缺少 props.skipHtml

**位置**: `common.tsx:47`

**问题描述**: 当 `props.skipHtml` 变化时，useMemo 不会重新计算 rehypePlugins 数组，因为 `props.skipHtml` 不在依赖数组中。

**影响**: 动态切换 skipHtml 时，管线不会更新，可能导致 HTML 解析与用户预期不一致。

**修复建议**: 在 useMemo 依赖数组中添加 `props.skipHtml`。

---

## 三、已有安全措施（正面评价）

| 安全机制 | 实现质量 | 说明 |
|----------|---------|------|
| MarkdownViewer DOMPurify | 优秀 | 三层纵深防御（safeUrlTransform + allowElement + DOMPurify） |
| rehypeRewrite try-catch | 良好 | 用户 rewrite 回调有错误边界保护 |
| SAFE_TAGS 白名单 | 良好 | preview.tsx 显式标签白名单 |
| safeUrlTransform | 良好 | 协议白名单过滤 |
| rehypeRewrite 属性白名单 | 良好 | SEC-02 锚点属性白名单 |
| MAX_CODE_LENGTH 限制 | 良好 | SEC-03 代码块长度限制防 DOM 膨胀 DoS |
| useMemo 稳定性 | 良好 | Q-01/Q-05 插件数组/闭包稳定化 |
| PipelineConfig OCP | 良好 | A-03 prepend/append 扩展点 |

---

## 四、安全度量

| 安全维度 | 评分 | 说明 |
|----------|------|------|
| XSS 防御 | 7/10 | rehypeRaw 无条件包含降低安全性 |
| 插件安全 | 7/10 | 管线允许注入，但 MarkdownViewer 不使用 |
| DoS 防护 | 8/10 | 内容长度由 MarkdownViewer 限制 |
| 纵深防御 | 9/10 | MarkdownViewer 多层防御覆盖 |
| 代码质量 | 9/10 | 架构+质量评审已修复 |
| 最小权限 | 6/10 | rehypeRaw 违反最小权限原则 |

**综合安全评分: 7.0/10**

---

## 五、修复优先级

### 立即修复（P0）

| 问题 | 修复文件 | 工作量 |
|------|---------|--------|
| H-1: rehypeRaw 条件化 | `common.tsx` | 小 |
| H-2: preview.tsx 去重检查 | `preview.tsx` | 小 |

### 改进（P1）

| 问题 | 修复文件 | 工作量 |
|------|---------|--------|
| L-2: useMemo 添加 skipHtml 依赖 | `common.tsx` | 小 |

### 接受风险（ACCEPTED）

| 问题 | 原因 |
|------|------|
| M-1: rehypePlugins 注入 | MarkdownViewer 不传入自定义插件 |
| M-2: pipeline.prepend 前置 | MarkdownViewer 不使用 pipeline |
| L-1: rehypeAttrs 属性注入 | DOMPurify FORBID_ATTR 纵深防御 |

---

## 六、评审结论

**判定: CONDITIONAL APPROVE — 2 个 HIGH 级别问题需修复**

common.tsx 经过架构和质量评审后代码质量已显著提升。核心安全问题在于 `rehypeRaw` 无条件包含（H-1）和与 preview.tsx 的双重执行（H-2）。修复工作量极小（条件化 + 去重），预估 30 分钟。MarkdownViewer 的纵深防御已覆盖这些风险的实际利用路径。

---

*代码安全专家评审完成 — 2026-05-26*

---

## 七、修复确认（2026-05-26）

| 问题 | 状态 | 修复说明 |
|------|------|---------|
| H-1: rehypeRaw 无条件包含 | **已修复** | `props.skipHtml === false ? [rehypeRaw] : []`，仅在显式启用 HTML 时包含 |
| H-2: 双重 rehype-raw 执行 | **已修复** | preview.tsx 添加 `hasRaw` 去重检查，检测到已包含 raw 则跳过 |
| L-2: useMemo 缺少 skipHtml 依赖 | **已修复** | 依赖数组添加 `props.skipHtml` |
| M-1: rehypePlugins 注入 | ACCEPTED | MarkdownViewer 不传入自定义插件 |
| M-2: pipeline.prepend 前置 | ACCEPTED | MarkdownViewer 不使用 pipeline |
| L-1: rehypeAttrs 属性注入 | ACCEPTED | DOMPurify FORBID_ATTR 纵深防御 |

**修改文件**: `patches/@uiw+react-markdown-preview+5.2.1.patch`（重新生成，含 src/esm/lib 共 12 文件）

**综合安全评分: 7.0/10 → 9.0/10（APPROVE）**
- MarkdownViewer 测试: 122/122 ✅
- rehypePlugins 测试: 23/23 ✅
- build: ✅
- lint: ✅

*修复验证完成 — 2026-05-26*
