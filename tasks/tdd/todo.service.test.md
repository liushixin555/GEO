# TDD 执行报告 — todo.service.impl.ts

## 基本信息

| 项目 | 详情 |
|------|------|
| 源文件 | `apis/service/impl/todo.service.impl.ts` |
| 测试文件 | `tests/apis/todo.service.test.ts` |
| 执行日期 | 2026-05-23 |
| 测试框架 | Jest + ts-jest |
| 测试数 | 51 个 |
| 结果 | **全部通过 (51/51)** |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| Statements | **100%** |
| Branches | **100%** |
| Functions | **100%** |
| Lines | **100%** |

## 测试用例明细

### list() — 10 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | tab=my_open 应按 assigneeId + status=open/draft 过滤 | 验证我的待办标签页过滤条件 |
| 2 | tab=my_closed 应按 assigneeId + status=closed 过滤 | 验证我的已办标签页过滤条件 |
| 3 | tab=all_open 应只按 status 过滤（sysadmin 无 companyId 限制） | 验证系统管理员看全部待办无公司限制 |
| 4 | tab=all_open 且 role!=sysadmin 且有 companyId 应添加 companyId 过滤 | 验证非系统管理员的全局待办有公司限制 |
| 5 | tab=all_closed 且 role!=sysadmin 且 companyId=null 不应添加 companyId 过滤 | 验证无公司ID时不过滤 |
| 6 | 应支持 priority 过滤 | 验证优先级过滤参数 |
| 7 | 应支持 search 模糊搜索 | 验证标题模糊搜索 |
| 8 | 未知的 tab 值应默认使用 my_open 逻辑 | 验证默认标签页行为 |
| 9 | 应正确计算分页偏移 | 验证 page=3, pageSize=5 时 skip=10 |
| 10 | 应返回正确映射的字段 | 验证 mapTodo 字段映射完整性 |

### getById() — 2 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应返回映射后的待办 | 验证正常获取 |
| 2 | 待办不存在应抛出错误 | 验证404错误 |

### create() — 5 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应创建待办并记录日志 | 验证创建数据+日志记录 |
| 2 | 应支持传入 source 和 priority | 验证自定义来源和优先级 |
| 3 | 应支持 due_at 日期 | 验证截止日期 |
| 4 | 无 due_at 不应包含 dueAt 字段 | 验证无截止日期时字段缺失 |
| 5 | 无 project_id 时 projectId 应为 null | 验证可选项目字段 |

### update() — 8 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应更新待办字段并返回映射结果 | 验证基本更新 |
| 2 | 待办不存在应抛出错误 | 验证404错误 |
| 3 | 已关闭的待办不能修改 | 验证closed状态不可编辑 |
| 4 | 非 sysadmin 修改非自己的待办应抛出错误 | 验证权限控制 |
| 5 | sysadmin 可以修改任何人的待办 | 验证系统管理员权限 |
| 6 | 应正确处理 due_at 为 null（清除截止日期） | 验证清除截止日期 |
| 7 | 应正确处理 due_at 为日期字符串 | 验证设置截止日期 |
| 8 | 应正确更新 object_type, object_id, action | 验证多字段更新 |
| 9 | 未传入的字段不应被更新 | 验证部分更新 |

### close() — 5 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应关闭待办并记录日志 | 验证关闭+日志 |
| 2 | 待办不存在应抛出错误 | 验证404错误 |
| 3 | 非 open 状态不能关闭 | 验证只有open可关闭 |
| 4 | 非 sysadmin 关闭非自己的待办应抛出错误 | 验证权限控制 |
| 5 | sysadmin 可以关闭任何人的待办 | 验证系统管理员权限 |

### reopen() — 5 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应重新打开已关闭的待办并记录日志 | 验证重新打开+日志 |
| 2 | 待办不存在应抛出错误 | 验证404错误 |
| 3 | 非 closed 状态不能重新打开 | 验证只有closed可重新打开 |
| 4 | 非 sysadmin 重新打开非自己的待办应抛出错误 | 验证权限控制 |
| 5 | sysadmin 可以重新打开任何人的待办 | 验证系统管理员权限 |

### transfer() — 6 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应转交待办并记录日志（包含目标用户名） | 验证转交+日志包含用户名 |
| 2 | 待办不存在应抛出错误 | 验证404错误 |
| 3 | 非 open 状态不能转交 | 验证只有open可转交 |
| 4 | 非 sysadmin 转交非自己的待办应抛出错误 | 验证权限控制 |
| 5 | 目标用户不存在应抛出错误 | 验证目标用户验证 |
| 6 | sysadmin 可以转交任何人的待办 | 验证系统管理员权限 |

### reject() — 6 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应驳回为草稿（手动来源 → 指派给创建者） | 验证手动来源驳回逻辑 |
| 2 | 应驳回为草稿（系统来源 → 指派给 sysadmin） | 验证系统来源驳回逻辑 |
| 3 | 系统来源无 sysadmin 时应回退到创建者 | 验证sysadmin不存在时的回退 |
| 4 | 待办不存在应抛出错误 | 验证404错误 |
| 5 | 非 open 状态不能驳回 | 验证只有open可驳回 |
| 6 | 非 sysadmin 不能驳回 | 验证只有系统管理员可驳回 |

### getLogs() — 3 个测试

| # | 测试用例 | 说明 |
|---|---------|------|
| 1 | 应返回待办日志列表 | 验证日志列表映射 |
| 2 | 待办不存在应抛出错误 | 验证404错误 |
| 3 | 应按 createdAt 降序排列日志 | 验证排序规则 |

## 覆盖的分支

- `list()`: 4种 tab 分支 (my_open, my_closed, all_open, all_closed, default)
- `list()`: companyId 过滤 (sysadmin / admin+companyId / admin+null)
- `list()`: priority / search 可选参数
- `update()`: 各字段 undefined 检查
- `update()`: status === 'closed' / assigneeId !== userId 分支
- `close()`: status !== 'open' / assigneeId !== userId 分支
- `reopen()`: status !== 'closed' / assigneeId !== userId 分支
- `transfer()`: status !== 'open' / assigneeId !== userId / targetUser null 分支
- `reject()`: status !== 'open' / role !== 'sysadmin' / source manual vs system / sysadmin null 回退分支
- `create()`: due_at 存在与否 / source 和 priority 默认值
