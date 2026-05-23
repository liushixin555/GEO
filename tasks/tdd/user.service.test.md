# TDD 执行报告：user.service.impl.ts

## 测试文件
`tests/apis/user.service.test.ts`

## 源文件
`apis/service/impl/user.service.impl.ts`

## 测试结果
- **测试数量**: 30 个测试
- **通过率**: 100%（30/30）
- **执行时间**: ~6.5s

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 100% |
| 分支 (Branches) | 100% |
| 函数 (Functions) | 100% |
| 行 (Lines) | 100% |

## 测试用例清单

### list() — 9 个测试
| # | 测试用例 | 覆盖分支 |
|---|---------|---------|
| 1 | 应返回分页用户列表 | 基本流程 |
| 2 | 应正确计算分页偏移量（第2页） | skip 计算 |
| 3 | 应支持 search 搜索（username 和 cnName） | search OR 条件 |
| 4 | 应支持 role 过滤 | role 条件 |
| 5 | 应支持 status 过滤 | status 条件 |
| 6 | 应支持 companyId 过滤 | companyId 条件 |
| 7 | 应支持多条件组合过滤 | 所有条件组合 |
| 8 | companyId 为 null 时不添加 companyId 过滤 | companyId falsy 分支 |
| 9 | 应返回空列表 | 空结果 |

### getById() — 2 个测试
| # | 测试用例 | 覆盖分支 |
|---|---------|---------|
| 1 | 应返回指定用户 | 正常流程 |
| 2 | 用户不存在时应抛出错误 | null 检查 |

### create() — 5 个测试
| # | 测试用例 | 覆盖分支 |
|---|---------|---------|
| 1 | 应成功创建用户 | 完整创建流程（含 company_id） |
| 2 | 用户名已存在时应抛出错误 | 重复用户名 |
| 3 | 不传 company_id 时不应包含 companyId 字段 | company_id undefined |
| 4 | company_id 为 null 时不应包含 companyId 字段 | company_id null |
| 5 | 应正确哈希密码 | bcrypt.hash 调用 |

### update() — 11 个测试
| # | 测试用例 | 覆盖分支 |
|---|---------|---------|
| 1 | 应成功更新用户 cn_name | cn_name 字段更新 |
| 2 | 应成功更新用户 role | role 字段更新 |
| 3 | 应成功更新用户 status | status 字段更新 |
| 4 | 应成功更新用户密码 | password + bcrypt.hash |
| 5 | 应同时更新多个字段 | 多字段组合 |
| 6 | 用户不存在时应抛出错误 | null 检查 |
| 7 | 禁止修改系统管理员角色 | sysadmin 角色保护 |
| 8 | sysadmin 修改其他字段不报错 | sysadmin 非角色更新 |
| 9 | role 为 undefined 时不更新 role 字段 | undefined 检查 |
| 10 | 不传 password 时不更新密码 | 无密码更新 |
| 11 | 空字符串 password 不更新密码 | falsy password |

### delete() — 3 个测试
| # | 测试用例 | 覆盖分支 |
|---|---------|---------|
| 1 | 应成功软删除用户 | 正常软删除 |
| 2 | 用户不存在时应抛出错误 | null 检查 |
| 3 | 禁止删除系统管理员 | sysadmin 保护 |

## Mock 策略
- `getPrisma`: mock 返回包含对应 prisma 方法的对象
- `bcryptjs.hash`: mock 返回固定哈希值，避免真实哈希开销
