# project.controller.test.md — TDD 执行报告

## 测试文件
`tests/apis/project.controller.test.ts`

## 被测文件
`apis/controller/project.controller.ts`

## 测试结果
- **测试数量**: 94 个
- **通过**: 94 个
- **失败**: 0 个
- **执行时间**: ~5.5s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| project.controller.ts | **100%** | **100%** | **100%** | **100%** |

## 测试用例清单

### GET /api/projects (listProjects) — 16 个测试
1. 无 token 返回 401
2. view 角色返回 403
3. sysadmin 获取项目列表成功
4. 支持 company_id 过滤
5. 支持 status=true 过滤
6. 支持 status=false 过滤
7. 支持 search 查询
8. 支持自定义分页参数 (page, pageSize)
9. admin 角色按运营者过滤项目列表
10. 服务错误返回 500
11. 错误无消息时返回默认消息 500
12. 无查询参数时使用默认 page=1, pageSize=10
13. 支持组合过滤 (search + company_id + status)
14. 无 status 参数时不添加 status 过滤条件
15. 无效 status 参数返回 400
16. pageSize 上限 100

### GET /api/projects/:id (getProject) — 9 个测试
17. 无 token 返回 401
18. 无效 id 返回 400
19. 不存在的项目返回 404
20. 获取项目详情成功
21. admin 非运营者访问项目返回 403
22. admin 作为运营者可访问项目
23. 服务错误返回 500
24. 错误无消息时返回默认消息 500
25. 返回完整项目详情（所有字段映射验证）

### POST /api/projects (createProject) — 13 个测试
26. 缺少 short_name 返回 400
27. 缺少 full_name 返回 400
28. 缺少 company_id 返回 400（sysadmin）
29. 创建项目成功 (201)
30. 运营者不属于指定公司返回 400
31. 查看者不属于指定公司返回 400
32. admin 创建项目强制使用自己的 companyId
33. 创建服务错误返回 500
34. 创建错误无消息时返回默认消息 500
35. 创建项目包含所有可选字段（含 viewer_ids）
36. 创建项目不含运营者/查看者（空数组）
37. 三个必填字段全部缺失返回 400
38. admin 不提供 company_id 创建项目（自动使用 JWT companyId）

### PUT /api/projects/:id (updateProject) — 17 个测试
39. 无效 id 返回 400
40. 不存在的项目返回 404
41. 拒绝更改 company_id 返回 400
42. 相同 company_id 允许更新
43. admin 非运营者更新项目返回 403
44. 更新项目成功
45. 更新运营者不属于指定公司返回 400
46. 更新查看者不属于指定公司返回 400
47. 更新服务错误返回 500
48. 更新错误无消息时返回默认消息 500
49. 更新 status 字段（boolean 状态切换）
50. 更新 description 字段
51. 更新有效 operator_ids 替换（覆盖软删除+重建）
52. 更新有效 viewer_ids 替换（覆盖软删除+重建）
53. admin 作为运营者可更新项目
54. 更新时 company_id 从 body 中被剥离（不传给 service）
55. 空 operator_ids 数组更新（清空运营者）

### DELETE /api/projects/:id (deleteProject) — 9 个测试
56. 无效 id 返回 400
57. 不存在的项目返回 404
58. sysadmin 删除项目成功
59. admin 非运营者删除项目返回 403
60. admin 作为运营者可删除项目
61. 删除服务错误返回 500
62. 删除错误无消息时返回默认消息 500
63. sysadmin 直接删除（跳过运营者检查）
64. 无 token 删除返回 401

### 直接单元测试（defense-in-depth）— 4 个测试
65. deleteProject view 角色 403（绕过路由守卫）
66. getProject view 角色 403（绕过路由守卫）
67. updateProject view 角色 403（绕过路由守卫）

### 输入验证 — 5 个测试
68. search 超过 100 字符返回 400
69. search 恰好 100 字符允许
70. 无效 company_id（NaN）返回 400
71. 负数 company_id 返回 400
72. 零值 company_id 返回 400

### 字符串长度验证 — 4 个测试
73. short_name 超过 50 字符返回 400
74. full_name 超过 200 字符返回 400
75. description 超过 500 字符返回 400
76. short_name 恰好 50 字符允许

### 直接控制器测试（覆盖未触达分支）— 5 个测试（新增）
77. createProject full_name > 200 直接调用返回 400
78. createProject full_name 恰好 200 允许
79. createProject 401 未登录直接调用
80. createProject short_name > 50 直接调用返回 400
81. createProject description > 500 直接调用返回 400

### 直接控制器 401 检查（defense-in-depth）— 4 个测试（新增）
82. updateProject 401 未登录直接调用
83. getProject 401 未登录直接调用
84. deleteProject 401 未登录直接调用
85. listProjects 401 未登录直接调用

### 非 Error 对象抛出（分支覆盖）— 5 个测试（新增）
86. listProjects 非 Error 抛出 → 500 + 默认消息
87. getProject 非 Error 抛出 → 500 + 默认消息
88. createProject 非 Error 抛出 → 500 + 默认消息
89. updateProject 非 Error 抛出 → 500 + 默认消息
90. deleteProject 非 Error 抛出 → 500 + 默认消息

### admin 边界场景 — 1 个测试（新增）
91. admin 创建项目始终使用 JWT companyId（忽略 body 中的 company_id）

### view 角色路由守卫 — 3 个测试（新增）
92. GET /api/projects/:id view 角色 403（路由中间件拦截）
93. PUT /api/projects/:id view 角色 403（路由中间件拦截）
94. DELETE /api/projects/:id view 角色 403（路由中间件拦截）

## 覆盖的分支路径

### listProjects
- ✅ page/pageSize 解析（默认值、上限100）、search、company_id、status(true/false/undefined/invalid)、分页响应、组合过滤
- ✅ 异常流程: 服务错误、默认错误消息、非 Error 对象抛出
- ✅ 401 未登录直接调用

### getProject
- ✅ isNaN(id) → 400、项目不存在 → 404、admin非运营者 → 403、正常获取 → 200、全字段映射验证
- ✅ view 角色 → 403（直接单元测试 + 路由守卫）
- ✅ 其他错误 → 500 + 默认消息、非 Error 对象抛出
- ✅ 401 未登录直接调用

### createProject
- ✅ 缺少必填字段 → 400（schema 验证 + 控制器 effectiveCompanyId 检查）
- ✅ admin强制companyId覆盖、运营者/查看者不属于公司 → 400
- ✅ 创建成功 → 201（含/不含 operators/viewers 两种场景）
- ✅ full_name > 200 直接调用 → 400（绕过 schema 中间件）
- ✅ short_name > 50 / description > 500 直接调用 → 400
- ✅ 服务错误 → 500 + 默认消息、非 Error 对象抛出
- ✅ 401 未登录直接调用

### updateProject
- ✅ isNaN(id) → 400、项目不存在 → 404、company_id变更 → 400、相同company_id允许
- ✅ admin非运营者 → 403、admin运营者更新成功
- ✅ view 角色 → 403（直接单元测试 + 路由守卫）
- ✅ 运营者/查看者不属于公司 → 400
- ✅ 更新成功 → 200（status/description/operator_ids/viewer_ids 多场景）
- ✅ company_id 剥离、空 operator_ids 处理
- ✅ 服务错误 → 500 + 默认消息、非 Error 对象抛出
- ✅ 401 未登录直接调用

### deleteProject
- ✅ isNaN(id) → 400、项目不存在 → 404
- ✅ admin非运营者 → 403、admin运营者删除成功
- ✅ sysadmin删除成功（跳过运营者检查）
- ✅ view角色 → 403（直接单元测试 + 路由守卫）
- ✅ 无token → 401
- ✅ 服务错误 → 500 + 默认消息、非 Error 对象抛出
- ✅ 401 未登录直接调用

## 本次变更详情（2026-05-24 第二轮补全）

### 新增 18 个测试用例
从 76 个提升至 94 个，覆盖率从 90.83% Stmts / 87.05% Branch / 98.26% Lines 提升至 **100% 全覆盖**。

### 覆盖率缺口分析
1. **行 99-100**: `full_name.length > 200` 分支被路由 schema 中间件拦截，controller 自身该分支从未执行 → 通过直接调用 controller 函数覆盖
2. **Branch 87.05% → 100%**: 5 个 catch 块中 `err instanceof Error` 的 false 分支（非 Error 抛出）未覆盖 → 新增非 Error 抛出测试
3. **createProject/updateProject 401 检查**: controller 自身 `!req.user` 分支仅通过路由中间件间接覆盖 → 新增直接调用测试
4. **view 角色路由守卫**: GET/PUT/DELETE 三个端点的 view 角色路由级拦截 → 新增路由级测试

### 覆盖率变化
- 补全前: 76 用例，90.83% Stmts / 87.05% Branch / 100% Funcs / 98.26% Lines
- 补全后: 94 用例，**100% Stmts / 100% Branch / 100% Funcs / 100% Lines**
