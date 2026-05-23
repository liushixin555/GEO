# project.service.impl.ts TDD 执行报告

## 源文件
`apis/service/impl/project.service.impl.ts`

## 测试文件
`tests/apis/project.service.test.ts`

## 接口文件
`apis/service/project.service.ts`

## 测试结果

| 指标 | 值 |
|------|-----|
| 测试套件 | 1 passed |
| 测试用例 | **60 passed** |
| 语句覆盖率 | **100%** |
| 分支覆盖率 | **100%** |
| 函数覆盖率 | **100%** |
| 行覆盖率 | **100%** |

## 测试用例清单

### list() — 19 个测试
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

### getById() — 5 个测试
1. 找到项目返回映射结果
2. 未找到抛出"项目不存在"
3. userId/role 参数透传
4. 验证时间戳字段映射正确
5. 无运营者/查看者返回空数组

### create() — 12 个测试
1. 最小字段创建（无 operators/viewers）
2. 带描述创建
3. 有效 operators 创建
4. 无效 operators 抛出"运营者不属于指定公司"
5. 有效 viewers 创建
6. 无效 viewers 抛出"查看者不属于指定公司"
7. 同时带 operators 和 viewers
8. 空字符串 description 变为 null（`|| null` 逻辑）
9. 显式空数组 operator_ids/viewer_ids
10. description 为 undefined 时变为 null
11. operator 无 user 对象时使用 userId 回退
12. 多运营者/查看者列表创建

### update() — 19 个测试
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

### delete() — 5 个测试
1. 项目不存在抛出异常
2. 软删除设置 deletedAt
3. userId/role 参数透传
4. 软删除返回 void
5. 验证 findFirst 使用 deletedAt: null 过滤条件

## 测试策略

- **Mock 方式**: jest.mock(`db.util`)，mock Prisma 的 findMany/count/findFirst/create/update/updateMany 方法
- **验证方式**: 验证 Prisma 调用参数 + 返回值映射（mapProject）
- **边界条件**: 空字符串、空数组、falsy 值 (company_id=0)、不同角色类型（admin/view/sysadmin）、null user 回退
- **异常路径**: 项目不存在、运营者不属于指定公司、查看者不属于指定公司

## 本次更新（新增 9 个测试）

| 新增测试 | 验证点 |
|---------|--------|
| list: 空字符串搜索不添加 OR 过滤 | `if (search)` 对空字符串为 falsy |
| getById: 无运营者/查看者返回空数组 | mapProject 空 operators/viewers 处理 |
| update: 显式设置 description 为 null | null 值正确传递 |
| update: status=true | 状态设为 true |
| create: operator 无 user 对象时 userId 回退 | mapProject 中 `op.user?.id ?? op.userId` |
| list: count 和 findMany 使用相同 where | 分页数据一致性 |
| delete: findFirst 使用 deletedAt: null | 软删除过滤验证 |
| create: 多运营者/查看者列表 | 批量创建正确映射 |
| list: company 为 null 时 company_name 回退 | mapProject 中 `company?.shortName \|\| ''` |
