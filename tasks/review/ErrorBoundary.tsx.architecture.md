# ErrorBoundary.tsx — 软件架构专家评审

| 维度 | 评分 | 等级 |
|------|------|------|
| 组件拓扑定位与层叠策略 | 4.0/10 | CRITICAL |
| 状态模型设计 | 3.5/10 | CRITICAL |
| 恢复策略与降级设计 | 2.5/10 | CRITICAL |
| 关注点分离 | 4.0/10 | HIGH |
| 可扩展性与复用能力 | 3.0/10 | CRITICAL |
| 与项目架构一致性 | 3.5/10 | HIGH |
| **综合** | **3.4/10** | **REQUEST CHANGES** |

**结论：REQUEST CHANGES** — 存在 3 项 CRITICAL 级架构缺陷（状态模型丢失错误上下文、恢复策略仅限销毁会话、零复用能力导致 4 处重复实现），3 项 HIGH 级问题，2 项 MEDIUM 级问题。代码功能正确且符合 antd 规范，但架构设计缺乏对 Error Boundary 模式的完整理解，未利用 React 提供的错误信息做分层降级，是项目中唯一一个"错误即销毁"的边界组件。

---

## CRITICAL-1 — 状态模型丢弃错误上下文，render 无差异化能力

**位置**：L8-10（State 接口），L15-17（getDerivedStateFromError）

```typescript
interface ErrorBoundaryState {
  hasError: boolean;     // ← 仅一个布尔标志
}

static getDerivedStateFromError(): ErrorBoundaryState {  // ← error 参数未接收
  return { hasError: true };
}
```

**架构缺陷**：

1. **错误对象完全丢弃** — `getDerivedStateFromError` 签名支持 `(error: Error)` 参数但未使用，`componentDidCatch` 中接收的 `error` 和 `info` 仅用于 `console.error`，不写入 state。render 阶段无法获取任何错误上下文。
2. **单一布尔状态** — `hasError: boolean` 将所有类型的错误降级为二值判断。无法区分：
   - ChunkLoadError（网络问题 → 刷新可恢复）
   - TypeError（渲染代码 bug → 需要修复）
   - NetworkError（API 不可用 → 等待恢复）
3. **render 输出不可变** — 因为无错误上下文，render 只能输出固定的 `Result` 组件，无法根据错误类型展示差异化 UI。

**项目对比**：

| 实现 | State 包含 | 错误过滤 | render 差异化 |
|------|-----------|---------|-------------|
| **ErrorBoundary** | `hasError: boolean` | 无 | 无（固定 UI） |
| **ChunkErrorBoundary** | `hasError: boolean` | 精确匹配 ChunkLoadError | 无（但至少过滤了不相关的错误） |
| **MarkdownErrorBoundary** | `hasError: boolean` | 无 | 无 |
| **MarkdownEditorErrorBoundary** | `hasError: boolean` | 无 | 无 |

所有 4 个实现的 state 模型都过于简陋，但 ErrorBoundary 作为最外层全局边界，丢失错误上下文的影响最大——它决定了用户看到的信息和可执行的操作。

**修复建议**：

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

static getDerivedStateFromError(error: Error): ErrorBoundaryState {
  return { hasError: true, error, errorInfo: null };
}

componentDidCatch(error: Error, info: React.ErrorInfo) {
  this.setState({ errorInfo: info });
  console.error('[ErrorBoundary]', error, info.componentStack);
}
```

---

## CRITICAL-2 — 恢复策略仅限"销毁会话"，无渐进式降级路径

**位置**：L23-27（handleReset），L30-41（render）

```typescript
handleReset = () => {
  const keysToRemove = ['token', 'user', 'selected_company', 'selected_project', 'redirect_after_login'];
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  window.location.href = '/login';
};
```

**架构缺陷**：

1. **唯一的恢复操作是销毁整个用户会话** — 清除 5 个 localStorage key + 强制跳转 `/login`。对于临时性渲染错误（如瞬态数据异常），用户被迫重新登录、重新选择公司/项目。
2. **无"重试"能力** — React Error Boundary 支持通过 `setState({ hasError: false })` 重置状态、重新渲染子树。本组件未暴露此路径。
3. **无层级降级** — 全局 ErrorBoundary 应提供多级恢复策略：

```
错误发生 → 轻量重试（reset state） → 失败 → 刷新页面（reload） → 失败 → 清除会话（logout）
```

当前实现直接跳到最激进的"清除会话"。

**对用户的影响链**：

```
用户操作 → 触发渲染错误 → ErrorBoundary 捕获 → 显示"页面出现异常"
→ 用户唯一选择"返回登录" → 5 个 localStorage 被清除 → 跳转 /login
→ 重新登录 → 重新选择公司 → 重新选择项目 → 重新导航到出错页面 → 可能再次出错
```

**项目对比**：

| 实现 | 恢复操作 | 破坏性 |
|------|---------|--------|
| **ErrorBoundary** | 清除会话 + 跳登录 | **最高**（丢失所有状态） |
| **ChunkErrorBoundary** | `window.location.reload()` | 低（保留会话，仅刷新） |
| **MarkdownErrorBoundary** | 无操作按钮，提示手动刷新 | 无（被动） |
| **MarkdownEditorErrorBoundary** | 无操作按钮，提示手动刷新 | 无（被动） |

**修复建议**：提供三级恢复操作：

```typescript
// L1: 轻量重试 — 重置 state，重新渲染子树
handleRetry = () => this.setState({ hasError: false, error: null, errorInfo: null });

// L2: 刷新页面 — 保留会话状态
handleReload = () => window.location.reload();

// L3: 销毁会话（需二次确认）
handleLogout = () => { /* 当前 handleReset 逻辑 */ };
```

render 中展示：首选"重试"，次选"刷新页面"，末选"返回登录"（红色警告按钮 + Modal.confirm）。

---

## CRITICAL-3 — 零复用能力导致项目 4 处 ErrorBoundary 重复实现

**位置**：L4-6（Props 接口）

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;  // ← 唯一 prop，无任何定制点
}
```

**架构缺陷**：

项目中存在 **4 个独立的 ErrorBoundary 类**，全部是 class 组件，全部实现 `getDerivedStateFromError` + `componentDidCatch` + `render` 三件套，代码高度重复：

| 实现 | 文件 | 行数 | 错误 UI | 日志前缀 |
|------|------|------|--------|---------|
| ErrorBoundary | `ErrorBoundary.tsx` | 34 行 | `Result` + Button → 登录 | `[ErrorBoundary]` |
| ChunkErrorBoundary | `routes.tsx:56-90` | 35 行 | `Result` + Button → 刷新 | 无 componentDidCatch |
| MarkdownErrorBoundary | `MarkdownViewer.tsx:179-199` | 21 行 | `Empty` 无按钮 | `[MarkdownViewer]` |
| MarkdownEditorErrorBoundary | `MarkdownEditor.tsx:141-164` | 24 行 | `Empty` 无按钮 | `[MarkdownEditorErrorBoundary]` |

**总计 ~114 行重复代码**，核心逻辑（getDerivedStateFromError + componentDidCatch）完全相同。

**根本原因**：`ErrorBoundaryProps` 只接受 `children`，无以下定制能力：

1. **无 fallback 自定义** — 无法传入自定义错误 UI
2. **无错误过滤** — 无法指定只捕获特定类型的错误
3. **无恢复策略自定义** — 无法指定 reset/reload/logout
4. **无日志上下文** — 无法传入组件名称用于日志标识

**修复建议**：抽取通用 `BaseErrorBoundary` 基类或工厂函数：

```typescript
interface BaseErrorBoundaryProps {
  children: React.ReactNode;
  /** 错误过滤函数，返回 true 表示捕获此错误 */
  onError?: (error: Error) => boolean;
  /** 自定义 fallback UI */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** 组件标识，用于日志 */
  name?: string;
}
```

4 个现有实现可精简为：

```typescript
// 全局 ErrorBoundary
<ErrorBoundary name="Global" fallback={(error, reset) => <GlobalErrorUI error={error} onRetry={reset} />}>

// ChunkErrorBoundary
<ErrorBoundary name="Chunk" onError={(e) => /Loading chunk|ChunkLoadError/i.test(e.message)} fallback={...}>

// MarkdownErrorBoundary
<ErrorBoundary name="MarkdownViewer" fallback={() => <Empty description="内容渲染异常" />}>
```

---

## HIGH-1 — 跨层职责耦合：错误捕获 + 会话管理 + 路由导航混于一体

**位置**：L23-27（handleReset）

`handleReset` 方法同时承担三个不同职责：

1. **会话管理** — 清除 localStorage 中的认证状态（token、user）
2. **应用状态清理** — 清除用户选择（selected_company、selected_project）
3. **路由导航** — `window.location.href = '/login'`

这三个关注点分别属于：
- 会话管理 → `AuthContext.logout()`
- 应用状态清理 → `AppContext` 的 reset 逻辑
- 路由导航 → React Router `navigate('/login')`

当前实现直接操作 localStorage 绕过了 Context 层，导致：
- 如果 `AuthContext.logout()` 未来增加逻辑（如 token blacklist 调用），ErrorBoundary 不会执行
- localStorage key 列表与 `AuthContext`（L123-127）中的清除逻辑**重复维护**，不同步风险高

---

## HIGH-2 — localStorage key 列表与 AuthContext 维护不同步

**位置**：L24

```typescript
const keysToRemove = ['token', 'user', 'selected_company', 'selected_project', 'redirect_after_login'];
```

对比 `AuthContext.tsx` 的 logout 实现（L123-127）：

```typescript
localStorage.removeItem(TOKEN_KEY);      // 'token'
localStorage.removeItem(USER_KEY);       // 'user'
localStorage.removeItem('selected_company');
localStorage.removeItem('selected_project');
localStorage.removeItem('redirect_after_login');
```

两处 key 列表完全相同但**独立维护**。`AuthContext` 使用常量 `TOKEN_KEY`/`USER_KEY`，而 ErrorBoundary 直接硬编码字符串。如果 `AuthContext` 新增 logout 清理逻辑或改变 key 名称，ErrorBoundary 不会同步。

---

## HIGH-3 — window.location.href 绕过 React Router，破坏 SPA 导航

**位置**：L26

```typescript
window.location.href = '/login';
```

使用浏览器原生导航而非 React Router 的 `navigate('/login')`，导致：

1. **全页面重载** — 丢失所有 React 状态和已加载的 JS chunk
2. **子路径部署失效** — 如果项目部署在 `/app/` 下，`/login` 不是正确路径。应使用 `import.meta.env.BASE_URL` 或 React Router 的 basename
3. **与项目其他导航方式不一致** — `ChunkErrorBoundary` 使用 `window.location.reload()`（保留当前 URL），其他所有页面使用 React Router 导航

---

## MEDIUM-1 — componentDidCatch 日志无结构化，生产环境不可追溯

**位置**：L19-21

```typescript
componentDidCatch(error: Error, info: React.ErrorInfo) {
  console.error('[ErrorBoundary]', error, info.componentStack);
}
```

项目已有结构化日志工具 `apis/utils/logger.util.ts`（用于认证模块的 JSON 格式日志），但前端错误边界未采用任何结构化上报机制。生产环境中 `console.error` 输出不可见，错误发生后无法追溯。

对于全局 ErrorBoundary（位于组件树最顶端），应至少将错误信息发送到后端 `/api/error-report` 或写入 `localStorage` 的错误日志区域。

---

## MEDIUM-2 — 无错误类型过滤，全局边界捕获范围过宽

**位置**：L15-17

`getDerivedStateFromError` 不做任何错误类型判断，所有渲染错误统一处理。对比 `ChunkErrorBoundary`（routes.tsx:66-71）精确匹配 ChunkLoadError 并将其他错误重新抛出。

作为全局 ErrorBoundary，不进行错误过滤是合理的选择（兜底一切）。但当前设计没有为子级 ErrorBoundary 提供"已处理"标记——如果一个错误被 MarkdownErrorBoundary 捕获并展示了 fallback UI，同时又被全局 ErrorBoundary 捕获（因为 fallback 本身也出错），用户会看到全局错误页面而失去局部上下文。

---

## 架构对比：项目 4 个 ErrorBoundary 实现全景

```
App.tsx
└── ErrorBoundary (全局兜底)
    ├── 捕获一切 → 清除会话 → 跳登录
    │
    └── AuthProvider → AppContextProvider → AppRoutes
        └── Layout
            └── ChunkErrorBoundary (路由级)
                ├── 仅捕获 ChunkLoadError
                ├── 刷新页面
                └── 其他错误 → 向上冒泡到全局 ErrorBoundary
                    │
                    └── 各页面组件
                        ├── MarkdownViewer
                        │   └── MarkdownErrorBoundary (组件级)
                        │       └── Empty 提示
                        └── MarkdownEditor
                            └── MarkdownEditorErrorBoundary (组件级)
                                └── Empty 提示
```

**层级降级策略分析**：

| 层级 | 组件 | 恢复操作 | 错误过滤 | fallback 精度 |
|------|------|---------|---------|-------------|
| L1 全局 | ErrorBoundary | 销毁会话 | 无 | 粗粒度（整页替换） |
| L2 路由 | ChunkErrorBoundary | 刷新页面 | ChunkLoadError | 中粒度（路由区域替换） |
| L3 组件 | MarkdownErrorBoundary | 无操作 | 无 | 细粒度（组件内替换） |
| L3 组件 | MarkdownEditorErrorBoundary | 无操作 | 无 | 细粒度（组件内替换） |

**问题**：恢复策略与层级深度**反相关**——L1 最激进（销毁会话），L3 最被动（无操作）。正确做法应该是：越深层的边界越激进（直接重置子树），越顶层的边界越保守（尽量保留全局状态）。

---

## 架构改进路线图

### 第一阶段（必须修复）— 消除 CRITICAL

| # | 问题 | 修复方案 | 预估工作量 |
|---|------|---------|-----------|
| C-1 | State 丢弃错误上下文 | State 增加 `error`/`errorInfo` 字段 | 0.5h |
| C-2 | 恢复策略仅限销毁会话 | 三级恢复：重试 → 刷新 → 登出 | 1h |
| C-3 | 4 处 ErrorBoundary 重复 | 抽取 `BaseErrorBoundary` 通用基类 | 2h |

### 第二阶段（质量提升）

| # | 问题 | 修复方案 |
|---|------|---------|
| H-1 | 跨层职责耦合 | handleLogout 委托给 AuthContext.logout() |
| H-2 | localStorage key 不同步 | 引用 AuthContext 常量或调用其 logout |
| H-3 | window.location.href 绕过 Router | 使用 React Router navigate 或 BASE_URL |
| M-1 | 日志无结构化 | 添加错误上报到后端 |

### 第三阶段（长期优化）

| # | 问题 | 修复方案 |
|---|------|---------|
| M-2 | 无错误类型过滤 | 为全局边界添加 Promise rejection 过滤 |

---

## 修复后预期评分

完成第一阶段（C-1 + C-2 + C-3）后预期综合评分：**7.5/10**
完成全部修复后预期评分：**8.5/10**

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 文件 | pages/components/ErrorBoundary.tsx |
| 行数 | 46 |
| 类数量 | 1 |
| 评审类型 | 软件架构专家评审 |
| 评审日期 | 2026-05-26 |
| 关联文件 | pages/App.tsx:47-53, pages/router/routes.tsx:56-90, pages/components/MarkdownViewer.tsx:179-199, pages/components/MarkdownEditor.tsx:141-164, pages/context/AuthContext.tsx:123-127 |
| 关联评审 | [质量评审](ErrorBoundary.tsx.quality.md) 6.2/10 CONDITIONAL APPROVE |
