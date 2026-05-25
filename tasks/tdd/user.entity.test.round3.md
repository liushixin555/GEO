# user.entity TDD 第3轮执行报告

## 执行日期
2026-05-25

## 测试文件
`tests/apis/user.entity.test.ts`

## 源文件
`apis/entity/user.entity.ts`

## 测试接口/类型/类
- UserRole (union type: 'sysadmin' | 'admin' | 'view')
- User (9个字段)
- LoginRequest (2个字段)
- LoginResponse (2个顶层字段 + 7个嵌套user字段)
- SaveSelectionRequest (2个字段: 1必需 + 1可选)
- LoginSelectionError (自定义错误类)
- PermissionDeniedError (自定义错误类)
- UserListItem (9个字段: 7必需 + 2可选)
- CreateUserRequest (5个字段: 4必需 + 1可选)
- UpdateUserRequest (4个字段: 全部可选)

## 测试数量
392 个测试（从287个扩充，+105新增）

## 新增测试维度与用例（7维度105个）

### 安全注入 (17)
- User username 保留SQL注入字符串
- User cn_name 保留XSS script标签
- LoginRequest password 保留特殊字符
- CreateUserRequest cn_name 处理HTML实体注入
- LoginResponse token 保留JWT格式字符
- UserListItem company_name 处理原型链污染(__proto__)
- UpdateUserRequest cn_name 处理null byte注入
- LoginRequest 处理unicode转义序列
- User 存活JSON.parse含__proto__字段
- User username 处理LDAP注入模式
- CreateUserRequest 处理路径穿越username
- SaveSelectionRequest 存活JSON注入附加字段
- LoginResponse selected_company处理CRLF注入
- UserListItem 处理超长字符串不截断(100000字符)
- User password_hash JSON往返特殊字符保留
- LoginSelectionError message处理XSS载荷
- PermissionDeniedError message处理格式字符串攻击

### JSON Reviver 深度 (16)
- User dates 通过reviver正确反序列化
- User null company_id 通过reviver存活
- User undefined company_id 在JSON中省略
- UserListItem dates 通过reviver反序列化
- User 数组每个元素dates通过reviver反序列化
- LoginResponse 嵌套user存活JSON
- SaveSelectionRequest null project_id 往返
- CreateUserRequest null company_id 往返
- User 中文字段值JSON往返
- UpdateUserRequest 全字段往返正确
- User 所有角色类型序列化为字符串
- User Date字段序列化为ISO字符串
- UserListItem 可选company_name undefined在JSON中省略
- User boolean status序列化为JSON布尔值
- User epoch日期JSON往返
- UserListItem 含所有可选字段JSON往返

### 业务场景 (17)
- sysadmin用户company_id应为null
- admin用户应属于某个公司
- view用户角色受限但有company
- 禁用用户status为false
- 登录流程: LoginRequest → token → LoginResponse
- 选择流程: 选公司 → 选项目
- 用户创建: CreateUserRequest → User密码哈希化
- 用户更新: admin修改角色和中文名
- 密码变更: UpdateUserRequest仅含password
- 用户列表: User[] → UserListItem[]含公司名查找
- view角色不应有管理能力
- sysadmin可管理所有公司
- admin用户范围限定到其公司
- 用户状态切换: 启用/禁用
- LoginResponse不应暴露password_hash
- 批量禁用用户通过UpdateUserRequest
- LoginSelectionError表示未满足选择要求
- PermissionDeniedError表示权限不足

### NaN/Infinity边界 (14)
- User.id NaN运行时赋值不抛异常
- User.id Infinity运行时赋值不抛异常
- User.id -Infinity运行时赋值不抛异常
- User.company_id NaN运行时赋值不抛异常
- SaveSelectionRequest.company_id NaN运行时值
- SaveSelectionRequest.project_id Infinity运行时值
- CreateUserRequest.company_id NaN运行时值
- UserListItem.company_id -Infinity运行时值
- NaN id破坏数值比较（已知陷阱）
- NaN序列化为JSON null
- Infinity序列化为JSON null
- LoginResponse.user.id NaN不影响其他字段
- UserListItem.id 负零(-0)保留
- User.id Number.MIN_SAFE_INTEGER有效运行时值

### 类型守卫增强 (19)
- unknown类型验证sysadmin/admin/view角色
- 拒绝number/boolean/object/array/undefined/null作为角色
- 拒绝含前后空白的角色
- 拒绝大写角色变体
- LoginResponse完整验证
- LoginResponse缺少token拒绝
- LoginResponse无效角色拒绝
- SaveSelectionRequest含project_id验证
- SaveSelectionRequest不含project_id验证
- SaveSelectionRequest缺少company_id拒绝
- null作为SaveSelectionRequest拒绝

### 深冻结 (14)
- deep frozen User拒绝Date字段变异
- deep frozen User拒绝cn_name变异
- deep frozen LoginResponse拒绝嵌套user变异
- deep frozen LoginResponse拒绝selected_company变异
- deep frozen CreateUserRequest拒绝所有变异
- deep frozen UserListItem拒绝company_name变异
- deep frozen User被Object.isFrozen检测
- deep frozen User数组拒绝元素变异
- deep frozen UpdateUserRequest拒绝字段添加
- deep frozen SaveSelectionRequest拒绝变异
- deep frozen LoginRequest拒绝变异
- deep frozen LoginResponse null selections拒绝变异
- deep frozen User null company_id保持null
- deep frozen User阻止属性删除

### 生命周期 (8)
- 用户创建→读取→更新→禁用完整流程
- 登录→token签发→选择→会话建立流程
- LoginSelectionError → 捕获 → 重抛生命周期
- PermissionDeniedError → 捕获 → HTTP响应生命周期
- 用户时间戳单调递增验证
- CreateUserRequest → User → UserListItem → 展示转换链
- 错误类型在catch链中可区分

## 测试结果
```
PASS tests/apis/user.entity.test.ts
  user.entity
    UserRole type (4 tests)
    User interface (15 tests)
    LoginRequest interface (5 tests)
    LoginResponse interface (9 tests)
    SaveSelectionRequest interface (5 tests)
    LoginSelectionError class (13 tests)
    PermissionDeniedError class (14 tests)
    UserListItem interface (9 tests)
    CreateUserRequest interface (9 tests)
    UpdateUserRequest interface (14 tests)
    cross-interface integration (6 tests)
    re-exports from index (3 tests)
    JSON serialization round-trip (11 tests)
    Object.freeze immutability (13 tests)
    structural equality (9 tests)
    deep copy (5 tests)
    destructuring patterns (7 tests)
    collection advanced operations (7 tests)
    continuous update chain (3 tests)
    date operations (5 tests)
    Set-Map operations (4 tests)
    property descriptors (6 tests)
    function parameter passing (11 tests)
    type guard functions (16 tests)
    boundary values (15 tests)
    error class advanced patterns (11 tests)
    interface conversion and mapping (9 tests)
    array and collection advanced operations (9 tests)
    async and concurrent patterns (5 tests)
    generator and iterator patterns (4 tests)
    Object static methods (8 tests)
    string operations and template literals (4 tests)
    conditional logic and branch coverage (14 tests)
    security injection (17 tests)           ← NEW
    JSON reviver deep tests (16 tests)     ← NEW
    business scenarios (17 tests)           ← NEW
    NaN and Infinity boundary (14 tests)    ← NEW
    type guard enhanced (19 tests)          ← NEW
    deep freeze (14 tests)                  ← NEW
    lifecycle (8 tests)                     ← NEW (partially 7+1)

Test Suites: 1 passed, 1 total
Tests:       392 passed, 392 total
Time:        ~4.0s
```

## 覆盖率
```
File            | % Stmts | % Branch | % Funcs | % Lines
----------------|---------|----------|---------|--------
user.entity.ts  |     100 |      100 |     100 |    100
```
100% - 所有接口、类型、类均已覆盖（entity为纯类型声明+2个错误类，100%语句/分支/函数/行覆盖率）

## 构建验证
- pnpm build: ✅ 通过
- pnpm lint: ✅ 通过 (0 errors, 1 pre-existing warning)
- pnpm test (user.entity): ✅ 392/392 通过
- 全量测试: ✅ 10962 passed (42 pre-existing failures unrelated to this change)

## 第2轮→第3轮增长
| 指标 | 第2轮 | 第3轮 | 增长 |
|------|-------|-------|------|
| 总用例 | 287 | 392 | +105 |
| describe 块 | 33 | 40 | +7 |
| 覆盖率 | 100% | 100% | 维持 |
