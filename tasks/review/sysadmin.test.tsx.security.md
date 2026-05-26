# sysadmin.test.tsx 代码安全专家评审

**文件**: `tests/pages/sysadmin.test.tsx`
**评审维度**: 安全（Security）
**评审日期**: 2026-05-26
**评审结果**: **REJECT 1.0/10** — 测试与源码完全脱节，零安全测试覆盖，mock 策略与 API 层架构不兼容

---

## 一、总体评价

此测试文件**完全不具备安全评审价值**。它测试的是一个已不存在的旧版"公司管理"界面，而非当前源码中的 LLM 模型配置页面。测试中的 mock 策略与项目实际 API 层（`apiClient` 单例 + 拦截器架构）完全不兼容，导致所有断言在运行时均无法通过。

**核心问题**：测试文件测试的不是当前系统，安全评审无从谈起。

---

## 二、BLOCKING 级别问题（3 项）

### B-01: 测试对象与源码完全脱节 — 零安全验证价值

**严重度**: CRITICAL
**行号**: 全文件

测试文件描述的是"公司管理"功能（公司列表、添加公司、编辑公司），但 `pages/sysadmin/index.tsx` 实际是 **LLM 模型配置**页面，包含：
- LLM 模型 CRUD（provider / base_url / api_key / model_name）
- 蚁上数热点账号配置（username + password）
- 软盟账号配置（username + password）
- 发布平台同步

公司管理已迁移至 `pages/company/`，路由从 `/sysadmin/add` 改为 `/company/add`。

**安全影响**: 系统管理页面包含 API Key 管理、第三方账号密码存储等高敏感操作，当前**零安全测试覆盖**。API Key 在前端展示时的脱敏逻辑（`maskApiKey`）、密码字段的 `Input.Password` 使用、账号凭证的传输安全性均未经过任何测试验证。

---

### B-02: Mock 策略与 apiClient 单例架构不兼容

**严重度**: CRITICAL
**行号**: 11-23

```typescript
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  // ...
}));
```

源码使用的是 `pages/lib/apiClient.ts` 中的 **axios 实例**（`axios.create({ baseURL: '/api/v1' })`），而非直接调用 `axios.get/post`。该实例有两个关键安全拦截器：
1. **请求拦截器**：从 localStorage 读取 token，注入 `Authorization: Bearer` 头
2. **响应拦截器**：401 时清除 token 并跳转 `/login`

测试直接 mock `axios` 模块的顶层方法，**完全绕过了这两个安全拦截器**，导致：
- Token 注入逻辑从未被测试（安全边界验证缺失）
- 401 自动登出逻辑从未被测试（会话管理验证缺失）
- `baseURL` 拼接从未被验证（请求路径安全验证缺失）

**正确做法**: 应 mock `pages/lib/apiClient` 模块导出的 `apiClient` 实例，或使用 MSW (Mock Service Worker) 拦截 HTTP 请求。

---

### B-03: 测试数据模型与实体定义完全不符 — 安全字段缺失

**严重度**: CRITICAL
**行号**: 63-66, 131-163, 196-211

测试使用的数据模型：
```typescript
{ admin_username: 'newco_admin', admin_password: 'admin123' }
{ admin_username: 'acme_admin', view_username: 'acme_view', view_cn_name: 'ACME Viewer' }
```

实际 `company.entity.ts` 的 `CreateCompanyRequest`：
```typescript
{ operator_ids: number[], viewer_ids?: number[] }
```

公司创建已从"创建管理员账号"模式改为"关联已有用户"模式。`admin_username` / `admin_password` 字段已不存在。

**安全影响**:
1. 旧模式下"创建公司时同时创建管理员账号"是高敏感操作（涉及凭证生成），新模式下改为"关联已有用户 ID 列表"，二者的安全威胁模型完全不同
2. 新模式下 `operator_ids` / `viewer_ids` 的 IDOR（越权访问）风险、用户角色校验（operator 必须是 admin 角色、viewer 必须是 view 角色）等安全场景完全未被测试
3. `toggleCompanyStatus`（禁用/启用公司）这一权限敏感操作无任何测试覆盖

---

## 三、HIGH 级别问题（5 项）

### H-01: Token 存储安全性零测试

**严重度**: HIGH

`apiClient` 的请求拦截器从 `localStorage.getItem('token')` 读取 JWT，测试中仅做了 `localStorage.setItem('token', 'test-token')`（第 43 行），但未验证：
- Token 为空时请求是否缺少 Authorization 头
- Token 过期/无效时 401 拦截器是否正确清除 token 并跳转
- XSS 攻击下 localStorage token 的暴露风险

### H-02: API Key 脱敏展示零测试

**严重度**: HIGH

`pages/sysadmin/index.tsx:126-130` 中有 `maskApiKey` 函数：
```typescript
const maskApiKey = (key: string) => {
  if (!key) return '';
  if (key.length <= 8) return '***';
  return key.slice(0, 4) + '***' + key.slice(-4);
};
```

这是防止 API Key 在前端页面泄露的关键安全控制，但**无任何测试覆盖**。应测试：
- 长密钥是否正确脱敏（仅显示前 4 + 后 4）
- 短密钥（≤8 字符）是否完全隐藏
- 空密钥是否返回空字符串
- 编辑时回显的 API Key 是否通过 `Input.Password` 保护

### H-03: 第三方账号密码存储零测试

**严重度**: HIGH

系统管理页面包含蚁上数热点和软盟的账号密码配置，通过 `/system-configs` API 以明文存储和传输。这是**高敏感凭证管理场景**，但：
- 无测试验证密码字段是否使用 `Input.Password`（源码确认使用了，但测试未验证）
- 无测试验证密码在传输层是否加密（HTTPS）
- 无测试验证密码存储时是否加密（后端以 `config_value` 明文存储）
- 无测试验证密码在 API 响应中是否脱敏

### H-04: 路由守卫零测试

**严重度**: HIGH

`company.routes.ts:9` 中 `router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN))` 要求所有公司管理 API 必须通过 JWT 认证 + sysadmin 角色校验。前端路由同样通过 Layout 中的路由守卫控制。

测试中无任何针对以下场景的验证：
- 未登录用户访问 `/sysadmin` 是否被重定向到 `/login`
- 非 sysadmin 角色（admin / view）访问是否被拒绝
- Token 被篡改/伪造时的处理

### H-05: 输入校验绕过零测试

**严重度**: HIGH

`company.schema.ts` 中定义了严格的 Zod 校验（short_name ≤ 50 字符、contact_phone 正则校验等），但前端测试未验证：
- 超长输入是否被前端拦截
- SQL 注入 / XSS payload 输入是否被正确处理
- 必填字段为空时是否阻止提交
- `operator_ids` / `viewer_ids` 注入非法 ID 时的行为

---

## 四、MEDIUM 级别问题（3 项）

### M-01: 测试中硬编码凭证

**行号**: 43, 143, 178

```typescript
localStorage.setItem('token', 'test-token');
// ...
fireEvent.change(screen.getByPlaceholderText('请输入admin密码'), { target: { value: 'admin123' } });
```

虽然这是测试代码，但硬编码 `'test-token'` 和 `'admin123'` 等凭证值，且测试文件会被提交到版本控制。建议使用常量或环境变量。

### M-02: 错误消息泄露测试不充分

**行号**: 89-98

```typescript
mockedAxios.get.mockRejectedValueOnce({
  response: { data: { message: '获取公司列表失败' } },
});
```

仅测试了错误消息的展示，未验证：
- 服务端返回的原始错误消息是否包含敏感信息（如 SQL 错误、堆栈跟踪）
- 错误消息是否经过前端过滤/脱敏后再展示

### M-03: fetch error 静默吞没

测试中 mock 了错误响应，但源码中 `fetchModels`（第 38-39 行）和 `fetchConfigs`（第 61-62 行）使用 `catch { // ignore }` 静默吞没所有错误。这意味着：
- 网络错误（包括 MITM 攻击导致的连接异常）不会给用户任何提示
- 401/403 等安全相关错误可能被静默忽略（虽然响应拦截器会处理 401，但其他状态码不会）

---

## 五、LOW 级别问题（2 项）

### L-01: 测试文件 import 路径不存在

**行号**: 8

```typescript
import CompanyForm from '../../pages/sysadmin/CompanyForm';
```

该路径不存在。`CompanyForm` 实际位于 `pages/company/CompanyForm.tsx`。此 import 在 TypeScript 编译时即会报错（TS2307），测试根本无法执行。

### L-02: React Router v6 嵌套路由测试方式错误

**行号**: 26-37

测试使用扁平的 `<Routes>` + `<Route>` 定义所有路由，但实际项目中路由是通过 `App.tsx` 中的 `<Layout>` 组件嵌套渲染的。测试中 `SystemAdminPage` 和 `CompanyForm` 被渲染时缺少 Layout 包裹（缺少侧边栏、路由守卫、认证状态管理等），无法模拟真实的用户访问路径。

---

## 六、安全测试覆盖差距分析

| 安全领域 | 当前覆盖 | 应有覆盖 | 差距 |
|---------|---------|---------|------|
| JWT Token 注入/验证 | 0 | 5+ 测试 | 100% |
| 401 自动登出 | 0 | 3+ 测试 | 100% |
| API Key 脱敏 | 0 | 4+ 测试 | 100% |
| 路由守卫/RBAC | 0 | 6+ 测试 | 100% |
| 输入校验/XSS 防护 | 0 | 8+ 测试 | 100% |
| 凭证管理安全 | 0 | 5+ 测试 | 100% |
| IDOR 越权访问 | 0 | 4+ 测试 | 100% |
| 错误信息泄露 | 0 | 3+ 测试 | 100% |
| **总计** | **0 有效测试** | **38+ 测试** | **100%** |

---

## 七、修复建议

测试文件必须**从零重写**，建议拆分为以下独立测试文件：

1. **`tests/pages/sysadmin.test.tsx`** — 测试 LLM 模型管理页面
   - API Key 脱敏展示验证
   - 模型 CRUD 操作的 token 注入验证
   - 第三方账号密码字段的 `Input.Password` 验证
   - 401 拦截器自动登出验证

2. **`tests/pages/company.test.tsx`** — 测试公司列表页面
   - 公司列表加载 + token 注入
   - 状态切换（启用/禁用）权限验证
   - 错误处理（含敏感信息过滤）

3. **`tests/pages/company-form.test.tsx`** — 测试公司表单页面
   - 添加/编辑模式的字段验证
   - `operator_ids` / `viewer_ids` 的 Select 多选验证
   - 输入校验（超长输入、特殊字符、XSS payload）
   - 禁用公司不可编辑的验证

4. **Mock 策略改进**：
   - 使用 MSW (Mock Service Worker) 替代 `jest.mock('axios')`
   - 或 mock `pages/lib/apiClient` 模块以保留拦截器逻辑
   - 确保测试覆盖 token 注入和 401 处理的安全边界

---

## 八、评分明细

| 维度 | 得分 | 说明 |
|-----|------|------|
| Mock 安全性 | 1.0/10 | mock 绕过所有安全拦截器 |
| 输入验证覆盖 | 0/10 | 零有效输入验证测试 |
| 认证/授权覆盖 | 0/10 | 零认证授权测试 |
| 凭证安全覆盖 | 0/10 | 零凭证安全测试 |
| 数据脱敏覆盖 | 0/10 | 零脱敏测试 |
| 错误处理安全 | 1.0/10 | 仅测试错误展示，未验证信息泄露 |
| **加权总分** | **1.0/10** | **REJECT** |
