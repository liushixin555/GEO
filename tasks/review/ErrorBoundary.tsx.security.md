# ErrorBoundary.tsx — 代码安全专家评审

**文件**: `pages/components/ErrorBoundary.tsx`
**评审人**: 代码安全专家
**评审日期**: 2026-05-26
**代码行数**: 46 行

---

## 总评

| 维度 | 评分 | 等级 |
|------|------|------|
| 会话安全 | 3.0/10 | CRITICAL |
| 错误信息管控 | 6.5/10 | ACCEPTABLE |
| 攻击面与 DoS 防护 | 4.0/10 | HIGH |
| 输入验证与输出编码 | 7.0/10 | GOOD |
| 日志与可追溯性 | 3.5/10 | CRITICAL |
| **综合评分** | **4.0/10** | **REQUEST CHANGES** |

**结论：REQUEST CHANGES** — 存在 2 项 CRITICAL 级安全缺陷（handleReset 绕过后端注销导致 token 泄露窗口 2h + 错误堆栈明文输出到 console 暴露内部结构），3 项 HIGH 级问题，2 项 MEDIUM 级问题。代码在输出编码和错误信息管控方面做得较好（不渲染错误详情），但会话生命周期管理与安全审计链路存在显著缺陷。

---

## CRITICAL-1 — handleReset 绕过后端注销，JWT token 泄露窗口最长 2 小时

**位置**: L23-27

```typescript
handleReset = () => {
  const keysToRemove = ['token', 'user', 'selected_company', 'selected_project', 'redirect_after_login'];
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  window.location.href = '/login';
};
```

**安全缺陷**：

1. **仅清除客户端存储，未调用后端注销** — `handleReset` 直接操作 localStorage 清除 token，但没有调用 `AuthContext.logout()` 或 `POST /api/v1/auth/logout`。后端 token-blacklist 机制（`apis/utils/token-blacklist.util.ts`）不会被触发，JWT 在服务端仍然有效。

2. **Token 泄露窗口** — JWT 有效期 2 小时（CLAUDE.md 记载），如果攻击者已通过其他途径（XSS、网络嗅探、日志泄露）获取了 token，即便用户点击"返回登录"，攻击者的 token 副本仍然有效，最长可达 2 小时。

3. **与 AuthContext.logout() 的安全差距** — 对比 `AuthContext.tsx` L116-130 的标准注销流程：

```typescript
// AuthContext.logout() — 正确的安全流程
const logout = useCallback(async () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    axios.post('/api/v1/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` },  // ← 通知后端拉黑 token
    }).catch(() => {});
  }
  localStorage.removeItem(TOKEN_KEY);
  // ... 清除其他 key
  window.location.href = '/login';
}, []);
```

ErrorBoundary 的 `handleReset` **完全跳过了** `axios.post('/api/v1/auth/logout')` 这一步，相当于只做了"客户端忘记 token"而非"服务端撤销 token"。

4. **影响链路**：

```
渲染错误 → 用户点击"返回登录" → handleReset 清除 localStorage
→ 跳转 /login → 但 JWT 仍在服务端有效
→ 如果 token 已被窃取 → 攻击者可持续使用该 token 最长 2h
→ 用户以为已"安全退出" → 实际上 token 未被撤销
```

**攻击场景**：

| 场景 | 影响 |
|------|------|
| XSS 攻击者已窃取 localStorage.token | ErrorBoundary"返回登录"不撤销 token，攻击者继续有效使用 |
| 用户在公共电脑上遇到错误并"退出" | 误以为已安全退出，但 token 在 2h 内可被恢复（浏览器历史/网络日志） |
| 攻击者故意触发渲染错误迫使"重新登录" | 用户重新登录后旧 token 仍有效，攻击者拥有两个有效 token |

**修复建议**：

```typescript
handleReset = async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      await axios.post('/api/v1/auth/logout', null, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* 即使失败也继续清除客户端 */ }
  }
  const keysToRemove = ['token', 'user', 'selected_company', 'selected_project', 'redirect_after_login'];
  keysToRemove.forEach((key) => localStorage.removeItem(key));
  window.location.href = '/login';
};
```

或直接委托给 `AuthContext.logout()`（需通过 props 或 context 获取 logout 函数）。

---

## CRITICAL-2 — componentDidCatch 将错误堆栈明文输出到 console，暴露内部组件结构

**位置**: L19-21

```typescript
componentDidCatch(error: Error, info: React.ErrorInfo) {
  console.error('[ErrorBoundary]', error, info.componentStack);
}
```

**安全缺陷**：

1. **错误堆栈暴露组件拓扑** — `info.componentStack` 包含完整的 React 组件调用链（如 `in div in TableRow in Table in ArticleList in Layout in AuthProvider in ErrorBoundary`）。在生产环境中，任何打开浏览器 DevTools 的人（包括攻击者）都能获取：
   - 组件层次结构和命名
   - 第三方库版本（通过组件名称推断）
   - 内部业务模块名称（ArticleList、KnowledgeBase 等）

2. **Error.message 可能包含敏感信息** — 渲染错误的消息可能包含：
   - API 端点路径（如 `Failed to fetch /api/v1/articles/123`）
   - 数据库字段名（如 `Cannot read property 'company_id' of undefined`）
   - 用户数据片段（如 `Unexpected token < in JSON at position 0` 暗示 API 返回了 HTML 而非 JSON）

3. **无环境区分** — 不区分 `import.meta.env.DEV` 和生产环境，生产环境同样输出完整堆栈。

4. **无错误上报机制** — 只输出到 `console.error`，生产环境中错误信息无法被安全团队采集分析，无法建立安全事件时间线。

**信息泄露风险矩阵**：

| 泄露内容 | 攻击者利用方式 | 风险 |
|---------|-------------|------|
| 组件名称 | 精准定位攻击目标（如找到认证相关组件） | HIGH |
| API 路径 | 直接测试 API 端点漏洞 | HIGH |
| 第三方库版本 | 查找已知 CVE | MEDIUM |
| 数据库字段名 | 构造精准的 SQL 注入/IDOR | MEDIUM |

**修复建议**：

```typescript
componentDidCatch(error: Error, info: React.ErrorInfo) {
  if (import.meta.env.DEV) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  // 生产环境：发送到后端，不暴露到 console
  reportErrorToBackend({
    message: error.message,
    stack: error.stack,
    componentStack: info.componentStack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  }).catch(() => {}); // 静默失败，不影响用户
}
```

---

## HIGH-1 — localStorage 清除操作无 try-catch，异常路径下 session 残留

**位置**: L24-25

```typescript
const keysToRemove = ['token', 'user', 'selected_company', 'selected_project', 'redirect_after_login'];
keysToRemove.forEach((key) => localStorage.removeItem(key));
```

**安全缺陷**：

1. **localStorage 操作可能抛出异常** — 在以下场景中 `localStorage.removeItem` 会抛出 `SecurityError` 或 `DOMException`：
   - 浏览器隐私模式（部分浏览器限制 localStorage）
   - 用户禁用了 cookie/storage
   - 跨域 iframe 中运行（第三方上下文）
   - 浏览器存储策略限制

2. **异常导致部分清除** — 如果在第 3 个 key（`selected_company`）处抛出异常，`token` 和 `user` 已被清除，但 `selected_project` 和 `redirect_after_login` 仍然残留。更关键的是，**后续的 `window.location.href = '/login'` 不会执行**，用户停留在错误页面且处于不一致的认证状态。

3. **不一致的认证状态** — token 被清除但 redirect_after_login 残留，用户下次登录时会被重定向到出错页面，可能再次触发错误，形成循环。

**修复建议**：

```typescript
handleReset = () => {
  try {
    const keysToRemove = ['token', 'user', 'selected_company', 'selected_project', 'redirect_after_login'];
    keysToRemove.forEach((key) => { try { localStorage.removeItem(key); } catch { /* skip */ } });
  } finally {
    window.location.href = '/login';
  }
};
```

---

## HIGH-2 — 无 DoS 防护：恶意数据可迫使所有用户反复"返回登录"

**位置**: 整个组件（L1-46）

**安全缺陷**：

1. **无错误计数与阈值** — 如果攻击者能够控制某个 API 响应的数据（如通过存储型 XSS 注入或 API 参数污染），使渲染持续崩溃，ErrorBoundary 会反复显示错误页面。用户的唯一操作是"返回登录"，之后重新导航到同一页面，再次崩溃。

2. **无限重登循环**：

```
攻击者污染数据 → 用户访问某页面 → 渲染崩溃 → ErrorBoundary 捕获
→ 用户"返回登录" → 重新登录 → 导航回该页面 → 再次崩溃
→ 循环 ... → 用户无法使用系统
```

3. **无错误频率监控** — `componentDidCatch` 不记录错误发生时间，无法检测短时间内重复触发的异常模式（可能是攻击信号）。

**修复建议**：

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  errorCount: number;
  lastErrorTime: number | null;
}

componentDidCatch(error: Error, info: React.ErrorInfo) {
  const now = Date.now();
  const count = this.state.errorCount + 1;
  // 5 分钟内连续崩溃 3 次以上，标记为持续性错误
  if (count >= 3 && this.state.lastErrorTime && now - this.state.lastErrorTime < 5 * 60 * 1000) {
    // 上报安全事件
    reportPersistentError({ count, timeWindow: '5min' });
  }
  this.setState({ errorCount: count, lastErrorTime: now });
}
```

---

## HIGH-3 — 错误边界不捕获事件处理器中的错误，安全事件盲区

**位置**: 整个组件设计

**安全缺陷**：

React Error Boundary 只能捕获以下场景的错误：
- 组件渲染（render）
- 生命周期方法（componentDidMount 等）
- 构造函数

**不能捕获**：
- 事件处理器中的错误（onClick、onSubmit 等）
- 异步代码（setTimeout、Promise 回调）
- 服务端渲染错误
- ErrorBoundary 自身的错误

这意味着如果安全关键操作（如表单提交、认证流程）在事件处理器中抛出异常，ErrorBoundary 不会捕获，可能导致：
- 白屏或挂起状态
- 用户不知道发生了什么
- 安全错误（如认证失败）被吞掉

**修复建议**：在 `App.tsx` 或全局层添加 `window.onerror` / `window.onunhandledrejection` 监听，作为 ErrorBoundary 的补充：

```typescript
useEffect(() => {
  const handleGlobalError = (event: ErrorEvent) => {
    console.error('[GlobalError]', event.error);
    // 上报到后端
  };
  const handleRejection = (event: PromiseRejectionEvent) => {
    console.error('[UnhandledRejection]', event.reason);
  };
  window.addEventListener('error', handleGlobalError);
  window.addEventListener('unhandledrejection', handleRejection);
  return () => {
    window.removeEventListener('error', handleGlobalError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
}, []);
```

---

## MEDIUM-1 — window.location.href 跳转无路径校验，子路径部署场景下暴露路径信息

**位置**: L26

```typescript
window.location.href = '/login';
```

**安全缺陷**：

1. **硬编码绝对路径** — 如果应用部署在子路径（如 `https://example.com/app/`），`/login` 会跳转到 `https://example.com/login`，而非 `https://example.com/app/login`。这可能导致：
   - 404 页面暴露服务器路径结构
   - 暴露应用部署在非根路径的信息

2. **与 apiClient.ts 的 401 处理重复** — `apiClient.ts` L17 也有 `window.location.href = '/login'`，同样的硬编码路径问题。两处独立维护，安全策略不同步。

3. **不经过路由守卫** — 直接 `window.location.href` 触发浏览器全量跳转，绕过 React Router 的路由守卫（`AuthGuard`），如果 `/login` 路由未来需要特殊处理（如 rate limiting），会被跳过。

**修复建议**：使用 Vite 的 base URL：

```typescript
window.location.href = import.meta.env.BASE_URL + 'login';
```

---

## MEDIUM-2 — localStorage key 列表与 AuthContext 重复维护，安全策略不一致

**位置**: L24

```typescript
const keysToRemove = ['token', 'user', 'selected_company', 'selected_project', 'redirect_after_login'];
```

**安全缺陷**：

1. **与 AuthContext.logout() 清除列表独立维护** — `AuthContext.tsx` L123-127 使用常量 `TOKEN_KEY`/`USER_KEY` + 硬编码字符串。ErrorBoundary 硬编码了完全相同的 5 个 key。如果未来新增安全相关的 localStorage key（如 `csrf_token`、`session_id`），两处需要同步更新。

2. **AuthContext 已有完整注销逻辑** — `AuthContext.logout()` 已实现：后端注销 + 清除所有 key + 跳转 login。ErrorBoundary 重新实现了一个不完整、不安全的版本。

3. **潜在的 key 遗漏** — 如果 `AppContext`（`context/AppContext.tsx`）新增了 localStorage key 但 ErrorBoundary 的列表未更新，错误恢复时这些 key 会残留。

**修复建议**：ErrorBoundary 应通过 props 或 context 获取 `logout` 函数，直接调用 `AuthContext.logout()`，而非重新实现清除逻辑。

---

## 正面安全评价

1. **不渲染错误详情** — render 方法中只显示通用文案"页面出现异常"，不暴露 error.message 或 error.stack，避免了通过 UI 的信息泄露。这是正确的安全实践。

2. **使用 antd Result 组件** — 而非直接渲染 HTML，避免了潜在的 XSS 向量。

3. **aria-live="assertive" + role="alert"** — 确保屏幕阅读器用户能感知错误状态，符合无障碍安全要求。

4. **日志包含组件标识** — `console.error('[ErrorBoundary]', ...)` 使用了前缀标识，便于日志过滤和事件关联。

---

## 修复优先级总结

| 优先级 | 编号 | 标题 | 安全影响 | 工作量 |
|--------|------|------|---------|--------|
| CRITICAL | C-1 | handleReset 绕过后端注销 | Token 泄露窗口 2h | 0.5h |
| CRITICAL | C-2 | 错误堆栈明文输出 console | 组件结构/API 路径泄露 | 0.5h |
| HIGH | H-1 | localStorage 无 try-catch | 异常路径 session 残留 | 0.2h |
| HIGH | H-2 | 无 DoS 防护/错误计数 | 恶意数据迫使反复登出 | 0.5h |
| HIGH | H-3 | 不捕获事件处理器错误 | 安全事件盲区 | 1h |
| MEDIUM | M-1 | 硬编码跳转路径 | 子路径部署泄露信息 | 0.2h |
| MEDIUM | M-2 | key 列表重复维护 | 清除策略不同步 | 0.3h |

**预计总修复工作量**: ~3.2h

---

## 修复后预期评分

完成 CRITICAL + HIGH 修复后预期评分：**7.5/10**
完成全部修复后预期评分：**8.5/10**

---

## 关联评审

| 评审类型 | 文件 | 评分 | 结论 |
|---------|------|------|------|
| 质量评审 | [ErrorBoundary.tsx.quality.md](ErrorBoundary.tsx.quality.md) | 6.2/10 | CONDITIONAL APPROVE |
| 架构评审 | [ErrorBoundary.tsx.architecture.md](ErrorBoundary.tsx.architecture.md) | 3.4/10 | REQUEST CHANGES |

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 文件 | pages/components/ErrorBoundary.tsx |
| 行数 | 46 |
| 评审类型 | 代码安全专家评审 |
| 评审日期 | 2026-05-26 |
| 关联文件 | pages/App.tsx:47-53, pages/context/AuthContext.tsx:116-130, pages/lib/apiClient.ts:14-17, apis/utils/token-blacklist.util.ts |
