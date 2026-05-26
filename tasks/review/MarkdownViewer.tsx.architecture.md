# MarkdownViewer.tsx — 软件架构专家评审

**文件**: `pages/components/MarkdownViewer.tsx` (389行)
**评审日期**: 2026-05-26
**评审类型**: 软件架构评审（Architecture Review）
**评审基线**: React 18 + antd 5.x + DOMPurify + @uiw/react-markdown-preview + Carbon Design System

---

## 综合评分：8.0/10 — APPROVE

0 项 CRITICAL，3 项 HIGH，4 项 MEDIUM，3 项 LOW。六层纵深安全架构设计优秀，组件组合模式（memo + forwardRef + ErrorBoundary）规范，API 接口设计完备。存在 3 项 HIGH 级别架构问题：安全策略未抽取为独立模块导致跨组件依赖倒置、`rehypeRewrite` 安全/无障碍双重职责耦合、ErrorBoundary 缺少错误日志捕获。

---

## 一、评审维度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 模块职责分离 (SRP) | 7.5/10 | 封装层模式合理，但安全策略+颜色模式+无障碍混在一个文件中 |
| 安全架构设计 | 9.0/10 | 六层纵深防御完备，策略文档化优秀 |
| 类型系统设计 | 7.0/10 | `rehypeRewrite` 三参数全 `any`，其余类型完备 |
| 组件组合模式 | 8.5/10 | memo + forwardRef + ErrorBoundary 三层组合正确 |
| Hook 设计与依赖管理 | 8.5/10 | deps 全部正确，引用稳定性处理规范 |
| API 接口设计 | 9.0/10 | Props 接口清晰，Ref API 最小化，导出设计合理 |
| 关注点分离 | 6.5/10 | 安全常量/颜色检测/无障碍逻辑未模块化 |
| 依赖管理 | 8.0/10 | 最小化外部依赖，安全策略被 MarkdownEditor 复用 |
| 可扩展性 | 7.0/10 | 颜色模式和 ARIA 可配置，安全策略硬编码 |
| 可测试架构 | 8.5/10 | 纯函数导出可独立测试，测试比 2.7:1 |

---

## 二、HIGH 级别问题

### H-01 — 安全策略未抽取为独立模块，跨组件依赖倒置

**位置**: L32-100（7 个顶层安全常量/函数）、`pages/components/MarkdownEditor.tsx:32`

MarkdownEditor.tsx 从 MarkdownViewer 导入安全策略：

```typescript
// MarkdownEditor.tsx:32
import { safeUrlTransform, SAFE_TAGS, SAFE_INPUT_TYPES } from './MarkdownViewer';
```

这造成两个架构问题：

1. **依赖方向错误**：MarkdownEditor 依赖 MarkdownViewer 的内部实现细节，而非共享的安全策略模块。如果 MarkdownViewer 被重构或拆分，MarkdownEditor 的安全策略会断裂
2. **安全策略分散风险**：7 个安全相关声明（`ALLOWED_URL_PROTOCOLS`、`ALLOWED_URL_PARSED_PROTOCOLS`、`SAFE_INPUT_TYPES`、`EVENT_ATTRS`、`DANGEROUS_ATTRS`、`FORBID_TAGS_ARR`、`SAFE_TAGS`）和 4 个正则/集合（`DANGEROUS_URL_RE`、`DANGEROUS_ATTR_RE`、`URL_PROPERTIES`、`DANGEROUS_ATTRS`）共 11 个安全常量与组件渲染逻辑混在同一文件。安全策略变更需要修改渲染组件文件

**推荐架构**：

```
pages/components/
  markdown-security.ts    ← 安全策略模块（常量+工具函数）
  MarkdownViewer.tsx      ← 导入安全策略
  MarkdownEditor.tsx      ← 导入安全策略（不再依赖 Viewer）
```

**影响**：当前不影响功能，但安全策略无法独立演进和审查，且 MarkdownEditor 与 MarkdownViewer 之间产生了不必要的耦合。

---

### H-02 — `rehypeRewrite` 安全清理与无障碍注入双重职责耦合

**位置**: L256-301

`rehypeRewrite` 回调同时处理两个正交关注点：

| 行号 | 职责 | 具体操作 |
|------|------|---------|
| L261-273 | 安全 | 清理 `on*` 事件属性 + 危险 URL 协议属性 |
| L276-286 | 无障碍 | 复制按钮 ARIA 属性注入 + 超长代码块跳过 |
| L289-291 | 无障碍 | 标题锚点链接 `aria-label` 注入 |
| L295-298 | 无障碍 | 代码块 `role="region"` + `aria-label` 注入 |

两个关注点变化原因不同：
- **安全层**变更：第三方库漏洞修复、新增攻击向量
- **无障碍层**变更：WCAG 标准升级、设计系统调整、i18n 文案变更

任何一方变更都需修改同一个回调函数，违反 SRP 且增加回归风险。

**推荐架构**：

```typescript
// 分离为两个独立的 rehype 回调
const securityRewrite = useCallback(/* ... */, []);   // 安全属性清理
const accessibilityRewrite = useCallback(/* ... */, []); // ARIA 注入

// 在 MarkdownPreview 层组合
// 或在 rehype 插件链中顺序执行
```

**注**：`@uiw/react-markdown-preview` 只接受单个 `rehypeRewrite` prop，实际实现需通过组合函数或 rehype 插件链解决。

---

### H-03 — ErrorBoundary 缺少错误捕获日志，静默吞没异常

**位置**: L125-141

```typescript
export class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }
  // ← 缺少 componentDidCatch(error, info)
}
```

`getDerivedStateFromError` 只更新状态，不捕获 error 对象。异常被静默吞没：
- 无法在生产环境追踪 Markdown 渲染失败的原因
- 无法区分是 DOMPurify 消毒失败、MarkdownPreview 内部异常还是其他错误
- 用户只看到通用的 Empty 组件，运维无法定位问题

**修复**：

```typescript
componentDidCatch(error: Error, info: React.ErrorInfo) {
  console.error('[MarkdownViewer] 渲染异常:', error, info.componentStack);
}
```

---

## 三、MEDIUM 级别问题

### M-01 — `useSystemColorMode` 内联定义，无法复用和独立测试

**位置**: L35-49

自定义 Hook `useSystemColorMode` 定义在组件文件内，无法被其他需要系统颜色模式检测的组件复用。且作为组件内函数，无法独立进行单元测试。

**建议**：提取到 `pages/hooks/useSystemColorMode.ts`。

---

### M-02 — 亮度计算逻辑嵌入组件，应抽取为工具函数

**位置**: L206-212

```typescript
const hex = bg.replace('#', '');
const r = parseInt(hex.substring(0, 2), 16);
const g = parseInt(hex.substring(2, 4), 16);
const b = parseInt(hex.substring(4, 6), 16);
const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
```

这段亮度计算是一个通用的颜色工具函数，嵌入在 `resolvedColorMode` 的 `useMemo` 中：
- 无法被其他组件复用（如需要类似检测的自定义组件）
- 无法独立测试
- 不支持 RGB/RGBA 等其他颜色格式输入

**建议**：提取到 `pages/utils/color.ts` 的 `getLuminance(color: string): number` 函数。

---

### M-03 — `safeUrlTransform` URL 解析失败时安全放行策略过于宽松

**位置**: L107-114

```typescript
try {
  const parsed = new URL(trimmed, 'https://placeholder.com');
  if (ALLOWED_URL_PARSED_PROTOCOLS.has(parsed.protocol)) return url;
} catch {
  return url;  // ← 解析失败时返回原始 URL
}
```

`catch` 分支对所有解析失败的 URL 放行。虽然上层有 DOMPurify + `allowElement` 作为纵深防御，但作为安全链的第一层，应更严格：
- 某些畸形 URL（如包含空字节的 `javascript\0:...`）可能导致下游解析器行为不一致
- 相对路径已在 L105 快速路径处理（`/`、`#`、`./`、`../`），catch 中的放行理由不充分

**建议**：catch 分支改为 `return ''` 或记录 warning 日志。需要评估是否影响合法的非常规格式相对路径。

---

### M-04 — 组件导出策略不一致

**位置**: L383-389

```typescript
MarkdownViewerBase.displayName = 'MarkdownViewer';
const MarkdownViewer = memo(MarkdownViewerBase);
MarkdownViewer.displayName = 'MarkdownViewer';
export default MarkdownViewer;
```

`MarkdownViewerBase`（forwardRef 组件）和 `MarkdownViewer`（memo 包装）都设置了 `displayName = 'MarkdownViewer'`，React DevTools 中无法区分是否经过 memo 包装。此外，`MarkdownViewerBase` 未导出但设置了 `displayName`，调试时可能产生混淆。

**建议**：`MarkdownViewerBase.displayName = 'MarkdownViewerBase'`，保持 memo 包装后的 `MarkdownViewer.displayName = 'MarkdownViewer'`。

---

## 四、LOW 级别问题

### L-01 — React 命名空间导入未使用

**位置**: L25

```typescript
import React, { useMemo, useCallback, useState, useEffect, Component, forwardRef, useRef, useImperativeHandle, memo } from 'react';
```

`React` 命名空间导入在新 JSX 转换下不再需要。项目使用 Vite + React 18，默认启用新 JSX 转换。移除可减少未使用导入。

---

### L-02 — `safeUrlTransform` 返回类型显式标注冗余

**位置**: L102

```typescript
export const safeUrlTransform: (url: string) => string = (url) => {
```

TypeScript 可从函数体自动推断返回类型 `string`。显式标注 `(url: string) => string` 增加了维护负担但提供了文档价值——可保留，标记为 LOW。

---

### L-03 — loading 状态使用内联样式

**位置**: L341-345

```typescript
<div style={{ textAlign: 'center', padding: 48 }}>
  <Spin />
</div>
```

其余 UI 状态使用 antd 组件（`Typography.Text`、`Empty`），唯独 loading 使用内联样式。与 DESIGN.md 的 CSS 变量体系和项目样式规范不一致。

**建议**：使用 antd `<Space>` + `<Spin>` 或提取 CSS class。

---

## 五、架构亮点

### A-01 — 六层纵深安全架构设计优秀

安全防御链层次清晰，每层有明确的职责边界：

| 层次 | 机制 | 防御目标 |
|------|------|---------|
| L1 | `safeUrlTransform` | URL 协议白名单过滤 |
| L2 | `allowElement` | 标签白名单 + URL 属性危险协议检查 |
| L3 | DOMPurify | 标签/属性黑名单消毒 |
| L4 | `rehypeRewrite` | rehype-attr 注入的属性清理 |
| L5 | `MAX_SOURCE_LENGTH` 截断 | DoS 防护 |
| L6 | `MarkdownErrorBoundary` | 渲染异常兜底 |

这种分层设计使得单层绕过不会导致系统沦陷，是安全关键组件的典范架构。

### A-02 — useCallback/useMemo 引用稳定性设计规范

`allowElement`、`rehypeRewrite` 使用 `useCallback([], [])` 空依赖，`safeSource` 只在 `content` 变化时重算，`wrapperElement` 只在 `resolvedColorMode` 变化时重建。避免了 MarkdownPreview 不必要的管线重建，性能架构正确。

### A-03 — 安全策略复用设计

`safeUrlTransform`、`SAFE_TAGS`、`SAFE_INPUT_TYPES` 被 MarkdownEditor 导入复用，确保项目内 Markdown 渲染使用统一的安全策略，避免策略漂移。（虽建议抽取模块，但复用意图正确。）

### A-04 — 组件组合模式正确

`memo(forwardRef(Component))` + `useImperativeHandle` + `ErrorBoundary` 三层组合是 React 推荐的高阶组件模式，渲染优先级处理正确（loading → error → empty → content）。

---

## 六、修复优先级

| 优先级 | 编号 | 预估工作量 | 风险 |
|--------|------|-----------|------|
| HIGH | H-01 安全策略模块抽取 | 1h | 低（纯重构，无行为变更） |
| HIGH | H-02 rehypeRewrite 职责分离 | 0.5h | 中（需验证 rehype 插件链兼容性） |
| HIGH | H-03 ErrorBoundary 添加 componentDidCatch | 5min | 无 |
| MEDIUM | M-01 useSystemColorMode 提取 | 15min | 低 |
| MEDIUM | M-02 亮度计算提取 | 15min | 低 |
| MEDIUM | M-03 safeUrlTransform 严格化 | 30min | 中（需回归测试合法相对路径） |
| MEDIUM | M-04 displayName 一致性 | 2min | 无 |

**建议修复顺序**: H-03 → H-01 → M-04 → M-01 → M-02 → H-02 → M-03

---

## 七、结论

MarkdownViewer.tsx 是一个设计良好的安全封装组件，六层纵深防御架构是项目安全关键组件的标杆实现。3 项 HIGH 问题均为可维护性和架构组织层面，不影响当前功能正确性和安全性。建议在下一个迭代中完成 H-01（安全策略模块抽取）和 H-03（ErrorBoundary 日志），修复后预期评分可达 8.8/10。
