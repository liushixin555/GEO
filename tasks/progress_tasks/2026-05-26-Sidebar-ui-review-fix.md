# Sidebar.tsx UI 专家评审修复

**日期**: 2026-05-26
**关联评审文件**: tasks/review/Sidebar.tsx.ui.md
**关联文件**:
- pages/components/Sidebar.tsx
- pages/components/CompanyProjectSwitcher.tsx
- pages/styles/global.css

## 修复内容

### CRITICAL
- **C1**: 折叠按钮触控目标从 32x32px 提升至 48x48px，符合 Carbon Design 和 WCAG 规范；添加 hover 背景色和 transition

### HIGH
- **H1**: view 角色发布管理菜单项已在之前 commit 中移除（确认）
- **H2**: 折叠态 footer 新增公司/项目切换入口（CompanyProjectSwitcher collapsed 模式），保留用户图标+切换+登出三个按钮
- **H3**: Footer 用户名字号已修复为 caption token（12px/400/0.32px）（确认）
- **H4**: 路径匹配已修复为精确匹配+路径分隔符（确认）

### MEDIUM
- **M1**: 菜单项按"业务管理"和"系统管理"分组（antd Menu type: 'group'）
- **M3**: 折叠态品牌 fallback 已有（确认）
- **M4**: sidebar 添加 CSS transition 过渡动画（250ms ease）
- **M6**: 登出按钮 danger 属性和 Tooltip 已确认正常

### LOW
- **L5**: 品牌字重从 strong(600) 修复为 400，匹配 Carbon body-sm 规范

## 验证
- pnpm build: 通过
- pnpm lint: 通过
- pnpm test: 802 通过, 1 失败（非本次修改引起）
