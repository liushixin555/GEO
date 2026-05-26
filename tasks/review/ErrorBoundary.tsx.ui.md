# ErrorBoundary.tsx — UI 专家评审报告

> **评审日期**: 2026-05-26
> **评审维度**: DESIGN.md 合规性 / antd 最佳实践 / UI/UX 规范 / 可访问性 / 交互一致性
> **评审结果**: **REQUEST CHANGES 3.8/10**

---

## 一、总评

`ErrorBoundary.tsx` 作为全局错误边界组件，承担应用崩溃时的最后一道用户反馈屏障。组件使用了 antd `Result` + `Button` 组合，并添加了 `role="alert"` 和 `aria-live="assertive"` 无障碍标注，这是正确的起步。但作为应用级错误页面，在 **DESIGN.md 合规性、交互完整性、用户引导** 方面存在严重不足。

核心问题：(1) 零 DESIGN.md Token 覆盖——antd 默认样式（圆角 6px、蓝色 #1677ff、非 Plex Sans 字体）与 Carbon Design System 全面冲突；(2) 按钮操作与文案内容矛盾——subTitle 建议"刷新页面"却不提供刷新按钮；(3) 破坏性操作无确认无加载态；(4) 错误页面缺少全屏居中布局。

---

## 二、DESIGN.md 合规性评审（权重 30%）

### D-C1 [CRITICAL] 零 Token 覆盖——antd 默认样式与 Carbon Design System 全面冲突

**行号**: L30-39（`<Result>` + `<Button>` 整体）

DESIGN.md 明确规定：

> Use `{rounded.none}` 0px on every CTA, card, input, and container. The flat-square aesthetic is the brand.
> **IBM Blue** (`{colors.primary}` #0f62fe): The single brand accent.

当前组件直接使用 antd `Result` 和 `Button` 的默认样式，导致以下 DESIGN.md 违规：

| 属性 | antd 默认值 | Carbon 规范值 | 差距 |
|------|------------|--------------|------|
| 按钮圆角 | ~6px | 0px | 违反品牌核心美学 |
| 按钮背景色 | #1677ff | #0f62fe | 色差明显 |
| 错误红色 | #ff4d4f | #da1e28 | 语义色不一致 |
| 字体族 | -apple-system, sans-serif | IBM Plex Sans | 品牌识别缺失 |
| 字间距 | 0px (body) | 0.16px | Carbon precision detail 缺失 |

错误页面是用户在崩溃后看到的**唯一界面**，视觉上应保持品牌一致性，而非降级到 antd 裸默认值。

**修复建议**: 通过 antd `ConfigProvider` 的 `theme.token` 全局覆盖（`colorPrimary: '#0f62fe'`, `borderRadius: 0`, `fontFamily: "'IBM Plex Sans', sans-serif"`），或在组件级通过 CSS class 覆盖 `border-radius: 0`。

### D-H1 [HIGH] 错误图标色值不符合 Carbon 语义色规范

**行号**: L33 `<Result status="error">`

antd `Result status="error"` 渲染的 SVG 图标使用 `#ff4d4f` 红色。DESIGN.md 规定：

> **Error Red** (`{colors.semantic-error}`): Carbon red-60 (#da1e28) — error states.

`#ff4d4f`（antd 红色）vs `#da1e28`（Carbon red-60）在视觉上有明显差异——antd 红偏亮偏粉，Carbon 红更沉稳深邃。作为错误页面唯一的视觉焦点，色值偏差直接损害品牌一致性。

**修复建议**: 使用 `icon` prop 自定义 SVG 图标并设置 `color: #da1e28`，或在 CSS 中通过 `.ant-result-error .ant-result-icon > .anticon { color: #da1e28; }` 覆盖。

### D-M1 [MEDIUM] 按钮间距和尺寸未遵守 Carbon 规格

**行号**: L36 `<Button type="primary">`

DESIGN.md `button-primary` 组件规范：

> Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button}`, rounded `{rounded.none}`, padding 12px 16px.

antd `Button` 默认 padding 为 `4px 15px`（compact）或 `5px 16px`（default），与 Carbon 规范的 `12px 16px` 差距显著。Carbon 按钮在视觉上更宽厚，符合企业级"可信赖"视觉语言；antd 默认按钮偏紧凑，与 Carbon 审美不符。

---

## 三、antd 最佳实践评审（权重 25%）

### A-H1 [HIGH] 操作与文案矛盾——缺少"刷新页面"按钮

**行号**: L35 subTitle + L36 Button

组件 `subTitle` 明确建议用户："请尝试刷新页面"。但唯一的操作按钮是"返回登录"——一个破坏性操作（清除 localStorage + 重定向）。

用户流程断裂：
1. 用户看到"请尝试刷新页面" → 期望有刷新按钮
2. 找不到刷新按钮 → 只能点"返回登录"
3. 点击后丢失全部会话状态

这是典型的 **文案承诺与操作能力不匹配** 的 UX 缺陷。antd `Result` 组件的 `extra` prop 支持 ReactNode 数组，完全支持多按钮布局。

**修复建议**: 添加 `<Button onClick={() => window.location.reload()}>刷新页面</Button>` 作为主操作，将"返回登录"降为次操作（`type="default"` 或 `type="link"`）。

```tsx
extra={
  <Space direction="vertical">
    <Button type="primary" onClick={() => window.location.reload()}>刷新页面</Button>
    <Button type="default" onClick={this.handleReset}>返回登录</Button>
  </Space>
}
```

### A-H2 [HIGH] 破坏性操作无确认无加载态

**行号**: L23-27 `handleReset`

`handleReset` 执行两项破坏性操作：
1. 清除 5 个 localStorage 键（token, user, selected_company, selected_project, redirect_after_login）
2. `window.location.href = '/login'` 硬跳转

问题：
- **无确认对话框**: 用户可能误触"返回登录"，导致未保存工作丢失。antd 提供 `Modal.confirm()` 正是为此场景设计。
- **无加载态**: 点击后按钮无 `loading` 反馈，用户可能重复点击（尤其在网络延迟时）。

**修复建议**:
1. 添加 `Modal.confirm({ title: '确认返回登录？', content: '未保存的数据将丢失。' })` 确认步骤。
2. 使用 `this.setState({ loading: true })` + Button `loading` prop 防止重复提交。

### A-M1 [MEDIUM] Result 组件缺少 `icon` 自定义——品牌融入不足

**行号**: L32 `<Result status="error">`

antd `Result` 默认使用通用 SVG 错误图标（圆圈 + 叉号）。对于企业级应用，错误页面应融入品牌视觉元素，至少使用符合 Carbon Design 的错误状态图标（如 Carbon 的 `ErrorFilled` 图标）。

**修复建议**: 从 `@carbon/icons-react` 导入 `ErrorFilled`（32x32）作为自定义 icon，或使用 antd 的 `CloseCircleFilled` 配合品牌色。

---

## 四、UI/UX 规范评审（权重 25%）

### U-H1 [HIGH] 错误页面无全屏居中布局——视觉锚定缺失

**行号**: L30-39

当前 `<Result>` 直接渲染在 ErrorBoundary 的 DOM 位置，无任何布局容器包裹。这意味着：

1. Result 组件出现在组件树的崩溃点位置（可能是页面中间某处），而非全屏居中展示。
2. 没有背景色隔离——错误页面与父容器的背景色混为一体。
3. 没有垂直居中——在宽屏显示器上，Result 可能出现在页面顶部，大量留白在下方。

企业级错误页面应占据完整视口、居中展示，让用户一眼聚焦。

**修复建议**: 包裹全屏容器：

```tsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: '#ffffff',
}}>
  <Result ... />
</div>
```

### U-H2 [HIGH] 缺少错误追踪标识——用户无法报告问题

**行号**: 整个 render 方法

当前错误页面显示的文案完全静态：
- title: "页面出现异常"
- subTitle: "请尝试刷新页面，如果问题持续请联系管理员"

`componentDidCatch` 捕获了 `error` 和 `info.componentStack`，但这些信息仅输出到 `console.error`，用户无法获取。当用户联系管理员时，只能说"页面出错了"，没有任何可追踪的标识。

**修复建议**:
1. 在 state 中保存错误信息（`error: Error | null`），在 `componentDidCatch` 中设置。
2. 生成简短错误 ID（如时间戳哈希 `Date.now().toString(36).toUpperCase()`）显示在页面上。
3. subTitle 更新为包含错误 ID 的文案："请联系管理员并提供错误编号: ERR-XXXXXX"。

### U-M1 [MEDIUM] 缺少 ErrorBoundary 嵌套/分区策略

**行号**: 整个组件

当前 ErrorBoundary 包裹整个应用，任何子组件崩溃都会导致全局错误页面。更好的 UX 是支持局部错误降级——侧边栏崩溃不影响主内容区，主内容区崩溃不影响导航。

当前 Props 接口仅接受 `children`，无 `fallback` prop 自定义错误展示：

```tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  // 缺少: fallback?: React.ReactNode;
}
```

**修复建议**: 添加可选 `fallback` prop 允许不同使用场景自定义错误展示（如侧边栏显示小型错误卡片而非全屏 Result）。

### U-M2 [MEDIUM] 标题和副标题文案层级不够清晰

**行号**: L34-35

antd `Result` 组件的 title 渲染为 `font-size: 24px`，subTitle 为 `font-size: 14px`。按 DESIGN.md 层级：
- 24px 对应 `{typography.card-title}` (24px, weight 400)
- 14px 对应 `{typography.body-sm}` (14px, weight 400, letter-spacing 0.16px)

但 antd Result 的 title 默认字重为 500/600，与 Carbon 的 weight 400 不符。标题"页面出现异常"过于笼统，缺乏用户可操作的上下文。

**修复建议**:
- title: "应用遇到问题" 或 "页面加载失败"（更具体）
- subTitle: 包含错误编号 + 可操作步骤

### U-L1 [LOW] 未利用 antd Typography 组件

**行号**: L34-35

直接使用 Result 的 title/subTitle 字符串，未利用 antd `Typography.Title` / `Typography.Text` 的响应式字体缩放和语义化标记能力。

---

## 五、可访问性评审（权重 20%）

### X-P1 [POSITIVE] 已添加 role="alert" 和 aria-live="assertive"

**行号**: L37-38

正确使用了 WAI-ARIA live region 标注，屏幕阅读器会在错误发生时立即播报。这是 `Result` 组件作为错误反馈的最佳实践。

### X-M1 [MEDIUM] 按钮缺少 aria-label 描述操作后果

**行号**: L36 `<Button type="primary" onClick={this.handleReset}>返回登录</Button>`

按钮文本"返回登录"描述了导航目标，但未传达操作的破坏性（清除会话数据）。辅助技术用户无法仅从按钮文本判断此操作会清除所有本地状态。

**修复建议**: 添加 `aria-label="返回登录（将清除当前会话数据）"` 或使用 `Tooltip` 补充说明。

### X-M2 [MEDIUM] 缺少 heading 层级标注

**行号**: L34 title

antd `Result` 的 title 渲染为 `<div class="ant-result-title">` 而非 `<h1>`-`<h6>` 标题元素。错误页面标题应使用语义化 heading 元素，帮助屏幕阅读器用户理解页面结构。

**修复建议**: 通过 Result 的 `title` prop 传入 `<Typography.Title level={3}>页面出现异常</Typography.Title>` 替代纯字符串。

### X-L1 [LOW] 缺少 skip-to-main-content 导航

当错误页面出现时，键盘用户无法跳过错误内容导航到其他操作。虽然是错误状态，但提供简单的键盘导航路径（如 focus 自动定位到"刷新页面"按钮）能改善体验。

---

## 六、问题汇总

| 级别 | 编号 | 问题 | 分类 |
|------|------|------|------|
| CRITICAL | D-C1 | 零 Token 覆盖——圆角/色值/字体全面违反 DESIGN.md | DESIGN.md |
| HIGH | D-H1 | 错误图标色值 #ff4d4f vs Carbon #da1e28 | DESIGN.md |
| HIGH | A-H1 | 操作与文案矛盾——subTitle 建议"刷新"但无刷新按钮 | antd/UX |
| HIGH | A-H2 | 破坏性操作无确认对话框无 loading 态 | antd/UX |
| HIGH | U-H1 | 错误页面无全屏居中布局 | UX |
| HIGH | U-H2 | 缺少错误追踪标识——用户无法有效报告问题 | UX |
| MEDIUM | D-M1 | 按钮 padding 不符 Carbon 12px 16px 规范 | DESIGN.md |
| MEDIUM | A-M1 | Result icon 未自定义品牌图标 | antd |
| MEDIUM | U-M1 | 缺少 fallback prop 支持局部降级 | UX |
| MEDIUM | U-M2 | 标题文案笼统、字重与 Carbon 不符 | UX |
| MEDIUM | X-M1 | 按钮缺少 aria-label 描述操作后果 | A11y |
| MEDIUM | X-M2 | 标题非语义化 heading 元素 | A11y |
| LOW | U-L1 | 未使用 Typography 组件增强语义 | antd |
| LOW | X-L1 | 缺少键盘 focus 自动定位 | A11y |

---

## 七、评分明细

| 维度 | 权重 | 得分 | 加权 |
|------|------|------|------|
| DESIGN.md 合规性 | 30% | 2.5 | 0.75 |
| antd 最佳实践 | 25% | 4.0 | 1.00 |
| UI/UX 规范 | 25% | 3.5 | 0.88 |
| 可访问性 | 20% | 5.5 | 1.10 |
| **综合** | **100%** | — | **3.73 → 3.8** |

---

## 八、结论

**REQUEST CHANGES 3.8/10**

ErrorBoundary 作为应用的最后一道防线，当前实现在功能层面能完成"捕获错误 → 展示反馈"的基本闭环。但在 UI/UX 层面存在 1 项 CRITICAL + 5 项 HIGH 问题，需要修复后重新评审。

**必须修复的 BLOCKING 项**:
1. **D-C1**: 通过 antd ConfigProvider 或 CSS 覆盖，将按钮圆角改为 0px、主色改为 #0f62fe、字体改为 IBM Plex Sans。
2. **A-H1**: 添加"刷新页面"按钮作为主操作，与 subTitle 文案对齐。
3. **U-H1**: 包裹全屏居中容器，确保错误页面占据完整视口。

**推荐同时修复**:
4. **A-H2**: 为"返回登录"添加 `Modal.confirm` 确认 + Button loading 态。
5. **U-H2**: 生成并显示错误追踪 ID。
6. **D-H1**: 覆盖错误图标色值为 Carbon #da1e28。

修复以上 6 项后，预期评分可提升至 7.0+。
