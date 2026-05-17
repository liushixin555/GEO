# fix. Bug 修复汇总

> 状态：✅ 全部已完成

---

## fix001. Switch 圆角修复

### 问题
全局 `border-radius: 0` 规则影响了 `.ant-switch`，导致 Switch 变成方形而非椭圆胶囊。

### 修复
在 `pages/styles/global.css` 中排除 `.ant-switch`：
```css
*:not(.ant-switch) { border-radius: 0 !important; }
```

### 涉及文件
- `pages/styles/global.css`

---

## fix002. toolbar 控件高度不一致

### 问题
ConfigProvider 中 `Button.controlHeight=48` 而 `Input/Select.controlHeight=40`，导致 Input.Search（内含 Button）高度异常。

### 修复
统一所有控件 controlHeight 为 40px：
```typescript
components: {
  Button: { controlHeight: 40 },
  Input: { controlHeight: 40 },
  Select: { controlHeight: 40 },
}
```

### 涉及文件
- `pages/main.tsx` ConfigProvider

---

## fix003. antd 废弃 API 警告

### 问题
控制台出现 antd 废弃 API 警告。

### 修复
- Space 组件：`direction` → `orientation`
- Modal 组件：`destroyOnClose` → `destroyOnHidden`

### 涉及文件
- `pages/components/Sidebar.tsx` — Space orientation
- 所有 Modal 组件 — destroyOnHidden

---

## fix004. CompanyForm useForm 警告

### 问题
编辑模式下异步加载公司详情后调用 `form.setFieldsValue`，但 Form 可能未渲染，触发 "Instance created by useForm is not connected to any Form element" 警告。

### 修复
始终渲染 `<Form>`，loading 时用 `display: none` 隐藏。

### 涉及文件
- `pages/company/CompanyForm.tsx`

---

## fix005. User 路由权限违规

### 问题
用户管理 API 使用 `roleMiddleware('sysadmin', 'admin')` 允许 admin 访问，但规范（permissions.md Section 2.4）明确"只有 sysadmin 角色有权限"。

### 修复
1. `apis/app.ts`：`roleMiddleware('sysadmin', 'admin')` → `roleMiddleware('sysadmin')`
2. `apis/controller/user.controller.ts`：移除 admin 公司隔离逻辑
3. `tests/apis/user.controller.test.ts`：admin 全部改为期望 403

### 涉及文件
- `apis/app.ts:78-83`
- `apis/controller/user.controller.ts`
- `tests/apis/user.controller.test.ts`

---

## fix006. ProjectForm 调用 sysadmin-only API

### 问题
`ProjectForm.tsx` 调用 `/api/companies/:id` 获取运营者/查看者，该接口 sysadmin-only，admin 打开会 403。

### 修复
1. 新增 `GET /api/auth/companies/:id` 接口（所有已登录角色可用，admin 只能查自己公司）
2. `ProjectForm.tsx`：`/api/companies/:id` → `/api/auth/companies/:id`

### 涉及文件
- `apis/controller/auth.controller.ts` — 新增 getCompanyDetail
- `apis/service/auth.service.ts` + `impl` — 新增 getCompanyUsers
- `apis/app.ts` — 新增路由
- `pages/project/ProjectForm.tsx` — 修改 API 路径
- `tests/apis/auth.controller.test.ts` — 5 个新测试
