# sysadmin.test.tsx 软件UI专家评审

**文件**: `tests/pages/sysadmin.test.tsx`
**评审类型**: 软件UI专家评审（DESIGN.md + antd 规范 + UI/UX 规范）
**评审日期**: 2026-05-26
**评审结论**: **REJECT 1.0/10** — 测试与实际 UI 源码完全脱节，10 个测试用例 0 个可执行；UI 交互覆盖率为零，antd 组件行为未验证，DESIGN.md 视觉规范零覆盖

---

## 一、评审维度与评分

| 维度 | 分数 | 说明 |
|---|---|---|
| 源码一致性 | 0/25 | import 路径不存在，测试的组件与实际组件完全不同 |
| antd 组件测试 | 0/25 | 零个 antd 组件交互被正确测试 |
| UI/UX 行为覆盖 | 0/25 | 无加载态/空态/错误态/响应式/可访问性测试 |
| DESIGN.md 规范验证 | 0/25 | 无任何 Carbon Design System 视觉规范测试 |
| **总分** | **0/100** | **1.0/10（含基础运行分）** |

---

## 二、BLOCKING 问题（必须修复才能合并）

### B1. CompanyForm import 路径不存在 — TS2307 编译失败

```
// 测试文件第 8 行
import CompanyForm from '../../pages/sysadmin/CompanyForm';
```

- 实际文件路径：`pages/company/CompanyForm.tsx`
- `pages/sysadmin/CompanyForm.tsx` 不存在
- **影响**：TypeScript 编译直接报错，整个测试文件无法运行

### B2. 测试的 UI 与实际 SystemAdminPage 完全不同

测试描述的是旧版"公司管理"页面，但实际源码 `pages/sysadmin/index.tsx` 已重构为 LLM 模型管理 + 第三方账号配置页面。

| 测试期望 | 实际源码 |
|---|---|
| 页面标题文本 `系统管理` | `Breadcrumb` 组件 `<Breadcrumb items={[{ title: '系统管理' }]} />` |
| 公司卡片列表（DEFAULT、ACME） | LLM 模型卡片列表（provider 字段） |
| `添加公司` 卡片 | `添加模型` 卡片 |
| `/sysadmin/add` 路由 + CompanyForm 页面 | Modal 形式的 `LlmModelForm` 组件 |
| `/sysadmin/edit/:id` 路由 | 同上 Modal 编辑模式 |
| 公司字段：short_name, full_name, admin_username, admin_password | 模型字段：provider, base_url, api_key, model_name |

### B3. Mock 策略与 apiClient 单例架构不兼容

```javascript
// 测试 mock：模块级 axios 方法
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  create: jest.fn(() => ({ ... })),
}));
```

实际源码使用 `apiClient`（自定义 axios 实例 + 拦截器）：
```typescript
// pages/sysadmin/index.tsx
import apiClient from '../lib/apiClient';
// 所有请求通过 apiClient.get/post/put/delete 发送
```

- 测试 mock 的 `axios.get` 与 `apiClient` 实例方法是两个独立引用
- 即使测试能运行，`mockResolvedValueOnce` 也不会拦截到 `apiClient.get` 的请求

### B4. 零 antd 组件交互测试

实际页面使用了以下 antd 组件，测试中 **没有一个** 被正确覆盖：

| antd 组件 | 源码中的用法 | 测试覆盖 |
|---|---|---|
| `Collapse` | 三个折叠面板（LLM 模型/蚁上数/软盟） | 无 |
| `Card` | LLM 模型卡片 + 添加卡片 | 无 |
| `Switch` | 模型启用/禁用切换 | 无 |
| `Popconfirm` | 删除确认弹窗 | 无 |
| `Modal` | LlmModelForm 编辑/添加弹窗 | 无 |
| `Form` | 账号配置表单 + 模型表单 | 无 |
| `Input.Password` | API Key / 密码输入 | 无 |
| `Spin` | 加载状态 | 无 |
| `Alert` | 错误/警告提示 | 无 |
| `Breadcrumb` | 页面导航路径 | 无 |
| `Typography.Title/Text` | 标题/文本 | 无 |

### B5. 零 DESIGN.md 视觉规范验证

实际页面应遵循 IBM Carbon Design System，测试中无任何验证：

| DESIGN.md 规范 | 应测试内容 | 当前覆盖 |
|---|---|---|
| `{rounded.none}` 0px 圆角 | Card/Button/Input 无圆角 | 无 |
| IBM Blue `#0f62fe` 主色 | Switch/Button 主色 | 无 |
| IBM Plex Sans 字体 | Typography 字体族 | 无 |
| `letter-spacing: 0.16px` | body 文本间距 | 无 |
| 1px hairline 边框 | Card 边框样式 | 无 |
| 4px 间距网格 | 组件间距 | 无 |
| API Key 脱敏 `maskApiKey()` | 显示 `****` 格式 | 无 |

---

## 三、HIGH 问题（严重影响测试价值）

### H1. 缺失 Collapse 折叠面板交互测试

实际页面核心 UI 是三个 `Collapse` 面板。应测试：

- 默认全部展开（`defaultActiveKey={['llm', 'yishangshu', 'ruanmeng']}`）
- 点击面板头部可折叠/展开
- 折叠后面板内容不可见
- 展开后内容正确渲染

### H2. 缺失 Switch 状态切换测试

LLM 模型卡片使用 `Switch` 组件控制启用/禁用：

```tsx
<Switch size="small" checked={item.status} onChange={() => handleToggleStatus(item)}
  checkedChildren="启用" unCheckedChildren="禁用" />
```

应测试：
- Switch 显示当前状态（checked/unchecked）
- 点击 Switch 触发 `PUT /llm-models/:id` 请求
- Switch 的 `checkedChildren`/`unCheckedChildren` 文本
- `size="small"` 属性

### H3. 缺失 Modal 弹窗表单测试

`LlmModelForm` 使用 `Modal` + `Form` 组合，应有完整测试：

- Modal 标题：编辑模式 `编辑LLM模型` vs 添加模式 `添加LLM模型`
- 表单字段：provider / base_url / api_key / model_name
- `Input.Password` 遮盖显示 API Key
- 禁用模型时表单字段 disabled + 显示 `Alert type="warning"`
- 提交触发正确的 API 调用
- 取消按钮关闭 Modal
- 表单验证（required 字段）

### H4. 缺失 Popconfirm 删除确认测试

删除操作使用 `Popconfirm` 二次确认：

```tsx
<Popconfirm title="确定删除此模型？" onConfirm={() => handleDelete(item.id)} okText="确定" cancelText="取消">
  <DeleteOutlined className="item-card-edit item-card-edit-danger" />
</Popconfirm>
```

应测试：
- 点击删除图标弹出确认框
- 确认文本 `确定删除此模型？`
- 确认/取消按钮文本
- 确认后触发 `DELETE /llm-models/:id`
- 删除失败显示错误

### H5. 缺失 API Key 脱敏显示测试

`maskApiKey` 函数是 UI 安全特性，应测试：

```typescript
maskApiKey('sk-1234567890abcdef') → 'sk-1***cdef'
maskApiKey('short') → '***'
maskApiKey('') → ''
```

- 卡片中 API Key 以 `****` 脱敏显示
- 前4后4字符可见
- 短 key 全部遮盖

### H6. 缺失响应式布局测试

实际页面使用 antd `Row`/`Col` 栅格：

```tsx
<Col xs={24} sm={12} lg={8} xl={6}>
```

根据 DESIGN.md 断点规范（Mobile 320px / Tablet 672px / Desktop 1056px），应测试：
- 不同视口宽度下卡片列数变化
- 移动端单列布局
- 桌面端四列布局

### H7. 缺失加载/空态/错误态测试

| UI 状态 | 应测试 | 当前 |
|---|---|---|
| 加载中 | `Spin` 组件 spinning 状态 | 无 |
| 空列表 | 无模型卡片时仅显示"添加模型"卡片 | 无 |
| 错误 | `Alert type="error"` 显示错误消息 | 无 |
| 保存中 | Button `loading` 属性 | 无 |

### H8. 缺失第三方账号配置表单测试

实际页面有两个独立 Form（蚁上数/软盟账号），每个包含：
- `Form.Item` 带 `rules={[{ required: true }]}`
- `Input` + `Input.Password`
- 保存 Button 带 `loading` 状态
- 软盟额外有"同步发布平台"按钮

测试中完全没有覆盖这两个配置表单。

---

## 四、MEDIUM 问题

### M1. 未测试 antd Form 验证 UX

antd Form 的验证消息应使用 `help`/`validateStatus` 属性，验证失败时应显示红色错误文本。测试应验证：
- 空提交时显示 `供应商不能为空` 等中文提示
- 错误状态样式（红色边框）
- 输入后错误消息消失

### M2. 未测试 Breadcrumb 导航组件

```tsx
<Breadcrumb items={[{ title: '系统管理' }]} />
```

应验证 Breadcrumb 正确渲染，且路径与路由配置一致。

### M3. 未测试 Typography 层级

实际页面使用 `Typography.Title level={3}` 和 `Typography.Text`，应符合 DESIGN.md 的 `card-title`（24px/400）和 `body-sm`（14px/400）规范。

### M4. 未测试 Card hover 交互

模型卡片使用 `hoverable` 属性，添加卡片使用 `company-add-card` 样式类。应测试：
- hover 时鼠标样式变化
- 点击添加卡片触发弹窗

---

## 五、正确的测试架构建议

基于实际源码，测试应重构为以下结构：

```
tests/pages/sysadmin/
├── index.test.tsx              # SystemAdminPage 主页面测试
├── LlmModelForm.test.tsx       # LLM 模型表单 Modal 测试
└── account-configs.test.tsx    # 蚁上数/软盟账号配置测试
```

### Mock 策略修正

```typescript
// 正确：mock apiClient 而非 axios
jest.mock('../../pages/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));
```

### 必须覆盖的 UI 测试清单

1. **Collapse 面板**: 三个面板默认展开 + 折叠交互
2. **LLM 模型卡片**: 正确渲染 provider/model_name/base_url + 脱敏 API Key
3. **Switch 切换**: 启用/禁用 + API 调用
4. **添加模型**: Modal 弹出 + 表单填写 + 提交
5. **编辑模型**: 数据回填 + 更新提交 + 禁用模型不可编辑
6. **删除模型**: Popconfirm 确认 + API 调用
7. **账号配置**: 表单渲染 + 必填验证 + 保存/错误
8. **同步按钮**: loading 状态 + API 调用
9. **加载态**: Spin 组件显示
10. **错误态**: Alert 显示 + API Key 脱敏边界值

---

## 六、评分汇总

| 类别 | 项目 | 分数 |
|---|---|---|
| BLOCKING | B1. import 路径不存在 | -25 |
| BLOCKING | B2. 测试 UI 与实际完全不同 | -25 |
| BLOCKING | B3. Mock 与 apiClient 不兼容 | -25 |
| BLOCKING | B4. 零 antd 组件测试 | -25 |
| BLOCKING | B5. 零 DESIGN.md 验证 | -25 |
| HIGH | H1-H8. 缺失 8 项关键 UI 测试 | -40 |
| MEDIUM | M1-M4. 未测试交互细节 | -20 |
| **总分** | | **1.0/10** |

---

## 七、结论

**REJECT** — 此测试文件是对旧版"公司管理"页面的测试快照，与当前 `SystemAdminPage`（LLM 模型管理 + Collapse 面板 + Modal 表单 + Switch 状态切换）完全脱节。所有 10 个测试用例均无法执行，10 个测试用例 0 个可运行。从 UI 专家视角看，此文件没有任何评审价值——它既不验证 antd 组件行为，也不验证 DESIGN.md 视觉规范，也不验证用户交互流程。

**建议**：删除此文件，按 `tests/pages/sysadmin/` 目录结构从零重建三个测试文件，分别覆盖主页面、模型表单、账号配置。
