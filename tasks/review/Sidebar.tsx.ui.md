# pages/components/Sidebar.tsx — 软件UI专家评审报告

| 属性 | 值 |
|---|---|
| **文件** | `pages/components/Sidebar.tsx` (131行) + `pages/styles/global.css` (sidebar 相关) |
| **评审类型** | UI/UX 专家评审 |
| **评审依据** | DESIGN.md (IBM Carbon Design System) + Ant Design 6.x 规范 + WCAG 2.1 AA |
| **综合评分** | **5.5 / 10** |
| **评审日期** | 2026-05-26 |

---

## 评分维度

| 维度 | 得分 | 说明 |
|---|---|---|
| Design System 合规性 | 6/10 | 整体结构遵循 Carbon，但触控目标、footer 字号、圆角未完全达标 |
| Antd 组件使用 | 7/10 | Menu/Button/Tooltip/Typography 使用正确，Space direction 可能需确认 |
| 响应式设计 | 6/10 | 折叠/展开双态基本可用，但折叠态 footer 信息丢失，移动端仅隐藏 |
| 可访问性 (WCAG) | 3/10 | 折叠按钮 16×16px 严重不达标、无键盘快捷键、无 skip-to-content |
| 交互与反馈 | 5/10 | 有 Tooltip 和 aria-label，但无过渡动画、无 hover 高亮指示 |
| 视觉层次 | 6/10 | 三段式布局（header/menu/footer）清晰，但折叠态 footer 退化严重 |

---

## CRITICAL — 严重违反规范（必须修复）

### C1. 折叠按钮触控目标 16×16px — 严重违反 DESIGN.md 和 WCAG

- **位置**: `Sidebar.tsx:86-93` → `global.css:301-309`
- **现状**:
  ```css
  .sidebar-toggle-btn {
    width: 16px;
    height: 16px;
    font-size: 12px;
  }
  ```
- **违反**:
  - DESIGN.md 明确规定: **"Carbon spec: 48px minimum tap target. Buttons and inputs hold 48px on touch viewports."**
  - WCAG 2.1 SC 2.5.5 (Target Size - AAA) 要求最小 44px
  - WCAG 2.2 SC 2.5.8 (Target Size - AA) 要求最小 24px
- **影响**:
  - 16×16px 的折叠按钮在桌面端难以精确点击，移动端几乎无法操作
  - 实际可点击区域仅为规范要求的 **1/9 面积**（16×16 vs 48×48）
  - 无 `padding` 扩展有效点击区域
- **对比**: `global.css:315-327` 中 `.sidebar-mobile-unfold` 已正确使用 `width: 48px; height: 48px`，桌面端折叠按钮却只有 16px，标准不一致
- **修复**:
  ```css
  .sidebar-toggle-btn {
    width: 48px;
    height: 48px;
    font-size: 16px;
  }
  ```

---

## HIGH — 严重 UI/UX 问题（建议修复）

### H1. view 角色可见"发布管理"菜单项 — 违反 CLAUDE.md 铁律

- **位置**: `Sidebar.tsx:41`
- **现状**: `{ label: '发布管理', path: '/publish', roles: ['sysadmin', 'admin', 'view'] }`
- **违反**: CLAUDE.md 铁律第5条 — "view 角色只有被授权后查看每日检测报告的权限（每日检测功能待开发），除此之外没有任何权限。路由守卫、侧边栏菜单、API 权限校验中必须严格拦截 view 角色"
- **UI 影响**: view 角色登录后看到"发布管理"菜单，点击后如后端放行则可访问不授权页面，如后端拦截则显示错误页面 — 两种结果都是坏体验
- **修复**: 从 roles 数组中移除 `'view'`，改为 `roles: ['sysadmin', 'admin']`

### H2. 折叠态 footer 丢失用户信息和项目切换 — 功能退化

- **位置**: `Sidebar.tsx:120-126`
- **现状**: 折叠态只显示一个 16×16px 的登出按钮，无用户名、无公司/项目切换
- **影响**:
  - 用户在折叠态无法确认当前登录身份
  - 无法切换公司/项目 — 这是核心业务操作
  - antd `inlineCollapsed` 的 Menu 会自动折叠菜单文字，但 footer 的公司/项目切换完全消失
  - 登出按钮无用户名提示，多账号环境易误操作
- **Carbon 参考**: Carbon Shell 的 collapsed rail 仍保留 avatar 图标和 switcher 入口
- **修复**: 折叠态 footer 应保留：
  1. 用户头像/首字母 icon + Tooltip 显示用户名
  2. 公司/项目切换入口（图标 + Tooltip）

### H3. Footer 用户名字号/字重不符合 DESIGN.md Token

- **位置**: `global.css:280-284`
- **现状**:
  ```css
  .sidebar-footer-name {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.16px;
  }
  ```
- **违反**: DESIGN.md 中没有 `12px + 600` 的 Token 组合：
  - `{typography.caption}` = 12px / weight 400 / letter-spacing 0.32px
  - `{typography.body-emphasis}` = 14px / weight 600 / letter-spacing 0.16px
  - `{typography.body-sm}` = 14px / weight 400 / letter-spacing 0.16px
- **影响**: 字重 600 的 12px 文字视觉过重，且 letter-spacing 使用了 body-sm 的值而非 caption 的 0.32px — 混合了两个不同 Token 的属性
- **修复**: 根据语义选择：
  - 若为"辅助信息"：使用 `{typography.caption}`（12px / 400 / 0.32px）
  - 若为"强调标签"：使用 `{typography.body-emphasis}`（14px / 600 / 0.16px）

### H4. selectedKey 路径匹配使用 `startsWith` — 可能误匹配

- **位置**: `Sidebar.tsx:74-76`
- **现状**:
  ```ts
  const selectedKey = visibleMenuItems
    .filter((item) => location.pathname.startsWith(item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path || '';
  ```
- **影响**:
  - 如果存在 `/project-detail` 路由，当用户在此页面时 `/project` 也会匹配
  - `startsWith` 没有检查路径分隔符边界
  - 虽然用 `sort` 按长度降序取最长匹配部分缓解了问题，但如果 `/project` 和 `/project` 完全一样（一个带尾部斜线一个不带），行为不确定
- **修复**:
  ```ts
  .filter((item) =>
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/')
  )
  ```

---

## MEDIUM — 中等 UI 问题

### M1. 菜单项缺少分组和分隔 — 扁平列表信息密度过高

- **位置**: `Sidebar.tsx:37-48`
- **现状**: 10 个菜单项扁平排列，无 `Menu.Divider`、无 `Menu.ItemGroup`、无子菜单
- **影响**:
  - 业务管理（待办/知识库/文章/发布/项目/技能）和系统管理（用户/公司/系统/API）混在一起
  - 用户无法通过视觉分组快速定位功能区域
  - 随功能增长菜单会越来越长
- **Carbon 参考**: Carbon UI Shell 的 side nav 使用 `nav-item-group` 进行分组
- **修复**:
  ```ts
  const menuGroups = [
    {
      label: '业务管理',
      items: [todoItem, knowledgeItem, articleItem, publishItem, projectItem, skillsItem],
    },
    {
      label: '系统管理',
      items: [usersItem, companyItem, sysadminItem, swaggerItem],
    },
  ];
  ```

### M2. 菜单项缺少 Badge/数字提示 — 缺乏即时信息反馈

- **位置**: `Sidebar.tsx:68-72`
- **现状**: 所有菜单项只显示 icon + label，无任何状态指示
- **影响**:
  - "今日待办"无法显示待处理数量，用户需要点击进入才知道
  - 无视觉吸引力驱动用户关注重要功能
- **修复**: 为需要提示的菜单项添加 antd Badge:
  ```ts
  { key: '/todo', icon: <Badge count={todoCount} size="small"><CheckSquareOutlined /></Badge>, label: '今日待办' }
  ```

### M3. Header 品牌文字折叠态无 fallback — 无图标标识

- **位置**: `Sidebar.tsx:83-85`
- **现状**: `showFull && <Typography.Text>薄云商机倍增服务</Typography.Text>` — 折叠时完全消失
- **影响**:
  - 折叠态 sidebar header 区域空白（仅一个 16px 按钮），用户无法识别当前应用
  - Carbon Shell collapsed rail 保留 logo/icon 作为品牌标识
- **修复**: 折叠态显示品牌首字母图标或简化 logo:
  ```tsx
  {!showFull && <Typography.Text strong style={{ fontSize: 16 }}>薄</Typography.Text>}
  ```

### M4. 无菜单折叠/展开过渡动画 — 交互生硬

- **位置**: 整个 Sidebar 组件
- **现状**: `onCollapse(!collapsed)` 直接切换布尔值，无 CSS transition
- **影响**:
  - 宽度从 200px 突变为 64px，视觉跳跃
  - antd Sider 本身支持 `transition`，但自定义 CSS 中 sidebar-brand 和 footer 的显隐是 `&&` 条件渲染（无过渡）
  - Carbon Design Motion 指南推荐 150-200ms ease-in-out 用于面板展开/折叠
- **修复**: 使用 antd Sider 内置动画 + CSS `transition` 配合，避免条件渲染导致的突然消失

### M5. Menu 无 `defaultOpenKeys` 配置 — 展开状态未考虑

- **位置**: `Sidebar.tsx:96-103`
- **现状**: `inlineCollapsed={collapsed}` 但没有 `defaultOpenKeys` 或 `openKeys`
- **影响**: 如果未来菜单有子菜单（SubMenu），展开状态无法控制
- **修复**: 添加 `defaultOpenKeys` 以支持子菜单初始展开

### M6. 登出按钮视觉权重不足 — 误触风险

- **位置**: `Sidebar.tsx:113-115`（展开态）、`Sidebar.tsx:122-124`（折叠态）
- **现状**:
  - 展开态：登出按钮与用户名同一行，`type="text" size="small"` 无边框无背景
  - 折叠态：登出按钮是唯一 footer 元素，成为默认操作目标
- **影响**:
  - 折叠态 footer 只有登出按钮，用户可能误以为它是折叠/展开按钮
  - 登出是破坏性操作（清除会话），但视觉上与普通操作无区别
- **Carbon 参考**: Carbon 登出使用 danger variant 或明确的图标+文字组合
- **修复**:
  - 折叠态 footer 增加 Tooltip 明确说明"登出"
  - 考虑在展开态使用 `<Button type="text" danger>` 增加视觉区分

---

## LOW — 轻微问题

### L1. Sidebar header 高度 48px — 与 Carbon top-nav 一致但缺少底部 hairline 强调

- **位置**: `global.css:230-237`
- **现状**: `border-bottom: 1px solid var(--color-hairline)` — 使用 hairline (#e0e0e0)
- **DESIGN.md 参考**: top-nav 使用 `1px bottom hairline`，但 Carbon sidebar 的 header divider 通常使用更强的分隔线
- **建议**: 考虑使用 `var(--color-hairline-strong)` (#161616) 增强视觉分隔

### L2. `Space orientation="vertical"` — antd 6.x API 兼容性

- **位置**: `Sidebar.tsx:107`
- **现状**: `<Space orientation="vertical" size={4}>`
- **注意**: antd 5.x 使用 `direction` prop，antd 6.x 改为 `orientation`。当前项目使用 antd 6.x (`^6.4.1`)，API 正确。但如果未来降级需注意
- **建议**: 无需修改，仅记录

### L3. 无键盘快捷键支持

- **位置**: 整个 Sidebar 组件
- **现状**: 侧边栏折叠/展开只能通过鼠标点击
- **影响**: 键盘用户无法快速切换侧边栏状态
- **Carbon 参考**: Carbon Shell 支持 `Cmd/Ctrl + [` 快捷键
- **建议**: 添加 `useEffect` 监听 `keydown` 事件

### L4. 菜单配置硬编码在组件文件内

- **位置**: `Sidebar.tsx:37-48`
- **现状**: `menuItems` 作为模块级常量定义在组件文件中
- **影响**: 菜单项变更需要修改组件文件，无法通过配置/权限系统动态生成
- **建议**: 将 `menuItems` 抽取为独立配置文件或通过权限上下文动态生成

### L5. 品牌 Typography.Text strong 未匹配 DESIGN.md 字重

- **位置**: `Sidebar.tsx:84`
- **现状**: `<Typography.Text strong>` — antd `strong` 渲染为 `font-weight: 600`
- **DESIGN.md 参考**: 品牌/标题类文字在 Carbon 中使用 weight 400（body-sm 的标准字重）或 300（display），而非 600
- **建议**: 使用 `style={{ fontWeight: 400 }}` 覆盖，与 Carbon body 规范一致

---

## 评审总结

### 问题统计

| 严重程度 | 数量 | 编号 |
|---|---|---|
| CRITICAL | 1 | C1 |
| HIGH | 4 | H1, H2, H3, H4 |
| MEDIUM | 6 | M1, M2, M3, M4, M5, M6 |
| LOW | 5 | L1, L2, L3, L4, L5 |
| **合计** | **16** | |

### 核心优点

1. **antd 组件使用规范** — 全部使用 Menu、Button、Tooltip、Typography、Space，无原生 HTML 替代，符合 CLAUDE.md 铁律
2. **三段式布局** — header（品牌）/ menu（导航）/ footer（用户信息+切换）结构清晰，符合 Carbon UI Shell 规范
3. **CSS 变量化** — 使用 `var(--spacing-md)`、`var(--color-hairline)`、`var(--color-ink-muted)` 等 CSS 变量，与 DESIGN.md Token 体系基本对齐
4. **响应式折叠** — `isMobile` 时点击菜单自动折叠，`inlineCollapsed` 正确使用 antd Menu API
5. **aria-label 支持** — 折叠/展开按钮和登出按钮均有 `aria-label`，基本可访问性覆盖
6. **header 高度 48px** — 与 DESIGN.md top-nav 规范一致

### 核心问题

页面存在三个根本性 UI 问题：

1. **触控目标严重不足** — 折叠/展开按钮仅 16×16px，为 Carbon 48px 标准的 1/9，为 WCAG 最低标准的 2/3 以下，是整个组件最严重的可用性问题
2. **折叠态功能退化** — 折叠后用户信息和公司/项目切换完全消失，作为企业级 SaaS 应用的核心导航组件，这是不可接受的功能缺失
3. **view 角色越权** — 虽然是权限问题，但从 UI 角度看，向无权限用户展示不可用的菜单项本身就是糟糕的用户体验

### 推荐修复优先级

1. **P0（立即）**: C1 折叠按钮触控目标扩展至 48×48px
2. **P0（立即）**: H1 移除 view 角色的发布管理菜单项
3. **P1（本迭代）**: H2 折叠态 footer 保留用户图标和切换入口、H3 footer 字号对齐 DESIGN.md Token
4. **P2（下迭代）**: H4 路径匹配修复、M1-M6 中等优化
5. **P3（可选）**: L1-L5 轻微改进
