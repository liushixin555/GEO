# TDD 执行报告 — user.service.impl.ts 第2轮

## 基本信息

| 项目 | 详情 |
|------|------|
| 源文件 | `apis/service/impl/user.service.impl.ts` |
| 测试文件 | `tests/apis/user.service.test.ts` |
| 执行日期 | 2026-05-25 |
| 测试框架 | Jest + ts-jest |
| 第1轮测试数 | 44 个 |
| 第2轮新增 | +55 个 |
| 总测试数 | **99 个** |
| 结果 | **全部通过 (99/99)** |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | **100%** |
| Branches | **100%** |
| Functions | **100%** |
| Lines | **100%** |

## 第2轮新增测试分类

### 错误类型验证 — 7 个

验证所有抛出的错误均为 Error 实例，且 statusCode 正确：
- getById: NotFoundError(404) 实例 + 消息格式
- update: NotFoundError(404) + ForbiddenError(403) 实例
- delete: NotFoundError(404) + ForbiddenError(403) 实例
- create: ConflictError(409) 实例 + 消息格式

### 数据一致性 — 6 个

- list 的 count/findMany where 条件同步
- list 的 orderBy: { id: 'asc' } 验证
- list 的 Promise.all 并行执行验证
- list 无 options 时 where 为空对象
- getById findFirst 查询参数验证
- create findUnique 查重参数验证

### 字符串边界 — 8 个

- search 纯空格作为搜索条件
- search 特殊字符（XSS 向量）原样传递
- search emoji 原样传递
- search 超长字符串（10000字符）原样传递
- search SQL 注入字符串原样传递
- create username 前后空格原样保存
- create cn_name 换行符和制表符原样保存
- update cn_name emoji 原样保存

### 数值边界 — 4 个

- list page=0 负偏移量
- list page 极大值 skip 计算
- getById id=0 传递给 findFirst
- getById id=INT32_MAX (2147483647) 传递给 findFirst

### 综合映射验证 — 6 个

- mapUser company 有 shortName 正确映射
- mapUser company.shortName 为空字符串时 company_name 为空
- mapUser created_at/updated_at 保持 Date 类型
- list 多用户映射顺序一致
- create mapUser 返回所有 snake_case 字段
- delete deletedAt 时间戳验证

### 实例独立性与接口一致性 — 7 个

- 不同 UserServiceImpl 实例共享 Prisma
- IUserService 接口 5 个方法完整性
- list 方法参数数量 (3)
- getById 方法参数数量 (1)
- create 方法参数数量 (1)
- update 方法参数数量 (2)
- delete 方法参数数量 (1)

### list where 逐字段验证 — 4 个

- role 为空字符串不添加 role 过滤
- status 为 undefined 不添加 status 过滤
- status 为 true 添加 status: true
- companyId 为 null 不添加 companyId 过滤

### create 默认值与完整数据验证 — 3 个

- 完整数据传递所有字段给 prisma
- 不同角色（admin/view/sysadmin）均可创建
- bcrypt hash 失败时应抛出错误

### update 全字段覆盖 — 6 个

- 同时更新 cn_name + role + status + password 四个字段
- sysadmin 角色不可降级到 admin
- sysadmin 角色不可降级到 view
- 非 sysadmin 角色可以修改 role
- cn_name 为 undefined 时不更新 cn_name
- status 为 undefined 时不更新 status

### delete 深度验证 — 4 个

- delete 不应返回值
- delete 应先查询用户是否存在再删除（执行顺序）
- delete 用户不存在时不应调用 update
- delete sysadmin 存在时不应调用 update

## 测试分布总览（99 用例）

| 方法/分组 | 用例数 |
|-----------|--------|
| list() | 9 |
| getById() | 2 |
| create() | 5 |
| update() | 10 |
| delete() | 6 |
| 边界场景 | 13 |
| 错误类型验证 | 7 |
| 数据一致性 | 6 |
| 字符串边界 | 8 |
| 数值边界 | 4 |
| 综合映射验证 | 6 |
| 实例独立性与接口一致性 | 7 |
| list where 逐字段验证 | 4 |
| create 默认值与完整数据验证 | 3 |
| update 全字段覆盖 | 6 |
| delete 深度验证 | 4 |

## 关键测试策略

1. **错误实例验证**：所有错误（NotFoundError/ForbiddenError/ConflictError）均为 Error 子类实例，statusCode 正确
2. **数据一致性**：验证 count/findMany 使用相同 where 条件，防止分页总数与列表不匹配
3. **字符串边界**：覆盖 XSS、SQL 注入、emoji、超长字符串等安全场景，验证原样传递
4. **数值边界**：page=0、极大值、id=0、INT32_MAX 等极端输入
5. **映射完整性**：验证 mapUser 的所有字段（snake_case 命名、Date 类型、null 处理）
6. **接口合规性**：验证方法存在性、参数数量、实例独立性
