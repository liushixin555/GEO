# TDD 执行报告 — todo.service.impl.ts 第2轮

## 基本信息

| 项目 | 详情 |
|------|------|
| 源文件 | `apis/service/impl/todo.service.impl.ts` |
| 测试文件 | `tests/apis/todo.service.test.ts` |
| 执行日期 | 2026-05-25 |
| 测试框架 | Jest + ts-jest |
| 第1轮测试数 | 64 个 |
| 第2轮新增 | +60 个 |
| 总测试数 | **124 个** |
| 结果 | **全部通过 (124/124)** |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | **100%** |
| Branches | **100%** |
| Functions | **100%** |
| Lines | **100%** |

## 第2轮新增测试分类

### 错误类型验证 — 9 个

验证所有抛出的错误均为 Error 实例，且 statusCode 正确：
- getById: NotFoundError(404) + ForbiddenError(403)
- update: NotFoundError(404) + BusinessError(400) × 2
- close: BusinessError(400)
- reject: ForbiddenError(403)
- transfer: BusinessError(400)
- getLogs: ForbiddenError(403)
- getAssigneeCandidates: NotFoundError(404)

### 数据一致性 — 6 个

- list 的 count/findMany where 条件同步（单场景 + 5种tab遍历）
- getById/list 的 include 结构验证（company/project/assignee/createdBy）
- list 的 orderBy 验证（priority asc + createdAt desc）
- list 的 where 必含 deletedAt: null

### 字符串边界 — 8 个

- search 空字符串不添加 title 过滤
- search 纯空格作为搜索条件
- search 特殊字符（XSS 向量）原样传递
- search emoji 原样传递
- search 超长字符串（10000字符）原样传递
- create title 空字符串
- create title 前后空格原样保存
- create title 换行符和制表符

### 数值边界 — 4 个

- list page=0 负偏移
- list page 极大值
- getById id=0
- getById id=2147483647（INT32 MAX）

### 综合映射 — 6 个

- mapTodo project=null 场景
- mapTodo company.shortName 缺失（回退空字符串）
- mapTodo dueAt 日期 toISOString
- mapTodoLog 全字段映射（含 objectType/objectId/remark）
- mapTodoLog operator.cnName 缺失（回退空字符串）
- getAssigneeCandidates cn_name 下划线命名

### 实例独立性与接口一致性 — 2 个

- 不同 TodoServiceImpl 实例共享 Prisma
- ITodoService 接口 11 个方法完整性

### list where 条件逐字段验证 — 3 个

- tab=all_closed + sysadmin 无 companyId
- tab=all_open + sysadmin + companyId 非 null 不添加 companyId
- priority 空字符串不添加 priority 过滤

### create 默认值验证 — 5 个

- source 默认 manual
- priority 默认 P2
- status 始终 open
- object_id 未传时 null
- create include 关联验证

### draft 状态操作验证 — 5 个

- close 不应关闭 draft
- reopen 不应打开 draft
- transfer 不应转交 draft
- reject 不应驳回 draft
- update 应允许修改 draft

### update 全字段覆盖 — 1 个

- 6 个可更新字段全部写入

### getById companyId 边界 — 2 个

- companyId=null 访问任何待办 ForbiddenError
- companyId 匹配成功

### getObjectOptions 排序和字段选择 — 4 个

- article 按 id 降序
- article 只选 id + title
- keyword 按 id 降序
- keyword 只选 id + keyword

### getAssigneeCandidates 用户查询条件 — 4 个

- status=true + deletedAt=null
- 按 id 升序
- 正确字段选择（id/username/cnName/role）
- 无操作员时只返回 sysadmin
