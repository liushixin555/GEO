# 安全评审：pages/App.tsx

**评审日期**: 2026-05-24
**评审角色**: 代码安全专家（OWASP / CWE / 前端安全标准视角）
**评审范围**: 前端路由入口文件 `pages/App.tsx`（16行）及安全依赖链：`main.tsx` → `App.tsx` → `Layout.tsx` → `login/index.tsx` → `context/AppContext.tsx`
**关联文件**: `pages/main.tsx`, `pages/components/Layout.tsx`, `pages/login/index.tsx`, `pages/context/AppContext.tsx`, `pages/components/Sidebar.tsx`

---

## 1. 安全总体评级：C+（前端安全基础薄弱，存在多个可利用漏洞）

前端应用具备基本的认证流程（JWT + localStorage + verify API），但在关键安全域存在系统性缺陷：路由级别无权限控制、敏感数据明文存储于 localStorage、无 XSS 纵深防御、无错误边界隔离。

| 安全域 | 评分 | 状态 |
|--------|------|------|
| 认证（Authentication） | 6/10 | JWT 流程完整，但 token 存储方式有风险 |
| 授权（Authorization） | 3/10 | 路由级别无 RBAC，仅靠菜单隐藏 |
| 数据保护（Data Protection） | 3/10 | localStorage 明文存储 token + 用户角色 |
| XSS 防御（XSS Protection） | 2/10 | 无 CSP、无输出编码、localStorage 可被 XSS 读取 |
| 错误处理（Error Handling） | 2/10 | 无 Error Boundary，解析异常可导致白屏 |
| 会话管理（Session Management） | 5/10 | 2h 过期合理，但无客户端超时主动检查 |
| 传输安全（Transport Security） | 4/10 | 依赖后端 HTTPS，前端无强制校验 |

---

## 2. 漏洞清单（按 OWASP Top 10 2021 映射）

### SEC-FE-01: 路由级别无权限控制 — OWASP A01:2021 Broken Access Control

**严重度**: 🔴 HIGH
**位置**: `Layout.tsx:175-196`
**CWE**: CWE-863 (Incorrect Authorization)

```tsx
// Layout.tsx:175-196 — 所有路由对任何已认证用户开放
<Routes>
  <Route path="/sysadmin" element={<SystemAdminPage />} />    // 无角色检查
  <Route path="/users" element={<UserPage />} />              // 无角色检查
  <Route path="/company" element={<CompanyPage />} />         // 无角色检查
  // ... 全部 20+ 路由均无权限守卫
</Routes>
```

**风险分析**:
- 所有 20+ 条路由对**任何已认证用户开放**，无论角色
- 权限控制仅在 `Sidebar.tsx:62` 的菜单显示层面：
  ```tsx
  const visibleMenuItems = menuItems.filter((item) => item.roles.includes(userRole));
  ```
  这只是 **UI 隐藏**，不是 **访问控制**。用户可通过以下方式绕过：
  1. 直接在地址栏输入 `/sysadmin`、`/users`、`/company`
  2. 通过浏览器书签或历史记录访问
  3. 通过 DevTools 修改 React 状态绕过
- 虽然 API 层有 `roleMiddleware` 保护，但前端仍会：
  - 渲染不该看到的 UI 组件（信息泄露）
  - 发起不必要的 API 请求（服务器负载）
  - 显示 API 错误信息（暴露 API 结构）

**影响矩阵**:

| 角色 | 菜单可见 | 路由可达 | 泄露信息 |
|------|---------|---------|---------|
| view | /publish | 全部 20+ 路由 | 系统管理页面、用户列表、公司列表 |
| admin | 业务菜单 | 全部 20+ 路由 | 系统管理页面、用户管理 |

**修复方案**:

```tsx
// 方案1: 路由级权限守卫组件
const RoleGuard: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) {
    return <Result status="403" title="无权限访问" />;
  }
  return <>{children}</>;
};

// Layout.tsx 中使用
<Route path="/sysadmin" element={<RoleGuard roles={['sysadmin']}><SystemAdminPage /></RoleGuard>} />
<Route path="/users" element={<RoleGuard roles={['sysadmin']}><UserPage /></RoleGuard>} />
```

---

### SEC-FE-02: JWT Token 存储于 localStorage — OWASP A07:2021 Identification and Authentication Failures

**严重度**: 🔴 HIGH
**位置**: `login/index.tsx:26`, `Layout.tsx:70`
**CWE**: CWE-922 (Insecure Storage of Sensitive Information)

```tsx
// login/index.tsx:26 — 登录时存储
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));

// Layout.tsx:70 — 每次路由变化读取
const token = localStorage.getItem('token');
```

**风险分析**:
- localStorage 可被**同源下任何 JavaScript** 读取，包括 XSS 注入的脚本
- 一旦存在 XSS 漏洞（任何第三方依赖、任何页面的未编码输出），攻击者可：
  1. 读取 token → 冒充用户身份调用 API
  2. 读取 user 对象 → 获取用户角色、公司信息
  3. 修改 user 对象中的 `role` 字段为 `sysadmin` → 前端提权（虽然 API 层校验，但可看到管理 UI）
- localStorage 数据**不过期**，即使 token 已在服务端失效，localStorage 中仍保留
- 跨标签页共享 localStorage，多个标签页的认证状态互相影响

**修复方案**:

```tsx
// 方案1（推荐）: 使用 httpOnly Cookie 存储 token
// 后端设置 Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=7200
// 前端无需手动管理 token

// 方案2（渐进式）: 使用 sessionStorage + 内存存储
const AuthStore = {
  _token: null as string | null,
  getToken() { return this._token || sessionStorage.getItem('token'); },
  setToken(token: string) { this._token = token; sessionStorage.setItem('token', token); },
  clear() { this._token = null; sessionStorage.removeItem('token'); },
};
// sessionStorage 在标签页关闭后自动清除，且不跨标签页共享
```

---

### SEC-FE-03: localStorage 用户数据可被篡改实现前端提权 — OWASP A01:2021 Broken Access Control

**严重度**: 🟠 HIGH
**位置**: `Layout.tsx:84-86`
**CWE**: CWE-346 (Origin Validation Error)

```tsx
// Layout.tsx:84-86 — 直接解析 localStorage 中的用户数据
const userData = localStorage.getItem('user');
if (userData) {
  const parsed = JSON.parse(userData);
  setUser(parsed);  // parsed.role 可能被篡改
}
```

**风险分析**:
- `user` 对象从 localStorage 反序列化后**直接信任**，无任何校验
- 用户可通过 DevTools 修改 localStorage：
  ```javascript
  // 在浏览器控制台执行
  let user = JSON.parse(localStorage.getItem('user'));
  user.role = 'sysadmin';
  localStorage.setItem('user', JSON.stringify(user));
  // 刷新页面后，前端认为用户是 sysadmin
  ```
- 结合 SEC-FE-01（路由无 RBAC），攻击者可：
  1. 篡改 role → 看到管理菜单和页面
  2. 访问管理 UI → 向管理 API 发起请求（被后端拒绝，但 UI 已渲染）
  3. 管理页面的表单结构、字段名称等敏感信息已暴露

**修复方案**:

```tsx
// Layout.tsx — 不要信任 localStorage 中的用户数据
// verify API 返回的数据才是可信源
axios.get('/api/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
  .then((response) => {
    // 从服务端获取最新、可信的用户数据
    const serverUser = response.data.data;
    setUser(serverUser);
    // 更新 localStorage（可选，仅为缓存）
    localStorage.setItem('user', JSON.stringify(serverUser));
  });
```

---

### SEC-FE-04: 无 Error Boundary — 安全隔离缺失 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟠 HIGH
**位置**: `App.tsx`（缺失）、`main.tsx`（缺失）
**CWE**: CWE-755 (Improper Handling of Exceptional Conditions)

```tsx
// App.tsx — 无任何错误边界保护
const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<Layout />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};
```

**风险分析**:
- React 组件树中**无任何 Error Boundary**
- 以下代码路径可抛出未捕获异常，导致**整个应用白屏**：

  | 位置 | 异常原因 | 触发方式 |
  |------|---------|---------|
  | `Layout.tsx:86` | `JSON.parse(userData)` 数据损坏 | 篡改 localStorage |
  | `Layout.tsx:80` | `axios.get('/api/auth/verify')` 网络异常 | 断网、DNS 劫持 |
  | 任意子页面 | 渲染时 null 引用、类型错误 | 正常使用中的 bug |
  | `AppContext.tsx:34` | `JSON.parse(c)` localStorage 损坏 | XSS 注入或手动篡改 |

- 白屏后的安全影响：
  1. 用户无法操作，可能刷新页面重试（如果是恶意数据导致，会持续白屏）
  2. 无法正常登出，token 残留在 localStorage
  3. 可能诱导用户执行不安全的恢复操作（清除缓存、禁用安全扩展等）

**修复方案**:

```tsx
// pages/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  handleReset = () => {
    localStorage.clear();
    window.location.href = '/login';
  };
  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="页面出现异常"
          subTitle="请尝试刷新页面，如果问题持续请联系管理员"
          extra={<Button type="primary" onClick={this.handleReset}>返回登录</Button>}
        />
      );
    }
    return this.props.children;
  }
}

// App.tsx 中使用
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<Layout />} />
      </Routes>
    </ErrorBoundary>
  );
};
```

---

### SEC-FE-05: JSON.parse 无异常保护 — 可被利用造成拒绝服务 — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟠 MEDIUM
**位置**: `Layout.tsx:86`, `AppContext.tsx:34`
**CWE**: CWE-755 (Improper Handling of Exceptional Conditions)

```tsx
// Layout.tsx:86 — 无 try-catch
const userData = localStorage.getItem('user');
if (userData) {
  const parsed = JSON.parse(userData);  // 可能抛出 SyntaxError
  setUser(parsed);
}

// AppContext.tsx:34 — 有 try-catch ✅
const c = localStorage.getItem(COMPANY_KEY);
return {
  company: c ? JSON.parse(c) : null,  // 在 try-catch 内
};
```

**风险分析**:
- `Layout.tsx:86` 的 `JSON.parse(userData)` **无 try-catch 保护**
- 攻击向量：
  1. 通过 XSS 注入修改 `localStorage.user` 为非法 JSON
  2. 用户手动编辑 localStorage
  3. 浏览器存储损坏
- 结果：`SyntaxError` 异常向上传播，因无 Error Boundary，导致白屏
- `AppContext.tsx` 正确使用了 try-catch，但 `Layout.tsx` 遗漏

**修复方案**:

```tsx
// Layout.tsx — 添加 try-catch
const userData = localStorage.getItem('user');
if (userData) {
  try {
    const parsed = JSON.parse(userData);
    setUser(parsed);
  } catch {
    localStorage.removeItem('user');
    // 解析失败，让 verify API 重新获取
  }
}
```

---

### SEC-FE-06: 登录重定向未校验 — 潜在开放重定向 — OWASP A01:2021 Broken Access Control

**严重度**: 🟡 MEDIUM
**位置**: `login/index.tsx:30-34`, `Layout.tsx:73,99`
**CWE**: CWE-601 (URL Redirection to Untrusted Site)

```tsx
// Layout.tsx:73 — 存储当前路径
if (location.pathname !== '/login') {
  localStorage.setItem('redirect_after_login', location.pathname);
}

// login/index.tsx:30-34 — 登录后重定向
const redirectTo = !user.selected_project
  ? '/project'
  : (localStorage.getItem('redirect_after_login') || '/publish');
navigate(redirectTo);  // React Router 的 navigate 限制为内部路由
```

**风险分析**:
- `location.pathname` 由 React Router 管理，正常情况下不会是外部 URL
- `localStorage.getItem('redirect_after_login')` 可被 XSS 修改为恶意值
- React Router v6 的 `navigate()` 函数**仅处理内部路由**，不会导航到外部域名（`navigate('//evil.com')` 会变成 `http(s)://current-host//evil.com`，而非外部站点）
- **实际风险较低**：React Router 提供了隐式保护
- 但仍属于不安全的编码模式：直接信任未经校验的客户端输入

**修复方案**:

```tsx
// login/index.tsx — 校验重定向路径
const validateRedirect = (path: string | null): string => {
  if (!path) return '/publish';
  // 仅允许 / 开头的内部路径
  if (path.startsWith('/') && !path.startsWith('//')) {
    return path;
  }
  return '/publish';
};

const redirectTo = !user.selected_project
  ? '/project'
  : validateRedirect(localStorage.getItem('redirect_after_login'));
localStorage.removeItem('redirect_after_login');
navigate(redirectTo);
```

---

### SEC-FE-07: Verify API 过度调用 — 可被滥用进行 DoS — OWASP A05:2021 Security Misconfiguration

**严重度**: 🟡 MEDIUM
**位置**: `Layout.tsx:69-104`
**CWE**: CWE-770 (Allocation of Resources Without Limits)

```tsx
// Layout.tsx:69-105 — useEffect 依赖 location.pathname
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) { /* ... */ return; }
  axios.get('/api/auth/verify', { /* ... */ });  // 每次路由变化都调用
}, [location.pathname]);  // 依赖路由路径
```

**风险分析**:
- 每次路由变化（`location.pathname` 改变）都触发 `/api/auth/verify` 调用
- 在包含 20+ 路由的应用中，用户正常浏览即可产生大量 verify 请求
- 攻击场景：
  1. 恶意脚本通过 `history.pushState` 快速切换路由
  2. 每次切换触发 verify API 调用
  3. 结合后端 rate-limit（100次/分钟），正常用户可能被限流
- 正常使用中：用户浏览 10 个页面 = 10 次 verify API 调用，不必要
- 额外风险：verify 失败后（`catch` 块）清除 token 并重定向到 login，但**不阻止后续路由变化的 useEffect 执行**

**修复方案**:

```tsx
// 方案1: 仅在首次挂载时验证 token
const [verified, setVerified] = useState(false);

useEffect(() => {
  if (verified) return;
  const token = localStorage.getItem('token');
  if (!token) { setLoading(false); return; }
  axios.get('/api/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
    .then(() => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try { setUser(JSON.parse(userData)); } catch { localStorage.removeItem('user'); }
      }
      setVerified(true);
    })
    .catch(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    })
    .finally(() => setLoading(false));
}, []); // 仅挂载时执行一次

// 方案2: 使用 axios 拦截器统一处理 401（更推荐）
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

### SEC-FE-08: 登出流程使用 window.location.href — 状态残留风险 — OWASP A07:2021 Identification and Authentication Failures

**严重度**: 🟡 MEDIUM
**位置**: `Layout.tsx:107-124`
**CWE**: CWE-459 (Incomplete Cleanup)

```tsx
const handleLogout = async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      await axios.post('/api/auth/logout', null, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore logout API errors — client cleanup is the priority
    }
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('selected_company');
  localStorage.removeItem('selected_project');
  setUser(null);
  window.location.href = '/login';  // 完整页面刷新
};
```

**风险分析**:
- 登出流程基本完整：调用后端 API → 清除 localStorage → 清除状态 → 跳转
- `window.location.href = '/login'` 触发完整页面刷新，确保所有内存状态被清除 ✅
- **问题**：
  1. `redirect_after_login` 未在登出时清除 — 下次登录可能被重定向到登出前的页面（低风险）
  2. 如果 `/api/auth/logout` 调用超时（网络问题），`await` 会延迟后续的清理操作
  3. Service Worker（如果未来添加）可能缓存了包含敏感数据的页面
- 后端 logout API 失败被静默忽略（`catch {}`），这在安全性上可接受（客户端清理优先）

**修复方案**:

```tsx
const handleLogout = async () => {
  const token = localStorage.getItem('token');
  if (token) {
    axios.post('/api/auth/logout', null, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});  // 不 await，fire-and-forget
  }
  // 立即清理，不等后端响应
  localStorage.clear();  // 清除所有 localStorage 数据
  setUser(null);
  window.location.href = '/login';
};
```

---

### SEC-FE-09: 无 Content Security Policy — XSS 纵深防御缺失 — OWASP A03:2021 Injection

**严重度**: 🟡 MEDIUM
**位置**: `vite.config.ts`（前端构建配置）、`pages/index.html`
**CWE**: CWE-693 (Protection Mechanism Failure)

```html
<!-- pages/index.html — 无 CSP meta 标签 -->
<meta http-equiv="Content-Security-Policy" content="...">  <!-- 缺失 -->
```

**风险分析**:
- 前端 SPA 无 CSP（Content Security Policy）保护
- 如果存在任何 XSS 注入点（第三方依赖、用户输入渲染），攻击者可：
  1. 注入 `<script>` 标签执行任意代码
  2. 读取 localStorage 中的 token 和用户数据
  3. 向 API 发起请求（同源，CORS 不限制）
- 前端使用了以下外部资源：
  - `@fontsource/ibm-plex-sans` — 已本地化打包，不依赖 CDN ✅
  - antd 组件库 — 已本地化打包 ✅
  - 但如果未来引入任何 CDN 资源，风险会增加
- React 的 JSX 默认对输出进行 HTML 编码，降低了 XSS 风险，但不足以作为唯一防线

**修复方案**:

```html
<!-- pages/index.html — 添加 CSP meta 标签 -->
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self';">
```

注：`'unsafe-inline'` 对 antd 的内联样式是必需的，如果使用 antd 的 CSS-in-JS，可能还需要 `'unsafe-eval'`。在生产环境建议通过 Nginx 配置 CSP 头而非 meta 标签。

---

### SEC-FE-10: 认证状态竞态条件 — 登录闪烁 — OWASP A04:2021 Insecure Design

**严重度**: 🟢 LOW
**位置**: `login/index.tsx:12-16` ↔ `Layout.tsx:69-104`
**CWE**: CWE-367 (Time-of-check Time-of-use Race Condition)

```tsx
// login/index.tsx:12 — 仅检查 token 是否存在
useEffect(() => {
  const token = localStorage.getItem('token');
  if (token) navigate('/publish', { replace: true });  // 不验证有效性
}, [navigate]);

// Layout.tsx:79 — verify API 检查有效性
axios.get('/api/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
  .catch(() => { localStorage.removeItem('token'); });  // 失败才清除
```

**风险分析**:
- 当 token 已过期时出现竞态：
  1. 用户访问 `/login`
  2. LoginPage 检测到 localStorage 有 token → 跳转到 `/publish`
  3. Layout 调用 verify API → 返回 401 → 清除 token → 跳转回 `/login`
  4. 用户看到页面闪烁：`/login` → `/publish` → `/login`
- **安全影响**：闪烁期间 Layout 的子组件可能短暂渲染，泄露页面结构
- **用户体验影响**：明显的页面跳转闪烁，不专业

**修复方案**:

```tsx
// login/index.tsx — 也验证 token 有效性
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) return;
  axios.get('/api/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
    .then(() => navigate('/publish', { replace: true }))
    .catch(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
}, [navigate]);
```

---

### SEC-FE-11: 多标签页认证状态不同步 — OWASP A07:2021 Identification and Authentication Failures

**严重度**: 🟢 LOW
**位置**: `Layout.tsx:69-104`
**CWE**: CWE-613 (Insufficient Session Expiration)

**风险分析**:
- 用户在标签页 A 登出（清除 localStorage）后：
  - 标签页 B 的 React 状态仍保留旧 `user` 对象
  - 直到 `location.pathname` 变化触发 useEffect，才会重新检查
  - 期间标签页 B 仍可操作，API 请求使用已失效的 token（会收到 401）
- 反向场景：标签页 A 登录，标签页 B 不会自动感知
- `localStorage` 的 `storage` 事件仅在**其他标签页**触发，当前标签页不触发

**修复方案**:

```tsx
// Layout.tsx — 监听 storage 事件实现跨标签页同步
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'token' && !e.newValue) {
      // 其他标签页登出，当前标签页同步清除
      setUser(null);
    }
    if (e.key === 'token' && e.newValue) {
      // 其他标签页登录，当前标签页重新验证
      // 可选：自动刷新或提示用户
    }
  };
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

---

### SEC-FE-12: 路由死代码 — 认证用户访问根路径被强制跳转到登录页 — OWASP A04:2021 Insecure Design

**严重度**: 🟢 LOW
**位置**: `App.tsx:11`
**CWE**: CWE-617 (Reachable Assertion)

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/*" element={<Layout />} />            // 通配符匹配一切
  <Route path="/" element={<Navigate to="/login" replace />} />  // 死代码
</Routes>
```

**风险分析**:
- React Router v6 在同一 `<Routes>` 中按**路径特异性**排序，精确路径优先于通配符
- 因此 `path="/"` 的优先级高于 `path="/*"`，会被匹配
- 这意味着**已认证用户访问 `/` 时被强制跳转到 `/login`**
- 登录页逻辑：检测到 token → 跳转到 `/publish`（`login/index.tsx:14`）
- 结果：已认证用户访问 `/` → `/login` → `/publish`（两次跳转）
- **安全影响**：无直接安全风险，但额外的 `/login` 访问会触发 LoginPage 的 useEffect，如果 token 已过期但 localStorage 仍有值，会产生不必要的 API 请求

**修复方案**:

```tsx
// App.tsx — 移除死路由
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/*" element={<Layout />} />
  {/* 移除 "/" 路由，Layout 中已有兜底的 Navigate → /publish */}
</Routes>
```

---

## 3. 攻击面分析

### 3.1 攻击面矩阵

| 攻击向量 | 前置条件 | 可利用性 | 影响 | 当前防护 |
|----------|---------|----------|------|----------|
| 前端提权（篡改 localStorage role） | 物理访问 / XSS | 中 | 管理页面信息泄露 | ❌ 无前端校验 |
| Token 窃取（XSS → localStorage） | XSS 漏洞 | 中 | 账号完全接管 | ❌ 无 CSP |
| 路由越权访问 | 已认证用户 | 高 | 管理页面信息泄露 | ❌ 仅菜单隐藏 |
| localStorage 损坏导致白屏 DoS | 物理访问 / XSS | 低 | 应用不可用 | ❌ 无 Error Boundary |
| Token 过期后页面闪烁 | 自动触发 | 高 | 用户体验差 | ❌ 无预检查 |
| 跨标签页状态不一致 | 多标签页使用 | 中 | 操作已失效会话 | ❌ 无 storage 监听 |

### 3.2 最危险攻击链（SEC-FE-02 → SEC-FE-01 → SEC-FE-03）

```
1. 攻击者发现 XSS 漏洞（第三方依赖 / 未编码输出）
   ↓
2. 注入 JavaScript 读取 localStorage.token
   ↓
3. 使用窃取的 token 调用 API（同源，浏览器自动带 token）
   ↓
4. 同时修改 localStorage.user.role = 'sysadmin'
   ↓
5. 前端渲染管理页面，暴露管理 UI 结构和数据字段
   ↓
6. 虽然管理 API 调用被后端 RBAC 拒绝，但页面结构已泄露
```

**关键节点**: XSS → localStorage token 窃取。CSP 是阻断此链条的关键防线。

---

## 4. 安全合规性检查

| 检查项 | 标准 | 状态 | 备注 |
|--------|------|------|------|
| 前端路由 RBAC | 按角色限制页面访问 | ❌ | 仅菜单隐藏 |
| Token 安全存储 | httpOnly Cookie 或加密存储 | ❌ | localStorage 明文 |
| XSS 纵深防御 | CSP + 输出编码 | ⚠️ | React JSX 编码，无 CSP |
| 错误隔离 | Error Boundary | ❌ | 无任何错误边界 |
| 会话超时 | 客户端主动检查 | ⚠️ | 依赖 API 401 被动触发 |
| 登出完整性 | 清除所有客户端状态 | ⚠️ | `redirect_after_login` 未清除 |
| 跨标签页同步 | storage 事件监听 | ❌ | 无同步机制 |
| 重定向安全 | 白名单校验 | ⚠️ | React Router 隐式保护 |

---

## 5. 修复优先级路线图

### P0: 必须修复（阻断攻击链/防止信息泄露）

| 编号 | 安全问题 | 工作量 | 风险降低 |
|------|---------|--------|----------|
| SEC-FE-01 | 路由级 RBAC 权限守卫 | 2h | 🔴→🟢 |
| SEC-FE-04 | 添加 Error Boundary | 1h | 🟠→🟢 |
| SEC-FE-05 | JSON.parse 添加 try-catch | 0.5h | 🟠→🟢 |

### P1: 建议修复（增强安全纵深）

| 编号 | 安全问题 | 工作量 | 风险降低 |
|------|---------|--------|----------|
| SEC-FE-02 | Token 迁移至 httpOnly Cookie | 4h | 🔴→🟢 |
| SEC-FE-03 | 用户数据从服务端获取 | 1h | 🟠→🟢 |
| SEC-FE-07 | Verify API 调用优化 | 1h | 🟡→🟢 |
| SEC-FE-09 | 添加 CSP 头 | 1h | 🟡→🟢 |
| SEC-FE-10 | Login 页面 token 预检查 | 0.5h | 🟢→🟢 |

### P2: 可选优化（长期安全改进）

| 编号 | 安全问题 | 工作量 | 风险降低 |
|------|---------|--------|----------|
| SEC-FE-06 | 重定向路径校验 | 0.5h | 🟡→🟢 |
| SEC-FE-08 | 登出流程优化 | 0.5h | 🟡→🟢 |
| SEC-FE-11 | 跨标签页同步 | 1h | 🟢→🟢 |
| SEC-FE-12 | 移除路由死代码 | 0.1h | 🟢→🟢 |

---

## 6. 与已有评审的关系

### 6.1 与 `tasks/review/App.tsx.md`（软件架构评审）的关系

| 本评审编号 | 架构评审编号 | 关系 | 说明 |
|-----------|-------------|------|------|
| SEC-FE-01 | ARCH-06 | 相同问题，安全视角 | 架构评审关注可维护性，安全评审关注信息泄露 |
| SEC-FE-04 | ARCH-04 | 相同问题，安全视角 | 架构评审关注稳定性，安全评审关注 DoS |
| SEC-FE-05 | — | 新增 | 架构评审未单独列出 JSON.parse 问题 |
| SEC-FE-07 | ARCH-09 | 部分重叠 | 架构评审关注竞态条件，安全评审关注 DoS 滥用 |

### 6.2 与 `tasks/review/app.md`（后端安全评审）的关系

| 前端问题 | 后端对应 | 纵深防御分析 |
|---------|---------|-------------|
| SEC-FE-01 路由无 RBAC | SEC-06 静态文件无认证 | 两层均缺失访问控制 |
| SEC-FE-02 localStorage token | SEC-02 JWT 默认密钥 | 前端存储 + 后端弱密钥 = 双重风险 |
| SEC-FE-09 无 CSP | SEC-04 Helmet 配置不足 | 后端 CSP 对 SPA 无效，需前端/CDN 层配置 |

---

## 7. 结论

`pages/App.tsx` 虽然仅有 16 行代码，但其路由架构引发了**前端安全防御体系的系统性缺失**：

1. **最严重问题**: 路由级别无 RBAC（SEC-FE-01）导致任何已认证用户可访问管理页面，结合 localStorage 用户数据可被篡改（SEC-FE-03），构成前端提权风险
2. **最紧迫问题**: 无 Error Boundary（SEC-FE-04）和 JSON.parse 无异常保护（SEC-FE-05），恶意数据可导致应用白屏 DoS
3. **最深远的架构问题**: JWT Token 存储于 localStorage（SEC-FE-02），一旦存在 XSS 漏洞即可被窃取，且无 CSP（SEC-FE-09）作为纵深防御
4. **最影响用户体验的问题**: Token 过期后的页面闪烁（SEC-FE-10）和 Verify API 过度调用（SEC-FE-07）

**综合安全评级: C+** — 前端安全基础薄弱，建议在下一个迭代中完成 P0 三项修复，并规划 P1 的 Token 存储迁移和 CSP 配置。

---

*代码安全专家评审完成 — 2026-05-24*
