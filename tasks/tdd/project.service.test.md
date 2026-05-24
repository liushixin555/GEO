# project.service.impl.ts TDD 执行报告

## 源文件
`apis/service/impl/project.service.impl.ts`

## 测试文件
`tests/apis/project.service.test.ts`

## 接口文件
`apis/service/project.service.ts`

## 测试结果

| 指标 | 第1轮 | 第2轮 |
|------|-------|-------|
| 测试用例 | 72 passed | **103 passed** (+31) |
| 语句覆盖率 | 100% | **100%** |
| 分支覆盖率 | 100% | **100%** |
| 函数覆盖率 | 100% | **100%** |
| 行覆盖率 | 100% | **100%** |

## 测试用例清单

### list() — 21 个测试
1. 返回分页列表按 id 升序
2. 第2页 skip 计算正确
3. 按 shortName/fullName 搜索过滤
4. 按 company_id 过滤
5. 按 status=true 过滤
6. 按 status=false 过滤
7. status=undefined 时不添加过滤
8. admin 角色 + userId 添加 operator 过滤
9. admin 角色无 userId 不添加过滤
10. 所有过滤器组合使用
11. mapProject 映射验证
12. 空结果返回空列表
13. 非 admin 角色（view）不添加 admin 过滤
14. sysadmin 角色不添加 admin 过滤
15. company_id=0（falsy）不添加 companyId 过滤
16. page=3, pageSize=5, skip=10 计算正确
17. 空字符串搜索不添加 OR 过滤
18. count 和 findMany 使用相同 where 条件
19. company 为 null 时 company_name 回退为空字符串
20. **[第2轮]** Promise.all 并发执行 findMany 和 count（调用次数验证）
21. **[第2轮]** 多条记录映射保持顺序

### getById() — 8 个测试
1. 找到项目返回映射结果
2. 未找到抛出"项目不存在"
3. userId/role 参数透传
4. admin 非 operator 抛出 ForbiddenError
5. admin 是 operator 允许访问
6. sysadmin 无需 operator 检查
7. 验证时间戳字段映射正确
8. 无运营者/查看者返回空数组
9. **[第2轮]** NotFoundError 类型 + statusCode=404 验证
10. **[第2轮]** ForbiddenError 类型 + statusCode=403 验证
11. **[第2轮]** admin userId=0 跳过权限检查（falsy userId 边界）
12. **[第2轮]** 非 admin/view/sysadmin 角色跳过权限检查

### create() — 15 个测试
1. 最小字段创建（无 operators/viewers）
2. 带描述创建
3. 有效 operators 创建
4. 无效 operators 抛出"运营者不属于指定公司"
5. 有效 viewers 创建
6. 无效 viewers 抛出"查看者不属于指定公司"
7. 同时带 operators 和 viewers
8. 空字符串 description 变为 null
9. 显式空数组 operator_ids/viewer_ids
10. description 为 undefined 时变为 null
11. operator 无 user 对象时使用 userId 回退
12. 多运营者/查看者列表创建
13. admin 覆盖 company_id
14. sysadmin 使用 request company_id
15. **[第2轮]** BusinessError(运营者) 类型 + statusCode=400 验证
16. **[第2轮]** BusinessError(查看者) 类型 + statusCode=400 验证
17. **[第2轮]** admin undefined companyId 使用 undefined 作为 effectiveCompanyId
18. **[第2轮]** viewer 无 user 对象 userId 回退
19. **[第2轮]** create 方法 include 包含 OPERATOR_INCLUDE

### update() — 27 个测试
1. 项目不存在抛出异常
2. 更新 short_name
3. 更新 full_name
4. 更新 description
5. 更新 status
6. 有效 operators 更新（含 soft delete 旧记录）
7. 无效 operators 抛出异常
8. 空 operators 数组清除所有运营者
9. 有效 viewers 更新
10. 无效 viewers 抛出异常
11. 空 viewers 数组清除所有查看者
12. 使用已有 companyId 验证 operators
13. undefined 字段不更新
14. 同时更新多个字段
15. description 设为空字符串
16. 同时更新 operators 和 viewers
17. status=false + operators 组合更新
18. 显式设置 description 为 null
19. status=true 更新
20. company_id 不可更改 BusinessError
21. 同一 company_id 允许
22. admin 非 operator ForbiddenError
23. admin 是 operator 允许更新
24. **[第2轮]** NotFoundError 类型 + statusCode=404 验证
25. **[第2轮]** BusinessError(公司不可改) 类型 + statusCode=400 验证
26. **[第2轮]** BusinessError(运营者) 类型 + statusCode=400 验证
27. **[第2轮]** BusinessError(查看者) 类型 + statusCode=400 验证
28. **[第2轮]** ForbiddenError 类型 + statusCode=403 验证
29. **[第2轮]** admin userId=0 跳过权限检查
30. **[第2轮]** admin undefined userId 跳过权限检查
31. **[第2轮]** viewer validation 使用 existing.companyId
32. **[第2轮]** company_id undefined 不抛错
33. **[第2轮]** operator 软删除后创建（替换语义）
34. **[第2轮]** viewer 软删除后创建（替换语义）
35. **[第2轮]** update 方法 include 包含 OPERATOR_INCLUDE

### delete() — 8 个测试
1. 项目不存在抛出异常
2. 软删除设置 deletedAt
3. userId/role 参数透传
4. 软删除返回 void
5. findFirst 使用 deletedAt: null 过滤条件
6. admin 非 operator ForbiddenError
7. admin 是 operator 允许删除
8. sysadmin 无需 operator 检查
9. **[第2轮]** NotFoundError 类型 + statusCode=404 验证
10. **[第2轮]** ForbiddenError 类型 + statusCode=403 验证
11. **[第2轮]** admin userId=0 跳过权限检查
12. **[第2轮]** admin undefined userId 跳过权限检查
13. **[第2轮]** delete findFirst 包含 OPERATOR_INCLUDE（用于权限检查）

### mapProject 边界值 — 4 个测试（第2轮新增）
1. 多个 operator 和 viewer 的映射
2. operator/user cnName 为空字符串时正确映射
3. viewer/user 对象存在但 id 字段不存在时 userId 回退
4. 多条记录映射保持顺序

## 第2轮新增 31 个用例分类

| 分类 | 数量 | 验证点 |
|------|------|--------|
| 错误类型验证 | 11 | NotFoundError/BusinessError/ForbiddenError 的 instanceof + statusCode + message |
| Admin 边界值 | 7 | userId=0/undefined 跳过权限检查、companyId=undefined、非标准角色 |
| 安全性与数据完整性 | 9 | viewer 使用 existing.companyId、软删除替换语义、include 验证、Promise.all |
| mapProject 边界值 | 4 | 多 operator/viewer 映射、空 cnName、user.id 回退、顺序保持 |

## 测试策略

- **Mock 方式**: jest.mock(`db.util`)，mock Prisma 的 findMany/count/findFirst/create/update/updateMany 方法
- **验证方式**: 验证 Prisma 调用参数 + 返回值映射（mapProject）+ 错误类型/状态码
- **边界条件**: 空字符串、空数组、falsy 值 (company_id=0, userId=0)、不同角色类型（admin/view/sysadmin）、null user 回退
- **异常路径**: NotFoundError(404)、BusinessError(400)、ForbiddenError(403) 全量类型验证
- **安全性**: admin 权限检查 falsy userId 边界、company_id 不可变性、existing.companyId 用于验证
