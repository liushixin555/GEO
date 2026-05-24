# knowledge-base.service.test.ts - TDD 执行报告

## 测试文件
`tests/apis/knowledge-base.service.test.ts`

## 被测文件
`apis/service/impl/knowledge-base.service.impl.ts`

## 测试结果
- **测试数量**: 84 个测试
- **通过率**: 100% (84/84)
- **执行时间**: ~4.9s

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 100% |
| 分支 (Branches) | 99.12% |
| 函数 (Functions) | 100% |
| 行 (Lines) | 100% |

未覆盖分支: line 169 `request.company_id ?? null` 中 `?? null` 回退分支（防御性代码：scope='project' 且 company_id 为 undefined 时走 null 默认值路径）。

## 测试用例清单

### list() - 17 个测试
1. ✅ 应返回按 id 降序排列的分页列表
2. ✅ 应正确计算第 3 页的 skip 偏移量
3. ✅ 应按搜索词过滤（name 或 description）
4. ✅ 应按 scope 过滤
5. ✅ 应按 status=true 过滤
6. ✅ 应按 status=false 过滤
7. ✅ status=undefined 时不添加 status 过滤
8. ✅ 应组合 search、scope、status 多重过滤
9. ✅ admin 用户不存在时返回空列表
10. ✅ admin 角色 - 仅平台范围（用户无公司无项目）
11. ✅ admin 角色 - 平台 + 公司范围
12. ✅ admin 角色 - 平台 + 项目范围
13. ✅ admin 角色 - 三种范围全部组合
14. ✅ admin 角色过滤与搜索过滤组合
15. ✅ view 角色不应用 admin 过滤
16. ✅ sysadmin 角色不应用 admin 过滤
17. ✅ 应正确映射列表项字段

### getById() - 13 个测试
1. ✅ 应按 id 返回知识库
2. ✅ 知识库不存在时应抛出错误
3. ✅ 应正确映射包括关联关系的所有字段
4. ✅ 非 sysadmin 访问未激活的平台知识库应抛出错误
5. ✅ 非 sysadmin 可访问已激活的平台知识库
6. ✅ 用户属于同一公司时返回公司知识库
7. ✅ 用户属于不同公司时访问公司知识库应抛出错误
8. ✅ 用户不存在时访问公司知识库应抛出错误
9. ✅ 用户是项目操作者时返回项目知识库
10. ✅ 用户不是操作者时访问项目知识库应抛出错误
11. ✅ 项目知识库无 projectId 时应抛出错误
12. ✅ sysadmin 绕过访问控制
13. ✅ userId 为 undefined 时绕过访问控制

### create() - 17 个测试
1. ✅ 创建平台级知识库（清除 company_id 和 project_id）
2. ✅ 创建公司级知识库未提供 company_id 时抛出错误
3. ✅ 创建项目级知识库未提供 project_id 时抛出错误
4. ✅ 创建公司级知识库带 company_id
5. ✅ 创建项目级知识库带 project_id 和可选 company_id
6. ✅ 创建项目级知识库不带 company_id（companyId 默认为 null）
7. ✅ 未提供 description 时设为 null
8. ✅ description 为空字符串时设为 null
9. ✅ admin 创建公司级知识库时公司不匹配抛出 ForbiddenError (SEC-M-01)
10. ✅ admin 创建公司级知识库时用户不存在抛出 ForbiddenError
11. ✅ admin 创建公司级知识库时用户属于同公司则允许
12. ✅ admin 创建项目级知识库时无操作者权限抛出 ForbiddenError
13. ✅ admin 创建项目级知识库时有操作者权限则允许
14. ✅ sysadmin 创建公司级知识库跳过所有权校验
15. ✅ 非 admin 创建公司级知识库跳过所有权校验
16. ✅ admin 创建项目级知识库仅校验项目操作者权限（不校验公司）
17. ✅ admin 更新时同时校验公司和项目所有权

### update() - 27 个测试
1. ✅ 知识库不存在时抛出错误
2. ✅ 非 sysadmin 修改他人知识库时抛出错误
3. ✅ sysadmin 可修改任意知识库
4. ✅ 所有者可修改自己的知识库
5. ✅ 仅更新 name
6. ✅ 更新 description（空字符串设为 null）
7. ✅ 更新 status
8. ✅ 切换到 platform 范围并清除 company_id 和 project_id
9. ✅ 切换到 company 范围带新 company_id
10. ✅ 切换到 company 范围使用已有 company_id
11. ✅ 切换到 company 范围无 company_id 且无已有值时抛出错误
12. ✅ 切换到 project 范围带新 project_id 和 company_id
13. ✅ 切换到 project 范围使用已有 project_id 和 company_id
14. ✅ 切换到 project 范围无 project_id 且无已有值时抛出错误
15. ✅ 不改 scope，仅更新 company_id
16. ✅ 不改 scope，仅更新 project_id
17. ✅ 同时更新多个字段
18. ✅ 查询已存在记录时使用 deletedAt 过滤
19. ✅ admin 更新 company_id 时公司不匹配抛出 ForbiddenError (SEC-M-01)
20. ✅ admin 更新 company_id 时用户不存在抛出 ForbiddenError
21. ✅ admin 更新 company_id 时用户属于同公司则允许
22. ✅ admin 更新 project_id 时无操作者权限抛出 ForbiddenError
23. ✅ admin 更新 project_id 时有操作者权限则允许
24. ✅ sysadmin 更新 company_id 跳过所有权校验
25. ✅ sysadmin 更新 project_id 跳过所有权校验
26. ✅ admin 更新时同时校验公司和项目所有权

### delete() - 5 个测试
1. ✅ 知识库不存在时抛出错误
2. ✅ 非 sysadmin 删除他人知识库时抛出错误
3. ✅ sysadmin 软删除（设置 deletedAt）
4. ✅ 所有者可软删除自己的知识库
5. ✅ 查询已存在记录时使用 deletedAt 过滤

### getAccessibleBaseIds() - 4 个测试
1. ✅ 项目不存在时抛出错误
2. ✅ 无公司的项目返回平台 + 项目范围
3. ✅ 有公司的项目返回平台 + 公司 + 项目范围
4. ✅ 无可访问知识库时返回空数组

### field mapping - 3 个测试
1. ✅ 处理 null 关联和缺失 _count 的边界情况
2. ✅ 使用 company 和 project 的 shortName
3. ✅ 使用 creator 的 cnName

## 本轮新增测试用例（16 个）

覆盖 create() 和 update() 的 admin 所有权校验逻辑（SEC-M-01），将覆盖率从 88.8% / 84.21% 提升至 100% / 99.12%。

| # | 测试用例 | 覆盖目标 |
|---|---------|---------|
| 1 | admin 创建公司级知识库时公司不匹配 | line 151-155: ForbiddenError |
| 2 | admin 创建公司级知识库时用户不存在 | line 153: user null check |
| 3 | admin 创建公司级知识库时用户属于同公司 | line 151-155: pass-through |
| 4 | admin 创建项目级知识库时无操作者权限 | line 157-163: ForbiddenError |
| 5 | admin 创建项目级知识库时有操作者权限 | line 157-163: pass-through |
| 6 | sysadmin 创建公司级知识库跳过所有权校验 | line 150: role !== 'admin' skip |
| 7 | 非 admin 创建公司级知识库跳过所有权校验 | line 150: no role skip |
| 8 | admin 创建项目级知识库仅校验项目操作者 | line 157-163: project-only check |
| 9 | admin 更新 company_id 时公司不匹配 | line 199-201: ForbiddenError |
| 10 | admin 更新 company_id 时用户不存在 | line 200: user null check |
| 11 | admin 更新 company_id 时用户属于同公司 | line 199-201: pass-through |
| 12 | admin 更新 project_id 时无操作者权限 | line 205-209: ForbiddenError |
| 13 | admin 更新 project_id 时有操作者权限 | line 205-209: pass-through |
| 14 | sysadmin 更新 company_id 跳过所有权校验 | line 197: role !== 'admin' skip |
| 15 | sysadmin 更新 project_id 跳过所有权校验 | line 197: role !== 'admin' skip |
| 16 | admin 更新时同时校验公司和项目所有权 | line 198-209: both validations |

## 测试策略

- **Mock 策略**: 使用 `jest.mock` 模拟 `getPrisma`，每个测试独立设置 Prisma 方法的返回值
- **边界覆盖**: 覆盖了所有错误分支（不存在、权限不足、缺少必填字段）
- **角色测试**: sysadmin/admin/view 三种角色权限区分，admin 角色的可见范围过滤
- **数据访问控制**: getById 的平台/公司/项目三级 scope 访问控制全覆盖
- **字段映射**: 测试了 mapKnowledgeBase 函数的所有字段转换逻辑
- **Scope 转换**: 覆盖了 platform/company/project 三种 scope 之间的切换逻辑
