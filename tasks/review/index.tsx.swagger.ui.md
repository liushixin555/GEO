# pages/swagger/index.tsx — 软件UI专家评审报告

| 属性 | 值 |
|---|---|
| **文件** | `pages/swagger/index.tsx` (73行) + `pages/styles/global.css` (api-docs 相关) |
| **评审类型** | UI/UX 专家评审 |
| **评审依据** | DESIGN.md (IBM Carbon Design System) + Ant Design 6.x 规范 + WCAG 2.1 AA |
| **综合评分** | **6.0 / 10** |
| **评审日期** | 2026-05-26 |

---

## 评分维度

| 维度 | 得分 | 说明 |
|---|---|---|
| Design System 合规性 | 6/10 | CSS 变量基本遵循 Carbon，但 Card 潜在阴影未覆盖、内联样式硬编码 fontSize/margin |
| Antd 组件使用 | 7/10 | 组件选择合理（Card/Button/Alert/Spin/Divider/Typography），但 `direction` 是 antd 5.x 废弃 API |
| 响应式设计 | 5/10 | `width: '100%'` 基本自适应，但垂直 Divider 在窄屏折行混乱、无移动端专项优化 |
| 可访问性 (WCAG) | 5/10 | 按钮有 aria-label 和 rel 属性，但无 aria-live 通知状态变化、Spin 无 tip |
| 交互与反馈 | 7/10 | 三态模式（加载/可用/不可用）设计合理，但无 Skeleton 骨架屏、无重试机制 |
| 视觉层次 | 6/10 | 结构清晰（标题→描述→元信息→操作/状态），但信息密度偏低、缺少版本/环境信息 |

---

## CRITICAL — 严重违反规范（必须修复）

无 CRITICAL 级别问题。组件选择未违反 CLAUDE.md 铁律（全部使用 antd 组件），未使用原生 HTML 替代。

---

## HIGH — 严重 UI/UX 问题（建议修复）

### H1. `Space direction="vertical"` 使用 antd 5.x 废弃 API

- **位置**: `index.tsx:25`
- **现状**: `<Space direction="vertical" size="large" style={{ width: '100%' }}>`
- **违反**: 项目使用 antd `^6.4.1`（package.json:38）。antd 6.x 将 `direction` prop 改为 `orientation`，`direction` 已废弃并在控制台产生 deprecation warning
- **对比**: `pages/components/Sidebar.tsx:107` 已正确使用 `<Space orientation="vertical">`
- **影响**:
  - 控制台持续输出废弃警告，影响开发体验
  - 未来 antd 版本可能移除 `direction`，导致布局崩溃
- **修复**: `direction="vertical"` → `orientation="vertical"`

### H2. Card 默认阴影未显式覆盖 — 违反 DESIGN.md 无阴影规范

- **位置**: `index.tsx:24`
- **现状**: `<Card style={{ maxWidth: 600, width: '100%' }}>` — 无 `bordered`/`styles` 覆盖
- **违反**: DESIGN.md 明确 "Card hierarchy is carried by 1px hairlines and surface change, never by drop shadow"
- **当前缓解**: `global.css:96-108` 已覆盖 `.ant-card { border-radius: 0 !important }`，`global.css:119-122` 覆盖了 hoverable 态的 box-shadow
- **遗留风险**: 非 hoverable 的 Card 默认仍有 antd 6.x 的 `box-shadow`（global.css 仅覆盖 `.ant-card-hoverable:hover`），需在组件级别或全局级别补全
- **修复方案**:
  1. 组件级: `<Card styles={{ body: { boxShadow: 'none' } }} bordered>`
  2. 全局级: 在 `global.css` 中添加 `.ant-card { box-shadow: none !important }`

### H3. 缺少 Skeleton 骨架屏 — 加载态体验不完整

- **位置**: `index.tsx:45`
- **现状**: `{apiDocsAvailable === null && <Spin size="small" />}` — 仅一个小号旋转器
- **DESIGN.md 参考**: Carbon 加载规范推荐 Skeleton 提供内容结构预览
- **影响**:
  - 首次加载时，用户看到完整 Card 布局突然出现但中间只有一个小 Spin
  - Spin 没有告诉用户"正在检查什么"，缺乏上下文
  - 感知加载时间长于实际
- **修复**: 使用 antd `<Skeleton>` 或 `<Card loading>`:
  ```tsx
  {apiDocsAvailable === null && (
    <Card style={{ maxWidth: 600, width: '100%' }}>
      <Skeleton active paragraph={{ rows: 2 }} />
    </Card>
  )}
  ```

### H4. 垂直 Divider 在窄屏折行混乱 — 响应式缺陷

- **位置**: `index.tsx:39`
- **现状**: `<Divider type="vertical" />` 分隔"基础路径"和"认证方式"两段信息
- **CSS 缓解**: `global.css:213-218` 的 `.api-docs-info` 使用 `flex-wrap: wrap` + `gap: var(--spacing-xs)`
- **遗留问题**: 当容器宽度不足时，两段信息折行但垂直 Divider 仍渲染为竖线 `|`，在第二行开头出现一条无意义的竖线分隔符
- **修复方案**:
  1. 改用 antd `<Space>` 包裹，利用 `split` prop 自动处理分隔符
  2. 或改用两行布局移除垂直 Divider:
  ```tsx
  <Space orientation="vertical" size={4}>
    <Text type="secondary"><GlobalOutlined /> 基础路径：<Text code>/api</Text></Text>
    <Text type="secondary"><SafetyCertificateOutlined /> 认证方式：JWT Bearer Token</Text>
  </Space>
  ```

---

## MEDIUM — 中等 UI 问题

### M1. fontSize 硬编码 14px — 未使用 DESIGN.md Typography Token

- **位置**: `index.tsx:35`, `index.tsx:40`
- **现状**: `style={{ fontSize: 14 }}` 在两处 Typography.Text 上硬编码
- **DESIGN.md 参考**: `{typography.body-sm}` = 14px / weight 400 / letter-spacing 0.16px。`global.css:111-112` 已全局注入 `letter-spacing: 0.16px`，但 `fontSize: 14` 作为内联样式优先级高于 antd 默认
- **影响**: 硬编码 fontSize 与 antd Typography 的默认字号系统冲突，且不可被主题系统覆盖
- **修复**: 使用 antd Typography 的 `type="secondary"` 已隐含较小字号，或通过 CSS class `.ant-typography-body-sm` 控制

### M2. 图标间距不一致 — marginRight: 8 vs marginRight: 4

- **位置**: `index.tsx:27`（ApiOutlined `marginRight: 8`）、`index.tsx:36`/`index.tsx:41`（GlobalOutlined/SafetyCertificateOutlined `marginRight: 4`）
- **现状**: 标题图标间距 8px，元信息图标间距 4px，两者无统一规则
- **DESIGN.md 参考**: `{spacing.xs}` = 8px, `{spacing.xxs}` = 4px
- **影响**: 视觉不统一，缺乏间距逻辑（标题图标和文字间距应更大是合理的，但应由 CSS 变量控制）
- **修复**: 统一使用 antd `<Space>` 的 `size` prop 控制图标与文字间距，而非内联 `marginRight`

### M3. 不可用状态无重试机制 — 用户无法主动恢复

- **位置**: `index.tsx:59-66`
- **现状**: API 文档不可用时仅显示 `<Alert type="info">`，无重试按钮
- **影响**:
  - 网络抖动导致 HEAD 请求失败时，用户被永久锁定在"不可用"状态
  - 管理员启用 Swagger 后，用户需刷新整个页面才能重新检测
  - 无用户自主恢复路径
- **修复**: 在 Alert 内或下方添加重试按钮:
  ```tsx
  <Alert
    type="info"
    message="API 文档服务当前不可用"
    description="API 文档服务未启用，请联系系统管理员或在开发环境中访问。"
    showIcon
    action={<Button size="small" onClick={recheck}>重新检测</Button>}
  />
  ```
  其中 `recheck` 重置 `apiDocsAvailable` 为 `null` 触发 useEffect 重试

### M4. 信息密度偏低 — 缺少版本/环境/端点数量等元信息

- **位置**: `index.tsx:34-44`（api-docs-info 区域）
- **现状**: 仅显示基础路径（`/api`）和认证方式（JWT Bearer Token）两条静态硬编码信息
- **影响**:
  - 用户无法了解 API 文档的版本、端点数量、最近更新时间
  - "基础路径"和"认证方式"均为硬编码字符串，不反映后端实际配置
  - 作为 API 文档入口页面，信息量不足以帮助开发者决策
- **修复**: 可考虑从后端获取元信息（端点数量、API 版本、Swagger 版本号），或至少从 config 读取而非硬编码

### M5. Typography.Title level={3} 字号与 DESIGN.md Token 不精确匹配

- **位置**: `index.tsx:26`
- **现状**: `<Typography.Title level={3}>` — antd h3 默认渲染为 19.2px（1.2em × 16px），font-weight 600
- **DESIGN.md 参考**: 最接近的 Token 是 `{typography.card-title}` = 24px / weight 400 或 `{typography.subhead}` = 20px / weight 400
- **差异**: antd h3 默认字重 600 与 Carbon 的 weight 400 不符，字号 19.2px 不属于任何 DESIGN.md Token
- **修复**: 使用 `<Typography.Title level={3} style={{ fontWeight: 400 }}>` 对齐 Carbon 规范，或改用 `<Typography.Title level={4}>`（antd h4 = 16px，更接近 body）

### M6. Button 白空格处理使用内联样式

- **位置**: `index.tsx:54`
- **现状**: `style={{ whiteSpace: 'nowrap' }}` — 内联样式防止按钮文字换行
- **影响**: 内联样式不可被 CSS 覆盖，不利于主题化
- **修复**: 使用 CSS class 或依赖 antd Button 默认行为（antd 按钮默认不换行）

---

## LOW — 轻微问题

### L1. 无 aria-live 通知动态状态变化

- **位置**: `index.tsx:45-66`（三态条件渲染区域）
- **现状**: `apiDocsAvailable` 从 `null` → `true`/`false` 时，UI 内容完全替换，但无 aria-live 通知
- **影响**: 屏幕阅读器用户无法感知"正在检测"→"可用/不可用"的状态转换
- **建议**: 在外层容器添加 `aria-live="polite"`:
  ```tsx
  <Space orientation="vertical" size="large" style={{ width: '100%' }} aria-live="polite">
  ```

### L2. Spin 无 tip 属性 — 缺乏加载上下文

- **位置**: `index.tsx:45`
- **现状**: `<Spin size="small" />` — 旋转器无文字说明
- **影响**: 用户不知道正在加载什么（"正在检测 API 文档可用性？"）
- **建议**: `<Spin size="small" tip="检测中..." />` 或使用 `<Spin tip="正在检测 API 文档...">`

### L3. 全部内联样式 — 未使用 CSS class

- **位置**: 整个文件，6处 `style={{...}}`
- **现状**:
  - `style={{ maxWidth: 600, width: '100%' }}` (Card)
  - `style={{ margin: 0 }}` (Title)
  - `style={{ marginRight: 8, color: 'var(--color-primary)' }}` (Icon)
  - `style={{ width: '100%' }}` (Space)
  - `style={{ fontSize: 14 }}` × 2 (Text)
  - `style={{ marginRight: 4 }}` × 2 (Icon)
  - `style={{ whiteSpace: 'nowrap' }}` (Button)
- **影响**: 样式散落在 JSX 中，不利于维护和主题切换
- **建议**: 将常用样式提取到 `global.css` 中对应的 CSS class

### L4. 无面包屑导航 — 缺少页面层级上下文

- **位置**: 整个页面
- **现状**: 页面直接渲染 Card 内容，无 Breadcrumb 导航
- **对比**: `pages/user/index.tsx` 使用了 `<Breadcrumb>`
- **影响**: 用户在多层嵌套路由中无法判断当前页面在站点结构中的位置
- **建议**: 添加 `<Breadcrumb items={[{ title: '系统管理' }, { title: 'API 文档' }]} />`

### L5. useEffect 设置 document.title — 应由路由配置统一管理

- **位置**: `index.tsx:10-12`
- **现状**: 组件内 `useEffect` 手动设置 `document.title`
- **影响**: 每个页面组件自行管理 title，难以统一维护，且与 React Router 的 metadata 管理模式不一致
- **建议**: 在路由配置中统一管理页面标题（如 react-helmet 或路由 meta 字段）

### L6. 页面整体居中依赖 page-container 而非显式居中

- **位置**: `index.tsx:23`
- **现状**: `<div className="page-container">` + Card `maxWidth: 600`，但 Card 在 flex 容器内无居中对齐
- **影响**: Card 可能左对齐而非水平居中，视觉不平衡
- **建议**: 添加 `margin: '0 auto'` 或在 page-container 内使用 flex 居中

---

## 评审总结

### 问题统计

| 严重程度 | 数量 | 编号 |
|---|---|---|
| CRITICAL | 0 | — |
| HIGH | 4 | H1, H2, H3, H4 |
| MEDIUM | 6 | M1, M2, M3, M4, M5, M6 |
| LOW | 6 | L1, L2, L3, L4, L5, L6 |
| **合计** | **16** | |

### 核心优点

1. **antd 组件使用规范** — 全部使用 Card、Button、Alert、Spin、Divider、Typography、Space，无原生 HTML 替代，符合 CLAUDE.md 铁律
2. **三态模式设计合理** — loading（Spin）/ available（Button）/ unavailable（Alert）三种状态覆盖完整，交互逻辑清晰
3. **安全属性完备** — 外部链接携带 `target="_blank"` + `rel="noopener noreferrer"` + `aria-label`，符合安全最佳实践
4. **CSS 变量使用** — `color: 'var(--color-primary)'` 引用全局 Token，而非硬编码色值
5. **memo 优化** — 组件使用 `React.memo` 包裹，避免不必要的重渲染
6. **AbortController** — useEffect 清理中正确使用 `controller.abort()` 取消请求，防止内存泄漏
7. **图标语义准确** — ApiOutlined（API）/ SafetyCertificateOutlined（安全）/ GlobalOutlined（路径）/ LinkOutlined（外链），图标选择与语义高度匹配

### 核心问题

页面存在两个主要 UI 问题：

1. **antd API 版本不一致** — 使用 antd 5.x 的 `direction` prop 而非 6.x 的 `orientation`，同项目 Sidebar.tsx 已正确使用新版 API。这不是功能性 bug（antd 6.x 仍兼容），但会持续产生控制台废弃警告，且在 antd 未来大版本中可能 break。
2. **信息架构薄弱** — 作为 API 文档的入口页面，当前仅提供"基础路径"和"认证方式"两条硬编码静态信息，缺乏版本、端点数量、最近更新等动态元信息，页面价值密度不足以支撑独立的路由入口。

### 推荐修复优先级

1. **P0（立即）**: H1 `direction` → `orientation` 对齐 antd 6.x API
2. **P1（本迭代）**: H2 Card 阴影覆盖、H3 Skeleton 加载态、H4 垂直 Divider 响应式
3. **P2（下迭代）**: M1-M6 中等优化（fontSize Token化、间距统一、重试机制、信息密度）
4. **P3（可选）**: L1-L6 轻微改进（aria-live、面包屑、样式外提）
