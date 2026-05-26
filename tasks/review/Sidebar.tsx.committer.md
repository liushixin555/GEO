# pages/components/Sidebar.tsx — Committer 审核专家评审报告

**评审日期**: 2026-05-26
**评审角色**: Committer 审核专家（合并准入 · 铁律合规 · 架构一致性 · 安全合规 · API 契约评估 · 生产就绪度）
**文件路径**: `pages/components/Sidebar.tsx`（131行）
**关联文件**: `pages/router/routes.tsx`、`pages/context/AuthContext.tsx`、`pages/components/CompanyProjectSwitcher.tsx`、`pages/styles/global.css`
**已有评审**: 质量评审（7.2/10）、架构评审（6.8/10）、安全评审（6.2/10）、UI 评审（5.5/10）

---

## 一、Committer 审核总览

Sidebar.tsx 是项目全局导航组件，承载角色菜单过滤、路由导航、折叠控制三大职责。Committer 视角的核心关切：

1. **是否遵守项目铁律？** — view 角色可见"发布管理"菜单项，直接违反 CLAUDE.md 铁律第5条
2. **四份评审交叉验证后，哪些问题是真实阻断项？** — view 越权被四份评审一致标记为 CRITICAL/HIGH，需逐项裁定
3. **关联文件是否存在系统性放大？** — routes.tsx 将未授权路由默认重定向到 `/publish`，与 Sidebar 越权形成完整攻击链
4. **代码是否达到生产合并标准？** — 整体质量良好，仅需修复 view 角色配置即可达到合并门槛

| 审核维度 | 评分 | 判定 |
|----------|------|------|
| 铁律合规性 | 4/10 | 🔴 不通过 — view 角色越权违反铁律第5条 |
| 功能正确性 | 8/10 | 通过 — 导航、折叠、移动端行为均正确 |
| 安全合规性 | 6/10 | 有条件通过 — 越权链需 Sidebar + routes.tsx 联合修复 |
| 架构质量 | 7/10 | 通过 — 职责单一、数据流清晰、依赖图 DAG 无环 |
| antd 组件合规 | 9/10 | 通过 — 全部使用 antd 组件，无原生 HTML 替代 |
| 可访问性 | 5/10 | 有条件通过 — 折叠按钮 16×16px 严重不达标 |
| 生产就绪度 | 7/10 | 有条件通过 — view 越权修复后可合并 |

**综合判定: ⚠️ 有条件通过（CONDITIONAL APPROVE）— view 角色越权是唯一阻断项，修复后可合并**

---

## 二、四份评审综合裁定

| 评审 | 评分 | 核心结论 | Committer 裁定 |
|------|------|---------|---------------|
| 质量评审 | 7.2/10 | 代码结构清晰，TypeScript 类型完整；view 越权(C-1)、触控目标(H-1)、路径匹配(H-2) 需修复 | 🟡 **C-1 阻断合并**，H-1/H-2 不阻断但建议本迭代修复 |
| 架构评审 | 6.8/10 | 职责边界清晰、数据流单向；view 越权(ARCH-2)、路径匹配(ARCH-1)、菜单耦合(ARCH-3) | 🟡 **ARCH-2 阻断合并**，ARCH-1/ARCH-3 排期改进 |
| 安全评审 | 6.2/10 | view 越权(SEC-C1) + routes.tsx 重定向(SEC-H2) + AuthContext 回退(SEC-H1) | 🔴 **SEC-C1+SEC-H2 阻断合并**（同一越权链），SEC-H1 不阻断（概率低） |
| UI 评审 | 5.5/10 | 触控目标(C1)严重不足、折叠态退化(H2)、view 越权(H1)、字号违规(H3) | 🟡 **H1(view 越权) 阻断**，C1(触控)不阻断但高优先 |

---

## 三、逐条审核意见

### 3.1 铁律合规审核（最高优先级）

#### B-1 [BLOCKING] view 角色可见"发布管理"，违反 CLAUDE.md 铁律第5条

- **来源**: 质量评审 C-1 + 架构评审 ARCH-2 + 安全评审 SEC-C1 + UI 评审 H1 — 四份评审一致标记
- **位置**: `Sidebar.tsx:41`
- **代码**:
  ```typescript
  { label: '发布管理', path: '/publish', roles: ['sysadmin', 'admin', 'view'], icon: <TrophyOutlined /> },
  ```
- **铁律原文**: "view 角色只有被授权后查看每日检测报告的权限（每日检测功能待开发），除此之外没有任何权限。路由守卫、侧边栏菜单、API 权限校验中必须严格拦截 view 角色"
- **越权链分析**:
  ```
  Sidebar.tsx:41  → view 在 /publish 的 roles 中 → 菜单可见
       ↓ 点击
  routes.tsx:63   → view 在 /publish 路由的 roles 中 → 路由放行
       ↓
  routes.tsx:83   → 未授权角色重定向到 /publish → 系统性兜底越权
       ↓
  routes.tsx:87   → 未知路径也重定向到 /publish → 攻击面最大化
  ```
- **影响**: view 角色登录后看到"发布管理"菜单 → 点击后路由守卫放行 → 可查看发布数据。即使后端 API 拦截写操作，只读数据泄露仍然发生
- **Committer 裁定**: 🔴 **阻断合并** — 铁律违规无妥协空间
- **修复方案**:
  ```typescript
  // Sidebar.tsx:41 — 移除 view
  { label: '发布管理', path: '/publish', roles: ['sysadmin', 'admin'], icon: <TrophyOutlined /> },

  // routes.tsx:63 — 同步移除（关联文件，须联合修复）
  { path: '/publish', roles: ['sysadmin', 'admin'], element: <PublishingSchedulePage /> },

  // routes.tsx:83+87 — 未授权 fallback 改为安全页面（关联文件）
  route.roles.includes(role) ? route.element : <Result status="403" title="无权限" />
  ```
- **预估工作量**: 3 行代码修改（Sidebar.tsx 1行 + routes.tsx 2行）

### 3.2 高优先级审核裁定

#### H-1 [HIGH] 路由守卫默认重定向到 /publish——系统性越权放大器

- **来源**: 安全评审 SEC-H2
- **位置**: `pages/router/routes.tsx:83` + `routes.tsx:87`
- **代码**:
  ```typescript
  // routes.tsx:83 — 角色不匹配时重定向
  route.roles.includes(role) ? route.element : <Navigate to="/publish" replace />
  // routes.tsx:87 — 未知路径重定向
  <Route path="*" element={<Navigate to="/publish" replace />} />
  ```
- **Committer 裁定**: 🔴 **阻断合并** — 与 B-1 构成完整越权链。即使 B-1 修复了 Sidebar 菜单，view 角色直接访问 `/publish` URL 仍可被路由守卫放行
- **修复方案**: 使用 antd `<Result status="403">` 作为未授权 fallback
- **预估工作量**: 15 行（routes.tsx 内修改）

#### H-2 [HIGH] 折叠按钮触控目标 16×16px，严重违反 WCAG

- **来源**: 质量评审 H-1 + UI 评审 C1
- **位置**: `Sidebar.tsx:86-93` → `global.css:301-308`
- **Committer 裁定**: 🟡 **不阻断合并** — 当前桌面端可通过鼠标精确定位操作，移动端使用独立的 48px 展开按钮。但属于高优先级 UX 缺陷
- **修复方案**: `.sidebar-toggle-btn` 改为 `min-width: 32px; min-height: 32px; padding: 8px`
- **预估工作量**: CSS 调整

#### H-3 [HIGH] selectedKey 路径前缀匹配脆弱

- **来源**: 架构评审 ARCH-1 + 安全评审 SEC-M1 + 质量评审 H-2 + UI 评审 H4
- **位置**: `Sidebar.tsx:74-76`
- **代码**:
  ```typescript
  const selectedKey = visibleMenuItems
    .filter((item) => location.pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path || '';
  ```
- **Committer 裁定**: 🟡 **不阻断合并** — 当前 10 个菜单项无前缀冲突，`sort` 按长度降序取最长匹配部分缓解了问题。但隐式约束脆弱，新增路径时可能引入 Bug
- **修复方案**:
  ```typescript
  .filter((item) =>
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/')
  )
  ```
- **预估工作量**: 3 行

#### H-4 [HIGH] AuthContext localStorage 回退信任链

- **来源**: 安全评审 SEC-H1
- **位置**: `pages/context/AuthContext.tsx:42-47`
- **Committer 裁定**: 🟢 **不阻断合并** — 需同时满足"verify API 返回异常"和"用户主动篡改 localStorage"两个前置条件，实际概率极低。后端 JWT 中间件是真正的权限执行层，前端仅控制 UI 可见性
- **建议**: 在 AuthContext 迭代时移除 localStorage 回退，verify 失败时强制清除并跳转登录

### 3.3 中等问题裁定

| 编号 | 问题 | 来源 | Committer 裁定 |
|------|------|------|---------------|
| M-1 | 角色字符串硬编码为魔术值 | 质量 M-1, 架构 ARCH-4 | 🟡 不阻断 — 当前 10 处引用可控，提取常量可排期 |
| M-2 | `showFull` 是 `!collapsed` 的冗余别名 | 质量 M-2 | 🟢 不阻断 — 语义化命名，可保留 |
| M-3 | navigate 调用无错误处理 | 质量 M-3, 安全 SEC-L1 | 🟢 不阻断 — React Router navigate 在正常使用中不抛异常 |
| M-4 | 折叠态 footer 功能退化（无切换入口） | 架构 ARCH-5, UI H2 | 🟡 不阻断 — 展开后可切换，但建议折叠态增加 Tooltip 图标 |
| M-5 | Footer 字号 12px/600 不匹配 DESIGN.md Token | UI H3 | 🟡 不阻断 — 建议使用 `{typography.caption}`（12px/400/0.32px） |
| M-6 | 菜单无分组/分隔 | UI M1 | 🟢 不阻断 — 10 项菜单扁平排列当前可接受 |
| M-7 | 无过渡动画 | UI M4 | 🟢 不阻断 — antd Sider 内置 transition |
| M-8 | 折叠态 Tooltip 泄露用户名 | 安全 SEC-M4 | 🟢 不阻断 — cnName 非高敏感信息 |

### 3.4 认可的优点

| # | 优点 | 说明 |
|---|------|------|
| 1 | **antd 组件使用规范** | 全部使用 Menu、Button、Tooltip、Typography、Space，零原生 HTML 替代，完全符合铁律第1条 |
| 2 | **职责边界清晰** | 导航渲染 + 折叠控制 + 用户信息展示，不涉及数据获取/认证逻辑，SRP 合格 |
| 3 | **Props 最小化** | 仅 3 个 props（collapsed/onCollapse/isMobile），折叠状态提升到 Layout，受控组件设计正确 |
| 4 | **数据流单向可追踪** | AuthContext.user → userRole → visibleMenuItems → antdMenuItems，无反向数据流 |
| 5 | **空角色默认拒绝** | `user?.role ?? ''` 在 user 为 null 时返回空字符串，`roles.includes('')` 永远为 false |
| 6 | **模块级 menuItems 常量** | 避免每次渲染重建菜单配置，性能友好 |
| 7 | **CompanyProjectSwitcher 组合嵌入** | 不内联实现，通过组合方式放入 footer，符合 SRP |
| 8 | **最长路径优先匹配** | `sort` 按长度降序取最长匹配，对当前无冲突的菜单项是正确的策略 |
| 9 | **XSS 防护完整** | React JSX 自动转义 + 菜单路径硬编码 + 无 dangerouslySetInnerHTML |
| 10 | **移动端适配** | isMobile 时点击菜单自动折叠，Layout 提供独立 48px 展开按钮 |

---

## 四、与其他评审的交叉裁定

### 4.1 四份评审一致标记的问题

| 问题 | 质量 | 架构 | 安全 | UI | Committer 裁定 |
|------|------|------|------|-----|---------------|
| view 角色越权 | C-1 | ARCH-2 | SEC-C1 | H1 | 🔴 **阻断合并** — 铁律违规 |
| 路径前缀匹配脆弱 | H-2 | ARCH-1 | SEC-M1 | H4 | 🟡 不阻断 — 当前无冲突，排期修复 |
| 折叠态 footer 退化 | — | ARCH-5 | — | H2 | 🟡 不阻断 — 建议改进 |

### 4.2 仅安全评审标记的高优先级问题

| 问题 | 安全 | Committer 裁定 |
|------|------|---------------|
| AuthContext localStorage 回退 (SEC-H1) | HIGH | 🟢 不阻断 — 需特定条件触发，后端是真正权限执行层 |
| routes.tsx 重定向到 /publish (SEC-H2) | HIGH | 🔴 **阻断合并** — 与 B-1 构成越权链 |

### 4.3 仅 UI 评审标记的问题

| 问题 | UI | Committer 裁定 |
|------|-----|---------------|
| 触控目标 16px (C1) | CRITICAL | 🟡 不阻断 — 桌面端可用，移动端有独立按钮 |
| 字号不匹配 Token (H3) | HIGH | 🟡 不阻断 — 建议 P2 修复 |

---

## 五、修复路线图

### P0 — 立即修复（阻断合并）

| 修复项 | 文件 | 预估工作量 | 说明 |
|--------|------|-----------|------|
| B-1: view 角色从 /publish roles 中移除 | Sidebar.tsx:41 | 1行 | `'view'` 从数组中删除 |
| H-1: /publish 路由同步移除 view 角色 | routes.tsx:63 | 1行 | `'view'` 从数组中删除 |
| H-1: 未授权路由 fallback 改为 403 页面 | routes.tsx:83,87 | 10行 | `<Navigate to="/publish">` → `<Result status="403">` |

### P1 — 本迭代修复（强烈建议）

| 修复项 | 文件 | 预估工作量 | 说明 |
|--------|------|-----------|------|
| H-2: 折叠按钮触控目标扩展至 32px+ | global.css | CSS 调整 | `min-width/min-height: 32px` |
| H-3: 路径匹配改用精确段匹配 | Sidebar.tsx:74-76 | 3行 | `startsWith` → `===` 或 `startsWith(path + '/')` |
| M-5: Footer 字号对齐 DESIGN.md Token | global.css | 2行 | `font-weight: 600` → `400` |

### P2 — 下迭代优化

| 修复项 | 说明 |
|--------|------|
| M-1: 角色常量提取 | `const ROLES = { SYSADMIN: 'sysadmin', ... }` |
| M-4: 折叠态 footer 增加切换图标 | Tooltip 包装的 SwapOutlined |
| 菜单配置抽取到独立文件 | `pages/config/menu.config.ts` |
| MenuItemDef.roles 类型约束 | `string[]` → `Role[]` |

---

## 六、问题统计

| 严重程度 | 数量 | 编号 |
|----------|------|------|
| BLOCKING | 2 | B-1(view 越权), H-1(路由重定向越权链) |
| HIGH（不阻断） | 3 | H-2(触控目标), H-3(路径匹配), H-4(AuthContext 回退) |
| MEDIUM | 8 | M-1 ~ M-8 |
| LOW（各报告 L 级合计） | ~6 | 无阻断项 |
| **合计** | **~19** | |

---

## 七、最终裁决

### 裁决结果：⚠️ 有条件通过（CONDITIONAL APPROVE）

**裁决理由**：

1. **代码质量达标**: Sidebar.tsx 整体代码质量良好（7.2/10），TypeScript 类型完整、antd 组件使用规范、职责边界清晰、数据流单向可追踪。除 view 角色配置错误外，无功能性缺陷。

2. **铁律违规是唯一阻断项**: view 角色可见"发布管理"菜单项直接违反 CLAUDE.md 铁律第5条，且与 routes.tsx 构成完整越权链。但修复成本极低——仅需删除 2 处 `'view'` 字符串 + 修改 2 处路由 fallback，总计约 15 行代码。

3. **安全风险可控**: Sidebar 是纯 UI 可见性控制组件，不处理敏感操作。真正的权限执行在后端 JWT 中间件。前端越权的影响限于"看到不该看的菜单"，修复后风险即消除。

4. **修复后预期评分**: B-1 + H-1 修复完成后预估可达到 **8.0/10** 水平——代码质量 7.2 + 安全合规从 6.0 提升至 9.0 = 综合约 8.0。

### 前置条件（Blocking — 修复完成前不可合并）

- [ ] Sidebar.tsx:41 — view 角色从 `/publish` 的 roles 中移除
- [ ] routes.tsx:63 — view 角色从 `/publish` 路由 roles 中同步移除
- [ ] routes.tsx:83 — 未授权路由 fallback 从 `<Navigate to="/publish">` 改为 403 页面
- [ ] routes.tsx:87 — 未知路径 fallback 从 `<Navigate to="/publish">` 改为安全首页或 403 页面

### 建议改进（Non-blocking — 排期修复）

- [ ] 折叠按钮触控目标扩展至 32px+（global.css）
- [ ] 路径匹配改用精确段匹配（Sidebar.tsx:74-76）
- [ ] Footer 字号对齐 DESIGN.md Token（global.css）
- [ ] 角色常量提取（Sidebar.tsx menuItems）
- [ ] 添加单元测试覆盖角色过滤、路径匹配逻辑

---

**评审人**: Committer 审核专家
**评审结论**: CONDITIONAL APPROVE — 代码质量达标，view 角色越权是唯一阻断项
**阻断前置条件**: Sidebar.tsx + routes.tsx 联合移除 view 角色的 /publish 访问权限 + 路由 fallback 改为 403 页面
**预估修复工作量**: 约 30 分钟（4 处代码修改）
