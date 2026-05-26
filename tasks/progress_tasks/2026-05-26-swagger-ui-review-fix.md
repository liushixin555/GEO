# Swagger API文档页面 UI评审修复

**日期**: 2026-05-26
**评审文件**: tasks/review/index.tsx.swagger.ui.md
**评分**: 6.0/10 → 修复后预期 8.0/10

## 修复项目

### 已修复（本次）
- M2: 图标 `marginRight` 内联样式 → 使用 antd `<Space size={4/8}>` 组件统一间距
- L3: Card/Space 内联样式 → 提取到 CSS class (`api-docs-card`, `api-docs-content`, `api-docs-title-icon`)
- L4: 添加 `<Breadcrumb>` 面包屑导航，对齐项目其他页面
- L6: Card 水平居中 → `margin: 0 auto` 通过 CSS class 实现

### 先前已修复（非本次）
- H1: `direction="vertical"` → `orientation="vertical"` 对齐 antd 6.x
- H2: Card 阴影 → global.css 全局覆盖 `box-shadow: none`
- H3: Spin → `<Skeleton>` 骨架屏
- H4: 垂直 Divider → `<Space orientation="vertical">` 两行布局
- M1: `fontSize: 14` 内联样式移除
- M3: 不可用状态添加"重新检测"按钮
- M5: Title `fontWeight: 400` 对齐 Carbon 规范
- L1: 添加 `aria-live="polite"`

### 保留未修改
- M4: 信息密度（需后端API支持，降级为后续迭代）
- L5: `document.title`（路由级标题管理需全项目重构）

## 修改文件
- `pages/swagger/index.tsx` — 组件结构优化
- `pages/styles/global.css` — 新增 CSS class
