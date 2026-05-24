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
