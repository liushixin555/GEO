## 本次变更（2026-05-24 App.tsx 评审）
- [x] 软件质量专家评审 pages/App.tsx
- [x] 综合评分 6.5/10（及格，存在架构设计缺陷）
- [x] 发现 HIGH×1（缺少 Error Boundary）、MEDIUM×5（根路径重定向逻辑、认证守卫耦合、路由常量管理、Layout 过度膨胀、无单元测试）、LOW×3
- [x] Committer 审核通过，建议 P0 项在当前迭代修复
- [x] 评审报告 tasks/review/App.tsx.md


## 本次变更（2026-05-24 App.tsx 架构评审）
- [x] 软件架构专家评审 pages/App.tsx
- [x] 综合评分 6.0/10（及格，架构分层不清晰）
- [x] 10 项架构发现：HIGH×3（认证耦合、Error Boundary、角色守卫）、MEDIUM×4（AppContext 位置、路由集中化、代码分割、竞态条件）、LOW×3
- [x] 提出目标架构蓝图：AuthProvider → AuthGuard → LayoutShell 三层分层
- [x] 评审报告 tasks/review/App.tsx.md（覆盖原质量评审）


## 本次变更（2026-05-24 App.tsx 安全评审）
- [x] 代码安全专家评审 pages/App.tsx
- [x] 综合安全评级 C+（前端安全基础薄弱）
- [x] 12 项安全发现：HIGH×3（路由无RBAC、localStorage存储token、用户数据可篡改）、MEDIUM×4（Error Boundary缺失、JSON.parse无保护、重定向未校验、Verify API过度调用）、LOW×5
- [x] 修复优先级路线图：P0×3、P1×5、P2×4
- [x] 评审报告 tasks/review/App.tsx.security.md


## 本次变更（2026-05-24 App.tsx UI专家评审）
- [x] 软件UI专家评审 pages/App.tsx
- [x] 综合评分 5.5/10（基本可用，UI/UX 存在系统性缺陷）
- [x] 27 项 UI 发现：HIGH×4（Breadcrumb语义误用、Alert prop错误、Token过期闪烁、skip-to-content缺失）、MEDIUM×10、LOW×7
- [x] DESIGN.md 合规性审计：色彩8/10、字体7/10、间距6/10、组件6/10
- [x] 修复优先级路线图：P0×6、P1×8、P2×7
- [x] 评审报告 tasks/review/App.tsx.ui.md


## 本次变更（2026-05-24 App.tsx Committer审核）
- [x] Committer审核专家评审 pages/App.tsx
- [x] 综合判定：不通过（REJECT）— 存在死路由Bug + 零测试 + 无Error Boundary
- [x] 发现关键问题：第11行 `path="/"` 的 Navigate 是死路由（被第10行 `path="/*"` 吞没）、无 App.test.tsx 测试文件、无 Error Boundary 包裹
- [x] 阻塞合并项：修复死路由、添加 ErrorBoundary、创建路由测试
- [x] 评审报告 tasks/review/App.tsx.committer.md


## 本次变更（2026-05-24 App.tsx 评审问题修复）
- [x] **fix011: App.tsx 死路由 + 无 Error Boundary**
  - 删除第 11 行死路由 `<Route path="/" element={<Navigate to="/login" />} />`（被 `path="/*"` 吞没，永不执行）
  - 创建 `pages/components/ErrorBoundary.tsx`（antd Result + Button 友好错误页）
  - App.tsx 用 ErrorBoundary 包裹 Routes，防止子组件异常导致白屏
  - 移除冗余 `import React from 'react'`（tsconfig 已用 react-jsx 自动注入）
  - 创建 `tests/pages/App.test.tsx`，覆盖 7 个测试场景（路由匹配 4 个 + ErrorBoundary 3 个）
  - 安装缺失依赖 `@uiw/react-md-editor`、`mammoth`
  - Vite 构建通过、App 测试全部通过


## 本次变更（2026-05-24 App.tsx Committer审核验证）
- [x] **验证 App.tsx Committer审核修复（fix011）**
  - 死路由已删除、ErrorBoundary 已包裹、7个测试全部通过 ✅
  - 补充安装缺失依赖 `@uiw/react-markdown-preview`（构建失败根因）
  - Vite 构建通过、App 测试 7/7 通过
  - 恢复 `.gitignore` 中 `.env` 忽略规则（被意外删除）


## 本次变更（2026-05-24 App.tsx 安全评审问题修复）
- [x] **fix015: App.tsx 安全评审问题修复** — 4 项安全修复（基于 tasks/review/App.tsx.security.md）
  - **SEC-FE-03**: verify API 返回数据库用户数据（替代 localStorage 可篡改数据），AuthContext 以服务端数据为可信源
    - 后端 `auth.service.impl.ts`: verifyToken 新增数据库查询返回完整用户数据
    - 后端 `auth.service.ts`: 新增 VerifyUserData 接口
    - 后端 `auth.controller.ts`: verify 端点返回 user 对象
    - 前端 `AuthContext.tsx`: verify 成功后使用 response.data.data.user 覆盖 localStorage
  - **SEC-FE-06**: 登录重定向路径校验 validateRedirect 函数，仅允许 / 开头的内部路径
    - 修改 `pages/login/index.tsx`: 新增 validateRedirect 校验函数
  - **SEC-FE-08**: 登出时清除 redirect_after_login，防止下次登录被重定向到意外页面
    - 修改 `pages/context/AuthContext.tsx`: logout 添加 localStorage.removeItem('redirect_after_login')
    - logout 改为 fire-and-forget 后端调用（不 await），立即清理客户端状态
  - **SEC-FE-09**: 添加 CSP (Content-Security-Policy) meta 标签到 pages/index.html
    - 限制 script-src 'self'、style-src 'self' 'unsafe-inline'（antd CSS-in-JS 需要）、connect-src 'self' 等
  - auth.middleware 测试通过、前端构建通过
  - **SEC-FE-02 (localStorage token)** 需后端 httpOnly Cookie 改造，本轮暂不实施
- [x] **软件架构专家评审 @uiw/react-markdown-preview/src/common.tsx（27 行）**
  - 综合评分 5.4/10（管线编排架构清晰，但与 preview.tsx 存在职责重叠和耦合缺陷）
  - P1×3：每次渲染重建管线数组（无 useMemo）、与 preview.tsx 双封装职责重叠（安全策略分散）、插件管线违反 OCP（用户插件位置固定不可定制）
  - P2×3：rehypeRewriteHandle 混合稳定和不稳定依赖、`export *` 隐式导出不可控、forwardRef 匿名函数 DevTools 不可见
  - P3×2：管线顺序依赖数组索引无声明式约束、防御式编程不一致（|| vs ??）
  - SOLID 评估：SRP⚠️、OCP❌、LSP✅、ISP✅、DIP⚠️
  - 完整管线数据流分析（10 个插件顺序依赖关系）
  - 本项目影响：安全🔴高（rehypeRaw 无条件执行）、性能🟡中、可维护🟢低、升级风险🟡中
  - 评审报告 tasks/review/common.tsx.architecture.md


## 本次变更（2026-05-24 App.tsx UI 评审问题修复）
- [x] **fix016: App.tsx UI 评审问题修复（12 项）** — 基于 tasks/review/App.tsx.ui.md（5.5/10）
  - UI-09（P0 BUG）：Alert `title` → `message`，修复错误信息不显示
  - UI-10（P0 BUG）：Space `orientation` → `direction`，修复侧边栏底部布局
  - UI-08（P0）：Breadcrumb 误用 → Typography.Title（登录页 + PlaceholderPage）
  - UI-05（P0）：移动端展开按钮 24px → 48px 触摸目标
  - UI-03：sidebar-brand 字重 600 → 400
  - UI-11：登录页 div → antd Card 组件
  - UI-14：表单添加 label prop
  - UI-02：品牌标题使用 300 weight（IBM Carbon 品牌签名）
  - UI-12：添加 skip-to-content（WCAG 2.4.1）
  - UI-13：交互元素添加 ARIA 标签
  - UI-20：加载页添加品牌信息
  - UI-21：PlaceholderPage 用 Result 组件
  - 涉及文件：login/index.tsx, Layout.tsx, Sidebar.tsx, AuthGuard.tsx, routes.tsx, global.css

