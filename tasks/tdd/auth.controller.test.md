# TDD 执行报告：Auth Controller

## 执行时间
2026-05-24

## 测试结果
- 测试套件：1 passed
- 测试用例：106 passed, 0 failed
- 覆盖率：Stmts 88.46%, Branch 86.95%, Funcs 100%, Lines ~88%

## 修复的Bug
1. auth.controller.test.ts: 为 verify 端点测试添加 getPrisma mock，修复因缺少数据库 mock 导致的测试失败

## 测试用例分类

### 正向测试（Happy Path）
- POST /api/auth/login: sysadmin 登录成功（返回 token + 用户信息 + 角色）
- POST /api/auth/login: admin 登录成功（返回公司关联项目）
- POST /api/auth/login: view 角色登录成功（返回 viewer 可访问项目）
- POST /api/auth/login: 登录时 selected_company 不可用时 fallback 到第一个公司
- POST /api/auth/login: 登录时 selected_project 不可用时 fallback 到第一个项目
- POST /api/auth/login: sysadmin 无项目时 selected_project 为 null
- POST /api/auth/logout: 三种角色（sysadmin/admin/view）登出成功
- GET /api/auth/verify: 三种角色 token 验证有效
- PUT /api/auth/selection: 仅保存 company_id 成功
- PUT /api/auth/selection: 保存 company_id + project_id 成功
- PUT /api/auth/selection: project_id 为显式 null 时保存成功
- GET /api/auth/companies: sysadmin 获取所有公司
- GET /api/auth/companies: admin/view 获取自己公司
- GET /api/auth/projects: 三种角色获取项目列表
- GET /api/auth/context: 获取公司+项目上下文
- GET /api/auth/companies/:id: 获取公司详情（含 operators/viewers）

### 边界条件测试
- username 超过 100 字符限制（400）
- password 超过 200 字符限制（400）
- username 为空字符串、纯空格（400）
- password 为空字符串（400）
- company_id 为 0、负数、非数字字符串（400）
- project_id 为 0、负数、null（400/200）
- ID 为浮点数 1.5 时 parseInt 截断为 1（200）
- company_id 为 'abc' 时 projects 返回空数组（200）
- non-Error 类型异常抛出时返回默认消息
- 错误无 message 属性时返回默认消息

### 安全测试
- POST /api/auth/login: 用户名类型验证（number/array 均拒绝）
- GET /api/auth/verify: 无 Authorization 头返回 401
- GET /api/auth/verify: 无 Bearer 前缀返回 401
- GET /api/auth/verify: Bearer 后为空 token 返回 401
- GET /api/auth/verify: 过期 token 返回 401（"登录已过期，请重新登录"）
- GET /api/auth/verify: 错误密钥签名的 token 返回 401
- 所有受保护端点无 token 时返回 401

### 权限测试
- POST /api/auth/login: 用户不存在返回 401（"用户名或密码错误"）
- POST /api/auth/login: 密码错误返回 401（"用户名或密码错误"）
- POST /api/auth/login: 无可访问公司返回 403（"没有权限访问任何公司"）
- POST /api/auth/login: view 角色无可访问项目返回 403（"没有权限访问任何项目"）
- PUT /api/auth/selection: 不可访问的 company_id 返回 403（"无权选择该公司"）
- PUT /api/auth/selection: 不可访问的 project_id 返回 403（"无权选择该项目"）
- GET /api/auth/companies: admin 公司被禁用时返回空列表
- GET /api/auth/companies/:id: admin/view 查询其他公司返回 403（"无权查看其他公司的用户"）
- GET /api/auth/companies/:id: sysadmin 可查询任意公司

### 直接单元测试（Defensive !user checks）
- saveSelection/getAccessibleCompanies/getAccessibleProjects/getContext/getCompanyDetail: req.user 为 undefined 时返回 401（"未登录"）
