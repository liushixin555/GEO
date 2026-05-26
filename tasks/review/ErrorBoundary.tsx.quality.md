# ErrorBoundary.tsx 软件质量专家评审

**文件**: `pages/components/ErrorBoundary.tsx`
**评审人**: 软件质量专家
**评审日期**: 2026-05-26
**评审类型**: 质量评审（Quality Review）
**代码行数**: 46 行

---

## 总评

| 维度 | 评分 | 等级 |
|------|------|------|
| 功能正确性 | 7.5/10 | GOOD |
| 鲁棒性 | 5.0/10 | NEEDS IMPROVEMENT |
| 可维护性 | 7.0/10 | GOOD |
| 可测试性 | 6.0/10 | ACCEPTABLE |
| 一致性 | 5.5/10 | NEEDS IMPROVEMENT |
| **综合评分** | **6.2/10** | **CONDITIONAL APPROVE** |

---

## 正面评价

1. **简洁清晰** — 46 行代码实现完整的 ErrorBoundary 功能，职责单一，易于理解
2. **符合 CLAUDE.md 规范** — 使用 antd `Result` + `Button` 组件，未使用原生 HTML 替代
3. **无障碍支持** — 添加了 `role="alert"` 和 `aria-live="assertive"`，符合 WCAG 标准
4. **双生命周期方法** — 正确使用 `getDerivedStateFromError`（渲染阶段）+ `componentDidCatch`（副作用阶段）的 React 推荐模式
5. **有测试覆盖** — `App.test.tsx` 中有 3 个 ErrorBoundary 专项测试（异常捕获/正常渲染/状态保持）
6. **定位正确** — 在 `App.tsx` 中包裹最外层（ErrorBoundary → AuthProvider → AppContextProvider → Routes），确保全局异常兜底

---

## 发现问题

### BLOCKING（阻断项）— 必须修复

#### B-1: handleReset 破坏性操作无用户确认
- **严重性**: BLOCKING
- **位置**: 第 23-27 行
- **问题**: `handleReset` 一键清除所有 localStorage（token、user、selected_company、selected_project、redirect_after_login）并强制跳转 `/login`。用户点击"返回登录"后无法撤销，当前会话的所有状态（已选择的公司/项目、认证信息）全部丢失。
- **对比**: 同项目 `ChunkErrorBoundary`（routes.tsx:60）提供的是"刷新页面"按钮（`window.location.reload()`），不会清除用户会话。本组件作为最外层 ErrorBoundary，直接清除会话过于激进。
- **修复建议**: 添加 `Modal.confirm` 二次确认，或提供"刷新页面"作为首选操作、"返回登录"作为备选操作。

#### B-2: 无错误恢复机制，唯一出口是销毁会话
- **严重性**: BLOCKING
- **位置**: 第 30-41 行
- **问题**: 一旦触发 `hasError: true`，唯一操作是清除会话跳转登录。对于临时渲染错误（如网络波动导致的数据异常），用户被迫重新登录，体验极差。
- **对比**: `ChunkErrorBoundary` 提供"刷新页面"按钮（routes.tsx:81），`MarkdownErrorBoundary` 只显示提示让用户手动刷新（MarkdownViewer.tsx:195）。
- **修复建议**: 添加"重试"按钮，调用 `this.setState({ hasError: false })` 尝试恢复，而非直接销毁会话。

### HIGH（高优先级）— 强烈建议修复

#### H-1: getDerivedStateFromError 丢弃 error 对象，无法区分错误类型
- **严重性**: HIGH
- **位置**: 第 15-17 行
- **问题**: `getDerivedStateFromError()` 签名支持 `error` 参数但未使用。所有类型的渲染错误（ChunkLoadError、TypeError、NetworkError）统一显示"页面出现异常"，无法提供精准的用户指导。
- **对比**: `ChunkErrorBoundary`（routes.tsx:66-71）正确使用 error 参数做精准匹配：`/Loading chunk|ChunkLoadError/i.test(error.message)`，只捕获 chunk 加载错误，其他错误继续抛出。
- **修复建议**: 将 error 信息存入 state，根据错误类型提供不同的提示文案和操作按钮。

#### H-2: console.error 无结构化日志，生产环境错误信息丢失
- **严重性**: HIGH
- **位置**: 第 19-21 行
- **问题**: `componentDidCatch` 只使用 `console.error` 输出错误。生产环境中浏览器控制台通常不可见，错误信息无法被监控系统采集。
- **对比**: 项目已有结构化日志工具 `apis/utils/logger.util.ts`，但此组件未使用。
- **修复建议**: 集成错误上报机制（至少写入 localStorage 或发送到后端 `/api/error-report`），确保生产环境可追溯。

#### H-3: localStorage key 硬编码列表不完整且易过时
- **严重性**: HIGH
- **位置**: 第 24 行
- **问题**: 硬编码 5 个 localStorage key。项目中 `AuthContext` 和 `AppContext` 管理的 key 可能随时新增（如 `selected_company_name`），此列表不会自动同步。
- **修复建议**: 使用 `localStorage.clear()` 或采用 key 前缀约定（如 `app_`）统一管理。

#### H-4: window.location.href 硬编码 '/login' 路径
- **严重性**: HIGH
- **位置**: 第 26 行
- **问题**: 直接使用 `window.location.href = '/login'` 硬编码路径。如果项目部署在子路径（如 `/app/`），此路径将错误。
- **修复建议**: 使用 `window.location.href = import.meta.env.BASE_URL + 'login'` 或 `window.location.reload()` 后让前端路由自然跳转。

### MEDIUM（中优先级）— 建议修复

#### M-1: 缺少 error.stack 信息展示（开发模式）
- **严重性**: MEDIUM
- **位置**: 第 30-41 行 render 方法
- **问题**: 开发环境下，UI 只显示通用"页面出现异常"文案。开发者无法在 UI 上直接看到错误堆栈，需要打开浏览器控制台。
- **修复建议**: 在开发模式下（`import.meta.env.DEV`）折叠展示 error.stack。

#### M-2: 无错误计数/阈值防护
- **严重性**: MEDIUM
- **位置**: 整个组件
- **问题**: 如果错误反复触发（如无限循环渲染），ErrorBoundary 会持续被触发。React 虽然有内置防护（抛出错误的 getDerivedStateFromError 不会导致无限循环），但同一个组件反复 mount → crash → remount 的场景未被防护。
- **修复建议**: 添加 error count 到 state，超过阈值（如 3 次）后显示"请刷新浏览器"而非继续尝试渲染。

#### M-3: Props 接口不支持 fallback 自定义
- **严重性**: MEDIUM
- **位置**: 第 4-6 行 ErrorBoundaryProps
- **问题**: `children` 是唯一 prop。调用方无法自定义错误 UI（如不同页面需要不同的错误展示）。项目内已有 3 个独立的 ErrorBoundary 实现（ErrorBoundary、MarkdownErrorBoundary、MarkdownEditorErrorBoundary），部分原因就是无法复用。
- **修复建议**: 添加 `fallback?: React.ReactNode` 或 `fallbackRender?: (error: Error, reset: () => void) => React.ReactNode` prop。

---

## 一致性对比

项目中存在 **4 个 ErrorBoundary 实现**，风格和功能不一致：

| 实现 | 文件 | 错误恢复 | 用户操作 | 错误过滤 | fallback 自定义 |
|------|------|---------|---------|---------|---------------|
| **ErrorBoundary** | `ErrorBoundary.tsx` | 无 | 清除会话+跳登录 | 无 | 无 |
| **ChunkErrorBoundary** | `routes.tsx:60` | 无 | 刷新页面 | 精确匹配 ChunkLoadError | 无 |
| **MarkdownErrorBoundary** | `MarkdownViewer.tsx:179` | 无 | 提示刷新（无按钮） | 无 | 无 |
| **MarkdownEditorErrorBoundary** | `MarkdownEditor.tsx:141` | 无 | Empty 提示（无按钮） | 无 | 无 |

**建议**: 抽取通用 ErrorBoundary 基类，通过 props 控制行为（错误过滤、恢复策略、fallback UI），消除 4 处重复代码。

---

## 测试覆盖评估

`App.test.tsx` 第 133-199 行有 3 个 ErrorBoundary 测试：

| 测试 | 覆盖场景 | 评估 |
|------|---------|------|
| 异常捕获 + 错误 UI | getDerivedStateFromError → render error | 覆盖基本功能 |
| 正常组件渲染 | children 正常渲染 | 覆盖正常路径 |
| 错误状态保持 | rerender 后仍显示错误 | 覆盖状态持久性 |

**未覆盖的关键场景**:
- `handleReset` 按钮 onClick 行为（localStorage 清除 + 跳转）
- `componentDidCatch` 日志输出
- error 对象在不同类型时的行为
- aria-live / role="alert" 的无障碍验证

---

## 修复优先级总结

| 优先级 | 编号 | 标题 | 工作量 |
|--------|------|------|--------|
| BLOCKING | B-1 | handleReset 破坏性操作无确认 | 0.5h |
| BLOCKING | B-2 | 无错误恢复机制 | 0.5h |
| HIGH | H-1 | getDerivedStateFromError 丢弃 error 对象 | 0.5h |
| HIGH | H-2 | console.error 无结构化日志 | 0.5h |
| HIGH | H-3 | localStorage key 硬编码列表 | 0.3h |
| HIGH | H-4 | window.location.href 硬编码路径 | 0.2h |
| MEDIUM | M-1 | 缺少开发模式错误堆栈展示 | 0.3h |
| MEDIUM | M-2 | 无错误计数/阈值防护 | 0.3h |
| MEDIUM | M-3 | Props 不支持 fallback 自定义 | 0.5h |

**预计总修复工作量**: ~3.4h

---

## 裁决

**CONDITIONAL APPROVE** — 代码功能正确，结构清晰，符合 antd 规范和无障碍要求。但 2 项 BLOCKING 问题（无恢复机制 + 破坏性操作无确认）影响用户体验，必须在合并前修复。建议同时解决 HIGH 级别的一致性问题（4 个 ErrorBoundary 实现），以消除项目级技术债务。
