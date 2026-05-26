# Layout.tsx 安全评审

**文件**: `pages/components/Layout.tsx` (85行)
**评审维度**: 安全（Security）
**评审日期**: 2026-05-26
**评审基线**: OWASP Top 10 2021 + CWE + AuthContext 信任链分析 + 事件监听器生命周期审计
**关联评审**: 质量评审 7.0/10（`Layout.tsx.architecture.md`）、架构评审 6.8/10（`Layout.tsx.architecture-review.md`）

---

## 评审结论

**评分: 6.5/10 — CONDITIONAL APPROVE**

Layout.tsx 作为前端认证守卫的最后一道防线和页面布局的顶层容器，在事件清理、ARIA 可访问性方面表现良好。但存在 2 项 HIGH + 5 项 MEDIUM 安全缺陷：认证守卫缺乏重定向致信息泄露窗口（H-1）、loading 状态未检查致认证间隙渲染（H-2）、resize 无节流 DoS（M-1）、Sider 折叠态 DOM 残留（M-2）、认证信任链单点依赖（M-3）、Escape 键全局监听冲突（M-4）、skip-to-content 锚点劫持（M-5）。

---

## 发现清单

| 级别 | 编号 | 问题 | OWASP/CWE |
|------|------|------|-----------|
| **HIGH** | H-1 | 认证失败返回 null 无重定向，存在信息泄露窗口 | A01:2021/CWE-200 |
| **HIGH** | H-2 | `loading` 状态未检查，认证间隙渲染不完整内容 | A07:2021/CWE-367 |
| **MEDIUM** | M-1 | resize 事件监听无节流，可被利用为微 DoS 向量 | A05:2021/CWE-770 |
| **MEDIUM** | M-2 | 移动端 Sider `collapsedWidth=0` 仍保留 DOM，信息可提取 | A01:2021/CWE-200 |
| **MEDIUM** | M-3 | 认证信任链单一依赖 AuthContext，无纵深验证 | A07:2021/CWE-287 |
| **MEDIUM** | M-4 | Escape 键监听绑定 document 范围过宽，可与 Modal/Dropdown 冲突 | N/A/CWE-1023 |
| **MEDIUM** | M-5 | `<a href="#main-content">` 锚点可被 URL fragment 劫持 | A01:2021/CWE-601 |

---

## 详细分析

### H-1: 认证失败返回 null 无重定向 — 信息泄露窗口

**位置**: 第39行
```typescript
if (!user) return null;
```

**问题**: 当 `user` 为 null 时，Layout 直接返回 null，不执行重定向到登录页。虽然 routes.tsx 的 `<AuthGuard>` 已在路由层做重定向，但 Layout 作为组件树中的第二道守卫，返回 null 意味着：

1. **渲染空白页面**：用户看到完全空白的内容，没有"未登录"提示或跳转
2. **时序攻击窗口**：如果 AuthGuard 因代码重构被移除或绕过，Layout 的 `return null` 不会阻止已加载的 JS bundle 继续执行，攻击者可利用控制台访问组件树
3. **不完整的防御纵深**：认证守卫应该有明确的失败动作（重定向或错误页面），静默返回 null 违反 fail-safe 原则

**OWASP**: A01:2021 Broken Access Control — 认证失败无明确拒绝动作
**CWE**: CWE-200 Exposure of Sensitive Information — 空白页泄露"此路由有保护"信息

**修复建议**:
```typescript
const { user, loading, logout } = useAuth();

if (loading) return <PageLoading />;
if (!user) {
  window.location.href = '/login';
  return null;
}
```

---

### H-2: loading 状态未检查 — 认证间隙渲染

**位置**: 第13行 vs 第39行
```typescript
const { user } = useAuth(); // ← 未解构 loading
// ...
if (!user) return null;     // ← 无法区分"验证中"和"未认证"
```

**问题**: AuthContext 提供 `loading` 状态表示正在向 `/api/v1/auth/verify` 验证 token。Layout 忽略了此状态，导致：

1. **TOCTOU 竞态**：在 `loading=true` 且 `user=null` 的窗口期（服务器验证 token 的 ~200ms），Layout 返回 null。但 `user` 可能在验证通过后突然从 null 变为有效对象，触发完整布局渲染。攻击者可利用此时序差异推测认证状态
2. **闪屏攻击**：认证中 → 空白 → 认证成功 → 完整 UI 的跳变可被用于 UI redressing
3. **无法区分状态**：`!user` 混合了"正在验证"和"验证失败"两种语义上完全不同的状态

**OWASP**: A07:2021 Identification and Authentication Failures — 认证状态不完整
**CWE**: CWE-367 Time-of-check Time-of-use (TOCTOU) Race Condition

**修复建议**:
```typescript
const { user, loading } = useAuth();

if (loading) return <PageLoading />;
if (!user) return <Navigate to="/login" replace />;
```

---

### M-1: resize 事件监听无节流 — 微 DoS 向量

**位置**: 第17-22行
```typescript
useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

**问题**: `resize` 事件在窗口拖动时以约 60fps 触发（Chrome 在每帧触发一次），每次触发 `setIsMobile` 导致 React reconciliation。攻击者可通过以下方式利用：

1. **自动化脚本**：在 XSS 上下文中用 `window.dispatchEvent(new Event('resize'))` 高频触发（>1000次/秒），导致主线程阻塞
2. **低端设备**：在移动设备上拖动调整窗口大小时，可能导致帧率下降到不可用水平

**OWASP**: A05:2021 Security Misconfiguration — 无节流的 DOM 事件监听
**CWE**: CWE-770 Allocation of Resources Without Limits or Throttling

**修复建议**: 添加 150ms debounce：
```typescript
useEffect(() => {
  let timer: ReturnType<typeof setTimeout>;
  const checkMobile = () => {
    clearTimeout(timer);
    timer = setTimeout(() => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT), 150);
  };
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => { clearTimeout(timer); window.removeEventListener('resize', checkMobile); };
}, []);
```

---

### M-2: 移动端 Sider collapsedWidth=0 DOM 残留 — 信息可提取

**位置**: 第52-62行
```tsx
<Sider
  width={240}
  collapsedWidth={isMobile ? 0 : 64}
  collapsed={collapsed}
  // ...
>
  <Sidebar collapsed={collapsed} onCollapse={setCollapsed} isMobile={isMobile} />
</Sider>
```

**问题**: 当 `collapsedWidth=0` 时，Ant Design Sider 将宽度设为 0px，但 DOM 节点（含完整 Sidebar 内容）仍存在于文档树中：

1. **DevTools 可见**：攻击者可通过浏览器 DevTools 直接查看折叠侧边栏的完整 DOM 结构，提取菜单项、路由路径、功能模块名称
2. **屏幕阅读器**：未设置 `aria-hidden="true"` 的折叠 Sider 内容可能被屏幕阅读器读取
3. **CSS 覆写**：攻击者可通过 CSS 注入（如浏览器扩展或 XSS）覆写 `width: 0` 使 Sider 可见

**修复建议**: 在移动端折叠时条件渲染 Sider，而非依赖 CSS 隐藏：
```tsx
{(isMobile && !collapsed) && (
  <Sider width={240} collapsedWidth={0} ...>
    <Sidebar ... />
  </Sider>
)}
```

---

### M-3: 认证信任链单一依赖 — 无纵深验证

**位置**: 第13行
```typescript
const { user } = useAuth();
```

**问题**: Layout 将完整的认证信任委托给 AuthContext，自身不执行任何验证：

1. **AuthContext 信任链**: `useAuth()` → `localStorage.getItem('user')` → JSON.parse → setUser。虽然 AuthContext 在 mount 时会调用 `/api/v1/auth/verify` 验证 token，但后续跨标签同步（storage event handler）直接 `JSON.parse(e.newValue)` 并信任其 `role` 字段
2. **XSS 攻击面**: 如果应用中存在 XSS 漏洞，攻击者可执行 `localStorage.setItem('user', JSON.stringify({id:1, role:'sysadmin', ...}))` 提升权限，Layout 会无条件信任此数据
3. **无本地校验**: Layout 不检查 user.role 的合法性（AuthContext 的 `isValidRole` 有 fallback 到 VIEW，但 Layout 不感知）

**OWASP**: A07:2021 Identification and Authentication Failures
**CWE**: CWE-287 Improper Authentication — 信任未经独立验证的数据源

**修复建议**: 在 Layout 中添加轻量级防御性校验：
```typescript
const { user, loading } = useAuth();

if (!user || !isValidRole(user.role)) {
  return <Navigate to="/login" replace />;
}
```

---

### M-4: Escape 键监听绑定 document 范围过宽

**位置**: 第30-37行
```typescript
useEffect(() => {
  if (!isMobile || collapsed) return;
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setCollapsed(true);
  };
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [isMobile, collapsed]);
```

**问题**: Escape 键监听绑定在 `document` 上，优先级与 antd 组件冲突：

1. **Modal 冲突**: antd Modal 使用 Escape 键关闭。Layout 的监听器可能先于 Modal 捕获 Escape 事件，导致侧边栏关闭而非 Modal 关闭
2. **Dropdown/Select 冲突**: antd Dropdown 和 Select 也监听 Escape。如果用户在侧边栏展开时操作下拉菜单，Escape 可能触发非预期行为
3. **缺乏 event.stopPropagation() 策略**: 没有检查事件来源是否在特定容器内

**修复建议**: 检查事件目标是否在 Sider 外部：
```typescript
const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && !(e.target as HTMLElement).closest('.ant-modal, .ant-dropdown, .ant-select')) {
    setCollapsed(true);
  }
};
```

---

### M-5: skip-to-content 锚点可被 URL fragment 劫持

**位置**: 第75行
```tsx
<a href="#main-content" className="skip-to-content">跳到主要内容</a>
```

**问题**: `href="#main-content"` 使用 URL fragment 导航：

1. **CSS 注入攻击向量**: 如果攻击者能控制 URL（如钓鱼链接 `https://app.example.com/#main-content<style>...`），某些浏览器可能意外解释 fragment 后的内容
2. **focus 劫持**: 攻击者可构造 `https://app.example.com/#main-content` 使页面自动滚动到 main-content 区域，跳过可能包含安全提示的顶部区域
3. **实际风险较低**: 现代 React SPA 中 fragment 主要用于路由（hash router），实际被利用的可能性较小

**OWASP**: A01:2021 Broken Access Control
**CWE**: CWE-601 URL Redirection to Untrusted Site

**修复建议**: 使用 JavaScript focus 管理替代锚点导航：
```tsx
const handleSkip = (e: React.KeyboardEvent) => {
  e.preventDefault();
  document.getElementById('main-content')?.focus();
};
<a href="#main-content" onClick={handleSkip} onKeyDown={handleSkip} className="skip-to-content">
```

---

## 安全维度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| **认证与授权** | 6/10 | 防御性 `!user` 检查存在但无重定向，loading 状态未处理 |
| **输入验证** | 8/10 | 无用户输入直接处理，依赖 antd 组件内部验证 |
| **XSS 防护** | 9/10 | 无 dangerouslySetInnerHTML，className 拼接安全，依赖 React 自动转义 |
| **信息泄露** | 6/10 | Sider DOM 残留、认证状态空白泄露 |
| **DoS 防护** | 5/10 | resize 无节流，Escape 监听无冲突防护 |
| **信任链** | 5/10 | 完全依赖 AuthContext，无独立验证层 |
| **事件安全** | 7/10 | 清理函数完整，但 Escape 作用域过宽 |

---

## 正面评价

| 维度 | 评价 |
|------|------|
| **事件清理** | 三个 useEffect 均返回 cleanup 函数，无事件监听器泄漏 |
| **XSS 防护** | 纯 React JSX 渲染，无 dangerouslySetInnerHTML，无用户输入拼接 |
| **ARIA 可访问性** | skip-to-content、aria-label、aria-hidden、role="presentation" 覆盖完整 |
| **分层防御** | AuthGuard（路由层）+ Layout `!user` 检查（组件层），形成两层认证保护 |
| **antd 合规** | 使用 AntLayout/Sider/Content/Button，符合项目铁律 |
| **遮罩安全性** | 移动端遮罩 `aria-hidden="true"` + `role="presentation"` 防止屏幕阅读器误触 |

---

## 修复优先级建议

| 优先级 | 编号 | 工时预估 |
|--------|------|----------|
| P0 | H-1 认证失败重定向 | 15min |
| P0 | H-2 loading 状态处理 | 15min |
| P1 | M-1 resize 节流 | 15min |
| P1 | M-3 认证纵深验证 | 20min |
| P2 | M-2 Sider DOM 残留 | 10min |
| P2 | M-4 Escape 冲突防护 | 15min |
| P3 | M-5 锚点安全增强 | 10min |

**总工时预估**: ~1.5h

---

## 修复后预期评分

修复 H-1 + H-2 + M-1 + M-3 后，预期可达 **8.5/10 APPROVE**。
