# 安全评审：pages/components/Sidebar.tsx

**文件**: `pages/components/Sidebar.tsx` (131行)
**评审日期**: 2026-05-26
**评审角色**: 代码安全专家
**综合评分**: 6.2 / 10

---

## 评审维度评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 权限控制 | 4.0/10 | view 角色越权访问发布管理，违反项目铁律 |
| 认证信任边界 | 6.0/10 | 角色数据来自 AuthContext，但存在 localStorage 回退信任链 |
| 路由安全 | 6.5/10 | 前缀匹配可被路径构造绕过，无路由守卫在 Sidebar 层 |
| XSS/注入防护 | 9.0/10 | React JSX 自动转义，无 dangerouslySetInnerHTML，安全 |
| 信息泄露 | 7.5/10 | 折叠态 Tooltip 泄露用户名，角色信息客户端可枚举 |
| 会话安全 | 7.0/10 | logout 调用 API+清除 localStorage，但无 token 过期 UI 提示 |

---

## 安全亮点（值得肯定）

1. **React JSX 内置 XSS 防护** — `cnName`（用户姓名）通过 `{cnName}` 渲染，React 自动 HTML 转义，无注入风险
2. **菜单路径硬编码** — `menuItems` 中的 `path` 值为静态字符串常量，不接受外部输入，不存在开放重定向或路径遍历风险
3. **空角色默认拒绝** — `user?.role ?? ''` 在 user 为 null 时返回空字符串，`item.roles.includes('')` 永远为 false，等于拒绝所有菜单访问
4. **logout 清理完整** — AuthContext 的 `logout` 调用后端黑名单 API + 清除全部 localStorage 键值 + 强制跳转 `/login`
5. **aria-label 无注入面** — `aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}` 使用静态字符串模板，无动态拼接风险

---

## 问题清单

### CRITICAL（必须修复）

#### SEC-C1. view 角色越权访问「发布管理」，违反最小权限原则

- **位置**: `Sidebar.tsx:41`
- **代码**:
  ```typescript
  { label: '发布管理', path: '/publish', roles: ['sysadmin', 'admin', 'view'], icon: <TrophyOutlined /> },
  ```
- **威胁模型**: view 角色用户登录后可看到「发布管理」菜单入口，点击后导航到 `/publish` 页面
- **证据链**:
  - Sidebar.tsx:41 — 菜单项允许 view 角色
  - routes.tsx:63 — 路由配置同样允许 view 角色：`{ path: '/publish', roles: ['sysadmin', 'admin', 'view'] }`
  - routes.tsx:83 — 未授权角色默认重定向到 `/publish`：`<Navigate to="/publish" replace />`
  - routes.tsx:87 — 未知路径也重定向到 `/publish`：`<Route path="*" element={<Navigate to="/publish" replace />} />`
- **CLAUDE.md 铁律冲突**: "view 角色只有被授权后查看每日检测报告的权限（每日检测功能待开发），除此之外没有任何任何权限"
- **影响**:
  1. view 角色可查看发布管理页面，获取业务敏感数据（发布计划、文章发布状态等）
  2. routes.tsx 将 `/publish` 作为所有未授权路由的 fallback 目标，等于将 view 角色的默认落脚点设在一个它不该访问的页面
  3. 即使后端 API 拦截了写操作，只读数据泄露仍然发生
- **CVSS 评估**: AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N → **3.5 (LOW)**（前端越权，后端应有二次防护）
- **修复方案**:
  ```typescript
  // Sidebar.tsx:41 — 移除 view 角色
  { label: '发布管理', path: '/publish', roles: ['sysadmin', 'admin'], icon: <TrophyOutlined /> },

  // routes.tsx:63 — 同步移除
  { path: '/publish', roles: ['sysadmin', 'admin'], element: <PublishingSchedulePage /> },

  // routes.tsx:83+87 — 未授权 fallback 应重定向到 view 角色专属页面（待开发），而非 /publish
  ```

### HIGH（强烈建议修复）

#### SEC-H1. AuthContext localStorage 回退信任链——角色可被客户端篡改

- **位置**: `pages/context/AuthContext.tsx:42-47`（影响 Sidebar.tsx:58）
- **代码**:
  ```typescript
  // AuthContext.tsx verify 回调中
  const serverUser = response.data?.data?.user;
  if (serverUser) {
    setUser(serverUser);  // 服务端数据覆盖
  } else {
    const userData = localStorage.getItem(USER_KEY);
    if (userData) {
      try { setUser(JSON.parse(userData)); }  // 回退到 localStorage
      catch { localStorage.removeItem(USER_KEY); }
    }
  }
  ```
- **威胁模型**:
  1. 攻击者打开 DevTools → Application → Local Storage → 修改 `user` 的 `role` 字段从 `"view"` 为 `"sysadmin"`
  2. 触发页面刷新，此时 `/api/v1/auth/verify` 请求若因网络问题或 API 变更导致 `response.data.data.user` 为 `undefined`
  3. 代码进入 `else` 分支，从 localStorage 读取被篡改的用户数据，`role` 变为 `"sysadmin"`
  4. Sidebar 的 `visibleMenuItems` 过滤基于此篡改后的角色，渲染出 sysadmin 专属菜单
- **实际风险评估**: 低概率高影响。需要同时满足：(a) verify API 返回格式异常；(b) 用户主动篡改 localStorage。但在安全评审视角，信任客户端存储的角色数据是架构缺陷
- **影响**: 若后端 API 权限校验严格，实际危害限于前端 UI 层面（看到不该看的菜单），不构成数据泄露
- **修复方案**:
  ```typescript
  // AuthContext.tsx — 移除 localStorage 回退，verify 失败时强制重新登录
  .then((response) => {
    const serverUser = response.data?.data?.user;
    if (serverUser) {
      setUser(serverUser);
      localStorage.setItem(USER_KEY, JSON.stringify(serverUser));
    } else {
      // 不再回退 localStorage，强制清除并跳转登录
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  })
  ```

#### SEC-H2. 路由守卫默认重定向到 `/publish` 造成权限泄漏放大

- **位置**: `pages/router/routes.tsx:83` + `routes.tsx:87`
- **代码**:
  ```typescript
  // routes.tsx:83 — 角色不匹配时重定向
  element={
    route.roles.includes(role) ? route.element : <Navigate to="/publish" replace />
  }
  // routes.tsx:87 — 未知路径重定向
  <Route path="*" element={<Navigate to="/publish" replace />} />
  ```
- **威胁模型**: 任何角色不匹配路由的用户（包括 view 角色访问任何无权限页面）都会被重定向到 `/publish`。结合 SEC-C1（view 可访问 `/publish`），形成完整的越权链：view 用户输入任意 URL → 被重定向到 `/publish` → 看到发布管理数据
- **影响**: 将单点权限问题放大为系统性权限绕过——view 角色无论访问什么路径，最终都会被引向一个它不该看到的页面
- **修复方案**: 为未授权路由提供安全的 fallback 页面（如 "无权限" 提示页），而非重定向到功能页面：
  ```typescript
  const Unauthorized: React.FC = () => (
    <Result status="403" title="无权限" subTitle="您没有访问此页面的权限" />
  );
  // 使用 Unauthorized 替代 <Navigate to="/publish" />
  ```

### MEDIUM（建议修复）

#### SEC-M1. 路径前缀匹配可被路径构造攻击利用

- **位置**: `Sidebar.tsx:74-76`
- **代码**:
  ```typescript
  const selectedKey = visibleMenuItems
    .filter((item) => location.pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path || '';
  ```
- **威胁模型**: 虽然 `location.pathname` 由浏览器路由控制（不可被用户直接注入），但如果有动态路由或路由参数包含特殊值（如 `/project/../../admin`），`startsWith` 匹配可能产生意外结果
- **当前风险评估**: 低——React Router 规范化路径，不存在 `../` 遍历；当前 10 个菜单项无前缀冲突
- **潜在风险**: 若新增 `/api` 路由页面，会被 `/swagger` 的前缀匹配逻辑错误影响（虽然不是安全问题，但会导致 UI 混乱）
- **修复方案**:
  ```typescript
  // 精确匹配路径段
  .filter((item) => {
    const seg = '/' + (location.pathname.split('/')[1] || '');
    return seg === item.path;
  })
  ```

#### SEC-M2. 角色枚举——菜单项暴露完整角色体系

- **位置**: `Sidebar.tsx:37-48`
- **现象**: `menuItems` 定义了完整的角色-路径映射。虽然前端代码对终端用户不可见（编译后），但在 Source Map 启用的开发环境中，攻击者可通过 Source Map 获取完整角色列表和路径映射
- **威胁模型**: 攻击者通过 DevTools Sources 面板或 Source Map 获取 `menuItems` 配置，了解系统中存在 sysadmin/admin/view 三种角色及其对应的所有路由路径
- **影响**: 信息泄露——攻击者知道目标路径后可直接构造 URL 尝试访问（虽有后端防护）
- **修复方案**: 生产构建确保关闭 Source Map（`vite.config.ts` 中 `build.sourcemap: false`）

#### SEC-M3. 无 Session 过期 UI 提示——用户可能在无感知下操作已过期会话

- **位置**: `Sidebar.tsx`（全局缺失，非单一文件问题）
- **现象**: JWT 2 小时过期，但 Sidebar 和 Layout 均无过期倒计时或提前刷新提示。当 token 过期后，用户下一次操作才会触发 401 → 被 AuthGuard 踢回登录页
- **威胁模型**: 无直接安全威胁，但用户体验问题可能导致用户认为系统故障，反复尝试操作产生大量 401 请求
- **修复方案**: 在 Sidebar header 或 footer 区域显示会话剩余时间，或在 token 过期前 5 分钟触发静默刷新

#### SEC-M4. 折叠态 Tooltip 暴露用户名——肩窥信息泄露

- **位置**: `Sidebar.tsx:122`
- **代码**:
  ```typescript
  <Tooltip title={`登出（${cnName}）`}>
  ```
- **威胁模型**: 折叠状态下，用户名以 Tooltip 形式显示。在开放办公环境中，旁人可通过观察屏幕获取当前登录用户姓名
- **影响**: 低——cnName 不是高敏感信息，但在安全等级较高的场景下仍属于信息泄露
- **修复方案**: 折叠态 Tooltip 仅显示 "登出"，不包含用户名（展开态已有独立的用户名展示区域）

### LOW（可选优化）

#### SEC-L1. navigate 调用无错误处理

- **位置**: `Sidebar.tsx:64`
- **代码**:
  ```typescript
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) onCollapse(true);
  };
  ```
- **影响**: `navigate` 在正常使用中不会抛出异常，但如果路由配置缺失或 React Router 内部错误，用户点击菜单无任何反馈。非安全问题但影响可用性
- **修复方案**: 添加 try-catch 或使用 `message.error` 兜底

#### SEC-L2. 菜单项点击事件使用 key 作为路径——潜在的 key 注入

- **位置**: `Sidebar.tsx:69`
- **代码**:
  ```typescript
  const antdMenuItems = visibleMenuItems.map((item) => ({
    key: item.path,  // 路径作为 Menu item key
  }));
  ```
- **分析**: `key` 值来自硬编码的 `menuItems`，不接受外部输入，因此不存在注入风险。但如果未来改为动态菜单，需注意 key 值的合法性校验
- **当前评估**: 安全——无动态输入面

#### SEC-L3. 无 Content Security Policy 相关防护

- **位置**: 前端全局，非 Sidebar 独有问题
- **现象**: Sidebar 组件不涉及内联脚本或外部资源加载，但项目整体应确保 CSP 策略覆盖前端
- **当前评估**: Sidebar 本身不引入额外 CSP 风险

---

## 安全信任边界分析

```
┌──────────────────────────────────────────────────────────┐
│                    浏览器（客户端）                         │
│                                                          │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────┐   │
│  │localStorage│ ←→ │AuthContext│ ←→ │  Sidebar.tsx     │   │
│  │ (token,   │    │ (verify + │    │  (role filter +  │   │
│  │  user)    │    │  fallback)│    │   menu render)   │   │
│  └──────────┘    └─────┬─────┘    └──────────────────┘   │
│     ▲ 可篡改           │ 回退信任链     │ 仅控制 UI 可见性   │
│     │                  │               │                  │
├─────┼──────────────────┼───────────────┼──────────────────┤
│     │    HTTP API      │               │                  │
│     │                  ▼               │                  │
│     │           ┌──────────────┐       │                  │
│     │           │ /auth/verify │       │                  │
│     │           │ (权威数据源) │       │                  │
│     │           └──────────────┘       │                  │
│                                      │                  │
│                           安全边界 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                 后端 API 层                         │  │
│  │  JWT Auth Middleware → Role Check → 业务逻辑         │  │
│  │  （真正的权限执行层）                                 │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**关键洞察**: Sidebar 的角色过滤是 **UI 可见性控制层**，不是权限执行层。真正的权限执行在后端 API 的 JWT Auth Middleware + Role Check。因此 Sidebar 的安全问题 **不直接导致数据泄露**，但会：

1. **扩大攻击面** — 暴露功能入口给无权限用户，降低攻击门槛
2. **增加社会工程风险** — 用户看到菜单项可能认为自己有权限，尝试各种方式获取数据
3. **违反合规要求** — CLAUDE.md 铁律要求 view 角色零菜单可见性

---

## 修复优先级矩阵

| 编号 | 级别 | CVSS | 修复工作量 | 修复文件 | 说明 |
|------|------|------|-----------|----------|------|
| SEC-C1 | CRITICAL | 3.5 | 1行 | Sidebar.tsx + routes.tsx | view 角色从 /publish roles 中移除 |
| SEC-H1 | HIGH | 2.5 | 10行 | AuthContext.tsx | 移除 localStorage 回退信任链 |
| SEC-H2 | HIGH | 3.0 | 15行 | routes.tsx | 未授权 fallback 改为 403 页面 |
| SEC-M1 | MEDIUM | 1.5 | 3行 | Sidebar.tsx | 路径匹配改用精确段匹配 |
| SEC-M2 | MEDIUM | 1.0 | 配置 | vite.config.ts | 生产构建关闭 Source Map |
| SEC-M3 | MEDIUM | 1.0 | 中等 | Layout/Sidebar | 添加 Session 过期提示 |
| SEC-M4 | MEDIUM | 0.5 | 1行 | Sidebar.tsx | 折叠态 Tooltip 移除用户名 |
| SEC-L1 | LOW | 0 | 5行 | Sidebar.tsx | navigate 加 try-catch |
| SEC-L2 | LOW | 0 | 0 | — | 当前安全，仅标记注意动态菜单 |
| SEC-L3 | LOW | 0 | 配置 | 服务端 | 确保 CSP 策略覆盖 |

---

## 总结

Sidebar.tsx 在 XSS/注入防护方面表现良好（9/10），得益于 React JSX 的内置转义机制和菜单路径硬编码策略。**核心安全问题集中在权限控制层面（4/10）**：

1. **SEC-C1（CRITICAL）**: view 角色可访问「发布管理」，直接违反 CLAUDE.md 铁律的最小权限要求。与 routes.tsx 的双重配置（SEC-H2）形成系统性越权
2. **SEC-H1（HIGH）**: AuthContext 的 localStorage 回退信任链允许客户端角色篡改，虽然需特定条件触发，但违反安全设计原则——不应信任客户端存储的权限数据
3. **SEC-H2（HIGH）**: routes.tsx 将所有未授权路由重定向到 `/publish`，与 SEC-C1 组合形成完整的越权链

修复 SEC-C1 + SEC-H1 + SEC-H2 后预期安全评分可提升至 **8.0/10**。Sidebar 本身作为纯 UI 组件，不处理敏感操作，安全风险主要来自权限配置错误和上游 AuthContext 的信任边界设计。
