# pages/user/index.tsx — 软件UI专家评审报告

| 属性 | 值 |
|---|---|
| **文件** | `pages/user/index.tsx` |
| **评审类型** | UI/UX 专家评审 |
| **评审依据** | DESIGN.md (IBM Carbon Design System) + Ant Design 6.x 规范 + WCAG 2.1 AA |
| **综合评分** | **4.0 / 10** |
| **评审日期** | 2026-05-26 |

---

## 评分维度

| 维度 | 得分 | 说明 |
|---|---|---|
| Design System 合规性 | 4/10 | CSS 变量基本遵循 Carbon，但原生 table 绕过 antd、颜色硬编码、触控目标不达标 |
| Antd 组件使用 | 3/10 | 核心表格不用 antd Table、Descriptions 过度使用、缺少 Tooltip/Popconfirm |
| 响应式设计 | 6/10 | 卡片/表格双视图切换基本可用，但双渲染浪费 DOM、工具栏移动端堆叠欠佳 |
| 可访问性 (WCAG) | 2/10 | 无 aria-label、无 focus 管理、无键盘导航、触控目标不足 48px |
| 交互与反馈 | 4/10 | 有 loading 态但缺 skeleton、无操作确认对话框、搜索无防抖 |
| 视觉层次 | 5/10 | 基本结构清晰，但面包屑单层无意义、空状态缺乏引导 |

---

## CRITICAL — 违反强制规则（必须修复）

### C1. 使用原生 HTML `<table>` 代替 antd `<Table>` 组件
- **位置**: `index.tsx:159-199`
- **违反**: CLAUDE.md 铁律第1条"前端必须使用 Ant Design (antd) 组件 — 禁止使用原生 HTML 元素替代 antd 提供的组件（Button、Input、Form、Card、Menu、Layout、Table、Modal 等）"
- **现状**: 使用 `<table className="user-table">` 手工构建表格，自行处理 thead/tbody/tr/td
- **对比**: `pages/company/index.tsx:162` 和 `pages/skills/index.tsx:166` 均正确使用 antd `<Table>` 组件
- **影响**:
  - 丧失 antd Table 内置功能：排序、筛选、行选择、固定列、可展开行
  - CSS 强覆盖丢失一致性风险
  - 无 aria 属性支持，可访问性不达标
- **修复**: 替换为 antd `<Table>` 组件，通过 `columns` 定义列配置

### C2. 搜索输入无防抖 — 每次击键触发 API 请求
- **位置**: `index.tsx:85`
- **现状**: `onChange={(e) => { setSearch(e.target.value); setPage(1); }}` 直接更新 search state → 触发 `fetchData` useEffect
- **影响**:
  - 用户输入"张三"2个字即触发2次 API 请求
  - 搜索"系统管理员"5个字触发5次请求
  - 高频请求增加服务器负载，用户体验卡顿
- **DESIGN.md 参考**: Carbon 搜索组件规范要求输入延迟 300ms
- **修复**: 使用 lodash `debounce` 或 ahooks `useDebounceFn`，300ms 延迟后触发搜索

---

## HIGH — 严重 UI/UX 问题（建议修复）

### H1. 卡片视图和表格视图同时渲染 — 双倍 DOM 消耗
- **位置**: `index.tsx:125-200`
- **现状**: 卡片视图 (`<div className="user-cards">`) 和表格视图 (`<div className="user-table-wrapper">`) 同时渲染完整 DOM 树，通过 CSS `display: none` 隐藏其中一个
- **影响**:
  - 12 条用户数据 = 卡片12个 Card + 表格12行 = 24 个完整组件实例
  - 每次状态更新（搜索、分页、切换）双倍 React reconciliation 开销
  - 数据量大时 DOM 节点数翻倍
- **修复方案**:
  1. **推荐**: 使用 `window.matchMedia` hook 检测屏幕宽度，条件渲染单一视图
  2. **备选**: 使用 antd `<Table>` 的 `responsive` 属性自动处理

### H2. 状态切换无确认对话框 — Switch 直接调用 API
- **位置**: `index.tsx:66-75`（`handleToggleStatus`）、`index.tsx:138`（Switch 绑定）
- **现状**: 点击 Switch 直接 `apiClient.put` 切换用户启用/禁用，无任何确认提示
- **影响**:
  - 误触导致用户被禁用，影响业务
  - 禁用 sysadmin 理论上被 `item.role !== 'sysadmin'` 保护，但 Switch 仍然渲染给普通用户看
  - 无 undo 机制
- **DESIGN.md 参考**: Carbon 破坏性操作需要确认步骤
- **修复**: 使用 antd `<Popconfirm>` 包裹 Switch，确认后再执行 API 调用

### H3. 编辑按钮纯图标无 Tooltip — 可访问性缺陷
- **位置**: `index.tsx:144-151`（卡片）、`index.tsx:187-194`（表格）
- **现状**: `<Button type="text" size="small" icon={<EditOutlined />}>` — 纯图标按钮
- **影响**:
  - 无文字提示，用户不确定按钮功能
  - 无 `aria-label` 属性，屏幕阅读器读取为空按钮
  - `disabled` 状态无 Tooltip 解释原因（"系统管理员不可编辑"）
- **修复**: 使用 antd `<Tooltip title="编辑用户">` 包裹按钮，添加 `aria-label="编辑用户"`

### H4. 缺少 Skeleton 骨架屏 — 加载体验突兀
- **位置**: `index.tsx:123`
- **现状**: 使用 `<Spin spinning={loading}>` 全局遮罩旋转器
- **影响**:
  - Spin 覆盖整个内容区域，加载时用户看到空白+旋转圈
  - 首次加载白屏时间感知长
  - 不符合 Carbon 加载态规范（推荐 Skeleton）
- **修复**: 使用 antd `<Skeleton>` 组件模拟内容结构，或 `<Spin>` + `<Card loading>`

### H5. Pagination 功能不完整
- **位置**: `index.tsx:204-214`
- **现状**: `showSizeChanger={false}`，无 `showTotal`，无 `showQuickJumper`
- **影响**:
  - 用户无法看到"共 X 条"统计
  - 无法切换每页条数
  - 大量数据时无法跳转到指定页
- **修复**: 添加 `showTotal={(total) => \`共 ${total} 条\`}` 和 `showSizeChanger`

---

## MEDIUM — 中等 UI 问题

### M1. 面包屑仅单层 — 无导航价值
- **位置**: `index.tsx:79`
- **现状**: `<Breadcrumb items={[{ title: '用户管理' }]} />` — 只有一项
- **影响**: 面包屑的本质是展示层级路径并提供返回导航，单层面包屑既不能导航也不传达层级信息
- **修复**: 添加上级层级如 `{ title: '系统管理', path: '/sysadmin' }`，或用页面标题 `<Typography.Title>` 代替

### M2. 卡片视图 Descriptions 组件过度设计
- **位置**: `index.tsx:133-141`
- **现状**: 使用 `<Descriptions column={2} size="small">` 展示3个字段（用户名、角色、状态）
- **影响**:
  - 3个字段用 Descriptions 显得过于正式和臃肿
  - `column={2}` 导致第3个字段独占一行，布局不均匀
  - 角色信息重复：Card title 的 `extra` 已显示 Tag，Descriptions.Item 又显示一次
- **修复**: 简化为轻量布局，用 flex/grid 直接排列字段，消除角色重复显示

### M3. 颜色值硬编码 — 违反 DESIGN.md Token 体系
- **位置**: `index.tsx:22-26`
- **现状**:
  ```tsx
  const roleColors: Record<string, string> = {
    sysadmin: '#0f62fe',   // 直接使用 IBM Blue
    admin: '#525252',      // 直接使用 ink-muted
    view: '#8c8c8c',       // 直接使用 ink-subtle
  };
  ```
- **影响**:
  - `sysadmin` 用 `#0f62fe`（IBM Blue）与主色完全相同，DESIGN.md 明确"IBM Blue as the single brand accent — reserve for primary CTAs, links, focused-input underlines"
  - 不能与全局主题切换同步
  - 硬编码值无法被 antd token 系统覆盖
- **修复**: 使用 antd Tag 的预设颜色 `blue`/`gray`，或通过 CSS 变量引用

### M4. 无排序功能 — 表格缺乏数据操作能力
- **位置**: 整个表格视图
- **现状**: 表格列（姓名、角色、状态）均不支持排序
- **影响**: 用户数量增多后，无法快速查找特定角色的用户
- **修复**: 使用 antd Table 后可通过 `sorter` 属性轻松实现列排序

### M5. 空状态缺乏引导
- **位置**: `index.tsx:126-130`（卡片）、`index.tsx:170-174`（表格）
- **现状**: 空数据时仅显示文字"暂无数据"
- **影响**: 无视觉引导，无操作建议（如"点击添加用户"按钮）
- **修复**: 使用 antd `<Empty description="暂无用户数据">` 配合添加按钮引导

### M6. 触控目标不足 48px — 违反 Carbon 规范
- **位置**: `index.tsx:138`（`Switch size="small"`）、`index.tsx:148`（`Button size="small"`）
- **现状**: Switch 和 Button 均使用 `size="small"`
- **DESIGN.md 参考**: "Carbon spec: 48px minimum tap target. Buttons and inputs hold 48px on touch viewports."
- **影响**: 移动端触摸操作容易误触
- **修复**: 移动端使用默认尺寸或通过 CSS `min-height: 48px` / `min-width: 48px` 保证触控区域

---

## LOW — 轻微问题

### L1. `@` 前缀用户名显示
- **位置**: `index.tsx:134`、`index.tsx:178`
- **现状**: `@{item.username}` 显示 `@` 前缀
- **影响**: 这是社交平台（Twitter/微博）的惯例，在企业管理系统中可能引起困惑（用户可能以为是邮箱前缀）
- **建议**: 去掉 `@` 前缀或改为其他区分方式

### L2. 角色 Tag 颜色选择不合理
- **位置**: `index.tsx:132`（卡片）、`index.tsx:179`（表格）
- **现状**: sysadmin 使用 IBM Blue (#0f62fe)，与页面主色和按钮主色完全相同
- **影响**: Tag 和按钮颜色相同，视觉层次混淆
- **建议**: sysadmin 用 `geekblue` 或 `purple`，admin 用 `default`，view 用 `default`

### L3. 无键盘导航支持
- **位置**: 整个页面
- **现状**: 表格行不可聚焦，无法用 Tab 键在用户之间导航
- **影响**: 键盘用户操作效率低
- **建议**: 使用 antd Table 自动获得键盘导航支持

### L4. 卡片视图与表格视图数据重复
- **位置**: `index.tsx:131-154`（卡片）、`index.tsx:175-197`（表格）
- **现状**: 同一个 `data.map()` 逻辑写了两遍，角色/状态的渲染逻辑完全重复
- **影响**: 维护成本高，修改一处容易遗漏另一处
- **建议**: 抽取公共渲染函数（如 `renderRoleTag`、`renderStatusSwitch`、`renderEditButton`）

---

## 评审总结

### 问题统计

| 严重程度 | 数量 | 编号 |
|---|---|---|
| CRITICAL | 2 | C1, C2 |
| HIGH | 5 | H1, H2, H3, H4, H5 |
| MEDIUM | 6 | M1, M2, M3, M4, M5, M6 |
| LOW | 4 | L1, L2, L3, L4 |
| **合计** | **17** | |

### 核心问题

页面存在两个根本性问题：

1. **违反项目铁律** — 使用原生 HTML `<table>` 而非 antd `<Table>`，直接违反 CLAUDE.md 强制规则。同项目的 company、skills 等页面均已正确使用 antd Table，本页面是唯一例外。
2. **UI 组件使用不充分** — 缺少 Tooltip（图标按钮）、Popconfirm（破坏性操作）、Skeleton（加载态）、Empty（空状态）等 antd 标准组件，导致交互体验和可访问性均不达标。

### 推荐修复优先级

1. **P0（立即）**: C1 替换原生 table 为 antd Table → 自动解决 H1（双渲染）、M4（排序）、L3（键盘导航）
2. **P0（立即）**: C2 搜索防抖
3. **P1（本迭代）**: H2 Popconfirm 确认、H3 Tooltip + aria-label、H4 Skeleton 加载
4. **P2（下迭代）**: M1-M6 中等优化、L1-L4 轻微改进

### 正面评价

- 页面整体布局结构合理（toolbar + 内容 + 分页 + 弹窗表单）
- 响应式卡片/表格切换思路正确（尽管实现方式待优化）
- 使用 Breadcrumb、Spin 等基础组件提供了基本导航和加载反馈
- UserForm 使用了正确的 antd Form + Modal 模式
- CSS 样式文件中的变量化实现符合 Carbon Design System 基本规范
