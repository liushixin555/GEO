# project.controller.test.md — TDD 执行报告

## 测试文件
`tests/apis/project.controller.test.ts`

## 被测文件
`apis/controller/project.controller.ts`

## 测试结果
- **测试数量**: 44 个
- **通过**: 44 个
- **失败**: 0 个
- **执行时间**: ~9s

## 覆盖率

| 文件 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| project.controller.ts | **100%** | **100%** | **100%** | **100%** |
| project.service.impl.ts | 88.88% | 86.2% | 77.77% | 93.65% |

## 测试用例清单

### GET /api/projects (listProjects) — 11 个测试
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

### GET /api/projects/:id (getProject) — 7 个测试
12. 无效 id 返回 400
13. 不存在的项目返回 404
14. 获取项目详情成功
15. admin 非运营者访问项目返回 403
16. admin 作为运营者可访问项目
17. 服务错误返回 500
18. 错误无消息时返回默认消息 500

### POST /api/projects (createProject) — 9 个测试
19. 缺少 short_name 返回 400
20. 缺少 full_name 返回 400
21. 缺少 company_id 返回 400
22. 创建项目成功 (201)
23. 运营者不属于指定公司返回 400
24. 查看者不属于指定公司返回 400
25. admin 创建项目强制使用自己的 companyId
26. 创建服务错误返回 500
27. 创建错误无消息时返回默认消息 500

### PUT /api/projects/:id (updateProject) — 10 个测试
28. 无效 id 返回 400
29. 不存在的项目返回 404
30. 拒绝更改 company_id 返回 400
31. 相同 company_id 允许更新
32. admin 非运营者更新项目返回 403
33. 更新项目成功
34. 更新运营者不属于指定公司返回 400
35. 更新查看者不属于指定公司返回 400
36. 更新服务错误返回 500
37. 更新错误无消息时返回默认消息 500

### DELETE /api/projects/:id (deleteProject) — 7 个测试
38. 无效 id 返回 400
39. 不存在的项目返回 404
40. sysadmin 删除项目成功
41. admin 非运营者删除项目返回 403
42. admin 作为运营者可删除项目
43. 删除服务错误返回 500
44. 删除错误无消息时返回默认消息 500

## 覆盖的分支路径

### listProjects
- ✅ 正常流程 (try): page/pageSize解析、search、company_id、status(true/false)、分页响应
- ✅ 异常流程 (catch): 服务错误、默认错误消息

### getProject
- ✅ isNaN(id) → 400
- ✅ 项目不存在 → 404
- ✅ admin非运营者 → 403
- ✅ 正常获取 → 200
- ✅ 其他错误 → 500 + 默认消息

### createProject
- ✅ 缺少必填字段 → 400 (short_name/full_name/company_id 分别测试)
- ✅ admin强制companyId覆盖
- ✅ 运营者不属于公司 → 400
- ✅ 查看者不属于公司 → 400
- ✅ 创建成功 → 201
- ✅ 服务错误 → 500 + 默认消息

### updateProject
- ✅ isNaN(id) → 400
- ✅ 项目不存在(getById抛出) → 404
- ✅ company_id变更 → 400
- ✅ 相同company_id允许
- ✅ admin非运营者 → 403
- ✅ 运营者不属于公司 → 400
- ✅ 查看者不属于公司 → 400
- ✅ 更新成功 → 200
- ✅ 服务错误 → 500 + 默认消息

### deleteProject
- ✅ isNaN(id) → 400
- ✅ 项目不存在 → 404
- ✅ admin非运营者 → 403
- ✅ admin运营者删除成功
- ✅ sysadmin删除成功
- ✅ 服务错误 → 500 + 默认消息
