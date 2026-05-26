# ArticleReviewActions.tsx — 软件UI专家评审报告

| 属性 | 值 |
|---|---|
| **文件** | `pages/article/components/ArticleReviewActions.tsx` |
| **评审类型** | UI/UX 专家评审 |
| **评审依据** | DESIGN.md (IBM Carbon Design System) + Ant Design 5.x/6.x 规范 + WCAG 2.1 AA |
| **综合评分** | **3.8 / 10** |
| **评审日期** | 2026-05-26 |

---

## 评分维度

| 维度 | 得分 | 说明 |
|---|---|---|
| Design System 合规性 | 4/10 | Alert 边框圆角被全局 CSS 强制覆盖为 0px（合规），但 inline style 硬编码间距绕过 Token 体系；Button `size="small"` 高度 ~24px 远低于 Carbon 48px 触控目标 |
| Antd 组件使用 | 5/10 | Alert/Popconfirm/Button 基本用法正确，但未使用 `Space` 组件管理按钮间距，原生 div + inline style 违反 CLAUDE.md 铁律 1 |
| 响应式设计 | 3/10 | 无任何响应式策略——Alert action 区域固定 flex 横排，小屏幕按钮溢出或压缩；Popconfirm 无自适应宽度 |
| 可访问性 (WCAG) | 2/10 | 零 aria-label、Button 无语义描述、Popconfirm 无焦点管理、触控目标严重不足（~24px 远低于 48px） |
| 交互与反馈 | 3/10 | Popconfirm 提供基础二次确认，但缺 loading 态（API 调用期间可重复点击）、缺错误反馈、缺操作成功/失败视觉反馈 |
| 视觉层次 | 5/10 | Alert warning 色调+图标提供基本视觉层级，但按钮组与 Alert 文案缺少视觉分组，审核操作作为高风险行为缺少视觉强调 |

---

## CRITICAL — 违反强制规则（必须修复）

### C1. Button `size="small"` 触控目标严重不足，违反 DESIGN.md + WCAG + 铁律

- **位置**: `ArticleReviewActions.tsx:18`、`:21`
- **违反**: DESIGN.md Touch Targets 规范 "48px minimum tap target"；WCAG 2.1 AA 2.5.5 Target Size
- **现状**:
  ```tsx
  <Button size="small" type="primary" icon={<CheckCircleOutlined />}>审核通过</Button>
  <Button size="small" danger icon={<CloseCircleOutlined />}>审核不通过</Button>
  ```
  - antd `size="small"` 按钮高度约 **24px**，宽度约 80-100px
  - Carbon Design System 最低触控目标 **48px**
  - 差距达到 **100%**——触控目标不到规范要求的一半
- **影响**:
  1. 移动端/平板上用户极难精确点击审核按钮，误触率高
  2. **审核是高风险业务操作**——通过/不通过影响文章发布流程，误触后果严重
  3. 违反无障碍法规合规要求（国内等保/ISO 27001 附属无障碍要求）
- **修复**: 移除 `size="small"`，使用默认 size（~32px），或使用 `size="large"`（48px，完全符合 Carbon）：
  ```tsx
  <Button type="primary" icon={<CheckCircleOutlined />}>审核通过</Button>
  <Button danger icon={<CloseCircleOutlined />}>审核不通过</Button>
  ```

---

## HIGH — 严重 UI/UX 问题（建议修复）

### H1. 审核操作缺少 loading 态——双重提交无防护
- **位置**: `:17`、`:20` `onConfirm` 回调
- **现状**: `onReview(true/false)` 返回 `void`（实际消费者 `actions.review` 是 async），按钮无 `loading` / `disabled` 状态
- **影响**:
  1. API 请求期间用户可连续点击确认，产生**重复审核请求**
  2. 审核操作不可逆（通过→进入发布流程），双重提交可能导致数据不一致
  3. 用户点击后无任何反馈，无法感知操作是否被接受
- **DESIGN.md 参考**: Carbon Button 规范要求操作中的按钮应显示 loading spinner + disabled
- **修复**:
  ```tsx
  const [loading, setLoading] = useState(false);
  const handleReview = async (approved: boolean) => {
    setLoading(true);
    try { await onReview(approved); } finally { setLoading(false); }
  };
  // Button 添加 loading={loading} disabled={loading}
  ```

### H2. 使用原生 div + inline style 布局，违反 CLAUDE.md 铁律 1 和 DESIGN.md Token 体系
- **位置**: `:14` `style={{ marginBottom: 12 }}`、`:16` `style={{ display: 'flex', gap: 8 }}`
- **现状**:
  ```tsx
  <Alert ... style={{ marginBottom: 12 }}
    action={
      <div style={{ display: 'flex', gap: 8 }}>
  ```
- **违反**:
  1. **CLAUDE.md 铁律 1**: "前端必须使用 Ant Design (antd) 组件——禁止使用原生 HTML 元素替代 antd 提供的组件"
  2. **DESIGN.md Token**: `12px` = `spacing.sm`、`8px` = `spacing-xs`，硬编码绕过 CSS 变量体系
  3. **DESIGN.md Do's**: "Use surface change and 1px hairlines for card hierarchy"
- **对比**: 项目 `global.css` 已定义 `--spacing-sm: 12px`、`--spacing-xs: 8px`，以及 `form-alert` / `page-alert` 等 class
- **修复**:
  ```tsx
  <Alert ... className="form-alert"  // 使用 global.css 已有 class（margin-bottom: spacing-md）
    action={
      <Space size={8}>  // antd Space 替代原生 div
        <Popconfirm ...>...</Popconfirm>
        <Popconfirm ...>...</Popconfirm>
      </Space>
    }
  />
  ```

### H3. 审核按钮无权限控制——所有用户可见
- **位置**: 组件整体渲染逻辑
- **现状**: 组件无条件接收 `onReview` 回调即渲染审核按钮，无 `canReview` / `role` 判断
- **影响**:
  1. 非 sysadmin 用户看到审核按钮，点击后 API 返回 403，用户体验极差
  2. 审核操作暴露给无权限用户，视觉上暗示"你可以审核"，违背最小权限原则
  3. 与项目中 `useArticlePermissions` 的 `canReview` 判断完全脱节
- **UX 规范参考**: Carbon 权限模式——不可用操作应隐藏或以 disabled + Tooltip 解释原因
- **修复**: 接收 `visible` 或 `canReview` prop 控制渲染：
  ```tsx
  interface ArticleReviewActionsProps {
    visible: boolean;
    onReview: (approved: boolean) => Promise<void>;
  }
  if (!visible) return null;
  ```

### H4. 与 ArticleContentEditor 内联版本存在视觉差异，两套实现不一致
- **位置**: `ArticleReviewActions.tsx:18/21` vs `ArticleContentEditor.tsx:86/89`
- **现状**:

  | 属性 | ArticleReviewActions | ArticleContentEditor 内联 |
  |------|---------------------|--------------------------|
  | Button size | `small`（~24px） | 默认（~32px） |
  | alignItems | 无 | `center` |
  | Popconfirm description | "通过后将自动进入发布流程" | "通过后文章将完成审核流程" |

- **影响**: 同一页面如果两个版本被使用（当前 ArticleReviewActions 是死代码，内联版被使用），用户会看到不一致的按钮大小和文案
- **修复**: 消除重复实现，统一为一套组件

---

## MEDIUM — 中等 UI 问题

### M1. Alert message 文案过于简略，缺少上下文信息
- **位置**: `:12` `message="该文章待审核"`
- **现状**: Alert 仅显示"该文章待审核"，缺少：
  - 提交人信息
  - 提交时间
  - 文章标题/ID
- **Carbon 参考规范**: Alert description 用于提供补充信息，帮助用户做出决策
- **建议**: 添加 `description` prop 提供审核上下文：
  ```tsx
  <Alert type="warning" message="该文章待审核"
    description="请仔细审核文章内容后决定是否通过" showIcon ... />
  ```

### M2. Popconfirm 缺少 `placement` 属性，位置不可控
- **位置**: `:17`、`:20`
- **现状**: Popconfirm 默认 `placement="top"`，在页面底部时气泡可能溢出视口
- **建议**: 添加 `placement="topLeft"` 或根据页面位置动态调整

### M3. 审核按钮缺少操作说明 Tooltip
- **位置**: `:18`、`:21`
- **现状**: Button 只有文字和图标，无 Tooltip 说明操作后果
- **影响**: 用户需要点击才能看到 Popconfirm 的 description，增加操作成本
- **DESIGN.md 参考**: Carbon Button 规范——重要操作应提供 hover 提示
- **建议**: 在 Button 外包裹 `<Tooltip title="审核通过后文章将进入发布流程">` （与 Popconfirm description 互补）

### M4. 硬编码中文文案未使用国际化方案
- **位置**: `:12` "该文章待审核"、`:17` "确认审核通过？"/"通过后将自动进入发布流程"、`:18` "审核通过" / "确认"/"取消"
- **现状**: 6 处硬编码中文字符串
- **影响**: 虽然项目当前仅支持中文，但文案散落在组件内部不利于统一管理和 A/B 测试
- **建议**: 文案常量提取到配置或组件顶部

### M5. Alert `showIcon` 使用默认 warning 图标，审核场景可使用自定义图标
- **位置**: `:13` `showIcon`
- **现状**: 默认使用 antd warning 三角图标
- **建议**: 审核场景可使用 `icon={<AuditOutlined />}` 或自定义图标更贴切地表达"待审核"语义

---

## LOW — 轻微问题

### L1. Popconfirm `okText`/`cancelText` 可能冗余
- **位置**: `:17` `okText="确认" cancelText="取消"`
- **现状**: 如果项目通过 `ConfigProvider` 配置了全局中文 locale，此处的 `okText` / `cancelText` 是多余的
- **建议**: 检查 `main.tsx` ConfigProvider 是否已配置 zhCN locale，如是则移除

### L2. 缺少 React.memo 包裹后的 displayName
- **位置**: `:28` `export default React.memo(ArticleReviewActions)`
- **现状**: React.memo 包裹后部分打包器 devtools 中组件名显示为 `Anonymous` 或 `Memo(ArticleReviewActions)`
- **建议**: 添加 `ArticleReviewActions.displayName = 'ArticleReviewActions'`

### L3. Popconfirm description 与实际业务流程可能不一致
- **位置**: `:17` "通过后将自动进入发布流程"
- **现状**: 实际流程取决于后端实现——可能先进入"已发布"状态，也可能需要后续手动发布
- **建议**: 与后端团队确认审核通过后的实际状态流转，确保文案准确

### L4. 未使用 antd `Flex` 组件（antd 5.x+ 提供）
- **位置**: `:16` `<div style={{ display: 'flex', gap: 8 }}>`
- **现状**: antd 5.x 提供了 `Flex` 组件可替代原生 div 实现 flex 布局
- **建议**: 使用 `<Flex gap={8}>` 替代，获得更好的主题集成和响应式支持

---

## 评审总结

### 问题统计

| 严重程度 | 数量 | 编号 |
|---|---|---|
| CRITICAL | 1 | C1 |
| HIGH | 4 | H1, H2, H3, H4 |
| MEDIUM | 5 | M1, M2, M3, M4, M5 |
| LOW | 4 | L1, L2, L3, L4 |
| **合计** | **14** | |

### 核心问题

组件作为审核操作的独立 UI 单元，存在三个根本性 UI 缺陷：

1. **触控目标严重不足（C1）** — `size="small"` 按钮高度约 24px，仅为 Carbon 规范 48px 的一半。审核是高风险操作（通过→发布流程，不通过→退回草稿），触控目标过小导致误触风险极高。作为安全关键操作，按钮应使用 `size="large"`（48px）或至少默认尺寸。

2. **双重提交无防护（H1）** — 审核操作是异步 API 调用，但按钮无 loading/disabled 状态。用户在 API 响应前可连续点击 Popconfirm 确认，产生重复请求。审核操作的不可逆性（通过后自动进入发布流程）使得双重提交的后果尤为严重。

3. **原生 div 替代 antd 组件（H2）** — 使用 `<div style={{ display: 'flex', gap: 8 }}>` 替代 antd `Space` 或 `Flex` 组件，违反 CLAUDE.md 铁律 1。同时硬编码间距值绕过 DESIGN.md CSS Token 体系。

### 正面评价

- Alert 使用 `type="warning"` + `showIcon` 正确表达了"待审核"的警示语义
- Popconfirm 提供二次确认，防止误操作——审核操作的标准交互模式
- 两个按钮使用不同视觉权重（`type="primary"` vs `danger`）区分"通过"和"不通过"的主次关系，符合 Carbon 操作层级规范
- 图标选择得当（`CheckCircleOutlined` / `CloseCircleOutlined`），语义清晰
- 组件使用 `React.memo` 包裹，避免不必要的重渲染

### 推荐修复优先级

1. **P0（立即）**: C1 移除 `size="small"`，使用默认或 `large` size
2. **P1（本迭代）**: H1 添加 loading/disabled 状态防止双重提交
3. **P1（本迭代）**: H2 使用 antd `Space` 替代 div + inline style
4. **P1（本迭代）**: H3 添加权限控制 prop
5. **P2（下迭代）**: H4 消除与内联版本的重复实现
6. **P3（可选）**: M1-M5 中等优化 + L1-L4 轻微改进

### 修复后预期评分

| 维度 | 当前 | 修复后 |
|------|------|--------|
| Design System 合规性 | 4 | 8.0 |
| Antd 组件使用 | 5 | 8.5 |
| 响应式设计 | 3 | 6.5 |
| 可访问性 (WCAG) | 2 | 7.0 |
| 交互与反馈 | 3 | 8.0 |
| 视觉层次 | 5 | 7.5 |
| **综合** | **3.8** | **7.6** |

---

## 评审信息

| 项目 | 值 |
|------|-----|
| 文件 | pages/article/components/ArticleReviewActions.tsx |
| 行数 | 29 |
| 评审类型 | 软件UI专家评审 |
| 评审依据 | DESIGN.md (IBM Carbon Design System) + Ant Design 5.x/6.x 规范 + WCAG 2.1 AA |
| 评审日期 | 2026-05-26 |
| 关联文件 | pages/article/components/ArticleContentEditor.tsx, pages/article/ArticleDetail.tsx, pages/styles/global.css |
| 关联评审 | [架构评审](ArticleReviewActions.tsx.architecture.md) 2.9/10 · [安全评审](ArticleReviewActions.tsx.security.md) 3.2/10 · [质量评审](ArticleReviewActions.tsx.quality.md) 4.0/10 |
