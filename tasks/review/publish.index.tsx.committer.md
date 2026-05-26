# publish/index.tsx Committer 评审报告

**文件**: `pages/publish/index.tsx` (561行)
**评审角色**: 代码 Committer（最终合并把关人）
**评审日期**: 2026-05-26
**裁决**: **CONDITIONAL APPROVE 6.5/10**

---

## 总评

PublishingSchedulePage 是一个功能完整的发布计划管理页面，实现了列表查询（搜索+状态筛选）、创建/编辑/驳回/删除发布计划等核心操作。页面在桌面端(≥1280px)和窄屏端分别使用 Table 和 Card 双视图，antd 组件使用合规。但存在 **3 项 BLOCKING** 问题（零测试覆盖 + projectId 获取但从未传参 + fetchData 吞错误）和 **6 项 HIGH** 问题，需要在合并前或下一迭代修复。

---

## 四维评审交叉验证

| 维度 | 评分 | 核心问题 |
|------|------|----------|
| 质量 | 6.5 | 零测试、projectId 死代码、catch 吞错误、DatePicker 类型 any |
| 架构 | 6.0 | 561行单文件巨型组件、双视图重复操作逻辑、fetchData 与 fetchData 绑定不完整 |
| 安全 | 6.0 | 前端权限检查可被绕过、驳回无理由输入、DatePicker 无防过去时间 |
| UI | 7.0 | 双视图响应式合规、但卡片操作按钮缺间距、表格列宽不合理 |

---

## 阻断项 (BLOCKING) — 合并前必须修复

### B-1: 零测试覆盖 — 核心业务逻辑无验证

**位置**: 无对应测试文件（`tests/pages/publish.test.tsx` 不存在）
**交叉来源**: 质量/架构/安全/UI 四维一致
**严重度**: BLOCKING

**代码验证**:
- `Glob("tests/**/publish*")` 仅返回 API 侧测试文件（publishing-schedule.controller/service/entity.test.ts）
- 前端 publish/index.tsx 的 6 项关键行为完全无测试覆盖：
  1. 列表加载 + 搜索 + 状态筛选
  2. 创建发布计划（文章选择 → 平台选择 → 策略选择 → 时间选择 → 提交）
  3. 编辑发布计划（策略修改 → 时间修改 → 保存）
  4. 驳回操作（确认弹窗 → 调用 API → 刷新列表）
  5. 删除操作（确认弹窗 → 调用 API → 刷新列表）
  6. 权限控制（canEditSchedule / canRejectSchedule / canDeleteSchedule 边界条件）

**影响**: 561行页面组件包含复杂的业务逻辑（权限判断、API 交互、Modal 状态管理），任何回归无法自动检测。

**修复要求**: 创建 `tests/pages/publish.test.tsx`，至少覆盖上述 6 项核心场景。

**工时预估**: 3h

---

### B-2: projectId 获取但从未传参 — 项目筛选功能失效

**位置**: 第63行 + 第102-106行
**严重度**: BLOCKING

**实际代码**:
```typescript
// 第63行：从 AppContext 获取 projectId
const { projectId } = useAppContext();

// 第99-106行：fetchData 中未使用 projectId
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    const params: any = { page, pageSize };
    if (search) params.search = search;
    if (filterStatus) params.status = filterStatus;
    // ❌ 缺少: if (projectId) params.projectId = projectId;

    const res = await apiClient.get('/publishing-schedule', { params });
```

**后端验证**:
- 路由 `publishing-schedule.routes.ts` 的 `listPublishingScheduleSchema` 支持 `projectId` 参数（第39行）
- 服务层 `publishing-schedule.service.impl.ts` 的 `list()` 方法正确处理 `projectId` 过滤（第38-43行）
- 后端已准备好项目过滤，但前端从未传参

**影响**: 在多项目环境中，用户看到的是所有项目的发布计划，而非当前所选项目的发布计划。这违反了 AppContext 提供项目切换的核心设计意图。

**同样的问题存在于**:
- `fetchPublishableArticles`（第120-141行）：获取可发布文章列表时也未传 `projectId`，用户可能选择其他项目的文章
- `fetchPlatformOptions`（第143-154行）：平台列表未按项目过滤（但此接口本身不支持 projectId，可接受）

**修复要求**:
```typescript
// fetchData 中添加:
if (projectId) params.projectId = projectId;

// fetchPublishableArticles 中添加:
const params: any = { page: 1, pageSize: 200, status: 'approved' };
if (projectId) params.projectId = projectId;

// 同时需将 projectId 加入 fetchData 和 fetchPublishableArticles 的 useCallback 依赖数组
```

**工时预估**: 15min

---

### B-3: fetchData 吞错误 — 列表加载失败时用户无感知

**位置**: 第99-114行
**严重度**: BLOCKING

**实际代码**:
```typescript
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    // ...
  } catch {
    // ignore  ← 完全静默吞错误
  } finally {
    setLoading(false);
  }
}, [page, pageSize, search, filterStatus]);
```

**问题**:
1. 网络异常、401 token 过期、500 服务器错误全部被静默忽略
2. apiClient 的 401 拦截器会清空 token 并重定向到 /login（apiClient.ts 第14-18行），但其他错误（403 权限不足、404、500）用户完全不知道发生了什么
3. 页面只是显示空数据，用户可能误以为"确实没有发布计划"

**修复要求**:
```typescript
} catch (err) {
  message.error(getApiErrorMessage(err, '获取发布计划列表失败'));
}
```

**工时预估**: 2min

---

## 高优先级 (HIGH) — 本迭代内修复

### H-1: 561行单文件巨型组件 — 违反 SRP

**位置**: 整个文件
**交叉来源**: 架构评审

**问题分析**:
文件包含 7 个状态组（共 ~25 个 useState）、6 个事件处理函数、1 个权限计算函数、1 个表格列定义、2 个 Modal 组件、2 套视图渲染（Card + Table）。这远超单个组件的合理体量。

**建议拆分方案**:
| 拆分组件 | 职责 | 预估行数 |
|----------|------|----------|
| `PublishingSchedulePage` | 页面骨架 + 数据获取 + 状态管理 | ~120 |
| `PublishingTable` | 桌面端 Table 视图 | ~70 |
| `PublishingCards` | 窄屏 Card 视图 | ~80 |
| `CreateScheduleModal` | 新建发布计划弹窗 | ~120 |
| `EditScheduleModal` | 编辑发布计划弹窗 | ~70 |
| hooks/usePublishingSchedule.ts | 数据获取 + 操作逻辑 | ~100 |

**工时预估**: 2h

---

### H-2: 前端权限检查与后端不一致 — canRejectSchedule 逻辑偏差

**位置**: 第257-267行 vs 后端 `publishing-schedule.service.impl.ts` 第178-196行

**前端代码**:
```typescript
const canRejectSchedule = (item: ScheduleItem) => {
  return (item.status === 'pending' || item.status === 'publishing') && item.created_by !== user.id;
};
```

**后端代码**:
```typescript
// reject() 方法:
if (existing.status !== 'pending' && existing.status !== 'publishing') {
  throw new BusinessError('当前发布计划状态不支持驳回操作');
}
if (existing.createdBy === auth.userId) {
  throw new ForbiddenError('不能驳回自己创建的发布计划');
}
```

**问题**: 前端仅用 `created_by !== user.id` 做权限控制，但后端通过事务中的 `findFirst` + 状态检查 + 创建者检查 三重验证。前端未检查用户是否属于项目的 operator（后端 update 权限检查）。此外，前端 `canRejectSchedule` 允许 **view 角色** 看到"驳回"按钮（因为只检查 created_by，不检查 role），但后端路由 `PUT /:id/reject` 只允许 sysadmin + admin 角色。

**验证**: 在路由文件 `publishing-schedule.routes.ts` 第23行：
```typescript
router.put('/:id/reject', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), ...);
```
view 角色被路由层拦截，但前端仍然为 view 角色显示了驳回按钮（view 用户的 `created_by !== user.id` 可能为 true）。

**修复要求**:
```typescript
const canRejectSchedule = (item: ScheduleItem) => {
  if (user.role === 'view') return false; // view 角色无权驳回
  return (item.status === 'pending' || item.status === 'publishing') && item.created_by !== user.id;
};
```

同样 `canEditSchedule` 和 `canDeleteSchedule` 也需要检查 role（虽然路由层已拦截，但前端应保持一致，避免显示不可用的操作按钮）。

**工时预估**: 15min

---

### H-3: DatePicker onChange 类型标注 `unknown` — 类型安全缺失

**位置**: 第504行、第547行

**实际代码**:
```typescript
onChange={(_date: unknown, dateString: string | null) => {
  setCreateDate(dateString || null);
}}
```

**问题**: antd 5.x DatePicker 的 `onChange` 回调签名是 `(date: Dayjs | null, dateString: string | string[]) => void`。将 `date` 标注为 `unknown` 虽然绕过了 TypeScript 类型检查，但丢失了类型信息。当 `createScheduleType === 'scheduled'` 时，用户选择的时间格式为 `string`（由 `format` prop 决定），但 `dateString` 实际类型是 `string | string[]`（RangePicker 时为数组）。

**修复要求**:
```typescript
onChange={(_date: Dayjs | null, dateString: string | string[]) => {
  const value = Array.isArray(dateString) ? dateString[0] : dateString;
  setCreateDate(value || null);
}}
```

**工时预估**: 5min

---

### H-4: handleCreate 中缺少防重复提交 — 双击风险

**位置**: 第166-195行

**实际代码**:
```typescript
const handleCreate = async () => {
  // 验证...
  setCreateSaving(true);
  try {
    await apiClient.post('/publishing-schedule', { ... });
    message.success('发布计划已创建');
    setCreateModalOpen(false);
    fetchData();
  } catch (err: unknown) {
    message.error(getApiErrorMessage(err, '创建失败'));
  } finally {
    setCreateSaving(false);
  }
};
```

**分析**: Modal 的 `confirmLoading={createSaving}` 在 antd 中会禁用确认按钮，所以实际双击风险**已被 antd 内部机制缓解**。但 Modal 的 `onOk` 回调在 `confirmLoading` 生效前的同一事件循环中可能被触发两次。建议在函数入口添加 early return。

**修复要求**:
```typescript
const handleCreate = async () => {
  if (createSaving) return; // 防重复提交
  // ...
};
```

同样适用于 `handleSaveSchedule`（第204行）。

**工时预估**: 5min

---

### H-5: fetchPublishableArticles 中 user.role 检查无实际效果 — 死代码

**位置**: 第120-141行

**实际代码**:
```typescript
const fetchPublishableArticles = useCallback(async () => {
  setArticleLoading(true);
  try {
    const params: any = { page: 1, pageSize: 200, status: 'approved' };
    if (user.role !== 'sysadmin') {
      // 非 sysadmin 只能选自己的文章
      // ❌ 空块 — 无任何逻辑
    }
    const res = await apiClient.get('/publishing-schedule/articles', { params });
```

**问题**:
1. 第124-126行的 if 块为空块，注释声明了意图但未实现
2. 后端 `publishing-schedule.service.impl.ts` 的 `create()` 方法第101-103行确实做了此检查：`if (auth.role !== 'sysadmin' && article.createdBy !== auth.userId)` — 后端会拦截
3. 但前端应该在获取文章列表时就过滤掉非自己的文章（或至少在 UI 层面给出提示），而非依赖后端在创建时才报错

**修复要求**: 删除空 if 块，或实际实现过滤逻辑（如传 `createdBy` 参数让后端过滤）。后端路由 `GET /articles` 允许 sysadmin + admin（第14行），后端 service 层已按角色过滤，所以前端空块应直接删除。

**工时预估**: 2min

---

### H-6: useCallback 依赖数组不完整 — stale closure 风险

**位置**: 第99行、第120行

**fetchData 依赖数组**:
```typescript
const fetchData = useCallback(async () => {
  const params: any = { page, pageSize };
  if (search) params.search = search;
  if (filterStatus) params.status = filterStatus;
  // ...
}, [page, pageSize, search, filterStatus]); // ❌ 修复 B-2 后需添加 projectId
```

修复 B-2 后必须将 `projectId` 加入依赖数组，否则 projectId 变化时 fetchData 不会重新创建，仍使用旧值。

**fetchPublishableArticles 依赖数组**:
```typescript
}, [user.role]); // ❌ 如果添加 projectId 参数，需加入依赖
```

**工时预估**: 包含在 B-2 修复中

---

## 中优先级 (MEDIUM) — 下一迭代修复

### M-1: 表格列宽硬编码 — 未使用 antd Table 列宽

**位置**: 第269-336行 tableColumns

**问题**: CSS 中定义了 `.publishing-table` 的列宽（`.col-title` 200px、`.col-keywords` 180px 等），但 `tableColumns` 定义中也使用了 `width: 100`（status 列）和 `width: 120`（action 列）。同时 CSS 的 `.publishing-table` 类名在 Table 组件的 `className` 中未使用——antd Table 生成的是 `.ant-table` 类名体系，自定义 CSS 类名根本不会生效。

**验证**: 第417-425行使用的是 antd `Table` 组件，渲染结果为 `<table class="ant-table">`，而非 `<table class="publishing-table">`。CSS 中 816-894 行的 `.publishing-table` 样式规则全部无法匹配。

**建议**: 移除 CSS 中无效的 `.publishing-table` 相关样式，改用 antd Table 的 `columns[].width` 属性控制列宽。

---

### M-2: Card 视图操作按钮缺间距

**位置**: 第389-409行 publishing-card-footer

**问题**: Card 视图底部的操作按钮使用 `<Button>` 直接排列，但 `publishing-card-footer` 的 CSS 定义为 `display: flex; justify-content: flex-end;`，未设置 `gap`。当多个按钮同时显示时（如编辑 + 删除），按钮之间无间距。

**建议**: 添加 `gap: 8px;` 到 `.publishing-card-footer`。

---

### M-3: 驳回功能无理由输入 — 与后端 schema 不匹配

**位置**: 第231-242行 handleReject

**前端代码**:
```typescript
const handleReject = async (id: number) => {
  setRejectingId(id);
  try {
    await apiClient.put(`/publishing-schedule/${id}/reject`);
    // ...
```

**后端 schema**: `rejectPublishingScheduleSchema` 支持 `reason` 字段（`publishing-schedule.schema.ts` 第31行）。
**后端 controller**: 从 `req.body` 中提取 `reason`（controller.ts 第85行）。

前端未提供驳回理由输入 UI，也未在 API 请求中传递 reason。后端将 `reason` 存储到数据库（service.impl.ts 第191行），但永远为 null。

**建议**: 在驳回确认弹窗中添加理由输入框，或至少传递一个默认理由。

---

### M-4: createDate 类型为 `string | null` — DatePicker value 类型不匹配

**位置**: 第82行、第503行

```typescript
const [createDate, setCreateDate] = useState<string | null>(null);
// ...
value={createDate ? dayjs(createDate) : null}
```

`createDate` 存储的是 DatePicker 的 `dateString`（如 `"2026-05-26 14:30"`），然后传给 `dayjs()` 解析。这依赖 dayjs 能正确解析 `YYYY-MM-DD HH:mm` 格式字符串。虽然 dayjs 默认支持此格式，但直接存储 Dayjs 对象更安全。

---

### M-5: Select 搜索未防抖 — 大量文章时性能问题

**位置**: 第455-467行

```tsx
<Select
  showSearch
  optionFilterProp="label"
  // ❌ 未配置 filterOption 或 onSearch 防抖
/>
```

当前 `showSearch` + `optionFilterProp="label"` 使用客户端过滤。当文章列表达 200 条（pageSize: 200）时，每次输入都遍历全部选项进行字符串匹配。虽然 200 条规模不大，但最佳实践是添加 `filterOption` 自定义或使用后端搜索。

---

## Committer 交叉验证：剔除不成立发现

| 原始发现 | 判定 | 理由 |
|----------|------|------|
| "view 角色能看到发布管理页面" | **不成立** | Sidebar.tsx 第48行限制 `/publish` 仅 sysadmin + admin 可见；路由配置中 App.tsx 确认 |
| "fetchData 使用 any 类型参数" | **成立但降级** | 前端请求参数使用 `const params: any` 是常见模式，后端 schema 已做验证。非 BLOCKING |
| "未使用 Form 组件管理 Modal 表单" | **成立但可接受** | Modal 内手动管理状态是项目中的普遍模式，不强制要求 Form |
| "CSS 中 publishing-table 样式无效" | **成立，M-1** | CSS 定义了 `.publishing-table` 类但 antd Table 不使用此类名 |
| "Spin 包裹 Table 导致布局问题" | **不成立** | antd Spin 作为 Table 的包裹器是官方推荐用法，且 CSS 已设置 `flex: 1; min-height: 0` |

---

## 全栈类型契约审计

| 字段 | 前端 ScheduleItem | 后端 PublishingScheduleItem | 一致性 |
|------|-------------------|----------------------------|--------|
| id | `number` | `number` | OK |
| article_id | `number` | `number` | OK |
| title | `string` | `string` | OK |
| keywords | `string \| null` | `string \| null` | OK |
| article_type | `string \| null` | `string \| null` | OK |
| platforms | `string[] \| null` | `string[] \| null` | OK |
| status | `ScheduleStatus` | `string` | **偏差** — 后端为宽泛 string |
| schedule_type | `ScheduleType \| null` | `string \| null` | **偏差** — 后端为宽泛 string |
| scheduled_publish_at | `string \| null` | `Date \| null` | **注意** — 前端 string vs 后端 Date，JSON 序列化后一致 |
| project_id | `number` | `number` | OK |
| project_name | `string` | `string` | OK |
| company_name | `string` | `string` | OK |
| created_by | `number \| null` | `number \| null` | OK |
| created_by_name | `string` | `string` | OK |

**结论**: 类型契约基本一致。后端 `status` 和 `schedule_type` 使用宽泛 `string` 而非枚举，前端定义了更严格的 `ScheduleStatus` 和 `ScheduleType` 类型，这实际上提供了额外的类型安全。`scheduled_publish_at` 的 Date vs string 差异通过 JSON 序列化自然解决。

---

## 代码逐行审查备注

| 行号 | 审查结论 |
|------|----------|
| 1-9 | 导入正确，antd 组件使用合规，无原生 HTML 滥用 |
| 13-14 | 类型定义清晰，ScheduleType / ScheduleStatus 枚举完备 |
| 16-27 | 配置映射正确，中文字面量规范 |
| 29-44 | ScheduleItem 接口与后端契约对齐（见上表） |
| 46-51 | ArticleOption 接口精简，够用 |
| 53-59 | getScheduleLabel 辅助函数逻辑正确 |
| 61-63 | 组件入口正确，useApp/useAppContext/getSafeUser 使用规范 |
| 63 | **B-2**: projectId 获取但未使用 |
| 66-97 | 状态声明过多（~25 个 useState），建议 H-1 拆分 |
| 99-114 | **B-3**: fetchData 吞错误；**B-2**: 缺少 projectId 参数 |
| 116-118 | useEffect 依赖 fetchData，正确 |
| 120-141 | **H-5**: 空 if 块死代码；**B-2**: 缺少 projectId 参数 |
| 143-154 | fetchPlatformOptions 正确 |
| 156-164 | handleOpenCreate 状态重置正确 |
| 166-195 | handleCreate 逻辑正确，验证完备 |
| 190-191 | 错误处理使用 getApiErrorMessage，正确 |
| 197-229 | handleEditClick + handleSaveSchedule 逻辑正确 |
| 231-255 | handleReject + handleDelete 逻辑正确 |
| 257-267 | **H-2**: canRejectSchedule 缺少 role 检查 |
| 269-336 | tableColumns 定义清晰，操作列逻辑正确 |
| 338-339 | 页面容器结构正确 |
| 344-366 | 搜索栏布局正确，antd 组件使用合规 |
| 368-426 | 双视图渲染（Card + Table），CSS 响应式切换正确 |
| 429-439 | 分页逻辑正确，条件渲染避免多余 DOM |
| 442-513 | 创建弹窗结构正确，**H-3**: DatePicker 类型 |
| 516-555 | 编辑弹窗结构正确 |
| 560 | export default 正确 |

---

## 正面评价

| 维度 | 评价 |
|------|------|
| **antd 合规** | 全部使用 antd 组件（Table/Card/Modal/Select/Radio.Group/DatePicker/Tag/Button/Tooltip/Popconfirm/Pagination/Breadcrumb），零原生 HTML 滥用 |
| **双视图设计** | 桌面端 Table + 窄屏端 Card 的响应式切换逻辑清晰，CSS @media 断点与 DESIGN.md 对齐 |
| **权限控制** | canEditSchedule / canRejectSchedule / canDeleteSchedule 三级权限函数覆盖主要业务场景 |
| **错误处理** | 创建/编辑/驳回/删除均使用 `getApiErrorMessage` 统一错误提示 |
| **状态管理** | 每个 Modal 独立管理 open/saving 状态，互不干扰 |
| **代码组织** | 状态声明 → 数据获取 → 事件处理 → 权限函数 → 列定义 → 渲染，层次分明 |
| **安全时间格式** | 使用 `formatDateTime` 强制中国时区，符合项目铁律 |

---

## 合并风险评估

| 风险维度 | 评级 | 说明 |
|----------|------|------|
| **功能正确性** | MEDIUM | B-2 projectId 未传参导致多项目环境功能失效 |
| **安全风险** | LOW | 权限控制依赖后端，前端展示偏差不影响安全 |
| **性能风险** | LOW | 200 条数据量级下无性能瓶颈 |
| **回归风险** | HIGH | 零测试覆盖，任何变更无法自动验证 |
| **可维护性** | MEDIUM | 561行单文件，状态过多，拆分后可改善 |

---

## 修复优先级矩阵

| 优先级 | 编号 | 问题 | 工时 | 合并阻断 |
|--------|------|------|------|----------|
| **P0** | B-1 | 零测试覆盖 | 3h | 是 |
| **P0** | B-2 | projectId 未传参 | 15min | 是 |
| **P0** | B-3 | fetchData 吞错误 | 2min | 是 |
| **P1** | H-1 | 561行单文件拆分 | 2h | 本迭代内 |
| **P1** | H-2 | 权限检查与后端不一致 | 15min | 本迭代内 |
| **P1** | H-3 | DatePicker 类型 | 5min | 本迭代内 |
| **P1** | H-4 | 防重复提交 | 5min | 本迭代内 |
| **P1** | H-5 | 死代码清除 | 2min | 本迭代内 |
| **P1** | H-6 | 依赖数组修复 | 包含在 B-2 | 本迭代内 |
| **P2** | M-1~M-5 | CSS/驳回理由/类型优化 | ~1.5h | 下一迭代 |

**阻断修复总工时**: ~3.5h（含测试编写）

---

## 最终裁决

**CONDITIONAL APPROVE 6.5/10**

**合并条件**: 修复 B-1（创建测试文件，6个核心场景覆盖）+ B-2（projectId 传参 + 依赖数组修复）+ B-3（fetchData 错误处理）后可合并。H-1~H-6 建议在本迭代内完成，其中 H-2（权限检查）和 H-5（死代码）修复成本极低，建议与阻断项一起修复。

**修复后预期评分**: 修复全部 B + H 项后 **8.0/10 APPROVE**。

---

*评审人: Code Committer (Claude Opus 4.7)*
*评审标准: 功能正确性 + 全栈契约一致性 + 测试覆盖 + 可维护性*
