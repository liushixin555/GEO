# project.service.impl.ts TDD 执行报告

## 源文件
`apis/service/impl/project.service.impl.ts`

## 测试文件
`tests/apis/project.service.test.ts`

## 测试结果

| 指标 | 值 |
|------|-----|
| 测试套件 | 1 passed |
| 测试用例 | 39 passed |
| 语句覆盖率 | 100% |
| 分支覆盖率 | 100% |
| 函数覆盖率 | 100% |
| 行覆盖率 | 100% |

## 测试用例清单

### list() — 12 个测试
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

### getById() — 3 个测试
1. 找到项目返回映射结果
2. 未找到抛出"项目不存在"
3. userId/role 参数透传

### create() — 7 个测试
1. 最小字段创建（无 operators/viewers）
2. 带描述创建
3. 有效 operators 创建
4. 无效 operators 抛出"运营者不属于指定公司"
5. 有效 viewers 创建
6. 无效 viewers 抛出"查看者不属于指定公司"
7. 同时带 operators 和 viewers

### update() — 13 个测试
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

### delete() — 3 个测试
1. 项目不存在抛出异常
2. 软删除设置 deletedAt
3. userId/role 参数透传
