# project.controller.test.md — TDD 执行报告

## 测试文件
`tests/apis/project.controller.test.ts`

## 被测文件
`apis/controller/project.controller.ts`

## 测试结果
- **测试数量**: 60 个
- **通过**: 60 个
- **失败**: 0 个
- **执行时间**: ~10s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| project.controller.ts | **100%** | **100%** | **100%** | **100%** |
| project.service.impl.ts | **97.22%** | **93.1%** | **100%** | **100%** |

## 测试用例清单

### GET /api/projects (listProjects) — 14 个测试
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

### GET /api/projects/:id (getProject) — 8 个测试
15. 无效 id 返回 400
16. 不存在的项目返回 404
17. 获取项目详情成功
18. admin 非运营者访问项目返回 403
19. admin 作为运营者可访问项目
20. 服务错误返回 500
21. 错误无消息时返回默认消息 500
22. 返回完整项目详情（所有字段映射验证）

### POST /api/projects (createProject) — 12 个测试
23. 缺少 short_name 返回 400
24. 缺少 full_name 返回 400
25. 缺少 company_id 返回 400
26. 创建项目成功 (201)
27. 运营者不属于指定公司返回 400
28. 查看者不属于指定公司返回 400
29. admin 创建项目强制使用自己的 companyId
30. 创建服务错误返回 500
31. 创建错误无消息时返回默认消息 500
32. 创建项目包含所有可选字段（含 viewer_ids）
33. 创建项目仅包含必填字段（无 operator_ids/viewer_ids）
34. 三个必填字段全部缺失返回 400

### PUT /api/projects/:id (updateProject) — 17 个测试
35. 无效 id 返回 400
36. 不存在的项目返回 404
37. 拒绝更改 company_id 返回 400
38. 相同 company_id 允许更新
39. admin 非运营者更新项目返回 403
40. 更新项目成功
41. 更新运营者不属于指定公司返回 400
42. 更新查看者不属于指定公司返回 400
43. 更新服务错误返回 500
44. 更新错误无消息时返回默认消息 500
45. 更新 status 字段（状态切换）
46. 更新 description 字段
47. 更新有效 operator_ids 替换（覆盖软删除+重建）
48. 更新有效 viewer_ids 替换（覆盖软删除+重建）
49. admin 作为运营者可更新项目
50. 更新时 company_id 从 body 中被剥离（不传给 service）
51. 空 operator_ids 数组更新（清空运营者）

### DELETE /api/projects/:id (deleteProject) — 9 个测试
52. 无效 id 返回 400
53. 不存在的项目返回 404
54. sysadmin 删除项目成功
55. admin 非运营者删除项目返回 403
56. admin 作为运营者可删除项目
57. 删除服务错误返回 500
58. 删除错误无消息时返回默认消息 500
59. sysadmin 直接删除（跳过运营者检查）
60. 无 token 删除返回 401

## 覆盖的分支路径

### listProjects
- ✅ 正常流程 (try): page/pageSize解析（含默认值）、search、company_id、status(true/false/undefined)、分页响应、组合过滤
- ✅ 异常流程 (catch): 服务错误、默认错误消息

### getProject
- ✅ isNaN(id) → 400
- ✅ 项目不存在 → 404
- ✅ admin非运营者 → 403
- ✅ 正常获取 → 200（含全字段映射验证）
- ✅ 其他错误 → 500 + 默认消息

### createProject
- ✅ 缺少必填字段 → 400 (short_name/full_name/company_id 分别测试 + 全部缺失)
- ✅ admin强制companyId覆盖
- ✅ 运营者不属于公司 → 400
- ✅ 查看者不属于公司 → 400
- ✅ 创建成功 → 201（含 viewer_ids 和无 operators/viewers 两种场景）
- ✅ 服务错误 → 500 + 默认消息

### updateProject
- ✅ isNaN(id) → 400
- ✅ 项目不存在(getById抛出) → 404
- ✅ company_id变更 → 400
- ✅ 相同company_id允许 → company_id从body中剥离
- ✅ admin非运营者 → 403
- ✅ admin运营者更新成功
- ✅ 运营者不属于公司 → 400
- ✅ 查看者不属于公司 → 400
- ✅ 更新成功 → 200（含 status/description/operator_ids/viewer_ids 多场景）
- ✅ 服务错误 → 500 + 默认消息

### deleteProject
- ✅ isNaN(id) → 400
- ✅ 项目不存在 → 404
- ✅ admin非运营者 → 403
- ✅ admin运营者删除成功
- ✅ sysadmin删除成功（跳过运营者检查）
- ✅ 无token → 401
- ✅ 服务错误 → 500 + 默认消息

## 本次新增测试用例（从44→60）

新增 16 个测试，主要覆盖：
- **listProjects**: 默认分页参数、组合过滤、status参数缺失场景
- **getProject**: 完整字段映射验证
- **createProject**: 含 viewer_ids 创建、仅必填字段创建、全部必填缺失
- **updateProject**: status/description 字段更新、operator_ids/viewer_ids 有效替换、admin运营者更新、company_id剥离验证、空 operator_ids 数组
- **deleteProject**: sysadmin跳过运营者检查路径、无token删除
