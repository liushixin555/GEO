# project.service.impl.ts TDD 第3轮执行报告

## 源文件
`apis/service/impl/project.service.impl.ts`

## 测试文件
`tests/apis/project.service.test.ts`

## 接口文件
`apis/service/project.service.ts`

## 测试结果

| 指标 | 第1轮 | 第2轮 | 第3轮 |
|------|-------|-------|-------|
| 测试用例 | 72 passed | **103 passed** (+31) | **139 passed** (+36) |
| 语句覆盖率 | 100% | 100% | **100%** |
| 分支覆盖率 | 100% | 100% | **100%** |
| 函数覆盖率 | 100% | 100% | **100%** |
| 行覆盖率 | 100% | 100% | **100%** |

## 第3轮新增 36 个用例分类

### 接口契约合规性 — 10 个测试
1. service 实例暴露 5 个公共方法（list/getById/create/update/delete）
2. list 返回值结构 { list: Project[], total: number }
3. list 结果项包含全部 14 个 Project 字段
4. getById 返回值包含全部 14 个 Project 字段
5. create 返回值包含全部 14 个 Project 字段
6. update 返回值包含全部 14 个 Project 字段
7. delete 返回 void (undefined)
8. getById 返回字段类型验证（id:number, status:boolean, arrays, Dates）
9. list 结果中 operator_ids/viewer_ids 始终为数组（含空数组）
10. description 字段允许 null 值

### Prisma 异常传播 — 6 个测试
1. list: findMany 拒绝时传播原始错误
2. list: count 拒绝时传播原始错误
3. getById: findFirst 拒绝时传播原始错误
4. create: user.findMany 拒绝时传播原始错误
5. update: project.update 拒绝时传播原始错误
6. delete: project.update 拒绝时传播原始错误

### 数据完整性边界 — 8 个测试
1. create: 重复 operator_ids 导致验证失败（长度不匹配）
2. update: 重复 operator_ids 导致验证失败（长度不匹配）
3. create: 同一 ID 同时出现在 operator_ids 和 viewer_ids 中（不同角色）
4. list: page=0 时 skip 为负数（(0-1)*pageSize）
5. list: pageSize=1 返回单条记录
6. list: 超大页码返回空列表但 total 仍正确
7. update: 仅更新 status 时 data 对象只含 status
8. update: 仅更新 description 时 data 对象只含 description

### 错误继承层次 — 4 个测试
1. NotFoundError → AppError → Error 原型链 + name 属性验证
2. BusinessError → AppError → Error 原型链 + name 属性验证
3. ForbiddenError → AppError → Error 原型链 + name 属性验证
4. 所有 AppError 子类通过 Object.setPrototypeOf 保持原型链

### update 部分更新隔离 — 4 个测试
1. 同时设置所有可更新字段时 data 完整映射（无 operators/viewers）
2. operator 软删除仅针对指定 projectId + deletedAt:null
3. viewer 软删除仅针对指定 projectId + deletedAt:null
4. 仅传 company_id（与已有相同）时 data 为空对象

### 角色权限一致性 — 4 个测试
1. getById: view 角色跳过 operator 检查（仅 admin 检查）
2. update: view 角色跳过 operator 检查
3. delete: view 角色跳过 operator 检查
4. create: 非 admin 角色使用 request.company_id 而非 auth companyId

## 测试策略演进

| 轮次 | 重点 | 验证层次 |
|------|------|----------|
| 第1轮 | 基础 CRUD + 分页 + 过滤 + 权限 | 功能正确性 |
| 第2轮 | 错误类型 + Admin 边界值 + 安全性 + mapProject | 异常路径 + 安全边界 |
| 第3轮 | 接口契约 + 异常传播 + 数据完整性 + 原型链 + 隔离性 | 契约合规 + 防御性 |

## 累计测试用例总览（139 个）

| 方法 | 第1轮 | 第2轮 | 第3轮 | 合计 |
|------|-------|-------|-------|------|
| list() | 12 | 9 | 6 | **27** |
| getById() | 6 | 6 | 4 | **16** |
| create() | 15 | 4 | 4 | **23** |
| update() | 17 | 14 | 6 | **37** |
| delete() | 4 | 9 | 4 | **17** |
| Edge/mapProject | 18 | 4 | 0 | **22** |
| 接口契约 | 0 | 0 | 10 | **10** |
| 错误继承 | 0 | 0 | 4 | **4** |
| Prisma异常 | 0 | 0 | 6 | **6** |
