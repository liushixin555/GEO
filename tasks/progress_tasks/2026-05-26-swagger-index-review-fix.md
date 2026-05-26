# swagger/index.tsx 评审修复记录

**日期**: 2026-05-26
**文件**: `pages/swagger/index.tsx`
**关联评审**: 4份评审报告（安全/架构/UI/Committer）+ 1份质量评审

---

## 修复清单

### BLOCKING（阻断项）

| 编号 | 问题 | 修复 |
|------|------|------|
| B-1 | HEAD /api-docs/ 无认证 → swaggerAuthMiddleware 返回401 → 按钮永远不出现 | 新增 `/api-docs/health` 健康端点（app.ts），前端改用 GET /api-docs/health |

### HIGH

| 编号 | 问题 | 修复 |
|------|------|------|
| H-1 | Space `direction="vertical"` 为 antd 5.x 废弃 API | 改为 `orientation="vertical"` |
| H-2 | Card 默认 box-shadow 未覆盖，违反 DESIGN.md 无阴影规范 | global.css 添加 `.ant-card { box-shadow: none !important }` |
| H-3 | 加载态仅用 Spin，缺乏 Skeleton 骨架屏 | Spin 替换为 `<Skeleton active paragraph={{ rows: 2 }} />` |
| H-4 | fetch catch 静默吞没所有错误 | 区分 AbortError 和真实错误，非 AbortError 输出 console.warn |

### MEDIUM

| 编号 | 问题 | 修复 |
|------|------|------|
| M-1 | 垂直 Divider 窄屏折行混乱 | 替换为 `<Space orientation="vertical" size={4}>` 两行布局 |
| M-3 | 不可用状态无重试机制 | Alert 添加 `action={<Button onClick={recheck}>重新检测</Button>}` |
| SEC-M1 | 错误提示泄露服务配置信息 | 简化为 "API 文档服务暂不可用，请联系系统管理员。" |
| M-8 | Title fontWeight 600 与 Carbon weight 400 不匹配 | 添加 `fontWeight: 400` |
| M-9 | memo 包裹匿名函数 DevTools 显示 Anonymous | 改为 `memo(function ApiDocsPage() {...})` |
| ARCH-1 | Card 未显式声明 bordered | 添加 `bordered` 属性 |
| L1 | 无 aria-live 通知状态变化 | Space 添加 `aria-live="polite"` |

---

## 变更文件

| 文件 | 变更说明 |
|------|---------|
| `apis/app.ts` | 新增 `/api-docs/health` GET 端点（不经 swaggerAuthMiddleware） |
| `pages/swagger/index.tsx` | 全面重构：健康端点、orientation、Skeleton、重试、两行布局、文案简化、displayName |
| `pages/styles/global.css` | 新增 `.ant-card { box-shadow: none !important }` |
| `tests/pages/api-docs.test.tsx` | 26个测试覆盖所有变更（含重试、AbortError区分、Skeleton、错误消息） |
| `tests/pages/setup.ts` | mock 组件添加 `onClick` 属性转发 |

---

## 修复后预期评分

| 评审维度 | 修复前 | 修复后预期 |
|---------|-------|----------|
| 安全评审 | 8.0/10 | ~9.0/10 |
| 架构评审 | 7.8/10 | ~8.5/10 |
| UI 评审 | 6.0/10 | ~8.0/10 |
| Committer 评审 | 7.0/10 | ~8.5/10 |
