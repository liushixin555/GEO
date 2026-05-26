# pages/user/index.tsx — 代码 Committer 审核报告

| 属性 | 值 |
|---|---|
| **文件** | `pages/user/index.tsx` (228行) |
| **关联文件** | `pages/user/UserForm.tsx` (101行) |
| **评审类型** | Committer 审核（合并准入判断） |
| **评审日期** | 2026-05-26 |
| **综合评分** | **4.9 / 10** |
| **裁决** | **REQUEST CHANGES** — 阻断合并，需修复 CRITICAL 问题后方可重新提交 |

---

## 一、四份评审报告汇总

| 评审维度 | 评分 | 报告文件 |
|---|---|---|
| 安全评审 | 5.8/10 | `tasks/review/index.tsx.security.md` |
| 架构评审 | 4.5/10 | `tasks/review/index.tsx.architecture.md` |
| 质量评审 | 6.4/10 | `tasks/review/user-index.tsx.quality.md` |
| UI 评审 | 4.0/10 | `tasks/review/user-index.tsx.ui.md` |
| **Committer 综合** | **4.9/10** | 本报告 |

---

## 二、阻断项（BLOCKING — 必须修复后才能合并）

### B-1. 使用原生 HTML `<table>` 违反项目铁律

- **来源**: UI 评审 C1 + 质量评审设计合规项
- **位置**: `index.tsx:159-199`
- **违反**: CLAUDE.md 铁律第1条 — "前端必须使用 Ant Design (antd) 组件 — 禁止使用原生 HTML 元素替代 antd 提供的组件（Table 等）"
- **证据**: 同项目 `pages/company/index.tsx:162`、`pages/skills/index.tsx:166` 均使用 antd `<Table>`
- **影响**: 失去排序/筛选/行选择/固定列/aria等内置能力，CSS强制覆盖一致性风险
- **修复方案**: 替换为 antd `<Table columns={columns} dataSource={data} />`
- **附带收益**: 修复后自动消除 UI-H1（双渲染）、UI-M4（无排序）、UI-L3（无键盘导航）

### B-2. 空 catch 吞掉所有 API 错误

- **来源**: 安全评审 C1 + 质量评审 C-3
- **位置**: `index.tsx:55-58`（fetchData）、`index.tsx:73-75`（handleToggleStatus）
- **现状**: `catch {} // ignore` 完全静默
- **影响**: 安全事件不可见、用户无法感知操作失败、网络异常时显示过期数据
- **修复方案**: 添加 `console.error` + `message.error()` 用户提示

### B-3. 搜索无防抖，每次击键触发 API 请求

- **来源**: 安全评审 H1 + 质量评审 C-1 + UI 评审 C2
- **位置**: `index.tsx:85` — `onChange` 直接 `setSearch` → effect → API
- **影响**: DoS 攻击向量、服务器负载激增、用户体验卡顿
- **修复方案**: 300ms debounce 或改用 `Input.Search` 的 `onSearch` 回调

---

## 三、高危项（HIGH — 本轮迭代应修复）

### H-1. 状态切换无确认对话框
- **来源**: 安全评审 M2 + 质量评审 H-4 + UI 评审 H2
- **位置**: `index.tsx:66-75`, `index.tsx:138`, `index.tsx:182`
- **现状**: Switch 点击直接调用 API 禁用/启用用户
- **风险**: 误触导致合法用户被锁定，无 undo 机制
- **修复**: 使用 antd `<Popconfirm>` 包裹 Switch

### H-2. 状态切换无 loading/防重复点击
- **来源**: 安全评审 H2 + 质量评审 H-2
- **位置**: `handleToggleStatus`
- **风险**: 快速连续点击产生竞态条件，最终状态不确定
- **修复**: 维护 `togglingId` 状态，请求期间禁用 Switch

### H-3. 卡片和表格双视图始终同时渲染
- **来源**: 架构评审 A4 + UI 评审 H1 + 质量评审 M-3
- **位置**: `index.tsx:124-201`
- **影响**: DOM 节点翻倍、React reconciliation 开销翻倍
- **修复**: 使用 `window.matchMedia` hook 条件渲染单一视图（若 B-1 修复为 antd Table，此项自动解决）

### H-4. 认证数据源分裂
- **来源**: 架构评审 A1（CRITICAL）
- **位置**: `index.tsx:29` — `getSafeUser()` 绕过 AuthContext
- **现状**: user 模块是唯一使用 `getSafeUser()` 的页面，其他模块均使用 `useAuth()`
- **影响**: 双数据源导致认证状态不一致风险
- **修复**: 替换为 `useAuth()` hook

### H-5. UserItem 接口重复定义
- **来源**: 架构评审 A3 + 质量评审 H-1
- **位置**: `index.tsx:8-14` 与 `UserForm.tsx:5-11`
- **影响**: 字段变更时需多处修改，同步风险高
- **修复**: 提取到 `pages/types/user.ts` 共享类型文件

---

## 四、中等问题（MEDIUM — 建议下轮迭代修复）

| 编号 | 问题 | 来源 | 位置 |
|---|---|---|---|
| M-1 | 无请求取消机制（AbortController） | 安全 M4, 质量 C-2 | `fetchData` |
| M-2 | 编辑按钮纯图标无 Tooltip | UI H3 | `index.tsx:144,187` |
| M-3 | 缺少 Skeleton 骨架屏 | UI H4 | `index.tsx:123` |
| M-4 | Pagination 功能不完整（无 showTotal） | UI H5 | `index.tsx:204-214` |
| M-5 | params 类型使用 `any` | 安全 L1, 质量 M-1 | `index.tsx:45` |
| M-6 | 角色值魔术字符串 | 质量 M-2 | 多处 |
| M-7 | 颜色值硬编码绕过 Token 体系 | UI M3 | `index.tsx:22-26` |
| M-8 | 空状态缺乏引导 | UI M5 | `index.tsx:126,170` |
| M-9 | 10 个 useState 扁平罗列 | 架构 A6 | 整个组件 |

---

## 五、问题统计

| 严重程度 | 数量 | 编号 |
|---|---|---|
| BLOCKING | 3 | B-1, B-2, B-3 |
| HIGH | 5 | H-1 ~ H-5 |
| MEDIUM | 9 | M-1 ~ M-9 |
| LOW（各报告中 L 级合计） | ~8 | 各报告 L 级 |
| **合计** | **~25** | |

---

## 六、修复路线图

### P0 — 立即修复（阻断合并）

| 修复项 | 预估工作量 | 附带收益 |
|---|---|---|
| B-1: 替换原生 table 为 antd Table | 1-2h | 消除 H-3、UI-M4、UI-L3、UI-M2（Descriptions 过度设计） |
| B-2: 空 catch 添加错误提示 | 15min | — |
| B-3: 搜索添加 300ms 防抖 | 30min | — |

### P1 — 本轮迭代

| 修复项 | 预估工作量 |
|---|---|
| H-1: Popconfirm 确认对话框 | 30min |
| H-2: Switch loading 状态 | 30min |
| H-4: getSafeUser → useAuth | 30min |
| H-5: 共享类型文件 | 30min |

### P2 — 下轮迭代

M-1 ~ M-9 + 各 L 级问题

---

## 七、正面评价

1. **后端安全链完整**: JWT 认证 + 角色中间件 + Zod 严格验证 + Token 黑名单，纵深防御到位
2. **功能完整**: 列表/搜索/筛选/分页/状态切换/添加/编辑覆盖全部 CRUD 场景
3. **响应式设计思路正确**: 卡片/表格双视图适配不同屏幕尺寸
4. **组件拆分合理**: UserForm 作为独立 Modal 组件抽离，职责清晰
5. **sysadmin 保护**: 前后端双重保护系统管理员不可编辑/禁用
6. **CSS 变量化**: 遵循 IBM Carbon Design System 基本规范

---

## 八、最终裁决

### REQUEST CHANGES — 阻断合并

**理由**: 存在 3 项阻断问题，其中 B-1（原生 table 违反铁律）属于项目强制规则的明确违规，不可妥协。B-2（空 catch）和 B-3（搜索无防抖）在安全/质量/UI 三份评审中均被标记为 CRITICAL，属于功能性缺陷。

**准入条件**: 修复 B-1、B-2、B-3 后可重新提交审核。建议在 P0 修复中同时处理 H-1（Popconfirm）和 H-4（useAuth），以避免二次重构。

**预期修复后评分**: P0 + P1 修复完成后预估可达到 **7.0/10** 水平，达到 APPROVE 标准。
