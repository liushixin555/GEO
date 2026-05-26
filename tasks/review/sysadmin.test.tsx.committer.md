# tests/pages/sysadmin.test.tsx — Code Committer 综合审核报告

| 属性 | 值 |
|---|---|
| **文件** | `tests/pages/sysadmin.test.tsx` (247行, 3 describe, 10 it) |
| **评审类型** | Code Committer 综合审核（质量+架构+安全+UI 四维交叉裁定） |
| **综合评分** | **1.0 / 10** |
| **裁决** | **REJECT — 从零重写** |
| **评审日期** | 2026-05-26 |

---

## 四维评审汇总

| 维度 | 评分 | 裁决 | 评审文件 |
|---|---|---|---|
| 质量 | 1.0/10 | REJECT | `tasks/review/sysadmin.test.tsx.md` |
| 架构 | 1.0/10 | REJECT | `tasks/review/sysadmin.test.tsx.architecture.md` |
| 安全 | 1.0/10 | REJECT | `tasks/review/sysadmin.test.tsx.security.md` |
| UI | 1.0/10 | REJECT | `tasks/review/sysadmin.test.tsx.ui.md` |

**四维一致 REJECT** — 历史罕见。四份独立评审均给出最低评分，说明此测试文件的缺陷不是某个维度的薄弱，而是**测试对象本身与当前源码完全脱节**。

---

## 核心裁决：REJECT — 从零重写

此测试文件**不修复，须删除后从零重建**。原因如下：

1. **10 个测试用例 0 个可执行** — CompanyForm import 路径不存在（TS2307），编译即失败
2. **0/10 测试与当前源码行为匹配** — 测试描述的"公司管理"页面已重构为"LLM 模型管理 + 系统配置"
3. **Mock 层与 API 层架构完全不相交** — mock `axios` 模块级方法，源码用 `apiClient`（axios.create 实例），断言永远无法通过
4. **数据模型完全过时** — admin_username/admin_password 已不存在，现为 operator_ids/viewer_ids

---

## BLOCKING 问题（5 项 — 合并前必须修复）

### B-1. CompanyForm import 路径不存在，编译失败 [质量 C-1 + 架构 A-1 + 安全 L-1 + UI B1]

- **严重程度**: CRITICAL
- **跨维确认**: 四维评审均认定为第一阻断项
- **现状**: L8 `import CompanyForm from '../../pages/sysadmin/CompanyForm'` — 该文件不存在
- **事实**: CompanyForm 已迁移至 `pages/company/CompanyForm.tsx`
- **影响**: TypeScript 编译 TS2307，**10 个测试全部无法执行**
- **验证预期**:
  ```
  FAIL tests/pages/sysadmin.test.tsx
  TS2307: Cannot find module '../../pages/sysadmin/CompanyForm'
  Test Suites: 1 failed, 1 total | Tests: 0 total
  ```
- **阻断理由**: 编译级错误，无法通过任何 CI 门禁

### B-2. SystemAdminPage 测试描述的是已废弃的旧版页面 [质量 C-2 + 架构 A-2 + 安全 B-01 + UI B2]

- **严重程度**: CRITICAL
- **跨维确认**: 四维评审一致认定
- **现状**: L39-100 测试"公司列表 + 添加公司"功能
- **事实**: `pages/sysadmin/index.tsx` 已重构为：
  - LLM 模型管理（Collapse 面板 + Card 卡片 + Switch 启禁用）
  - 蚁上数热点账号配置（Form + Input.Password）
  - 软盟账号配置（Form + 同步按钮）
- **断言 vs 源码对比**:

  | 测试断言 | 当前源码 | 匹配 |
  |---------|---------|------|
  | `getByText('DEFAULT')` 公司名 | LLM provider 名称 | ❌ |
  | `getByText('ACME')` 公司名 | 不存在 | ❌ |
  | `getByText('添加公司')` | "添加模型" | ❌ |
  | `mock axios.get('/api/companies')` | `apiClient.get('/llm-models')` | ❌ |
  | 错误 "获取公司列表失败" | 源码 `catch { // ignore }` 静默 | ❌ |

- **阻断理由**: 即使 import 修复，4 个 SystemAdminPage 测试仍全部失败（断言不匹配）

### B-3. Mock 层与 apiClient 单例架构不兼容 [质量 C-4 + 架构 A-3 + 安全 B-02 + UI B3]

- **严重程度**: CRITICAL
- **跨维确认**: 四维评审一致认定为架构级根本缺陷
- **现状**: L11-20 `jest.mock('axios', ...)` mock axios 模块级 get/post/put
- **事实**: 源码使用 `apiClient`（`pages/lib/apiClient.ts`）：
  ```typescript
  const apiClient = axios.create({ baseURL: '/api/v1' });
  // 请求拦截器: 注入 Authorization: Bearer token
  // 响应拦截器: 401 → 清除 localStorage + 跳转 /login
  ```
- **调用链分析**:
  ```
  测试 mock: mockedAxios.get（模块级静态方法）
  源码调用: apiClient.get（axios.create() 实例方法）
  → axios.create() mock 返回的 instance.get 与 mockedAxios.get 是不同的 jest.fn()
  → mockResolvedValueOnce / toHaveBeenCalledWith 断言永远不会匹配
  ```
- **额外影响**:
  - Token 注入逻辑从未被测试（安全边界验证缺失）
  - 401 自动登出逻辑从未被测试（会话管理验证缺失）
  - `baseURL` 拼接从未被验证
- **阻断理由**: Mock 架构级错误，所有 API 断言均为死代码

### B-4. 数据模型从 admin_username/admin_password 改为 operator_ids/viewer_ids [架构 A-4 + 安全 B-03 + 质量 C-3]

- **严重程度**: CRITICAL
- **跨维确认**: 三维评审认定
- **现状**: 测试使用的数据模型：
  ```typescript
  { admin_username: 'newco_admin', admin_password: 'admin123' }
  { admin_username: 'acme_admin', view_username: 'acme_view' }
  ```
- **事实**: 当前 `company.entity.ts` 的 CreateCompanyRequest：
  ```typescript
  { operator_ids: number[], viewer_ids?: number[] }
  ```
- **断裂**: 从"创建 admin/viewer 账号"模式改为"关联已有用户 ID 列表"模式
- **影响**:
  - L112 `getByPlaceholderText('请输入运营者')` — 源码为 Select 多选 `请选择运营者`
  - L116 `getByPlaceholderText('请输入admin密码')` — 源码中不存在此字段
  - L149 `expect.objectContaining({ admin_username: 'newco_admin' })` — 字段不存在
- **阻断理由**: 表单字段和数据模型完全不匹配

### B-5. 零安全测试覆盖 — 100% 安全缺口 [安全 B-01~B-03 + 质量 H-1~H-3]

- **严重程度**: CRITICAL
- **跨维确认**: 安全评审独立确认
- **现状**: 系统管理页面包含以下高敏感功能，**全部零测试**：

  | 安全领域 | 当前覆盖 | 应有测试 |
  |---------|---------|---------|
  | JWT Token 注入/验证 | 0 | 5+ |
  | 401 自动登出 | 0 | 3+ |
  | API Key 脱敏（maskApiKey） | 0 | 4+ |
  | 路由守卫/RBAC | 0 | 6+ |
  | 输入校验/XSS 防护 | 0 | 8+ |
  | 凭证管理安全 | 0 | 5+ |
  | IDOR 越权访问 | 0 | 4+ |
  | 错误信息泄露 | 0 | 3+ |
  | **合计** | **0** | **38+** |

- **阻断理由**: 系统管理页面包含 API Key 管理和第三方账号密码，是安全敏感度最高的前端页面之一

---

## HIGH 问题（6 项 — 严重影响测试价值）

### H-1. 零 LlmModelForm 子组件测试 [质量 H-1 + 架构 B-2 + UI H3]

`pages/sysadmin/LlmModelForm.tsx`（Modal 表单）完全未导入、未测试。该组件包含 provider/base_url/api_key/model_name 四个字段及禁用模型逻辑。

### H-2. 零系统配置功能测试 [质量 H-2 + UI H8]

SystemAdminPage 包含蚁上数热点账号和软盟账号两个配置表单（GET/PUT `/system-configs`），无任何测试。

### H-3. 零 LLM 模型 CRUD 测试 [质量 H-3 + UI H2]

Switch 启禁用、Popconfirm 删除、编辑模型弹窗等核心交互行为完全未覆盖。

### H-4. 路由路径错误 [质量 H-5 + 架构 A-2]

测试定义 `/sysadmin/add` 和 `/sysadmin/edit/:id`，实际路由为 `/company/add` 和 `/company/edit/:id`。

### H-5. 零平台同步功能测试 [质量 H-4]

`POST /publishing-platforms/sync` 同步按钮无任何测试。

### H-6. CompanyForm Edit 模式测试不完整 [质量 H-6]

仅检查表单初始值加载和标题，缺少 PUT 提交、禁用状态、fetch 失败、operator_ids/viewer_ids 初始值等核心行为。

---

## MEDIUM 问题（5 项）

| 编号 | 问题 | 来源 |
|------|------|------|
| M-1 | BrowserRouter + pushState 测试反模式，应用 MemoryRouter | 质量 M-1 + 架构 C-3 |
| M-2 | 缺少 loading/Spin 状态测试 | 质量 M-2 + UI H7 |
| M-3 | 缺少 CompanyForm 用户列表加载测试（GET /users） | 质量 M-3 + 架构 B-4 |
| M-4 | 缺少表单提交 loading 状态测试 | 质量 M-4 |
| M-5 | 缺少 CompanyForm 禁用状态测试（companyDisabled） | 质量 M-5 |

---

## 测试统计审计

| 指标 | 值 |
|------|-----|
| 测试文件 | 1 |
| describe 块 | 3（SystemAdminPage / CompanyForm-Add / CompanyForm-Edit） |
| 测试用例 | 10 |
| **可执行测试** | **0**（TS2307 编译失败） |
| **匹配当前源码的测试** | **0**（即使 import 修复） |
| Mock 文件 | 1（`axios` 模块 — 与 apiClient 不兼容） |
| 覆盖源文件 | 0/3（SystemAdminPage / LlmModelForm / CompanyForm 均未真实覆盖） |

---

## 源码-测试映射审计

| 被测源文件 | 源码实际行为 | 测试覆盖 | 阻断项 |
|-----------|------------|---------|--------|
| `pages/sysadmin/index.tsx` | LLM 模型 CRUD + 系统配置 + 平台同步 | ❌ 测试描述旧版公司管理 | B-2 |
| `pages/sysadmin/LlmModelForm.tsx` | Modal 表单（添加/编辑/禁用） | ❌ 未导入 | H-1 |
| `pages/company/CompanyForm.tsx` | 公司表单（Select 多选 + 禁用状态） | ❌ 路径错误 + 字段不匹配 | B-1, B-4 |

---

## API 端点映射审计

| 测试中 mock 的端点 | 源码实际调用 | 匹配 |
|-------------------|------------|------|
| `GET /api/companies`（axios 模块级） | `GET /api/v1/llm-models`（apiClient 实例） | ❌ |
| `POST /api/companies`（axios 模块级） | `POST /api/v1/companies`（apiClient 实例） | ❌ |
| — | `GET /api/v1/system-configs` | 未测试 |
| — | `PUT /api/v1/system-configs` | 未测试 |
| — | `POST /api/v1/publishing-platforms/sync` | 未测试 |
| — | `PUT /api/v1/llm-models/:id` | 未测试 |
| — | `DELETE /api/v1/llm-models/:id` | 未测试 |
| — | `GET /api/v1/users` | 未测试 |

---

## 修复蓝图：从零重建

### Phase 1: 删除旧文件 + 拆分为 3 个测试文件

| 新文件 | 覆盖范围 | 估计用例 |
|--------|---------|---------|
| `tests/pages/sysadmin.test.tsx` | SystemAdminPage（LLM 模型列表 + 系统配置 + 平台同步） | ~15 |
| `tests/pages/llm-model-form.test.tsx` | LlmModelForm Modal（添加/编辑/禁用模型） | ~8 |
| `tests/pages/company-form.test.tsx` | CompanyForm（添加/编辑/禁用/Select 多选） | ~12 |

### Phase 2: 修正 Mock 架构

```typescript
// 正确：mock apiClient 模块（接口边界），而非 axios 模块（实现细节）
jest.mock('../../pages/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));
```

### Phase 3: 修正路由测试策略

```typescript
// 正确：MemoryRouter + initialEntries
const renderWithRouter = (initialPath: string) => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/sysadmin" element={<SystemAdminPage />} />
      </Routes>
    </MemoryRouter>
  );
};
```

### 预估工时

| 阶段 | 工时 |
|------|------|
| Phase 1: 删除 + 新建 3 个测试文件 | 4h |
| Phase 2: Mock 架构修正 | 1h |
| Phase 3: 补全测试用例 | 3h |
| **总计** | **~8h**（从零重建） |

---

## 最终裁决

| 项目 | 结论 |
|------|------|
| **裁决** | **REJECT — 从零重写** |
| **综合评分** | **1.0 / 10** |
| **可执行测试** | 0 / 10 |
| **源码匹配测试** | 0 / 10 |
| **安全覆盖** | 0% (0/38+ 必要测试) |
| **修复策略** | 删除当前文件，按当前源码架构拆分为 3 个独立测试文件 |
| **修复工时** | ~8h（从零重建） |
| **可否增量修复** | **否** — 所有 10 个测试均为死代码，无保留价值 |

此文件是对旧版"公司管理"页面的测试快照。源码已发生架构级变更：SystemAdminPage 从公司管理重构为 LLM 模型管理 + 系统配置，CompanyForm 已迁移至 `pages/company/` 目录，数据模型从 admin 账号创建改为用户关联。测试文件没有一行可保留，必须从零重建。

---

*Committer 综合审核 — 四维交叉裁定（质量 1.0 + 架构 1.0 + 安全 1.0 + UI 1.0 → 综合 1.0/10 REJECT）*
