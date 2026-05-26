# ErrorBoundary.tsx — Committer 综合审核

**文件**: `pages/components/ErrorBoundary.tsx`
**评审维度**: Committer 合并准入评审（综合质量/架构/安全/UI 四维）
**评审日期**: 2026-05-26
**评审员**: 代码 Committer 审核专家
**代码行数**: 46 行

---

## 总评: REQUEST CHANGES 3.8/10

**最终裁决: REJECT — 拒绝合并**

ErrorBoundary.tsx 作为全局错误边界组件（位于 `App.tsx` 组件树最顶端），承担应用崩溃时的最后一道用户反馈屏障。四维评审（质量 6.2、架构 3.4、安全 4.0、UI 3.8）一致指向相同的结构性缺陷：**错误上下文完全丢弃、恢复策略仅限销毁会话、会话管理绕过后端注销机制、零 DESIGN.md 合规**。

当前存在 **3 项 BLOCKING** + **7 项 HIGH** + **6 项 MEDIUM** 级别问题，不具备合并条件。

---

## 四维评审综合

| 维度 | 评分 | 结论 | 评审文件 |
|------|------|------|----------|
| 质量 | 6.2/10 | CONDITIONAL APPROVE | [ErrorBoundary.tsx.quality.md](ErrorBoundary.tsx.quality.md) |
| 架构 | 3.4/10 | REQUEST CHANGES | [ErrorBoundary.tsx.architecture.md](ErrorBoundary.tsx.architecture.md) |
| 安全 | 4.0/10 | REQUEST CHANGES | [ErrorBoundary.tsx.security.md](ErrorBoundary.tsx.security.md) |
| UI | 3.8/10 | REQUEST CHANGES | [ErrorBoundary.tsx.ui.md](ErrorBoundary.tsx.ui.md) |
| **Committer 综合** | **3.8/10** | **REQUEST CHANGES** | 本文件 |

**加权计算**: (6.2×0.15 + 3.4×0.30 + 4.0×0.30 + 3.8×0.25) = 0.93 + 1.02 + 1.20 + 0.95 = **4.10 → 3.8**（向最差维度倾斜，因 BLOCKING 项跨维度交叉印证）

---

## 发现清单

| 级别 | 编号 | 问题 | 评审维度 | 工时 |
|------|------|------|----------|------|
| **BLOCKING** | B-1 | handleReset 绕过后端注销，JWT token 泄露窗口最长 2h | 安全+架构 | 0.5h |
| **BLOCKING** | B-2 | 恢复策略仅限"销毁会话"，无重试/刷新渐进降级 | 架构+质量+UI | 1h |
| **BLOCKING** | B-3 | 状态模型丢弃错误上下文，render 无差异化能力 | 架构+质量 | 0.5h |
| HIGH | H-1 | 错误堆栈明文输出 console，暴露组件结构和 API 路径 | 安全 | 0.5h |
| HIGH | H-2 | 操作与文案矛盾——subTitle 建议"刷新"但无刷新按钮 | UI+质量 | 0.3h |
| HIGH | H-3 | 破坏性操作无 Modal.confirm 确认 + 无 loading 态 | 质量+UI | 0.5h |
| HIGH | H-4 | localStorage key 列表与 AuthContext 重复维护，不同步 | 架构+安全 | 0.3h |
| HIGH | H-5 | window.location.href 硬编码 '/login'，绕过 Router + 子路径部署失效 | 架构+安全 | 0.2h |
| HIGH | H-6 | 错误页面无全屏居中布局 | UI | 0.2h |
| HIGH | H-7 | 零 DESIGN.md Token 覆盖，antd 默认样式全面违反 Carbon 规范 | UI | 0.5h |
| MEDIUM | M-1 | console.error 无结构化日志，生产环境错误不可追溯 | 质量+架构 | 0.5h |
| MEDIUM | M-2 | getDerivedStateFromError 未接收 error 参数 | 质量 | 0.3h |
| MEDIUM | M-3 | 无错误计数/阈值防护，恶意数据可迫使反复登出 | 安全+质量 | 0.3h |
| MEDIUM | M-4 | localStorage 清除操作无 try-catch，异常路径 session 残留 | 安全 | 0.2h |
| MEDIUM | M-5 | 缺少错误追踪标识，用户无法有效报告问题 | UI | 0.3h |
| MEDIUM | M-6 | 零复用能力导致项目 4 处 ErrorBoundary 重复实现（~114 行） | 架构 | 2h |

---

## BLOCKING 详细分析

### B-1 [BLOCKING] handleReset 绕过后端注销，JWT token 泄露窗口最长 2h

**位置**: L23-27

```typescript
handleReset = () => {
  const keysToRemove = ['token', 'user', 'selected_company', 'selected_project', 'redirect_after_login'];
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  window.location.href = '/login';
};
```

**四维交叉验证**:

| 维度 | 对应发现 | 要点 |
|------|----------|------|
| 安全 CRITICAL-1 | handleReset 绕过后端注销 | 未调用 `POST /api/v1/auth/logout`，token-blacklist 不触发 |
| 架构 HIGH-1 | 跨层职责耦合 | 错误捕获 + 会话管理 + 路由导航混于一体 |
| 架构 HIGH-2 | localStorage key 不同步 | 与 AuthContext.logout() 独立维护 5 个 key |

**安全影响链路**:

```
渲染错误 → 用户点击"返回登录"
→ handleReset 清除 localStorage（客户端忘记 token）
→ 但 JWT 仍在服务端有效（token-blacklist 未触发）
→ 如 token 已被窃取 → 攻击者可持续使用最长 2h
→ 用户误以为已"安全退出"
```

**对比 AuthContext.logout() 正确流程**（AuthContext.tsx L116-130）:

```typescript
// 正确：先通知后端拉黑 token，再清除客户端
const logout = useCallback(async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    axios.post('/api/v1/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  localStorage.removeItem(TOKEN_KEY);
  // ... 清除其他 key
  window.location.href = '/login';
}, []);
```

**Committer 判定**: ErrorBoundary 的 `handleReset` 完全跳过了 `axios.post('/api/v1/auth/logout')` 这一步，只做了"客户端忘记 token"而非"服务端撤销 token"。在同项目已部署 token-blacklist 机制（SHA-256 哈希存储 + 自动清理）的前提下，绕过此机制属于安全倒退。

**修复方案**: 委托给 `AuthContext.logout()`，或在 handleReset 中复刻完整的后端注销调用。

---

### B-2 [BLOCKING] 恢复策略仅限"销毁会话"，无渐进式降级

**位置**: L30-41（render）

**四维交叉验证**:

| 维度 | 对应发现 | 要点 |
|------|----------|------|
| 质量 B-1 | 破坏性操作无确认 | 一键清除所有 localStorage + 跳转，不可撤销 |
| 质量 B-2 | 无错误恢复机制 | 唯一出口是销毁会话 |
| 架构 CRITICAL-2 | 恢复策略仅限"销毁会话" | 缺少重试/刷新等轻量恢复 |
| UI A-H1 | 操作与文案矛盾 | subTitle 建议"刷新"但无刷新按钮 |
| UI A-H2 | 破坏性操作无确认无 loading | 无 Modal.confirm，无 loading 态 |

**用户影响链**:

```
用户操作 → 触发临时渲染错误 → ErrorBoundary 捕获 → 显示"页面出现异常"
→ subTitle 说"请尝试刷新页面" → 但无刷新按钮
→ 唯一操作"返回登录" → 全部 localStorage 被清除 → 跳转 /login
→ 重新登录 → 重新选择公司 → 重新选择项目 → 重新导航到出错页面
→ 如果是临时错误（已恢复）→ 用户承受了不必要的数据丢失
→ 如果仍是错误 → 再次崩溃 → 循环
```

**项目内 4 个 ErrorBoundary 恢复策略对比**:

| 实现 | 恢复操作 | 破坏性 |
|------|---------|--------|
| **ErrorBoundary（全局）** | 清除会话 + 跳登录 | **最高** |
| ChunkErrorBoundary（路由级） | `window.location.reload()` | 低 |
| MarkdownErrorBoundary（组件级） | 无操作按钮 | 无 |
| MarkdownEditorErrorBoundary（组件级） | 无操作按钮 | 无 |

**架构反模式**: 恢复策略与层级深度**反相关**——L1 全局边界最激进（销毁会话），L3 组件级最被动（无操作）。正确做法应是：越深层越激进（直接重置子树），越顶层越保守（尽量保留全局状态）。

**Committer 判定**: 全局 ErrorBoundary 的恢复策略过于激进，且与文案承诺矛盾。对于瞬态错误（网络波动、临时数据异常），用户被迫承受完整会话重建。

**修复方案**: 三级渐进降级：

```typescript
// L1: 轻量重试 — 重置 state，重新渲染子树
handleRetry = () => this.setState({ hasError: false, error: null, errorInfo: null });

// L2: 刷新页面 — 保留会话状态
handleReload = () => window.location.reload();

// L3: 销毁会话（需 Modal.confirm 二次确认）
handleLogout = () => Modal.confirm({ ... });
```

render 中展示：首选"重试"，次选"刷新页面"，末选"返回登录"。

---

### B-3 [BLOCKING] 状态模型丢弃错误上下文，render 无差异化能力

**位置**: L8-10（State 接口），L15-17（getDerivedStateFromError）

```typescript
interface ErrorBoundaryState {
  hasError: boolean;     // ← 仅一个布尔标志
}

static getDerivedStateFromError(): ErrorBoundaryState {  // ← error 参数未接收
  return { hasError: true };
}
```

**四维交叉验证**:

| 维度 | 对应发现 | 要点 |
|------|----------|------|
| 质量 H-1 | getDerivedStateFromError 丢弃 error 对象 | 无法区分 ChunkLoadError/TypeError/NetworkError |
| 架构 CRITICAL-1 | 状态模型丢弃错误上下文 | render 输出固定，无差异化 |
| 安全 CRITICAL-2 | componentDidCatch 明文输出 console | error+componentStack 暴露内部结构 |

**信息流向**:

```
React 抛出 error + info
  ├── getDerivedStateFromError() → 丢弃 error，只设 hasError=true
  ├── componentDidCatch()        → console.error（生产环境不可见，攻击者可在 DevTools 看到）
  └── render()                   → 固定 Result UI，无法根据错误类型提供精准指导
```

**对比 ChunkErrorBoundary**（routes.tsx L66-71）:

```typescript
static getDerivedStateFromError(error: Error) {
  if (/Loading chunk|ChunkLoadError/i.test(error.message)) {
    return { hasError: true };  // ← 精确匹配
  }
  throw error;  // ← 不相关的错误重新抛出
}
```

**Committer 判定**: ErrorBoundary 作为全局最外层边界，丢失错误上下文导致：(1) 无法根据错误类型提供差异化 UI 和操作建议；(2) 生产环境无法追溯错误详情；(3) 错误信息只到 console，安全风险和信息浪费并存。

**修复方案**:

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
  return { hasError: true, error };
}

componentDidCatch(_error: Error, info: React.ErrorInfo) {
  this.setState({ errorInfo: info });
  if (import.meta.env.DEV) {
    console.error('[ErrorBoundary]', _error, info.componentStack);
  }
  // 生产环境：上报到后端
}
```

---

## HIGH 级问题汇总

### H-1 [HIGH] 错误堆栈明文输出 console（安全 CRITICAL-2）

`componentDidCatch`（L19-21）将 `error.message` + `info.componentStack` 明文输出到 `console.error`，暴露组件拓扑、API 路径、第三方库版本、数据库字段名。不区分 `DEV`/生产环境。

**修复**: 仅 DEV 环境输出 console，生产环境上报到后端。

### H-2 [HIGH] 操作与文案矛盾（UI A-H1 + 质量 B-1）

`subTitle`（L35）建议"请尝试刷新页面"，但唯一按钮是"返回登录"。用户要么 F5 手动刷新（非直觉操作），要么被迫销毁会话。

**修复**: 添加"刷新页面"按钮作为主操作。

### H-3 [HIGH] 破坏性操作无确认 + 无 loading（质量 B-1 + UI A-H2）

`handleReset` 清除 5 个 localStorage key + 硬跳转，无 `Modal.confirm` 二次确认，无 Button `loading` 态防重复点击。

**修复**: `Modal.confirm` + `this.setState({ loading: true })`。

### H-4 [HIGH] localStorage key 列表重复维护（架构 HIGH-2 + 安全 MEDIUM-2）

ErrorBoundary L24 硬编码 5 个 key，与 AuthContext.logout()（L123-127）完全相同但独立维护。新增 key 时两处需同步。

**修复**: 委托给 AuthContext.logout()。

### H-5 [HIGH] window.location.href 硬编码 '/login'（架构 HIGH-3 + 安全 MEDIUM-1）

硬编码绝对路径 `/login`，子路径部署失效（如 `/app/login`）。绕过 React Router 的路由守卫和 basename 配置。

**修复**: 使用 `import.meta.env.BASE_URL + 'login'` 或 React Router navigate。

### H-6 [HIGH] 错误页面无全屏居中布局（UI U-H1）

`<Result>` 直接渲染在 ErrorBoundary 的 DOM 位置（崩溃点），无全屏容器包裹。错误页面可能出现在页面中间某处，无背景色隔离，无垂直居中。

**修复**: 包裹 `display:flex; align-items:center; justify-content:center; min-height:100vh` 容器。

### H-7 [HIGH] 零 DESIGN.md Token 覆盖（UI D-C1）

antd 默认样式（圆角 6px、蓝色 #1677ff、非 Plex Sans 字体、错误红 #ff4d4f）与 DESIGN.md Carbon 规范全面冲突：

| 属性 | antd 默认 | Carbon 规范 |
|------|-----------|------------|
| 按钮圆角 | ~6px | 0px |
| 主色 | #1677ff | #0f62fe |
| 错误红 | #ff4d4f | #da1e28 |
| 字体 | -apple-system | IBM Plex Sans |

**修复**: 通过 ConfigProvider theme 或 CSS class 覆盖。

---

## 正面评价

1. **符合 CLAUDE.md antd 规范** — 使用 `Result` + `Button` 组件，未使用原生 HTML
2. **无障碍支持** — `role="alert"` + `aria-live="assertive"`，WCAG 合规
3. **双生命周期方法正确** — `getDerivedStateFromError`（渲染阶段）+ `componentDidCatch`（副作用阶段）符合 React 推荐模式
4. **不渲染错误详情** — UI 只显示通用文案，避免通过 UI 的信息泄露
5. **定位正确** — 在 `App.tsx` 中包裹最外层（ErrorBoundary → AuthProvider → AppContextProvider → Routes），确保全局兜底
6. **有测试覆盖** — `App.test.tsx` 中 3 个 ErrorBoundary 专项测试
7. **代码简洁** — 46 行，职责清晰，易于理解

---

## 项目内 ErrorBoundary 全景

```
App.tsx
└── ErrorBoundary (全局兜底 — B-1/B-2/B-3 问题所在)
    ├── 捕获一切 → 清除会话 → 跳登录（最激进）
    │
    └── AuthProvider → AppContextProvider → AppRoutes
        └── Layout
            └── ChunkErrorBoundary (路由级)
                ├── 仅捕获 ChunkLoadError → 刷新页面（合理）
                └── 其他错误 → 向上冒泡到全局 ErrorBoundary
                    │
                    └── 各页面组件
                        ├── MarkdownViewer
                        │   └── MarkdownErrorBoundary → Empty 提示（被动）
                        └── MarkdownEditor
                            └── MarkdownEditorErrorBoundary → Empty 提示（被动）
```

**4 个实现共 ~114 行重复代码**，核心逻辑（getDerivedStateFromError + componentDidCatch + render）高度雷同。

---

## 修复优先级路线图

### P0 — BLOCKING（必须修复才能合并）

| 编号 | 修复内容 | 工时 |
|------|----------|------|
| B-1 | handleReset 委托给 AuthContext.logout()，确保后端 token-blacklist 触发 | 0.5h |
| B-2 | 三级恢复：重试 → 刷新页面 → 返回登录（带 Modal.confirm） | 1h |
| B-3 | State 增加 `error`/`errorInfo`，render 根据错误类型差异化 | 0.5h |

**P0 总工时**: 约 2h

### P1 — HIGH（本迭代修复）

| 编号 | 修复内容 | 工时 |
|------|----------|------|
| H-1 | componentDidCatch 环境区分：DEV→console，生产→上报后端 | 0.5h |
| H-2 | 添加"刷新页面"按钮，与 subTitle 文案对齐 | 0.3h |
| H-3 | 返回登录添加 Modal.confirm + Button loading 态 | 0.5h |
| H-4 | 移除硬编码 key 列表，委托给 AuthContext | 含在 B-1 |
| H-5 | 路径使用 `import.meta.env.BASE_URL + 'login'` | 0.2h |
| H-6 | 包裹全屏居中容器 | 0.2h |
| H-7 | 通过 ConfigProvider/CSS 覆盖圆角/色值/字体 | 0.5h |

**P1 总工时**: 约 2.2h

### P2 — MEDIUM（下一迭代）

| 编号 | 修复内容 | 工时 |
|------|----------|------|
| M-1~M-6 | 结构化日志、错误计数/阈值、try-catch、错误追踪 ID、复用基类 | 3.3h |

**全部修复后预期评分**: **7.5/10**

---

## 同项目 ErrorBoundary 横向对比

| 维度 | ErrorBoundary.tsx | ChunkErrorBoundary | MarkdownErrorBoundary | MarkdownEditorEB |
|------|:-:|:-:|:-:|:-:|
| 错误过滤 | 无 | ChunkLoadError | 无 | 无 |
| 恢复操作 | 清除会话 | 刷新页面 | 无 | 无 |
| 破坏性 | 最高 | 低 | 无 | 无 |
| State 模型 | `boolean` | `boolean` | `boolean` | `boolean` |
| fallback 可定制 | 无 | 无 | 无 | 无 |
| 测试覆盖 | 3 测试 | 0 | 0 | 0 |
| DESIGN.md 合规 | 不合规 | 不合规 | 不合规 | 不合规 |

**结论**: 4 个实现有相同的设计缺陷（简陋状态模型、无复用能力），但 ErrorBoundary.tsx 作为全局边界，影响面最大，修复优先级最高。

---

## 评审签名

**评审人**: 代码 Committer 审核专家 (Claude Code)
**评审模型**: Committer Review v1.0
**评审依据**: 四份前置评审（质量 6.2/10 CONDITIONAL APPROVE、架构 3.4/10 REQUEST CHANGES、安全 4.0/10 REQUEST CHANGES、UI 3.8/10 REQUEST CHANGES）+ AuthContext.logout() 源码验证 + token-blacklist.util.ts 机制验证 + 项目内 4 个 ErrorBoundary 实现对比 + DESIGN.md 规范核查
