# pages/knowledge/KeywordDetail.tsx — 软件UI专家评审报告

| 属性 | 值 |
|---|---|
| **文件** | `pages/knowledge/KeywordDetail.tsx` |
| **评审类型** | UI/UX 专家评审 |
| **评审依据** | DESIGN.md (IBM Carbon Design System) + Ant Design 5.x/6.x 规范 + WCAG 2.1 AA |
| **综合评分** | **3.5 / 10** |
| **评审日期** | 2026-05-26 |

---

## 评分维度

| 维度 | 得分 | 说明 |
|---|---|---|
| Design System 合规性 | 4/10 | 使用了 page-container/form-actions 等规范 class，但 7+ 处 inline style 硬编码间距、宽度、布局，绕过 CSS Token 体系 |
| Antd 组件使用 | 4/10 | Form/Table/Pagination/Checkbox 基本到位，但 Alert `title` prop 错误导致内容不可见、Table 未用 rowSelection、缺 Skeleton/Tooltip/Empty |
| 响应式设计 | 2/10 | 零响应式适配——无 media query、无卡片/表格切换、输入框和表格在移动端溢出 |
| 可访问性 (WCAG) | 3/10 | disabled 按钮无 Tooltip 解释、无 aria-label、Checkbox 列无表头关联、触控目标不足 48px |
| 交互与反馈 | 5/10 | 有 loading 态(message/Spin)、有保存计数反馈，但缺 Skeleton、无批量选择、扩词无防抖 |
| 视觉层次 | 3/10 | Alert 错误不可见导致视觉层次断裂，空状态无引导，表单/表格/操作区缺少视觉分组 |

---

## CRITICAL — 违反强制规则（必须修复）

### C1. Alert 使用 `title` prop — antd Alert 无 `title` 属性，错误内容完全不可见
- **位置**: `KeywordDetail.tsx:70`、`KeywordDetail.tsx:189`
- **违反**: antd Alert 组件 API — 主文案 prop 为 `message` 而非 `title`
- **现状**:
  ```tsx
  // :70 — 无效ID守卫 Alert
  <Alert type="error" title="无效的知识库ID" showIcon
    action={<Button onClick={() => navigate('/knowledge')}>返回列表</Button>} />

  // :189 — 表单错误 Alert
  {error && <Alert type="error" title={error} className="form-alert" showIcon closable
    onClose={() => setError('')} style={{ marginBottom: 16 }} />}
  ```
- **影响**:
  - `title` 作为 HTML 原生属性传递给 `<div>`，仅显示为浏览器悬停 tooltip
  - **Alert 框可见但文案不可见**——用户看到空红色/蓝色框，无法理解错误原因
  - :70 处的无效 ID 场景，用户面对一个空的红色框+一个"返回列表"按钮，无法理解为什么被拦截
  - :189 处的保存失败场景，后端返回的错误信息完全丢失，用户无法排查问题
  - **这是阻断级 UI Bug**——错误反馈系统形同虚设
- **修复**:
  ```tsx
  // :70
  <Alert type="error" message="无效的知识库ID" showIcon
    action={<Button onClick={() => navigate('/knowledge')}>返回列表</Button>} />

  // :189
  {error && <Alert type="error" message={error} className="form-alert" showIcon closable
    onClose={() => setError('')} style={{ marginBottom: 16 }} />}
  ```

---

## HIGH — 严重 UI/UX 问题（建议修复）

### H1. 零响应式设计 — 移动端完全不可用
- **位置**: 整个组件（:176-245）
- **现状**: 页面无任何 media query 或响应式策略：
  - 输入框固定 `width: 280` (:192)，小屏幕溢出
  - `layout="inline"` 的 Form 在窄屏下控件换行但间距失控
  - Table 列固定宽度，无横向滚动处理
  - 面包屑在窄屏下不折叠
- **DESIGN.md 参考**: 响应式断点规范——Tablet 672px 卡片 2-up、Mobile 320px 单列，触控目标 48px
- **影响**: 在手机/平板上访问此页面，内容溢出、操作按钮不可达
- **修复**:
  1. 输入框改用 `style={{ width: '100%', maxWidth: 280 }}` 或 CSS class
  2. Table 添加 `scroll={{ x: 'max-content' }}`
  3. 考虑在 `<672px` 时将 Form `layout` 切换为 `vertical`
  4. 使用 `@media (max-width: 672px)` 或 `useBreakpoint` hook

### H2. 7+ 处 inline style 绕过 DESIGN.md Token 体系
- **位置**: `:185`、`:190`、`:192`、`:202`、`:211`、`:222`
- **现状**:
  ```tsx
  style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}  // :185
  style={{ marginBottom: 16 }}           // :190, :202
  style={{ width: 280 }}                  // :192
  style={{ marginTop: 12, textAlign: 'right' }}  // :211
  style={{ marginTop: 16 }}               // :222
  ```
- **违反**: DESIGN.md 间距体系——`12px` 对应 `spacing.sm`、`16px` 对应 `spacing.md`
- **影响**:
  - 无法通过 CSS 变量统一调整间距
  - 与 global.css 中已定义的间距 class 不一致
  - inline style 优先级最高，无法被主题覆盖
- **修复**: 抽取为 CSS class 或使用 antd `Space`/`Flex` 组件：
  ```css
  .keyword-detail-header { display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-md); }
  .keyword-detail-form { margin-bottom: var(--spacing-md); }
  .keyword-detail-pagination { margin-top: var(--spacing-sm); text-align: right; }
  ```

### H3. 缺少 Skeleton 骨架屏 — 加载体验突兀
- **位置**: `:148`
- **现状**: `<div className="page-container"><Spin /></div>` — 全局遮罩旋转器
- **影响**:
  - 加载时页面完全空白，只有一个居中旋转圈
  - 用户无法预期页面结构，首屏感知时间长
  - 不符合 Carbon 加载态规范（推荐 Skeleton）
- **DESIGN.md 参考**: Carbon Skeleton 模式——展示与最终内容结构对应的占位块
- **修复**:
  ```tsx
  if (loading) return (
    <div className="page-container">
      <Skeleton.Input active style={{ width: 200, marginBottom: 16 }} />
      <Skeleton.Input active style={{ width: 280, marginBottom: 16 }} />
      <Skeleton paragraph={{ rows: 5 }} active />
    </div>
  );
  ```

### H4. Table 未使用 antd 内置 `rowSelection` — 手动 Checkbox 列
- **位置**: `:101-103`（toggleSelect）、`:152-171`（columns 定义）
- **现状**: 自定义 Checkbox 列实现选择功能，而非使用 antd Table 的 `rowSelection` 属性
  ```tsx
  {
    title: '选择',
    key: 'select',
    width: 80,
    render: (_: unknown, record: ExpandedWordItem) => (
      <Checkbox checked={record.selected} onChange={() => toggleSelect(record.word)} disabled={!canEdit} />
    ),
  }
  ```
- **影响**:
  - 丧失 antd 内置功能：全选/反选 header checkbox、受控选中态管理
  - 列标题"选择"占用水平空间，不如 antd checkbox 列紧凑
  - 手动维护 selected 状态增加 bug 风险
- **修复**: 使用 `rowSelection` 配置：
  ```tsx
  <Table
    rowSelection={{
      selectedRowKeys: expandedWords.filter(w => w.selected).map(w => w.word),
      onChange: (keys) => { /* update selected state */ },
      getCheckboxProps: () => ({ disabled: !canEdit }),
    }}
  />
  ```

### H5. disabled 按钮无 Tooltip 解释原因
- **位置**: `:195`（智能扩词按钮）、`:228`（保存按钮）
- **现状**:
  ```tsx
  <Button ... disabled={!keywordValue?.trim() || !canEdit}>智能扩词</Button>
  <Button ... disabled={isNew && expandedWords.filter(w => w.selected).length === 0}>
    保存...
  </Button>
  ```
- **影响**:
  - 用户看到灰色按钮但不知道为什么不可用
  - 新用户不理解"需要先选择关键词才能保存"的业务规则
  - 可访问性缺陷：屏幕阅读器无语义信息
- **DESIGN.md 参考**: Carbon disabled 状态需提供原因提示
- **修复**:
  ```tsx
  <Tooltip title={!keywordValue?.trim() ? '请先输入种子词' : !canEdit ? '无编辑权限' : ''}>
    <Button ... disabled={!keywordValue?.trim() || !canEdit}>智能扩词</Button>
  </Tooltip>
  ```

### H6. 无全选/反选批量操作控件
- **位置**: `:201-234`（expandedWords 区域）
- **现状**: 扩词结果只有逐个 Checkbox 选择，无"全选"/"反选"按钮
- **影响**:
  - 扩词可能返回 20-50 个词，逐个点击效率极低
  - 用户最常见的操作是"全部接受"或"选择大部分再排除几个"
  - 当前交互模式: 50 个词 = 50 次点击
- **修复**: 在 Table 上方或 columns 头部添加批量操作：
  ```tsx
  <div style={{ marginBottom: 8 }}>
    <Button size="small" onClick={selectAll}>全选</Button>
    <Button size="small" onClick={deselectAll}>取消全选</Button>
    <span>已选 {selectedCount}/{totalCount}</span>
  </div>
  ```
  或使用 antd Table `rowSelection` 自带全选 checkbox。

---

## MEDIUM — 中等 UI 问题

### M1. Form `layout="inline"` 不适合详情页
- **位置**: `:190`
- **现状**: `<Form form={form} layout="inline" style={{ marginBottom: 16 }}>`
- **影响**:
  - inline 布局将 label 和输入框横向排列，在窄屏下换行混乱
  - 详情页通常是纵向表单，inline 布局更适合工具栏/筛选栏
  - "种子词"label + input + "智能扩词"按钮横排，视觉上过于紧凑
- **修复**: 改为 `layout="horizontal"` 或使用 `Space.Compact` 将输入框和按钮组合

### M2. Input 宽度硬编码 280px
- **位置**: `:192`
- **现状**: `<Input placeholder="输入种子词" style={{ width: 280 }} disabled={!canEdit} />`
- **影响**: 280px 是魔数，不在 DESIGN.md 间距体系中；不同屏幕尺寸无法自适应
- **修复**: 使用 CSS class `max-width` 或 antd `style={{ width: '100%', maxWidth: 280 }}`

### M3. Pagination 缺少 showTotal — 用户无法感知总数
- **位置**: `:212-218`
- **现状**:
  ```tsx
  <Pagination current={expandPage} pageSize={EXPAND_PAGE_SIZE} total={expandedWords.length}
    showSizeChanger={false} onChange={(p) => setExpandPage(p)} />
  ```
- **影响**: 用户看到分页器但不知道总共有多少条数据、当前在第几页
- **修复**: 添加 `showTotal={(total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`}`

### M4. 空状态无视觉引导
- **位置**: `:201`（expandedWords.length === 0 时无任何显示）
- **现状**: 当没有扩词结果时，表单下方完全空白，无任何引导
- **影响**: 新用户不知道需要先输入种子词再点击"智能扩词"
- **修复**:
  ```tsx
  {expandedWords.length === 0 && !expanding && (
    <Empty description="输入种子词并点击"智能扩词"生成关键词" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  )}
  ```

### M5. Table `size="small"` 触控目标不足 48px
- **位置**: `:205`
- **现状**: `<Table ... size="small" bordered>`
- **DESIGN.md 参考**: "Carbon spec: 48px minimum tap target"
- **影响**: small table 行高约 36-40px，Checkbox 和文字点击区域不足
- **修复**: 移动端使用 `size="middle"` 或通过 CSS `min-height: 48px` 扩大触控区域

### M6. 面包屑字号 20px 对于详情页过大
- **位置**: `:179-184`
- **现状**: 使用 `page-breadcrumb` class，global.css 定义 `.page-breadcrumb .ant-breadcrumb { font-size: 20px }`
- **DESIGN.md 参考**: `subhead` token 为 20px 400 weight，属于正文强调级别；面包屑应使用 `body-sm`（14px）
- **影响**: 面包屑作为辅助导航元素，20px 比页面标题的 Typography.Title level={2}（24px）小不了多少，视觉层次倒挂
- **修复**: 为详情页面包屑添加专门的 CSS class 使用 `font-size: 14px`

---

## LOW — 轻微问题

### L1. 保存按钮文案混合中文与数字
- **位置**: `:230`
- **现状**: `` `保存${isNew && expandedWords.some(w => w.selected) ? ` (${expandedWords.filter(w => w.selected).length}个)` : ''}` ``
- **影响**: 按钮文案"保存 (5个)"中数字和中文直接拼接，全角/半角括号不一致（使用的是半角括号）
- **建议**: 统一为全角括号 `（${count}个）` 或改用 badge 显示数量

### L2. 保存按钮内重复计算 selected 数量
- **位置**: `:228-231`
- **现状**: 同一个 render 中 `expandedWords.filter(w => w.selected).length` 被计算 3 次（disabled 判断 1 次 + 条件判断 1 次 + 文案显示 1 次）
- **影响**: 每次 render 3 次 O(n) 过滤，虽然 n 较小但违反 DRY 原则
- **建议**: 提取为变量 `const selectedCount = expandedWords.filter(w => w.selected).length;`

### L3. 分页器右对齐硬编码
- **位置**: `:211`
- **现状**: `<div style={{ marginTop: 12, textAlign: 'right' }}>`
- **影响**: inline style 不利于统一调整布局
- **建议**: 使用 CSS class 或 antd Table 内置 `pagination` 属性

### L4. 无键盘快捷键支持
- **位置**: 整个页面
- **现状**: 无 Ctrl+S 保存快捷键、无 Escape 返回快捷键
- **影响**: 高频用户无法通过键盘提高操作效率
- **建议**: 添加 `useEffect` 监听键盘事件，Ctrl+S 触发 handleSave

---

## 评审总结

### 问题统计

| 严重程度 | 数量 | 编号 |
|---|---|---|
| CRITICAL | 1 | C1 |
| HIGH | 6 | H1, H2, H3, H4, H5, H6 |
| MEDIUM | 6 | M1, M2, M3, M4, M5, M6 |
| LOW | 4 | L1, L2, L3, L4 |
| **合计** | **17** | |

### 核心问题

页面存在一个根本性 UI 缺陷和两个系统性设计缺陷：

1. **Alert 内容不可见（C1）** — antd Alert 使用 `title` prop 而非 `message`，导致所有错误提示框可见但文案不可见。无效 ID 拦截场景（:70）和保存失败场景（:189）的用户反馈完全失效。错误提示是 UI 的安全网，安全网断裂意味着用户在面对问题时完全失明。

2. **零响应式设计（H1）** — 整个页面无任何响应式策略。输入框固定 280px、Form inline 布局、Table 无横向滚动，在 672px 以下设备上内容溢出不可用。DESIGN.md 明确定义了 Tablet/Mobile 断点规范。

3. **inline style 泛滥（H2）** — 7+ 处 inline style 绕过 DESIGN.md CSS Token 体系。间距值（12/16px）虽对应 Token（sm/md），但硬编码在 JSX 中无法统一管理和主题覆盖。

### 推荐修复优先级

1. **P0（立即）**: C1 Alert `title`→`message` 修复——1 分钟修复，影响所有错误可见性
2. **P1（本迭代）**: H2 inline style 提取为 CSS class、H3 Skeleton 替换 Spin、H5 disabled Tooltip
3. **P1（本迭代）**: H4 Table rowSelection 替换手动 Checkbox、H6 添加全选控件
4. **P2（下迭代）**: H1 响应式适配、M1-M6 中等优化
5. **P3（可选）**: L1-L4 轻微改进

### 正面评价

- 页面整体布局结构合理（面包屑 → 标题栏 → 表单 → 表格 → 操作按钮），信息层次清晰
- 使用 `page-container`、`page-breadcrumb`、`form-actions` 等 global.css 规范 class，框架层符合 Carbon 设计
- `form-actions` 的 sticky 定位 + hairline border-top 遵循 Carbon 表单操作栏规范
- Breadcrumb 三级导航（知识库列表 → 具体知识库 → 详情页）路径清晰，每级均可点击返回
- 保存按钮的计数反馈（"保存 (5个)"）是良好的 UX 实践
- loading 态使用 message.error/success 提供基本操作反馈
- 返回按钮（ArrowLeftOutlined + type="text"）设计克制，不喧宾夺主
