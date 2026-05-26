# sysadmin.test.tsx 架构评审

**文件**: `tests/pages/sysadmin.test.tsx`
**评审类型**: 软件架构专家评审
**评审日期**: 2026-05-26
**评审结论**: **REJECT 1.0/10** — 测试架构与源码架构在四个维度完全断裂：模块依赖图失效（import 指向不存在的模块）+ 组件拓扑失配（测试的组件树已被拆分重组）+ API 层 mock 策略与 apiClient 单例架构不兼容 + 路由架构从嵌套式改为扁平独立式但测试未跟进

---

## 评审维度与评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 模块依赖正确性 | 0/10 | CompanyForm import 路径 `pages/sysadmin/CompanyForm` 不存在，编译即失败 |
| 组件拓扑匹配度 | 0/10 | 测试描述的组件树（SystemAdminPage→CompanyForm 嵌套路由）已被拆分为两个独立页面模块 |
| API 层架构对齐 | 0/10 | mock `axios` 模块级方法 vs 源码用 `apiClient`（axios.create 实例），调用链完全不相交 |
| 路由架构对齐 | 0/10 | 测试的 `/sysadmin/add`、`/sysadmin/edit/:id` 嵌套路由不存在，实际为 `/company/add`、`/company/edit/:id` |
| 测试隔离策略 | 2/10 | 有 beforeEach 清理和 localStorage 设置，但 BrowserRouter+pushState 是反模式，且未 mock apiClient |
| 数据流覆盖 | 1/10 | 仅覆盖了旧版公司列表的读取流，LLM 模型 CRUD、系统配置读写、平台同步的数据流全部未覆盖 |
| 测试结构设计 | 3/10 | describe 分组合理（按页面/模式拆分），但分组依据是已废弃的旧架构 |

**综合评分**: **1.0/10** — REJECT

---

## 一、源码架构现状

### 1.1 页面模块拓扑

```
pages/
├── sysadmin/
│   ├── index.tsx        → SystemAdminPage（LLM模型管理 + 系统配置 + 平台同步）
│   └── LlmModelForm.tsx → LlmModelForm（Modal子组件，受SystemAdminPage控制）
├── company/
│   ├── index.tsx        → CompanyPage（公司列表）
│   └── CompanyForm.tsx  → CompanyForm（添加/编辑公司，独立路由页面）
└── lib/
    └── apiClient.ts     → axios.create({ baseURL: '/api/v1' }) 单例
```

### 1.2 路由架构

```typescript
// pages/router/routes.tsx — 扁平独立路由
{ path: '/sysadmin', roles: [SYSADMIN], Component: SystemAdminPage }   // 系统管理
{ path: '/company',  roles: [SYSADMIN], Component: CompanyPage }       // 公司列表
{ path: '/company/add',     roles: [SYSADMIN], Component: CompanyForm } // 添加公司
{ path: '/company/edit/:id', roles: [SYSADMIN], Component: CompanyForm } // 编辑公司
```

### 1.3 API 依赖图

```
SystemAdminPage
  ├── apiClient.get('/llm-models')          → 获取模型列表
  ├── apiClient.put('/llm-models/:id')      → 切换模型状态
  ├── apiClient.delete('/llm-models/:id')   → 删除模型
  ├── apiClient.get('/system-configs')      → 获取系统配置
  ├── apiClient.put('/system-configs')      → 保存系统配置
  ├── apiClient.post('/publishing-platforms/sync') → 同步平台
  └── <LlmModelForm>                        → Modal子组件
        ├── apiClient.post('/llm-models')   → 添加模型
        └── apiClient.put('/llm-models/:id') → 编辑模型

CompanyForm
  ├── apiClient.get('/companies/:id')       → 获取公司详情
  ├── apiClient.post('/companies')          → 创建公司
  ├── apiClient.put('/companies/:id')       → 更新公司
  └── apiClient.get('/users')               → 获取用户列表（Select选项）
```

---

## 二、测试架构 vs 源码架构 — 逐层断裂分析

### A-1: 模块依赖图断裂 [CRITICAL]

**测试的 import 依赖**:
```typescript
import SystemAdminPage from '../../pages/sysadmin';       // ✅ 存在
import CompanyForm from '../../pages/sysadmin/CompanyForm'; // ❌ 不存在
```

**源码实际依赖**:
```typescript
// pages/sysadmin/index.tsx
import apiClient from '../lib/apiClient';           // 测试未 mock
import { getApiErrorMessage } from '../utils/error'; // 测试未 mock
import LlmModelForm from './LlmModelForm';          // 测试未导入

// pages/company/CompanyForm.tsx
import apiClient from '../lib/apiClient';           // 测试未 mock
```

**问题**: 测试的依赖图缺少 3 个关键模块（apiClient、error utility、LlmModelForm），同时引用了 1 个不存在的模块。这意味着：
- TypeScript 编译失败（TS2307）
- 即使跳过类型检查，运行时 apiClient 调用会发起真实 HTTP 请求
- `getApiErrorMessage` 未被 mock，错误处理路径不可控

**架构修复**:
```typescript
// 测试应 mock 的模块
jest.mock('../../../pages/lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));
```

### A-2: 组件拓扑断裂 [CRITICAL]

**测试假设的组件树**:
```
<BrowserRouter>
  <Routes>
    <Route path="/sysadmin" element={<SystemAdminPage />} />
    <Route path="/sysadmin/add" element={<CompanyForm />} />      ← 不存在
    <Route path="/sysadmin/edit/:id" element={<CompanyForm />} />  ← 不存在
  </Routes>
</BrowserRouter>
```

**源码实际的组件树**:
```
// /sysadmin 路由
<SystemAdminPage>
  <Collapse>
    <Collapse.Panel key="llm">        → LLM模型卡片列表 + 添加模型卡片
    <Collapse.Panel key="yishangshu">  → 蚁上数热点账号表单
    <Collapse.Panel key="ruanmeng">    → 软盟账号表单 + 同步按钮
  </Collapse>
  <LlmModelForm />                     → Modal（条件渲染）
</SystemAdminPage>

// /company/add 和 /company/edit/:id 路由（独立页面）
<CompanyForm>
  <Form>                               → 公司表单（含 Select 多选）
</CompanyForm>
```

**架构断裂点**:
1. 测试假设 SystemAdminPage 和 CompanyForm 在同一个路由树下 — 实际它们是两个独立的扁平路由页面
2. 测试假设 SystemAdminPage 渲染公司列表 — 实际它渲染 LLM 模型列表 + 系统配置表单
3. 测试完全未覆盖 SystemAdminPage 的三个子区域（llm/yishangshu/ruanmeng）
4. 测试未覆盖 LlmModelForm 这个关键的 Modal 子组件

### A-3: API 层架构断裂 [CRITICAL]

**测试的 API 架构假设**:
```
axios.get('/api/companies')      → 模块级静态方法
axios.post('/api/companies', {}) → 模块级静态方法
```

**源码的 API 架构**:
```
apiClient.get('/llm-models')           → axios.create() 实例方法 + baseURL '/api/v1'
apiClient.put('/llm-models/:id', {})   → 同上
apiClient.delete('/llm-models/:id')    → 同上
apiClient.get('/system-configs')       → 同上
apiClient.put('/system-configs', {})   → 同上
apiClient.post('/publishing-platforms/sync') → 同上
```

**问题链**:
1. 测试 mock 了 `axios` 模块的 `get/post` 静态方法，但源码调用的是 `axios.create()` 返回的实例方法
2. 测试中 `axios.create` 返回的 mock 实例与 `mockedAxios.get` 是**不同的 jest.fn()**，所以 `mockResolvedValueOnce` 和 `toHaveBeenCalledWith` 断言完全无法拦截
3. 源码 apiClient 有 `baseURL: '/api/v1'`，所有请求自动添加前缀，测试断言的 `/api/companies` 路径即使能拦截也不匹配
4. apiClient 有请求拦截器（注入 Authorization header）和响应拦截器（处理 401），测试完全未覆盖这两个拦截器的行为

### A-4: 数据模型断裂 [CRITICAL]

**测试假设的数据模型**:
```typescript
// 公司列表
{ id, short_name, full_name, address, contact_person, contact_phone }

// 公司创建 payload
{ short_name, full_name, contact_person, contact_phone, admin_username, admin_password }

// 公司详情（编辑）
{ id, short_name, full_name, address, contact_person, contact_phone, admin_username, view_username, view_cn_name }
```

**源码实际的数据模型**:
```typescript
// SystemAdminPage — LLM 模型
{ id, provider, base_url, api_key, model_name, status }

// CompanyForm — 公司表单
{ short_name, full_name, address, contact_person, contact_phone, operator_ids, viewer_ids }

// CompanyForm — 用户列表
{ id, username, cn_name, role, status }
```

**断裂**: 测试中的 `admin_username`、`admin_password`、`view_username`、`view_cn_name` 字段在源码中不存在。源码使用 `operator_ids`（number[]）和 `viewer_ids`（number[]）代替，通过 Select 多选组件从用户列表中选择。这是从"创建 admin/viewer 账号"到"关联已有用户"的架构级变更。

---

## 三、缺失的架构覆盖

### B-1: SystemAdminPage 子区域架构未覆盖 [HIGH]

SystemAdminPage 使用 Ant Design `Collapse` 组件组织为三个面板，每个面板有独立的数据流：

| 面板 | 数据流 | 测试覆盖 |
|------|--------|---------|
| llm | `GET /llm-models` → 卡片列表 + `PUT /llm-models/:id`（toggle）+ `DELETE /llm-models/:id` + `<LlmModelForm>`（Modal） | ❌ |
| yishangshu | `GET /system-configs` → Form.setFieldsValue + `PUT /system-configs`（保存） | ❌ |
| ruanmeng | `GET /system-configs` → Form.setFieldsValue + `PUT /system-configs`（保存）+ `POST /publishing-platforms/sync`（同步） | ❌ |

### B-2: LlmModelForm 独立组件架构未覆盖 [HIGH]

LlmModelForm 是 SystemAdminPage 的 Modal 子组件，拥有独立的 Props 接口和数据流：

```typescript
interface LlmModelFormProps {
  item: LlmModelItem | null;  // null=添加, 非null=编辑
  onClose: () => void;        // 关闭回调
  onSaved: () => void;        // 保存成功回调（触发父组件刷新列表）
}
```

这个组件的 Props 架构设计（受控 + 回调模式）完全未被测试验证。

### B-3: apiClient 拦截器架构未覆盖 [MEDIUM]

apiClient 的两个拦截器是架构关键路径：
- **请求拦截器**: 从 localStorage 读取 token 并注入 Authorization header
- **响应拦截器**: 401 时清除 localStorage 并跳转 `/login`

测试设置了 `localStorage.setItem('token', 'test-token')` 但从未验证这个 token 是否被正确注入到 API 请求中（因为 mock 层级错误，根本无法拦截）。

### B-4: CompanyForm 依赖数据流未覆盖 [HIGH]

CompanyForm 有两条并行的数据流：

```
useEffect(() => { fetchCompany(id) }, [id])          // 编辑模式：获取公司数据
useEffect(() => { fetchUsers() }, [])                 // 始终：获取用户列表（Select 选项）
```

测试中从未 mock `/users` 接口，也未验证 operator_ids/viewer_ids 的 Select 选项渲染。

---

## 四、架构级设计问题

### C-1: 测试文件名与测试范围不匹配

**问题**: 文件名 `sysadmin.test.tsx` 暗示测试 SystemAdminPage，但实际包含 CompanyForm 测试。这两个组件现在分属不同路由、不同页面模块。

**架构建议**: 拆分为：
- `tests/pages/sysadmin.test.tsx` — 测试 SystemAdminPage（LLM 模型管理 + 系统配置）
- `tests/pages/llm-model-form.test.tsx` — 测试 LlmModelForm（Modal 子组件）
- `tests/pages/company-form.test.tsx` — 测试 CompanyForm（独立路由页面）

### C-2: Mock 架构应与 DI 层对齐

**当前**: mock `axios` 模块（实现细节）
**应改为**: mock `pages/lib/apiClient` 模块（接口边界）

项目使用 apiClient 作为 HTTP 层的统一抽象边界，测试应在这个边界上 mock，而非穿透到底层 axios 实现。这遵循了**依赖倒置原则** — 测试应该依赖抽象（apiClient 接口），而非具体实现（axios 模块）。

### C-3: 路由测试策略应匹配扁平路由架构

源码路由架构已从嵌套路由（`/sysadmin/*`）改为扁平独立路由（`/sysadmin`、`/company/add`），测试应：
- 对 SystemAdminPage 使用 `<MemoryRouter initialEntries={['/sysadmin']}>` 测试
- 对 CompanyForm 使用 `<MemoryRouter initialEntries={['/company/add']}>` 独立测试
- 不再需要将两个组件放在同一个 `<Routes>` 树下

### C-4: 缺少 App.useApp() mock

SystemAdminPage 使用 `const { message } = App.useApp()` 获取 message 实例（antd 5.x 的静态方法改为 hooks 方案），测试需要：
```typescript
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return { ...antd, App: { ...antd.App, useApp: () => ({ message: { success: jest.fn(), error: jest.fn() } }) } };
});
```
否则 `message.success/error` 调用会导致测试错误。

---

## 五、架构修复蓝图

### Phase 1: 修正模块依赖（P0）

| 步骤 | 操作 | 影响 |
|------|------|------|
| 1.1 | 将 mock 目标从 `axios` 改为 `pages/lib/apiClient` | 修复 API 调用拦截 |
| 1.2 | 删除 `import CompanyForm from '../../pages/sysadmin/CompanyForm'` | 修复 TS2307 编译错误 |
| 1.3 | 添加 `App.useApp()` mock | 修复 message 调用 |

### Phase 2: 重构测试文件拆分（P0）

| 文件 | 覆盖范围 | 测试用例数估计 |
|------|---------|-------------|
| `sysadmin.test.tsx` | SystemAdminPage（LLM 模型列表 + 系统配置 + 平台同步） | ~15 |
| `llm-model-form.test.tsx` | LlmModelForm Modal（添加/编辑/禁用） | ~8 |
| `company-form.test.tsx` | CompanyForm（添加/编辑/禁用/Select） | ~12 |

### Phase 3: 补全架构覆盖（P1）

| 功能 | 数据流 | 优先级 |
|------|--------|--------|
| LLM 模型列表渲染 | GET /llm-models → Card map | P1 |
| LLM 模型 toggle | Switch onChange → PUT /llm-models/:id | P1 |
| LLM 模型删除 | Popconfirm → DELETE /llm-models/:id | P1 |
| 系统配置加载 | GET /system-configs → Form.setFieldsValue | P1 |
| 系统配置保存 | Form.onFinish → PUT /system-configs | P1 |
| 平台同步 | Button onClick → POST /publishing-platforms/sync | P1 |
| CompanyForm 用户列表 | GET /users → Select options | P1 |
| CompanyForm 禁用状态 | GET /companies/:id → status=false → disabled | P1 |

---

## 六、与项目最佳实践的差距

| 架构维度 | 项目最佳实践 | 本文件现状 | 差距 |
|----------|------------|-----------|------|
| Mock 目标 | `pages/lib/apiClient` 模块 | `axios` 模块 | 层级错误 |
| 路由器 | `MemoryRouter` + `initialEntries` | `BrowserRouter` + `pushState` | 反模式 |
| 测试粒度 | 一个测试文件对应一个源码模块 | 一个文件跨越两个页面模块 | 职责不清 |
| 数据模型 | 基于当前接口 TypeScript 类型 | 基于旧版字段假设 | 完全脱节 |
| 组件边界 | 独立测试每个组件 | 混合测试两个无关联组件 | 拓扑失配 |
| antd 集成 | mock App.useApp() | 无 mock | 缺失 |

---

## 七、总结

`sysadmin.test.tsx` 的测试架构在四个维度与源码架构完全断裂：(1) **模块依赖图** — CompanyForm 的 import 路径指向 `pages/sysadmin/CompanyForm`（不存在），apiClient 和 error utility 未被 mock；(2) **组件拓扑** — 测试假设 SystemAdminPage 和 CompanyForm 在同一嵌套路由下，实际它们已被拆分为两个独立的扁平路由模块；(3) **API 层** — 测试在 axios 模块级 mock，但源码所有 API 调用走 apiClient（axios.create 实例），mock 的 jest.fn() 与实际调用的 jest.fn() 是两个独立引用，断言完全不相交；(4) **数据模型** — 测试假设的 CompanyForm 字段（admin_username、admin_password、view_username）在源码中已被 operator_ids/viewer_ids（Select 多选）替代。

**综合评分 1.0/10 — REJECT**。这不是"修复几个断言"的问题，而是测试架构需要从零重建：按当前源码模块拓扑拆分为 3 个测试文件（sysadmin.test.tsx、llm-model-form.test.tsx、company-form.test.tsx），将 mock 层从 axios 模块提升到 apiClient 边界，用 MemoryRouter 替代 BrowserRouter，基于当前 TypeScript 接口类型构造 mock 数据。预计工时 ~8h。
