# fix. MarkdownViewer 封装组件（Props.tsx 评审修复）

> 状态：✅ 已完成

---

## 背景

基于 5 份专家评审报告（架构、质量、安全、UI、Committer），对第三方库 `@uiw/react-markdown-preview` 的 `Props.tsx` 进行综合评审。结论：Props.tsx 属于第三方依赖不可直接修改，必须创建项目级封装组件隔离安全风险。

### 评审评分汇总

| 评审 | 评分/评级 | 核心结论 |
|------|----------|---------|
| 架构评审 | 5.0/10 | Ref 接口违反 ISP/OCP，类型重复 |
| 质量评审 | 5.3/10 | 拼写错误固化、类型重复 |
| 安全评审 | ⚠️ MEDIUM | rehypeRewrite 可绕过安全过滤 |
| UI 评审 | 4.1/10 | 无 a11y、无 auto 主题 |
| Committer 审核 | ⚠️ 有条件通过 | 必须创建封装组件 |

## 功能说明

### MarkdownViewer 封装组件

- 路径：`pages/components/MarkdownViewer.tsx`
- 封装 `@uiw/react-markdown-preview`，隔离第三方库安全风险

### 实现的安全管控措施

| 措施 | 对应评审问题 | 说明 |
|------|-------------|------|
| source 长度截断 ≤ 1MB | SEC-MD-01 | 防止超长字符串 DoS |
| 禁止暴露 rehypeRewrite | SEC-MD-02 | 防止绕过安全过滤 |
| 禁止暴露 pluginsFilter | SEC-MD-03 | 防止移除安全插件 |
| 禁止暴露 warpperElement | SEC-MD-07 | 避免弃用属性 |
| 固定 data-color-mode='light' | UI-P1-01 | 统一主题 |
| 添加 role="region" + aria-label | UI-P1-02 | WCAG 可访问性合规 |
| 支持加载/错误/空状态 | UI-P2-04 | 使用 antd 组件 |
| CSS 变量引用 Carbon Token | UI-P2-01 | Carbon Design System 对齐 |

### CSS 覆盖方案

- 路径：`pages/styles/markdown-viewer.css`
- 使用 CSS 变量引用 Carbon Design Token
- 覆盖字体、颜色、间距、圆角等

## 供应链确认

- `react-markdown` 版本：10.1.0（≥ 9.0，默认启用 HTML 过滤）✅
- `@uiw/react-markdown-preview` 版本：5.2.0

## 业务规则

1. 加载状态优先于错误和内容显示
2. 错误状态优先于内容显示
3. 空内容显示可配置的空状态提示
4. 超过 1MB 的内容自动截断，不报错

## 验收标准

- [x] 创建 MarkdownViewer 封装组件
- [x] source 长度截断 ≤ 1MB
- [x] 不暴露 rehypeRewrite、pluginsFilter、warpperElement
- [x] 确认 react-markdown 版本 ≥ 9.0
- [x] 创建 markdown-viewer.css 对齐 Carbon Design System
- [x] 添加 a11y 属性（role + aria-label）
- [x] 编写单元测试（13 个场景全部通过）
- [x] ArticleDetail.tsx 已替换使用 MarkdownViewer
- [x] 前端构建通过

---

## 第二轮评审修复（index.tsx 评审，2026-05-24）

基于 5 份专家评审报告（质量 7.5/10、架构 5.4/10、安全 B-/7.8、UI 2.9/10、Committer 4.5/10），对 `@uiw/react-markdown-preview/src/index.tsx` 进行综合评审。结论同第一轮：第三方库不可直接修改，通过封装层隔离。

### 新增修复项

| 评审问题编号 | 优先级 | 修复措施 | 状态 |
|-------------|--------|---------|------|
| C-01 / A-09 / DIFF-01 | P0 | 导入路径从 `@uiw/react-markdown-preview` 切换为 `@uiw/react-markdown-preview/common`，减少 ~150KB gzip bundle | ✅ |
| SEC-1 (#1 HIGH) | P0 | 添加 `safeUrlTransform` 函数，过滤 `javascript:`、`data:`、`vbscript:` 等危险 URL 协议 | ✅ |
| SEC-2 (#2 HIGH) | P0 | DOMPurify 添加 `ALLOWED_URI_REGEXP` 限制允许的 URI 协议（深度防御） | ✅ |
| C-03 / PERF-1 | P1 | React.memo 包裹（第一轮已实施） | ✅ |
| CSS 覆盖 / C-09 | P1 | markdown-viewer.css Carbon DS 覆盖（第一轮已实施） | ✅ |

### 安全防护层级

| 层级 | 机制 | 防护目标 |
|------|------|---------|
| L1 | `safeUrlTransform` | 过滤 Markdown 链接中的 `javascript:`、`data:` 等 URL |
| L2 | DOMPurify `FORBID_TAGS` | 移除 script/iframe/form 等危险 HTML 标签 |
| L3 | DOMPurify `FORBID_ATTR` | 移除 onerror/onload/onclick 等事件属性 |
| L4 | DOMPurify `ALLOWED_URI_REGEXP` | HTML 层面限制 URI 协议白名单 |
| L5 | 内容长度截断 1MB | 防止超长字符串 DoS |

### 涉及文件

- `pages/components/MarkdownViewer.tsx` — 导入路径切换 + safeUrlTransform + ALLOWED_URI_REGEXP
- `tests/pages/components/MarkdownViewer.test.tsx` — 新增 9 个安全测试用例（25 个全部通过）

### 验收标准（第二轮）

- [x] 导入路径切换为 `@uiw/react-markdown-preview/common`
- [x] safeUrlTransform 过滤危险 URL 协议
- [x] DOMPurify ALLOWED_URI_REGEXP 深度防御
- [x] 新增 safeUrlTransform 单元测试（9 个场景）
- [x] 新增 urlTransform prop 传递验证测试
- [x] 前端构建通过

---

## 第三轮评审修复（Props.tsx UI 评审，2026-05-24）

基于 `tasks/review/Props.tsx.ui.md` UI 专家评审（综合评分 4.1/10），对 MarkdownViewer 封装组件进行第三轮加固修复。

### 新增修复项

| 评审问题编号 | 优先级 | 修复措施 | 状态 |
|-------------|--------|---------|------|
| UI-P1-02 | P1 | `ariaLabel` / `role` 可配置化（默认 `"Markdown 内容预览"` / `"region"`） | ✅ |
| UI-P2-04 | P2 | 空状态使用 antd `Empty` 组件（替代原生 div，符合 CLAUDE.md 铁律） | ✅ |
| UI-P2-05 | P2 | 添加事件处理 props：`onScroll`、`onClick`、`onKeyDown` | ✅ |
| UI-P3-03 | P3 | `forwardRef` + `useImperativeHandle` 暴露命令式 API：`scrollToTop()`、`scrollToAnchor()` | ✅ |
| UI-P3-04 | P3 | 添加 `onMouseEnter` / `onMouseLeave`（不冒泡，替代 `onMouseOver`） | ✅ |

### 导出接口变更

```typescript
// 新增 MarkdownViewerRef 类型
export interface MarkdownViewerRef {
  scrollToTop(): void;
  scrollToAnchor(anchor: string): void;
}

// MarkdownViewerProps 新增 props
ariaLabel?: string;           // 默认 "Markdown 内容预览"
role?: 'region' | 'document' | 'article';  // 默认 "region"
onScroll?: (e: UIEvent<HTMLDivElement>) => void;
onClick?: (e: MouseEvent<HTMLDivElement>) => void;
onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
```

### 涉及文件

- `pages/components/MarkdownViewer.tsx` — forwardRef + 新 props + Empty 组件
- `tests/pages/components/MarkdownViewer.test.tsx` — 新增 12 个 UI 评审修复测试（48 个全部通过）

### 验收标准（第三轮）

- [x] ariaLabel / role 可配置，有合理默认值
- [x] 空状态使用 antd Empty 组件
- [x] forwardRef + useImperativeHandle 命令式 API
- [x] 添加 onScroll / onClick / onKeyDown / onMouseEnter / onMouseLeave 事件
- [x] 新增 12 个测试用例（TDD 红灯-绿灯通过）
- [x] 全部 48 个 MarkdownViewer 测试通过
- [x] 前端构建通过

---

## 第四轮评审修复（react-markdown-preview index.tsx UI 评审，2026-05-24）

基于 `tasks/review/react-markdown-preview.index.tsx.ui.md` UI 专家评审（综合评分 2.9/10），对 MarkdownViewer 封装组件进行第四轮对照检查与修复。

### 评审问题对照状态

| 评审问题 | 优先级 | 修复措施 | 状态 |
|---------|--------|---------|------|
| UI-P1-01 rehypePrism 强制 GitHub 主题 | P1 | 使用 nohighlight 入口，避免 rehypePrism 主题冲突 | ✅ 已有 |
| UI-P1-02 rehypeRaw 始终启用 | P1 | DOMPurify 消毒 + SAFE_TAGS 标签白名单 + FORBID_ATTR | ✅ 已有 |
| UI-P1-03 rehypeAttrs 允许任意属性注入 | P1 | DOMPurify ALLOW_DATA_ATTR: false + FORBID_ATTR | ✅ 已有 |
| UI-P2-01 插件数组每次渲染重建 | P2 | 使用 nohighlight 入口 + React.memo | ✅ 已有 |
| UI-P2-02 用户插件插入位置固定 | P2 | 使用 nohighlight 入口，无硬编码插件管线 | ✅ 已有 |
| UI-P2-03 与 preview.tsx rehypeRaw 重复 | P2 | 使用 nohighlight 入口，无 rehypeRaw | ✅ 已有 |
| UI-P2-04 forwardRef 无 displayName | P2 | MarkdownViewerBase.displayName + MarkdownViewer.displayName | ✅ 已有 |
| UI-P2-05 ignoreMissing 静默吞错 | P2 | 使用 nohighlight 入口，无 rehypePrism | ✅ 已有 |
| UI-P2-06 export * 污染 API | P2 | 通过 wrapper 封装隔离，消费者只使用 MarkdownViewer | ✅ 已有 |
| UI-P3-01 rehypeRewriteHandle 闭包 | P3 | useCallback 包裹 rehypeRewrite | ✅ 已有 |
| UI-P3-03 meta 插件分散 | P3 | 使用 nohighlight 入口 | ✅ 已有 |
| UI-P3-04 无错误边界 | P3 | MarkdownErrorBoundary 组件 | ✅ 已有 |
| **S-1 代码块字体缺少 IBM Plex Mono** | **P1** | **安装 `@fontsource/ibm-plex-mono`，更新 CSS font-family** | **✅ 本次修复** |

### 本次修复内容

1. **安装 `@fontsource/ibm-plex-mono@5.2.7`** — Carbon Design System 代码块等宽字体
2. **`pages/main.tsx`** — 新增 `import '@fontsource/ibm-plex-mono/400.css'`
3. **`pages/styles/markdown-viewer.css`** — 代码块 font-family 从 `'IBM Plex Sans', monospace` 更新为 `'IBM Plex Mono', 'IBM Plex Sans', monospace`

### 涉及文件

- `package.json` — 新增 `@fontsource/ibm-plex-mono` 依赖
- `pages/main.tsx` — 新增 IBM Plex Mono 字体导入
- `pages/styles/markdown-viewer.css` — 代码块 font-family 更新
- `tasks/fix.MarkdownViewer评审修复.md` — 任务文档更新

### 验收标准（第四轮）

- [x] 安装 @fontsource/ibm-plex-mono
- [x] main.tsx 导入 IBM Plex Mono 400.css
- [x] markdown-viewer.css 代码块字体更新为 IBM Plex Mono
- [x] 全部 67 个 MarkdownViewer 测试通过
- [x] 前端构建通过
- [x] TypeScript 类型检查通过

---

## 第五轮评审修复（react-markdown-preview index.tsx 架构评审，2026-05-24）

基于 `tasks/review/react-markdown-preview.index.tsx.architecture.md` 架构专家评审（综合评分 5.4/10），对照检查 MarkdownViewer 封装组件的架构合规性。

### 架构评审问题对照

| 评审问题 | 优先级 | 修复措施 | 状态 |
|---------|--------|---------|------|
| A-01 每次渲染重建管线 | P1 🔴 | React.memo 包裹 + useCallback/useMemo 稳定引用 | ✅ |
| A-02 安全策略分裂 | P1 🔴 | DOMPurify + SAFE_TAGS + safeUrlTransform + FORBID_ATTR 纵深防御 | ✅ 已有 |
| A-03 OCP 管线不可定制 | P1 🔴 | 使用 nohighlight 入口，无硬编码插件管线 | ✅ 已有 |
| A-04 代码克隆 DRY 违反 | P1 🔴 | 使用 nohighlight 入口，规避 index.tsx/common.tsx 双入口问题 | ✅ 已有 |
| A-05 rehypeRewriteHandle 混合依赖 | P2 🟡 | 自定义 rehypeRewrite useCallback，与上游解耦 | ✅ 已有 |
| A-07 forwardRef 匿名函数 | P2 🟡 | MarkdownViewerBase.displayName + MarkdownViewer.displayName | ✅ 已有 |
| A-09 全量 prism bundle | P3 🟢 | 使用 nohighlight 入口，零语法高亮 bundle 开销 | ✅ 已有 |
| A-10 防御式编程不一致 | P3 🟢 | MarkdownViewer 统一使用 `??` nullish 合并 | ✅ 已有 |

### 本次新增修复

| 评审问题 | 修复内容 | 说明 |
|---------|---------|------|
| A-01 深层优化 | `allowElement` 提取为 `useCallback([], [])` | 内联箭头函数每次渲染创建新引用，即使逻辑完全稳定。稳定引用防止 MarkdownPreview 下游管线不必要重建 |
| A-01 深层优化 | `wrapperElement` 提取为 `useMemo([resolvedColorMode])` | 内联对象字面量每次渲染创建新引用。仅在 resolvedColorMode 变化时创建新对象 |

### 涉及文件

- `pages/components/MarkdownViewer.tsx` — allowElement useCallback + wrapperElement useMemo
- `tests/pages/components/MarkdownViewer.test.tsx` — 新增 7 个架构修复测试（74 个全部通过）

### 验收标准（第五轮）

- [x] allowElement 提取为 useCallback，引用稳定（跨渲染不变）
- [x] wrapperElement 提取为 useMemo，仅在 colorMode 变化时重建
- [x] allowElement 功能回归测试通过（标签白名单 + input checkbox 过滤）
- [x] wrapperElement 引用稳定性测试通过
- [x] rehypeRewrite/safeUrlTransform 引用稳定性测试通过
- [x] 全部 74 个 MarkdownViewer 测试通过
- [x] 前端构建通过

---

## 第六轮评审修复（react-markdown-preview index.tsx 安全评审，2026-05-25）

基于 `tasks/review/react-markdown-preview.index.tsx.security.md` 代码安全专家评审（综合评分 B-/7.8），对 MarkdownViewer 封装组件进行安全加固修复。

### 评审发现对照

| 发现编号 | 严重性 | 问题 | 封装层修复措施 | 状态 |
|----------|--------|------|---------------|------|
| #1 | HIGH | URL 安全过滤被默认禁用，`javascript:` XSS 向量开放 | 已有 `safeUrlTransform` 白名单协议过滤 | ✅ 已有缓解 |
| #2 | HIGH | rehypeRaw 无条件启用，任意 HTML 注入 | DOMPurify 增加 `FORBID_TAGS` 显式黑名单（17 个危险标签） | ✅ 本次修复 |
| #3 | MEDIUM | rehype-attr 允许任意 HTML 属性注入 | `rehypeRewrite` 增加危险属性清理（on* 事件处理器 + URL 危险协议） | ✅ 本次修复 |
| #4 | MEDIUM | allowElement 过滤器过于宽松 | `allowElement` 增加 URL 属性危险协议检查（href/src/action 等检测 javascript:/data:/vbscript:） | ✅ 本次修复 |
| #5 | MEDIUM | useImperativeHandle 泄露全部 props | 第三方内部问题，无法从封装层修复 | 需上游修复 |
| #6 | LOW | pluginsFilter 可移除安全插件 | 未传 `pluginsFilter`，无移除安全插件风险 | 风险可接受 |
| #7 | LOW | rehypePrism ignoreMissing 隐藏错误 | 使用 `nohighlight` 变体，不适用 | 不适用 |
| #8 | LOW | useCopied 事件处理器闭包未更新 | 第三方内部问题，无法从封装层修复 | 需上游修复 |

### 新增安全常量

```typescript
FORBID_TAGS_ARR   // 17 个危险标签黑名单（script/iframe/object/embed/applet/form/textarea/select/button/meta/base/link/style/svg/math/noscript/template）
DANGEROUS_URL_RE  // 危险 URL 协议正则 /^(javascript|data|vbscript):/i
DANGEROUS_ATTR_RE // 事件处理器属性正则 /^on/i
URL_PROPERTIES    // 可能包含 URL 的属性名集合（href/src/action/formaction/xlink:href/poster/background/dynsrc/lowsrc）
```

### 安全防护层级（更新后）

| 层级 | 机制 | 防护目标 |
|------|------|---------|
| L1 | `safeUrlTransform` | 过滤 Markdown 链接中的 `javascript:`、`data:` 等 URL |
| L2 | DOMPurify `FORBID_TAGS` | 移除 script/iframe/object/embed/applet/form 等 17 种危险 HTML 标签（#2 修复增强） |
| L3 | DOMPurify `FORBID_ATTR` | 移除 onerror/onload/onclick 等 22 种事件属性 |
| L4 | DOMPurify `ALLOWED_URI_REGEXP` | HTML 层面限制 URI 协议白名单 |
| L5 | `allowElement` 标签白名单 + URL 属性检查 | 白名单标签 + 检测 href/src 中的危险协议（#4 修复增强） |
| L6 | `rehypeRewrite` 属性清理 | 清理 rehype-attr 注入的 on* 事件属性和危险 URL（#3 修复） |
| L7 | 内容长度截断 1MB | 防止超长字符串 DoS |

### 涉及文件

- `pages/components/MarkdownViewer.tsx` — FORBID_TAGS + allowElement URL 检查 + rehypeRewrite 属性清理
- `tests/pages/components/MarkdownViewer.test.tsx` — 新增 35 个安全评审测试（109 个全部通过）
- `tasks/review/react-markdown-preview.index.tsx.security.md` — 更新修复状态记录

### 验收标准（第六轮）

- [x] DOMPurify 增加 FORBID_TAGS 配置（17 个危险标签）
- [x] allowElement 增加 URL 属性危险协议检查（javascript:/data:/vbscript:）
- [x] rehypeRewrite 增加危险属性清理（on* 事件处理器 + URL 危险协议）
- [x] 新增 4 个测试 describe 块（35 个测试用例）
- [x] 全部 109 个 MarkdownViewer 测试通过
- [x] 前端构建通过
- [x] ESLint 无错误
- [x] 安全评审文档更新修复状态

---

## 第七轮评审修复（common.tsx UI 评审，2026-05-25）

基于 `tasks/review/common.tsx.ui.md` UI 专家评审（综合评分 5.3/10），对 MarkdownViewer 封装组件进行第七轮 UI 对照检查与修复。

### 评审问题对照状态

| 评审问题 | 优先级 | 修复措施 | 状态 |
|---------|--------|---------|------|
| CSS-02 行内代码使用语义红色 `var(--color-error)` | P1 | 改为 `var(--color-blue-80)`（#002d9c），消除色彩语义误导 | ✅ 已有修复 |
| CSS-01 两套重复 Markdown 覆盖样式 | P1 | `global.css` 中 `.article-content-preview .wmde-markdown` 规则迁移至 `markdown-viewer.css` 统一维护 | ✅ 已有修复 |
| R-02 表格无响应式容器 | P2 | `.wmde-markdown table` 添加 `display: block; overflow-x: auto` | ✅ 已有修复 |
| A-01 Copy 按钮 ARIA 缺失 | P1 | `rehypeRewrite` 为复制按钮注入 `aria-label`/`role`/`tabindex` | ✅ 已有修复 |
| A-02 动态内容无焦点管理 | P2 | **新增** `useEffect` + `prevContentRef` 内容切换后 focus 容器 | ✅ 本次修复 |
| A-03 行内代码使用语义红色 | P2 | 与 CSS-02 合并，已改为 `var(--color-blue-80)` | ✅ 已有修复 |
| R-01 代码块无滚动提示 | P3 | **新增** 移动端 CSS 渐变遮罩，提示可横向滚动 | ✅ 本次修复 |
| P3 letter-spacing 补全 | P3 | `markdown-viewer.css` 已有 `letter-spacing: 0.16px` | ✅ 已有 |
| P3 aria-live 动态内容通知 | P3 | **新增** 容器 `aria-live="polite"` 支持屏幕阅读器 | ✅ 本次修复 |

### 本次新增修复

| 修复项 | 文件 | 说明 |
|--------|------|------|
| A-02 焦点管理 | `MarkdownViewer.tsx` | `prevContentRef` + `useEffect`，内容变化时 `focus({ preventScroll: true })`，键盘用户无需从页顶重新 Tab |
| P3 aria-live | `MarkdownViewer.tsx` | 容器 div 添加 `aria-live="polite"`，屏幕阅读器自动播报内容更新 |
| R-01 滚动提示 | `markdown-viewer.css` | 移动端（≤672px）代码块添加 `background-image: linear-gradient` 右侧渐变遮罩，视觉提示可横向滚动 |

### 涉及文件

- `pages/components/MarkdownViewer.tsx` — aria-live + 焦点管理
- `pages/styles/markdown-viewer.css` — 移动端代码块渐变遮罩
- `tests/pages/components/MarkdownViewer.test.tsx` — 新增 7 个 UI 评审测试（116 个全部通过）

### 验收标准（第七轮）

- [x] 容器添加 `aria-live="polite"`
- [x] 内容切换时自动 focus 到容器（preventScroll）
- [x] 初始渲染不触发 focus
- [x] 移动端代码块渐变遮罩
- [x] 新增 7 个测试用例
- [x] 全部 116 个 MarkdownViewer 测试通过
- [x] 前端构建通过
- [x] ESLint 无错误

---

## 第八轮评审修复（rehypePlugins.tsx UI 评审，2026-05-25）

基于 `tasks/review/rehypePlugins.tsx.ui.md` UI 专家评审（综合评分 2.5/10），对 `@uiw/react-markdown-preview/src/rehypePlugins.tsx` 进行 UI 对照检查与修复。结论：第三方库不可直接修改，通过封装层 CSS 覆盖 + rehypeRewrite 注入修复。

### 评审问题对照状态

| 评审问题 | 优先级 | 修复措施 | 状态 |
|---------|--------|---------|------|
| UI-P1-01 标题锚点图标使用 GitHub Octicon | P1 | CSS 隐藏 `.octicon-link`，用 Carbon Link SVG data URI 替代 | ✅ 本次修复 |
| UI-P1-02 复制按钮使用原生 div 而非 antd Button | P1 | 第三方库不可修改，通过封装层 ARIA 注入弥补 | ✅ 已有缓解 |
| UI-P1-03 复制按钮无可访问性支持 | P1 | rehypeRewrite 注入 `role`/`tabindex`/`aria-label`/`aria-live` | ✅ 本次增强 |
| UI-P1-04 复制按钮图标使用 GitHub Octicon | P1 | CSS 隐藏 `.octicon-copy`/`.octicon-check`，用 Carbon Copy/Checkmark SVG data URI 替代 | ✅ 本次修复 |
| UI-P2-01 复制按钮无交互状态定义 | P2 | CSS 完善 default/hover/active/pressed 状态 | ✅ 本次修复 |
| UI-P2-04 标题锚点始终可见 | P2 | CSS `opacity:0` + hover 显示 + transition | ✅ 已有修复 |
| UI-P3-01 反馈文案硬编码无 i18n | P3 | 抽取为 CSS 变量 `--copy-text-copied`/`--copy-text-failed` | ✅ 本次修复 |
| UI-P3-02 复制按钮定位溢出风险 | P3 | 第三方库结构限制，CSS 已覆盖定位 | ✅ 已有缓解 |
| UI-P3-03 data-code DOM 膨胀 | P3 | rehypeRewrite 超过 100KB 删除 data-code | ✅ 已有修复 |

### 本次修复内容

| 修复项 | 文件 | 说明 |
|--------|------|------|
| UI-P1-01 Carbon 锚点图标 | `markdown-viewer.css` | CSS 隐藏 `.octicon-link`，`::after` 伪元素注入 Carbon Link SVG data URI |
| UI-P1-04 Carbon 复制图标 | `markdown-viewer.css` | CSS 隐藏 `.octicon-copy`/`.octicon-check`，`::before` 伪元素注入 Carbon Copy/Checkmark SVG |
| UI-P1-03 aria-live | `MarkdownViewer.tsx` | 复制按钮注入 `aria-live="polite"`，屏幕阅读器播报复制状态 |
| UI-P2-01 交互状态完善 | `markdown-viewer.css` | `.copied` 添加默认背景色/边框、`:active` 按下状态、active/failed 边框色 |
| UI-P3-01 CSS 变量 i18n | `markdown-viewer.css` | `--copy-text-copied`/`--copy-text-failed` CSS 变量，支持多语言覆盖 |

### 涉及文件

- `pages/styles/markdown-viewer.css` — Carbon 图标替代 + 交互状态 + CSS 变量
- `pages/components/MarkdownViewer.tsx` — aria-live 注入
- `tests/pages/components/MarkdownViewer.test.tsx` — 更新 aria-live 测试断言（116 个全部通过）

### 验收标准（第八轮）

- [x] GitHub Octicon 锚点图标隐藏，Carbon Link 图标替代
- [x] GitHub Octicon 复制/成功图标隐藏，Carbon Copy/Checkmark 图标替代
- [x] 复制按钮注入 aria-live="polite"
- [x] 复制按钮默认/active/pressed 状态 CSS 完善
- [x] 反馈文案抽取为 CSS 变量支持 i18n
- [x] 全部 116 个 MarkdownViewer 测试通过
- [x] 前端构建通过
- [x] ESLint 无错误

---

## 第九轮评审修复（preview.tsx Committer 审核，2026-05-26）

基于 `tasks/review/preview.tsx.committer.md` Committer 审核专家评审（综合判定：⚠️ 有条件通过 CONDITIONAL APPROVE），验证所有前置条件已实现并补充测试覆盖。

### 前置条件验证

| # | 前置条件 | 状态 |
|---|----------|------|
| 1 | 传入安全 `urlTransform` | ✅ safeUrlTransform 白名单协议过滤 |
| 2 | 传入自定义 `allowElement` | ✅ SAFE_TAGS 显式标签白名单 |
| 3 | DOMPurify 消毒不可移除 | ✅ "安全关键"注释标注 |
| 4 | 文档化 preview.tsx 安全风险 | ✅ 文件头部完整安全缺陷 + 防护措施注释 |
| 5 | React.memo 包裹 | ✅ memo(MarkdownViewerBase) |
| 6 | nohighlight 入口 | ✅ @uiw/react-markdown-preview/nohighlight |
| 7 | 版本锁定 | ✅ ~5.2.1 |

### 新增测试用例（6 个）

- `removes style attribute from any element` — #3 修复 rehypeRewrite style 属性清理
- `scrollToAnchor calls scrollIntoView on matching element` — scrollToAnchor 命令式 API
- `triggers click on Enter/Space key when target is inside .copied element` — 键盘无障碍
- `returns empty string for unparseable URL` — safeUrlTransform catch 分支
- `handles empty and null-like inputs` — safeUrlTransform 空值防御

### 涉及文件

- `tests/pages/components/MarkdownViewer.test.tsx` — 新增 6 个测试（122 个全部通过）

### 验收标准（第九轮）

- [x] preview.tsx Committer 审核 4 项 Blocking 全部已实现
- [x] preview.tsx Committer 审核 4 项 Non-blocking 全部已实现
- [x] pnpm patch 已应用（`patches/@uiw__react-markdown-preview@5.2.1.patch`）
- [x] 新增 6 个测试用例覆盖未覆盖行
- [x] 全部 122 个 MarkdownViewer 测试通过
- [x] 覆盖率 97.27% Stmts / 93.5% Branch / 95.83% Funcs / 100% Lines
- [x] 前端构建通过
- [x] ESLint 无错误
