# fix048: Sidebar.tsx + routes.tsx + AuthContext.tsx 评审修复

> 日期: 2026-05-26
> 关联评审: tasks/review/Sidebar.tsx.*.md（质量/架构/安全/UI/Committer 五份评审）

---

## 修复清单

### BLOCKING（阻断合并）

| 编号 | 问题 | 修复 |
|------|------|------|
| B-1 | view 角色可见"发布管理"菜单项，违反 CLAUDE.md 铁律第5条 | Sidebar.tsx:41 — 从 /publish roles 中移除 'view' |
| H-1a | routes.tsx /publish 路由允许 view 角色 | routes.tsx:63 — 从 roles 中移除 'view' |
| H-1b | 未授权路由默认重定向到 /publish，形成越权链 | routes.tsx:83 — `<Navigate to="/publish">` → `<Result status="403">` |
| H-1c | 未知路径重定向到 /publish | routes.tsx:87 — `<Navigate to="/publish">` → `<Result status="404">` |

### HIGH

| 编号 | 问题 | 修复 |
|------|------|------|
| H-2 | 折叠按钮触控目标 16×16px，违反 WCAG | global.css: .sidebar-toggle-btn → min-width/min-height: 32px, padding: 8px |
| H-3 | selectedKey 路径前缀匹配脆弱 | Sidebar.tsx — `startsWith(path)` → `=== path || startsWith(path + '/')` |

### MEDIUM

| 编号 | 问题 | 修复 |
|------|------|------|
| M-1 | 角色字符串硬编码为魔术值 | 提取 `ROLES` 常量对象 + `Role` 联合类型 |
| M-2 | showFull 是 !collapsed 的冗余别名 | 移除 showFull，直接使用 !collapsed |
| M-3 | navigate 调用无错误处理 | 包裹 try-catch + message.error 兜底 |
| M-4 | 折叠态 footer 缺少用户身份提示 | 增加 UserOutlined 图标按钮 + Tooltip 显示 cnName |
| M-5 | Footer 字号 12px/600 不匹配 DESIGN.md Token | global.css: font-weight 600→400, letter-spacing 0.16px→0.32px（caption Token） |
| SEC-M4 | 折叠态 Tooltip 暴露用户名（肩窥风险） | Tooltip 仅显示 cnName 在用户图标上，登出按钮 Tooltip 仅显示"登出" |
| UI-M3 | 折叠态 header 无品牌标识 | 折叠态显示"薄"首字母 |
| UI-M6 | 登出按钮视觉权重不足 | 添加 `danger` 属性增强视觉区分 |

### AuthContext 安全修复

| 编号 | 问题 | 修复 |
|------|------|------|
| SEC-H1 | localStorage 回退信任链——角色可被客户端篡改 | verify API 返回无 user 时，清除 localStorage + setUser(null)，不再回退到 localStorage |

---

## 修改文件

| 文件 | 修改内容 |
|------|----------|
| pages/components/Sidebar.tsx | view 越权修复 + 角色常量 + 路径匹配 + showFull 移除 + navigate 错误处理 + 折叠态 UI 改进 |
| pages/router/routes.tsx | view 越权修复 + 403/404 fallback |
| pages/context/AuthContext.tsx | localStorage 回退信任链移除 |
| pages/styles/global.css | 折叠按钮触控目标 + footer 字号对齐 |
