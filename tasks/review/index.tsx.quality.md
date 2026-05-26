# pages/swagger/index.tsx 软件质量专家评审

**文件**: `pages/swagger/index.tsx`
**评审维度**: 质量评审（Quality Review）
**评审日期**: 2026-05-26
**评审人**: 软件质量专家
**综合评分**: 6.5/10 — CONDITIONAL APPROVE

---

## 1. 评审摘要

API 文档页面实现简洁，职责单一（可用性检测 + 外链跳转），已有 17 个测试用例覆盖主流程。但存在 1 项 **BLOCKING** 级别问题（antd 6.x API 使用错误）和 4 项 **HIGH** 级别设计合规问题。

| 级别 | 数量 | 明细 |
|------|------|------|
| BLOCKING | 1 | antd Space `orientation` prop 在 antd 6.x 中无效 |
| HIGH | 4 | Card borderless 违反 DESIGN.md / inline style 硬编码字号 / 无响应式适配 / 无 loading 状态骨架屏 |
| MEDIUM | 2 | API 可用性判断逻辑可扩展性差 / 硬编码中文字符串无 i18n 考量 |
| LOW | 1 | `page-container` className 无 CSS Module 隔离 |

---

## 2. 逐项评审

### QUA-01 [BLOCKING] Space 组件 `orientation` prop 在 antd 6.x 中无效

**位置**: `index.tsx:25`

```tsx
<Space orientation="vertical" size="large" style={{ width: '100%' }}>
```

**问题**: 项目使用 antd 6.4.1。antd 6.x 的 `Space` 组件使用 `direction` prop（非 `orientation`）。`orientation` 在 antd 6.x 中为无效 prop，会被静默忽略，导致 `Space` 子元素水平排列而非垂直排列。项目 `.claude/frontend.md` 第 40 行已明确记录此修复："antd Space 组件使用 `direction`（非 `orientation`）"，但 swagger 页面遗漏。

**同类问题**: `Sidebar.tsx` 和 `CompanyProjectSwitcher.tsx` 已修复为 `direction`。

**修复**:
```tsx
<Space direction="vertical" size="large" style={{ width: '100%' }}>
```

**影响**: 当前渲染效果——子元素水平排列，视觉布局错误。由于内容较多（标题 + 描述 + 信息行 + 按钮/Alert），水平布局会导致严重溢出。

---

### QUA-02 [HIGH] Card `variant="borderless"` 违反 DESIGN.md 规范

**位置**: `index.tsx:24`

```tsx
<Card variant="borderless" style={{ maxWidth: 600 }}>
```

**问题**: DESIGN.md 的 `feature-card` 规范要求：
- `rounded: {rounded.none}` — 0px 圆角
- 1px `{colors.hairline}` (#e0e0e0) 边框描边
- padding 24px

`variant="borderless"` 移除了边框，违反了 Carbon Design System 中"卡片通过 1px hairlines 区分层级"的核心原则。DESIGN.md Do's 明确要求"Use surface change and 1px hairlines for card hierarchy"。

**修复**: 移除 `variant="borderless"`，使用默认带边框的 Card。

---

### QUA-03 [HIGH] inline style 硬编码字号，未使用 DESIGN.md 排版 Token

**位置**: `index.tsx:35-36, 40-41`

```tsx
<Typography.Text type="secondary" style={{ fontSize: 14 }}>
```

**问题**: DESIGN.md 定义了完整的排版 Token 系统（`body-sm`: 14px / 400 / 1.29 / 0.16px），当前代码仅覆盖了 `fontSize: 14`，遗漏了 `fontWeight: 400`、`lineHeight: 1.29`、`letterSpacing: 0.16px` 等 Carbon 规范属性。更严重的是使用 inline style 而非 CSS class/Token，使样式脱离全局设计系统管控。

**修复**: 使用 antd Typography 的 `Typography.Text` 配合全局 CSS class，或通过 antd Token 系统统一定义。

---

### QUA-04 [HIGH] 无响应式适配

**位置**: `index.tsx:24`

```tsx
<Card variant="borderless" style={{ maxWidth: 600 }}>
```

**问题**: `maxWidth: 600` 是固定像素值，在移动端（320px 宽）不会出问题，但在平板（672px）和桌面端无自适应。缺少 `width: '100%'` 配合 `maxWidth` 的标准响应式模式。同时，信息行（基础路径 + 认证方式）使用 `Divider type="vertical"` 分隔，在小屏幕上可能溢出。

**DESIGN.md 要求**: Carbon 的 4px grid 系统要求组件在不同断点（320/672/1056/1312/1584px）下正确渲染。

**修复**:
```tsx
<Card style={{ maxWidth: 600, width: '100%' }}>
```
信息行使用 flex wrap 或 antd `Flex` 组件实现小屏换行。

---

### QUA-05 [HIGH] 无 loading 状态骨架屏

**位置**: `index.tsx:45`

```tsx
{apiDocsAvailable === null && <Spin size="small" />}
```

**问题**: 加载状态仅显示一个小型 `Spin`，与页面整体布局不一致。DESIGN.md 要求内容密集的页面使用骨架屏（Skeleton）保持布局稳定。一个居中的小 spinner 在页面中间会显得突兀，且页面从 Spin → Button/Alert 的切换会导致布局跳动。

**修复**: 使用 `Skeleton` 组件占位，或至少将 `Spin` 包裹在与按钮/Alert 等高的容器中。

---

### QUA-06 [MEDIUM] API 可用性判断逻辑硬编码且可扩展性差

**位置**: `index.tsx:17`

```tsx
.then(res => setApiDocsAvailable(res.status !== 404 && res.status !== 502 && res.status !== 503))
```

**问题**:
1. 使用黑名单逻辑（排除特定状态码）而非白名单（只允许 2xx/3xx），新增不可用状态码时需修改代码
2. `500 Internal Server Error` 被视为"可用"——这显然不合理
3. `401 Unauthorized` 被视为"可用"——虽然注释说"需要认证但服务在运行"，但 Swagger UI 通常不需要认证

**修复**:
```tsx
.then(res => setApiDocsAvailable(res.ok))
```
`res.ok` 在状态码 200-299 时返回 `true`，语义更清晰，且自动覆盖 500 等异常状态码。

---

### QUA-07 [MEDIUM] 硬编码中文字符串无 i18n 考量

**位置**: `index.tsx:12, 31-32, 37, 42, 53, 62-63`

**问题**: 所有用户可见文本（"API 文档"、"查看、测试和管理所有 API 接口"、"基础路径"、"认证方式"、"打开 API 文档"、"API 文档服务当前不可用"等）均为硬编码中文字符串。虽然项目当前无需多语言支持，但这些字符串分散在 JSX 中而非集中管理，未来国际化改造成本高。

**建议**: 将字符串提取为常量或使用配置对象集中管理，降低未来 i18n 改造的 diff 范围。

---

### QUA-08 [LOW] `page-container` className 无 CSS Module 隔离

**位置**: `index.tsx:23`

```tsx
<div className="page-container">
```

**问题**: 全局 CSS class 名 `page-container` 可能与其他页面冲突。项目使用 Vite 构建，支持 CSS Modules，但未启用。

**影响**: 当前项目中所有页面共用 `global.css` 中的 `.page-container`，暂无冲突风险，但不符合组件化最佳实践。

---

## 3. 优点

| 项目 | 评价 |
|------|------|
| `AbortController` 清理 | 组件卸载时正确取消 fetch 请求，避免内存泄漏和 state 更新已卸载组件 |
| `memo` 包裹 | 无 props 的纯组件使用 `memo` 合理，防止父组件重渲染时不必要的更新 |
| 外部链接安全 | `rel="noopener noreferrer"` + `target="_blank"` + `aria-label` 三重保障 |
| 职责单一 | 页面仅做可用性检测和跳转，无多余逻辑 |
| 测试覆盖 | 17 个测试用例覆盖渲染、交互、错误、安全属性、清理等场景 |
| 路由守卫 | `/swagger` 路由在 `routes.tsx` 中限制为 `sysadmin` 角色，安全性好 |
| HEAD 请求 | 使用 HEAD 而非 GET 检测可用性，带宽开销最小 |

---

## 4. 评分明细

| 维度 | 得分 | 满分 | 说明 |
|------|------|------|------|
| 功能正确性 | 7 | 10 | Space orientation bug 导致布局错误 -2，500 状态码误判 -1 |
| DESIGN.md 合规 | 4 | 10 | borderless Card / inline fontSize / 无响应式 / 无 Skeleton |
| 代码质量 | 8 | 10 | 结构清晰，职责单一，命名规范，扣分在硬编码状态码逻辑 |
| 可维护性 | 7 | 10 | 硬编码字符串分散，但文件体量小影响有限 |
| 可访问性 | 8 | 10 | aria-label / noopener noreferrer 到位，缺少 heading landmark |
| 测试覆盖 | 7 | 10 | 17 用例覆盖主流程，但未测试 Space layout（因 mock 环境不渲染布局） |

**加权总分: 6.5/10**

---

## 5. 修复优先级

| 优先级 | 编号 | 修复建议 | 预估工作量 |
|--------|------|----------|-----------|
| P0 | QUA-01 | `orientation` → `direction` | 1 分钟 |
| P1 | QUA-02 | Card 移除 `variant="borderless"` | 1 分钟 |
| P1 | QUA-03 | inline fontSize → CSS class/Token | 5 分钟 |
| P1 | QUA-04 | 添加 `width: '100%'` + flex wrap | 5 分钟 |
| P1 | QUA-05 | Spin → Skeleton 或等高容器 | 10 分钟 |
| P2 | QUA-06 | 状态码判断改为 `res.ok` | 2 分钟 |
| P2 | QUA-07 | 提取字符串常量 | 10 分钟 |
| P3 | QUA-08 | CSS Module 隔离 | 全局改造，非本页独立解决 |

**P0 修复后预期评分: 7.0/10**
**全部修复后预期评分: 8.0/10**

---

## 6. 结论

**CONDITIONAL APPROVE** — QUA-01（Space orientation）为阻断项，必须修复后才能合并。QUA-02 ~ QUA-05 为 HIGH 级别设计合规问题，建议同批修复。整体代码结构健康，功能简洁明确，测试覆盖充分。
