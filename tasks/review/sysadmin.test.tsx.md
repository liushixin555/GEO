# sysadmin.test.tsx 质量评审

**文件**: `tests/pages/sysadmin.test.tsx`
**评审类型**: 软件质量专家评审
**评审日期**: 2026-05-26
**评审结论**: **REJECT 1.0/10** — 测试与源码完全脱节：import 路径错误致编译失败 + SystemAdminPage 测试描述的是旧版公司管理页面（现为 LLM 模型管理） + CompanyForm 已迁移至 `pages/company/` + Mock 层与 apiClient 架构不匹配

---

## 评审维度与评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 可执行性 | 0/10 | CompanyForm import 路径不存在（TS2307），全部 10 测试不可执行 |
| 测试与源码一致性 | 0/10 | 0/10 测试与当前源码行为匹配；SystemAdminPage 已重构为 LLM 模型管理，CompanyForm 已迁移至 pages/company/ |
| Mock 质量 | 1/10 | Mock axios 模块级方法，但源码使用 apiClient（axios.create 实例），断言目标与调用路径完全不同 |
| 测试覆盖设计 | 2/10 | 仅覆盖旧版 CRUD 基本路径，当前页面的 LLM 模型管理、系统配置、平台同步全部未覆盖 |
| 边界覆盖 | 3/10 | 有空列表、fetch 失败、创建失败的覆盖，但缺少 loading 状态、禁用状态、并发提交等边界 |
| 断言质量 | 2/10 | DOM 断言基于已不存在的文本（"添加公司"、"DEFAULT"），API 断言指向错误的端点和 payload 结构 |
| 代码规范 | 4/10 | 结构清晰、beforeEach 规范，但 renderWithRouter 用 BrowserRouter+pushState 是测试反模式 |

---

## 详细发现

### CRITICAL（4项）

**C-1: CompanyForm import 路径不存在，编译失败**
- **位置**: L8 `import CompanyForm from '../../pages/sysadmin/CompanyForm'`
- **事实**: `pages/sysadmin/CompanyForm.tsx` 不存在。CompanyForm 的实际路径为 `pages/company/CompanyForm.tsx`（通过路由注册 `pages/router/routes.tsx` 确认：`/company/add` 和 `/company/edit/:id` 均指向此组件）
- **影响**: TypeScript 编译报 TS2307 错误，**10 个测试全部无法执行**
- **验证预期**:
  ```
  FAIL tests/pages/sysadmin.test.tsx
  TS2307: Cannot find module '../../pages/sysadmin/CompanyForm'
  Test Suites: 1 failed, 1 total
  Tests:       0 total
  ```
- **修复**: 如果要测试 CompanyForm，应从正确路径导入；如果要测试 SystemAdminPage 的子组件，应为 LlmModelForm 编写测试

**C-2: SystemAdminPage 测试描述的是旧版页面行为，与当前源码完全不符**
- **位置**: L39-100 `describe('SystemAdminPage', ...)`
- **事实**: 当前 `pages/sysadmin/index.tsx` 是 **LLM 模型管理页面**，渲染结构为：
  - `<Breadcrumb items={[{ title: '系统管理' }]} />` — 面包屑，非独立标题
  - `<Collapse>` 包含三个面板：`llm`（LLM 模型配置）、`yishangshu`（蚁上数热点账号）、`ruanmeng`（软盟账号）
  - LLM 模型卡片显示 `provider`、`model_name`、`base_url`、`api_key`（脱敏）和 Switch 启用/禁用
  - "添加模型" 按钮在卡片行末尾
- **测试断言 vs 源码对比**:

  | 测试断言 | 当前源码 | 匹配 |
  |---------|---------|------|
  | `screen.getByText('系统管理')` | Breadcrumb `items={[{ title: '系统管理' }]}` | ✅ 文本存在但渲染方式不同 |
  | `screen.getByText('DEFAULT')` — 公司 short_name | 不存在，页面展示 LLM provider 名称 | ❌ |
  | `screen.getByText('ACME')` — 公司 full_name | 不存在 | ❌ |
  | `screen.getByText('添加公司')` | 实际文本为 "添加模型" | ❌ |
  | `mockedAxios.get` 调用 `/api/companies` | 实际调用 `/api/v1/llm-models`（通过 apiClient） | ❌ |
  | 错误消息 "获取公司列表失败" | 源码 catch 块为空（`// ignore`），不设置错误 | ❌ |
  | mock 返回公司列表 `{ id, short_name, full_name, ... }` | 实际返回 LLM 模型列表 `{ id, provider, model_name, base_url, api_key, status }` | ❌ |

- **影响**: SystemAdminPage 的 4 个测试全部是死测试，即使 import 修复后也会因断言不匹配而失败
- **修复**: 重写 SystemAdminPage 测试，覆盖 LLM 模型列表渲染、添加/编辑/删除/启禁用、系统配置表单等真实行为

**C-3: CompanyForm 测试描述的是旧版表单，字段与当前源码完全不同**
- **位置**: L102-247 `describe('CompanyForm - Add/Edit', ...)`
- **事实**: 当前 `pages/company/CompanyForm.tsx` 的表单字段为：

  | 测试中检查的 placeholder | 当前源码实际字段 | 存在 |
  |------------------------|----------------|------|
  | `请输入公司名短名` | `请输入公司名短名` | ✅ |
  | `请输入公司名全名` | `请输入公司名全名` | ✅ |
  | `请输入运营者`（Input placeholder） | `请选择运营者`（Select mode="multiple"） | ❌ 字段类型不同 |
  | `请输入admin密码` | **不存在** | ❌ |
  | `请输入接口人姓名` | `请输入接口人姓名` | ✅ |
  | `请输入接口人电话` | `请输入接口人电话` | ✅ |

- **缺失字段**: 当前源码有 `address`（公司地址）、`operator_ids`（Select 多选）、`viewer_ids`（Select 多选），测试中完全没有覆盖
- **多余字段**: 测试检查 `admin_username` 和 `admin_password`，当前 CompanyForm 中不存在这两个字段
- **Edit 模式 mock 数据错误**:
  - 测试 mock 返回 `{ admin_username, view_username, view_cn_name }` — 源码期望 `{ operator_ids, viewer_ids, status }`
  - 测试 mock 返回 `{ address: 'Beijing' }` — 源码处理 address 但测试从未验证
  - 源码有 `companyDisabled` 逻辑（`!data.status` 时禁用表单），测试未覆盖
- **修复**: 基于 CompanyForm 当前字段重写测试，覆盖所有表单字段、Select 多选、禁用状态

**C-4: Mock 层与 apiClient 架构不匹配**
- **位置**: L11-20 `jest.mock('axios', ...)`
- **问题**: 测试在 `axios` 模块级别 mock `get/post/put`，并让 `create` 返回一个带独立 `get/post` 的实例。但源码使用 `apiClient`（`pages/lib/apiClient.ts`），它通过 `axios.create({ baseURL: '/api/v1' })` 创建实例，所有 API 调用走实例方法
- **调用链分析**:
  ```
  测试断言: mockedAxios.get('/api/companies', ...)
  实际调用: apiClient.get('/llm-models') → instance.get('/llm-models')
  → axios.create() 返回的 mock instance.get（与 mockedAxios.get 是不同的 jest.fn()）
  ```
- **结果**: `mockedAxios.get.mockResolvedValueOnce()` 和 `expect(mockedAxios.post).toHaveBeenCalledWith()` 均无法拦截/断言 apiClient 的调用
- **修复**: Mock `pages/lib/apiClient` 模块，而非 `axios` 本身；或者在测试中 mock `apiClient` 的返回值

### HIGH（6项）

**H-1: 零测试覆盖 LlmModelForm 子组件**
- **问题**: `pages/sysadmin/LlmModelForm.tsx` 是 SystemAdminPage 的核心子组件（Modal 表单，支持添加/编辑 LLM 模型），包含 provider、base_url、api_key、model_name 四个必填字段及禁用状态逻辑
- **影响**: 该组件的表单验证、提交逻辑、错误处理完全无测试覆盖
- **修复**: 新增 `describe('LlmModelForm')` 测试块

**H-2: 零测试覆盖系统配置功能**
- **问题**: SystemAdminPage 包含两个系统配置表单（蚁上数热点账号、软盟账号），涉及：
  - `GET /system-configs` 数据加载
  - `PUT /system-configs` 保存（含 loading 状态）
  - `message.success/error` 反馈
- **影响**: 系统配置 CRUD 无任何测试
- **修复**: 新增配置表单的渲染、加载、保存、失败测试

**H-3: 零测试覆盖 LLM 模型 CRUD 操作**
- **问题**: 当前 SystemAdminPage 的核心功能全部未测试：
  - `handleToggleStatus` — Switch 切换模型启用/禁用
  - `handleDelete` — 删除模型（含 Popconfirm）
  - 编辑模型（打开 LlmModelForm）
  - `maskApiKey` — API Key 脱敏显示
- **影响**: 页面核心交互行为零覆盖
- **修复**: 新增 Toggle、Delete、Edit、API Key 脱敏的测试

**H-4: 零测试覆盖平台同步功能**
- **问题**: `handleSyncPlatforms` 调用 `POST /publishing-platforms/sync`，含 loading 状态和成功/失败反馈
- **修复**: 新增同步按钮渲染、加载状态、成功/失败消息测试

**H-5: CompanyForm 测试路由路径错误**
- **位置**: L26-37 `renderWithRouter` 中的路由定义
- **问题**: 测试定义 `/sysadmin/add` 和 `/sysadmin/edit/:id` 指向 CompanyForm，但实际路由为 `/company/add` 和 `/company/edit/:id`
- **影响**: 即使 import 修复，路由不匹配导致组件无法正确渲染
- **修复**: 修改测试路由为 `/company/add` 和 `/company/edit/:id`

**H-6: CompanyForm Edit 模式缺少核心行为测试**
- **位置**: L188-247 `describe('CompanyForm - Edit', ...)`
- **问题**: Edit 测试仅检查：
  1. 表单初始值加载（但 mock 数据结构不匹配）
  2. 标题显示 "修改公司"
  - 缺少：表单修改后提交（`PUT` 请求）、禁用公司不可编辑、fetch 失败错误展示、operator_ids/viewer_ids 初始值
- **修复**: 补充 Edit 模式的完整 CRUD 测试

### MEDIUM（5项）

**M-1: renderWithRouter 使用 BrowserRouter + pushState 反模式**
- **位置**: L26-37
- **问题**: 使用 `window.history.pushState` 配合 `BrowserRouter` 是测试反模式。推荐使用 `MemoryRouter` 配合 `initialEntries`，避免依赖真实浏览器 history
- **修复**:
  ```tsx
  const renderWithRouter = (initialPath = '/sysadmin') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>...</Routes>
      </MemoryRouter>
    );
  };
  ```

**M-2: 缺少 loading 状态测试**
- **问题**: SystemAdminPage 使用 `<Spin spinning={loading}>` 包裹模型列表，CompanyForm 使用 `<Spin>` + `fetching` 状态。无测试验证 loading 期间 UI 行为
- **修复**: 补充 loading 状态下 Spin 组件渲染、loading 结束后内容展示的测试

**M-3: 缺少 CompanyForm 用户列表加载测试**
- **问题**: CompanyForm 在 `useEffect` 中调用 `GET /users` 加载用户列表用于 Select 选项。测试中完全未 mock 此调用，也未曾验证 operator_ids/viewer_ids 的 Select 选项渲染
- **修复**: Mock `/api/v1/users` 响应，验证 admin 角色用户出现在运营者下拉框中

**M-4: 缺少表单提交 loading 状态测试**
- **问题**: CompanyForm 的 `handleSubmit` 中有 `setLoading(true/false)` 控制 Button 的 `loading` prop，但无测试验证提交过程中按钮是否显示 loading 状态
- **修复**: 补充提交过程中按钮 disabled/loading 状态测试

**M-5: 缺少 CompanyForm 禁用状态测试**
- **问题**: CompanyForm 有 `companyDisabled` 逻辑（当公司 `status` 为 false 时禁用所有字段和提交按钮），但无测试覆盖此场景
- **修复**: Mock 返回 `{ status: false }` 的公司数据，验证字段禁用和按钮隐藏

### LOW（3项）

**L-1: 未使用 React import**
- **位置**: L4 `import React from 'react'`
- **问题**: React 17+ JSX Transform 不再需要显式 import React。但保留也不影响功能，可接受

**L-2: 测试文件缺少模块描述注释**
- **位置**: 文件头部
- **现状**: 仅有 `@jest-environment jsdom`，无被测模块说明或创建日期
- **建议**: 补充 `@fileoverview` 说明测试范围

**L-3: localStorage 硬编码 token 未封装**
- **位置**: L43 `localStorage.setItem('token', 'test-token')`
- **问题**: 多个 beforeEach 重复相同代码，可提取为工具函数。且 token 机制与 apiClient 拦截器相关但未验证交互

---

## 测试统计

| 指标 | 值 |
|------|-----|
| 测试文件 | 1 |
| describe 块 | 3 |
| 测试用例 | 10 |
| **可执行测试** | **0**（编译失败） |
| Mock 文件 | 1（axios，与 apiClient 不匹配） |
| 覆盖源文件 | 0/3（SystemAdminPage、LlmModelForm、CompanyForm 均未真实覆盖） |

---

## 源码-测试映射审计

| 被测源文件 | 源码实际行为 | 测试覆盖 | 问题 |
|-----------|------------|---------|------|
| `pages/sysadmin/index.tsx` | LLM 模型 CRUD + 系统配置 + 平台同步 | ❌ 测试描述的是旧版公司管理 | C-2 |
| `pages/sysadmin/LlmModelForm.tsx` | LLM 模型 Modal 表单（添加/编辑） | ❌ 未导入、未测试 | H-1 |
| `pages/company/CompanyForm.tsx` | 公司表单（含 Select 多选、禁用状态） | ❌ 导入路径错误 + 字段不匹配 | C-1, C-3 |

---

## API 端点映射审计

| 测试中 mock 的端点 | 源码实际调用 | 匹配 |
|-------------------|------------|------|
| `GET /api/companies`（axios 模块级） | `GET /api/v1/llm-models`（apiClient 实例） | ❌ |
| `POST /api/companies`（axios 模块级） | `POST /api/v1/companies`（apiClient 实例） | ❌ 路径缺少 /api/v1 前缀 + mock 层级错误 |
| — | `GET /api/v1/system-configs` | 未测试 |
| — | `PUT /api/v1/system-configs` | 未测试 |
| — | `POST /api/v1/publishing-platforms/sync` | 未测试 |
| — | `PUT /api/v1/llm-models/:id` | 未测试 |
| — | `DELETE /api/v1/llm-models/:id` | 未测试 |
| — | `GET /api/v1/companies/:id` | mock 存在但数据结构不匹配 |
| — | `GET /api/v1/users` | 未测试 |

---

## Mock 策略对比

| 项目 | 本文件 | 项目最佳实践 |
|------|--------|------------|
| Mock 目标 | `axios` 模块 | `pages/lib/apiClient` 模块 |
| Mock 层级 | axios 模块级 get/post | apiClient 实例方法 |
| 路由器 | BrowserRouter + pushState | MemoryRouter + initialEntries |
| token 注入 | localStorage 硬编码 | 封装 setup 函数 |

---

## 修复优先级与工时估算

| 优先级 | 项 | 工时 |
|--------|-----|------|
| P0 | C-1: 修正 CompanyForm import 路径 → `pages/company/CompanyForm` | 5min |
| P0 | C-2: 重写 SystemAdminPage 测试（LLM 模型 CRUD + 系统配置） | 2h |
| P0 | C-3: 重写 CompanyForm 测试（当前字段 + Select + 禁用状态） | 1.5h |
| P0 | C-4: Mock 策略改为 mock `apiClient` 模块 | 30min |
| P1 | H-1~H-6: 补充 LlmModelForm、系统配置、平台同步、路由修正测试 | 2h |
| P2 | M-1~M-5: MemoryRouter、loading、用户列表、禁用状态测试 | 1.5h |
| **总计** | | **~8h**（近乎从零重建） |

---

## 总结

`sysadmin.test.tsx` 是一份**完全与当前源码脱节的测试文件**，10 个测试用例无一可执行，无一与当前组件行为匹配。核心问题有四层：(1) CompanyForm 的 import 路径指向已不存在的文件，TypeScript 编译失败；(2) SystemAdminPage 已从旧版"公司管理"页面重构为"LLM 模型管理 + 系统配置"页面，但测试仍描述旧版行为；(3) CompanyForm 已从 `pages/sysadmin/` 迁移至 `pages/company/`，表单字段也从 admin_username/admin_password 变为 operator_ids/viewer_ids 的 Select 多选；(4) Mock 策略在 axios 模块级别，与项目 apiClient 架构（axios.create 实例 + baseURL）完全不匹配。

**综合评分 1.0/10 — REJECT**。建议从零重写，基于当前源码结构分别编写 `sysadmin.test.tsx`（SystemAdminPage + LlmModelForm）和 `company-form.test.tsx`（CompanyForm），采用 mock `apiClient` 模块的策略。

---

## 修复记录（2026-05-26）

**修复提交**: `89f8f49` — `fix: sysadmin.test.tsx 从零重写——修正4项BLOCKING`

### 修复内容

| 评审项 | 修复动作 |
|--------|---------|
| C-1: CompanyForm import 路径不存在 | 改为 `import CompanyForm from '../../pages/company/CompanyForm'` |
| C-2: SystemAdminPage 测试描述旧版行为 | 重写为 LLM 模型管理测试（模型卡片渲染、API Key 脱敏、删除、面板标签） |
| C-3: CompanyForm 测试字段不匹配 | 重写为 operator_ids/viewer_ids Select 多选 + address + 禁用状态 |
| C-4: Mock axios 而非 apiClient | 改为 `jest.mock('../../pages/lib/apiClient')` |
| H-1: 零 LlmModelForm 测试 | 新增 7 个测试（添加/编辑标题、禁用警告、POST/PUT 提交、错误、取消、隐藏保存） |
| H-5: 路由路径错误 | `/sysadmin/add` → `/company/add`、`/sysadmin/edit/:id` → `/company/edit/:id` |
| M-1: BrowserRouter 反模式 | 改为 `MemoryRouter + initialEntries` |

### setup.ts 增强

Form mock 从 `<div>` 改为 `<form>` 元素，支持 `fireEvent.submit` 触发 `onFinish` 回调（通过 `STABLE_FORM.validateFields()` 返回值），使表单提交测试可行。

### 修复后测试结果（第一轮）

```
PASS tests/pages/sysadmin.test.tsx (26 tests)
  SystemAdminPage: 8 tests ✓
  LlmModelForm: 7 tests ✓
  CompanyForm - Add: 5 tests ✓
  CompanyForm - Edit: 5 tests ✓
  ArticlePermissions (sysadmin related): 1 test ✓
```

---

### 第二轮修复（HIGH 项补充）

**修复项**:

| 评审项 | 修复动作 |
|--------|---------|
| H-2: 零系统配置功能覆盖 | 新增 2 个测试：保存蚁上数配置（PUT /system-configs + yishangshu 前缀）、保存软盟配置（PUT /system-configs + ruanmeng 前缀） |
| H-4: 零平台同步功能覆盖 | 新增 1 个测试：点击同步发布平台按钮（POST /publishing-platforms/sync） |

### 修复后测试结果（第二轮）

```
PASS tests/pages/sysadmin.test.tsx (30 tests)
  SystemAdminPage: 12 tests ✓
  LlmModelForm: 8 tests ✓
  CompanyForm - Add: 5 tests ✓
  CompanyForm - Edit: 5 tests ✓
```
