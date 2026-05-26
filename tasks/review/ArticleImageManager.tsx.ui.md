# pages/article/components/ArticleImageManager.tsx — 软件UI专家评审报告

| 属性 | 值 |
|---|---|
| **文件** | `pages/article/components/ArticleImageManager.tsx` (187行) |
| **评审类型** | UI/UX 专家评审 |
| **评审依据** | DESIGN.md (IBM Carbon Design System) + Ant Design 6.x 规范 + WCAG 2.1 AA |
| **综合评分** | **4.5 / 10** |
| **评审日期** | 2026-05-26 |

---

## 评分维度

| 维度 | 得分 | 说明 |
|---|---|---|
| Design System 合规性 | 4/10 | borderRadius/颜色基本正确，但37处 inline style + 2px 非标边框 + upload 区域 2px 圆角 |
| Antd 组件使用 | 5/10 | Segmented/Upload/Input.Search/Image/Spin 使用正确，但空状态用原生 span 替代 Empty，删除无 Popconfirm，未用 Upload.Dragger |
| 响应式设计 | 3/10 | 固定 80×80px 缩略图、Segmented 不换行、无断点适配、移动端无法操作 |
| 可访问性 (WCAG) | 5/10 | role/aria/tabIndex/onKeyDown 基本覆盖，但删除按钮 20×20px 触控不足、无 focus indicator、图片无 alt |
| 交互与反馈 | 4/10 | 上传有加载文案、知识库有 Spin，但无 hover 态、无删除确认、无选中动画、URL 添加无成功反馈 |
| 视觉层次 | 6/10 | 三模式切换清晰、选中态有勾选覆盖层，但缩略图过小、模式与已选列表间无分隔、间距体系不统一 |

---

## CRITICAL — 严重违反规范（必须修复）

### C1. 37 处 inline style — 违反 DESIGN.md Token 体系与项目规范

- **位置**: 全文件，行 69/71/73/83/95/100/126-130/135-141/152-156/165/167/175 等
- **现状**: 几乎所有 JSX 元素使用 `style={{ ... }}` 硬编码样式，共计 **37 处** inline style
- **违反**:
  - DESIGN.md 明确要求使用 CSS Token 系统（`{colors.*}`, `{spacing.*}`, `{rounded.*}`），而非直接写 CSS 属性
  - CLAUDE.md 铁律第1条要求"前端必须遵守 DESIGN.md"
  - 项目其他组件（如 Sidebar）已全部使用 CSS class + CSS 变量，本组件严重不一致
- **影响**:
  - 无法统一管理主题切换
  - 无法复用样式规则（如 80×80 缩略图在 5 处重复定义）
  - 代码可读性极差，187 行中超过 80 行是样式代码
- **证据**:
  ```tsx
  // ❌ 当前（5处重复的80×80缩略图样式）
  <div style={{ width: 80, height: 80, borderRadius: 0, overflow: 'hidden' }}>  // 行73
  <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 0, overflow: 'hidden' }}>  // 行127
  <div style={{ position: 'relative', width: 80, height: 80, borderRadius: 0, overflow: 'hidden', border: ... }}>  // 行167

  // ✅ 应改为 CSS class
  <div className="image-thumb">...</div>
  ```
- **修复**: 提取 `.image-thumb`、`.image-thumb-selected`、`.image-delete-btn`、`.image-upload-zone`、`.image-empty-text`、`.image-gallery-grid`、`.image-overlay` 等 class 到 `global.css`

### C2. 空状态使用原生 `<span>` 替代 antd `Empty` 组件 — 违反 CLAUDE.md 铁律

- **位置**: 行 69
- **现状**: `<span style={{ color: 'var(--color-ink-subtle)' }}>暂无插图</span>`
- **违反**:
  - CLAUDE.md 铁律第1条："前端必须使用 Ant Design (antd) 组件 — 禁止使用原生 HTML 元素替代 antd 提供的组件"
  - antd 提供 `<Empty>` 组件专门用于空状态展示，支持 `image`、`description`、`imageStyle` 等属性
- **影响**: 空状态无图标、无标准间距、与其他页面的 Empty 组件视觉不一致
- **修复**:
  ```tsx
  <Empty description="暂无插图" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  ```

---

## HIGH — 严重 UI/UX 问题（建议修复）

### H1. 删除按钮 20×20px — 严重违反 DESIGN.md 触控目标规范

- **位置**: 行 170-175
- **现状**:
  ```tsx
  style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, ... }}
  ```
- **违反**:
  - DESIGN.md 明确规定: **"Carbon spec: 48px minimum tap target. Buttons and inputs hold 48px on touch viewports."**
  - WCAG 2.1 SC 2.5.5 (Target Size - AAA) 要求最小 44px
  - WCAG 2.2 SC 2.5.8 (Target Size - AA) 要求最小 24px
- **影响**:
  - 20×20px 仅为 Carbon 48px 标准的 **17% 面积**
  - 移动端几乎无法精确点击删除按钮
  - 删除是破坏性操作，误操作和操作困难都是严重 UX 问题
- **修复**:
  - 扩大可视区域至 32×32px，但通过 `padding` 扩展实际点击区域至 48×48px
  - 使用 antd `<Button type="text" danger size="small">` + 图标替代原生 div

### H2. `Segmented size="small"` — 触控目标不足

- **位置**: 行 85
- **现状**: `<Segmented size="small" options={[...]} />`
- **违反**: DESIGN.md 规定 48px minimum tap target。antd `size="small"` 使 Segmented 高度降至约 32px
- **影响**: 三个模式切换按钮（从知识库选择/上传图片/输入URL）在触摸设备上难以操作
- **修复**: 移除 `size="small"`，使用默认尺寸

### H3. 上传区域 `borderRadius: 2` — 违反 DESIGN.md flat-square 原则

- **位置**: 行 154
- **现状**: `borderRadius: 2`
- **违反**: DESIGN.md 明确规定 `{rounded.none}` 0px 是默认值，"Don't round corners on buttons, cards, or inputs. Even 4px rounded corners break the Carbon look." 2px 虽然是 `{rounded.xs}` 但仅用于 "small badges (rare exception)"
- **影响**: 上传区域圆角与其他 0px 圆角元素（缩略图、按钮）不一致
- **修复**: 改为 `borderRadius: 0`

### H4. 图片选中/已选边框 2px — 违反 DESIGN.md hairline 规范

- **位置**: 行 129 (`border: '2px solid ...'`)、行 167 (`border: '2px solid ...'`)
- **现状**: 知识库选中态和已选图片列表均使用 `2px solid` 边框
- **违反**: DESIGN.md 明确规定 "Card hierarchy is carried by 1px hairlines"，所有 card/container 使用 `1px {colors.hairline}` 边框
- **影响**:
  - 2px 边框过粗，与项目其他组件的 1px hairline 不一致
  - Carbon 的选中态使用的是 **底部 2px primary 下划线**（如 product-tab-selected），而非全边框
- **修复**:
  - 方案A（推荐）: 使用 1px hairline + 底部 2px `--color-primary` 下划线（符合 Carbon tab selected 模式）
  - 方案B: 使用 `outline: 2px solid var(--color-primary); outline-offset: -2px` 替代 border

### H5. 零响应式设计 — 移动端完全不可用

- **位置**: 全组件
- **现状**:
  - 缩略图固定 80×80px，无媒体查询适配
  - `flexWrap: 'wrap'` 允许换行但无最小宽度保护
  - `Segmented` 三个选项在小屏幕上可能溢出
  - `Input.Search` 无 `style={{ width: '100%' }}`，宽度不确定
  - 知识库图片网格无列数限制，移动端可能一行挤入过多图片
- **违反**: DESIGN.md 定义了完整的响应式断点系统（Desktop → Tablet → Mobile）
- **影响**: 在 672px 以下视口，组件布局可能完全混乱
- **修复**:
  - 缩略图使用 `clamp(60px, 15vw, 80px)` 或媒体查询
  - Segmented 考虑使用 antd `<Radio.Group optionType="button">` 替代以获得更好的换行支持
  - 添加 `max-width` 和响应式 class

### H6. 无删除确认 — 破坏性操作无保护

- **位置**: 行 173
- **现状**: `onClick={() => imageListChange(imageList.filter((_, i) => i !== idx))}`
- **违反**:
  - Nielsen Norman Group 启发式 #5: "Error Prevention" — 破坏性操作需要确认
  - antd 提供 `Popconfirm` 组件专门用于此场景
  - CLAUDE.md 铁律要求使用 antd 组件
- **影响**: 用户误点删除按钮立即移除图片，无法撤销
- **修复**:
  ```tsx
  <Popconfirm title="确定删除此图片？" onConfirm={() => imageListChange(...)} okText="删除" cancelText="取消">
    <Button type="text" danger size="small" icon={<DeleteOutlined />} />
  </Popconfirm>
  ```

---

## MEDIUM — 中等 UI 问题

### M1. 知识库图片无 hover 反馈 — 交互不可发现

- **位置**: 行 104-145
- **现状**: 点击选择/取消，但无 `:hover` 视觉反馈（无背景色变化、无边框过渡、无 opacity 变化）
- **影响**: 用户不知道图片是可点击的，特别是未选中状态的图片与普通展示图片外观一致
- **Carbon 参考**: Carbon tile 组件 hover 态使用 `background: {colors.surface-1}` + `cursor: pointer`
- **修复**: 添加 hover 样式 `background: var(--color-surface-1); transition: all 150ms ease`

### M2. 删除按钮无 Tooltip — 功能不可发现

- **位置**: 行 169-178
- **现状**: 删除按钮仅有 `aria-label="删除图片 ${idx + 1}"`，无视觉提示
- **影响**: 用户需要悬停才能猜测功能，且 20×20px 的区域难以发现
- **修复**: 使用 antd `<Tooltip title="删除">` 包裹删除按钮

### M3. 知识库加载态使用 Spin 而非 Skeleton — 加载体验不自然

- **位置**: 行 94-98
- **现状**: `<Spin spinning={kbLoading}>` 包裹空状态文案
- **影响**:
  - Spin 显示旋转图标，但内容区域是空白的"知识库暂无图片"文案，加载完成后文案突然消失并显示图片
  - Skeleton 加载态更自然，显示占位方块与最终布局一致
- **修复**: 使用 antd `<Skeleton.Image>` 替代 Spin：
  ```tsx
  {kbLoading ? (
    <div style={{ display: 'flex', gap: 8 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton.Image key={i} active style={{ width: 80, height: 80 }} />
      ))}
    </div>
  ) : ...}
  ```

### M4. 覆盖层颜色使用硬编码 rgba 而非 CSS 变量

- **位置**: 行 137、175
- **现状**:
  ```tsx
  background: 'var(--color-overlay-light, rgba(22,22,22,0.25))'   // 行137
  background: 'var(--color-overlay-medium, rgba(22,22,22,0.5))'   // 行175
  ```
- **问题**: `--color-overlay-light` 和 `--color-overlay-medium` 在 `global.css` 中未定义，最终 fallback 到硬编码 rgba 值
- **影响**: 如果未来引入暗色主题，这些硬编码的 rgba 值不会自动适配
- **修复**: 在 `global.css` 中定义这些变量，或使用 DESIGN.md 已有的 surface token

### M5. 图片缺少 alt 属性 — 可访问性不足

- **位置**: 行 74 (`<Image src={url} ... />`), 行 133 (`<Image src={img.image_url} ... />`), 行 168 (`<Image src={url} ... />`)
- **现状**: 所有 `<Image>` 组件均无 `alt` 属性
- **违反**: WCAG 1.1.1 Non-text Content 要求所有 `<img>` 必须有 `alt` 文本
- **影响**: 屏幕阅读器无法描述图片内容
- **修复**:
  - 浏览态: `<Image src={url} alt={`插图 ${idx + 1}`} />`
  - 知识库: `<Image src={img.image_url} alt={img.title} />`

### M6. 上传区域使用原生 div 而非 antd Upload.Dragger — 错失标准组件

- **位置**: 行 152-158
- **现状**: 手动创建 `<Upload>` + 自定义 div 子元素模拟拖拽区域
- **违反**: antd 提供 `Upload.Dragger` 专门用于拖拽上传场景，内置拖拽高亮、动画、禁用态
- **影响**: 缺少拖拽高亮反馈（文件拖到区域时的视觉提示），且需要手动维护上传中样式
- **修复**:
  ```tsx
  <Upload.Dragger accept="image/*" showUploadList={false} beforeUpload={handleUpload} disabled={uploading}>
    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
    <p>{uploading ? '上传中...' : '点击或拖拽上传图片'}</p>
  </Upload.Dragger>
  ```

### M7. 缩略图 80×80px 硬编码 — 未使用 spacing token

- **位置**: 行 73/127/167 等
- **现状**: `width: 80, height: 80` 直接硬编码
- **违反**: DESIGN.md 定义了 spacing token 系统（4px grid: 8/12/16/24/32/48/96），80px 不在任何 token 上
- **影响**: 与项目其他组件的尺寸体系不统一
- **修复**: 使用 80px（`spacing.xl × 2 + spacing.xs` = 72px，或 `spacing.xxl + spacing.md + spacing.xs` = 72px），或定义 CSS 变量 `--image-thumb-size: 80px` 集中管理

### M8. 已选图片列表无视觉分隔 — 模式区域与已选区域混淆

- **位置**: 行 164-182
- **现状**: 已选图片列表通过 `{imageList.length > 0 && (...)}` 直接渲染在模式内容下方，无 `<Divider />` 或间距分隔
- **影响**: 用户无法区分"操作区域"（选择/上传/URL）和"已选结果区域"
- **修复**: 在已选列表前添加 antd `<Divider style={{ margin: '12px 0' }} />` 或使用带标题的分组

---

## LOW — 轻微问题

### L1. 图片数组索引作为 key — React 渲染异常风险

- **位置**: 行 72 (`key={idx}`)、行 166 (`key={idx}`)
- **现状**: 使用数组索引作为 React key
- **影响**: 当删除中间图片时 React 可能复用错误的 DOM 节点，导致图片闪烁或状态错乱
- **修复**: 使用图片 URL 作为 key: `key={url}`（已通过 `imageList.includes(url)` 确保去重）

### L2. InboxOutlined fontSize: 24 硬编码

- **位置**: 行 155
- **现状**: `<InboxOutlined style={{ fontSize: 24 }} />`
- **Carbon 参考**: DESIGN.md 未定义 icon 尺寸 token，但 antd icon 默认 16px
- **建议**: 定义 `--icon-size-upload: 24px` CSS 变量集中管理

### L3. 非编辑态无图片数量提示

- **位置**: 行 67-79
- **现状**: 非编辑态仅显示图片网格，无总数提示
- **建议**: 添加 `Typography.Text type="secondary"` 显示"共 N 张插图"

### L4. CheckOutlined fontSize: 20 硬编码

- **位置**: 行 141
- **现状**: `<CheckOutlined style={{ color: 'var(--color-on-primary)', fontSize: 20 }} />`
- **建议**: 统一 icon 尺寸管理

### L5. 上传限制 10MB 仅前端校验 — 无进度提示

- **位置**: 行 29
- **现状**: `file.size > 10 * 1024 * 1024` 前端校验文件大小
- **建议**: 大文件上传时添加 antd `<Progress>` 显示上传进度，而非仅文字"上传中..."

### L6. Input.Search enterButton 使用 LinkOutlined — 语义不当

- **位置**: 行 162
- **现状**: `enterButton={<LinkOutlined />}`
- **影响**: LinkOutlined 表示"链接"语义，但此处操作是"添加 URL"，应使用 PlusOutlined
- **修复**: `enterButton={<PlusOutlined />}` 或使用文字按钮 `enterButton="添加"`

---

## 评审总结

### 问题统计

| 严重程度 | 数量 | 编号 |
|---|---|---|
| CRITICAL | 2 | C1, C2 |
| HIGH | 6 | H1, H2, H3, H4, H5, H6 |
| MEDIUM | 8 | M1, M2, M3, M4, M5, M6, M7, M8 |
| LOW | 6 | L1, L2, L3, L4, L5, L6 |
| **合计** | **22** | |

### 核心优点

1. **颜色使用正确** — 使用 `var(--color-primary)`, `var(--color-hairline)`, `var(--color-ink-subtle)` 等 CSS 变量，与 DESIGN.md 色彩体系对齐
2. **borderRadius: 0 合规** — 大部分元素使用 0px 圆角，符合 Carbon flat-square 原则
3. **可访问性基础覆盖** — `role="checkbox"`, `aria-checked`, `aria-label`, `tabIndex`, `onKeyDown` (Enter/Space) 已在知识库选择器上实现
4. **三模式切换设计合理** — 知识库选择/上传/URL 三种输入方式覆盖了主要使用场景
5. **选中态视觉清晰** — 勾选图标 + 半透明覆盖层提供明确的选中反馈
6. **React.memo 优化** — 使用 `React.memo` 避免不必要的重渲染

### 核心问题

组件存在三个根本性 UI 问题：

1. **样式架构严重违规** — 37 处 inline style 是最突出的问题，完全绕过了 DESIGN.md 的 Token 体系和项目的 CSS 变量系统，导致无法统一管理主题、无法复用样式、代码可维护性极差
2. **触控目标全面不足** — 删除按钮 20×20px、Segmented size="small"、缩略图内无 padding，均远低于 Carbon 48px 触控标准，移动端体验灾难性
3. **antd 组件利用不足** — 空状态用原生 span（应使用 Empty）、删除无确认（应使用 Popconfirm）、拖拽上传用手动 div（应使用 Upload.Dragger）、加载态用 Spin（应使用 Skeleton.Image），多项违反 CLAUDE.md 铁律

### 推荐修复优先级

1. **P0（立即）**: C1 提取所有 inline style 为 CSS class; C2 空状态改用 antd Empty
2. **P0（立即）**: H1 删除按钮触控扩展至 48px; H6 添加 Popconfirm 删除确认
3. **P1（本迭代）**: H2 Segmented 移除 size="small"; H3 上传区域 borderRadius 改 0; H4 边框改 1px hairline; H5 添加响应式适配
4. **P2（下迭代）**: M1-M8 添加 hover 反馈/Tooltip/Skeleton/alt/Uploader.Dragger/Divider 等
5. **P3（可选）**: L1-L6 key 优化/icon 统一/进度提示等

### 预期评分

- **修复 CRITICAL + HIGH 后**: 7.5 / 10
- **全部修复后**: 8.5 / 10
