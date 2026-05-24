# TDD 执行报告 — knowledge-base.service.ts 第二轮补全

> 日期：2026-05-25
> 文件：`apis/service/knowledge-base.service.ts`（接口定义）
> 实现：`apis/service/impl/knowledge-base.service.impl.ts`
> 测试：`tests/apis/knowledge-base.service.test.ts`

## 测试概览

| 指标 | 第一轮 | 第二轮（本轮） |
|------|--------|----------------|
| 测试用例数 | 84 | 128（+44） |
| 语句覆盖率 | 100% | 100% |
| 分支覆盖率 | 99.12% | 99.12% |
| 函数覆盖率 | 100% | 100% |
| 行覆盖率 | 100% | 100% |
| 测试通过率 | 100% | 100% |

## 新增测试分类（44 个用例）

### 1. 字段映射额外测试（+3）
- company 存在但 shortName 为空 → company_name 为 null
- creator 存在但 cnName 为空 → creator_name 为 null
- _count 全部为 0 → 所有 count 字段为 0

### 2. 接口契约验证（+7）
- 实现 IKnowledgeBaseService 全部 6 个方法
- 方法参数数量验证（list=7, getById=3, create=3, update=4, delete=3, getAccessibleBaseIds=1）
- 每个方法返回 Promise 类型验证

### 3. 错误类型验证（+8）
- getById → NotFoundError（statusCode=404）
- create 缺少 company_id → BusinessError（statusCode=400）
- create 所有权违规 → ForbiddenError（statusCode=403）
- update 未找到 → NotFoundError（404）
- update 所有权违规 → ForbiddenError（403）
- delete 未找到 → NotFoundError（404）
- delete 所有权违规 → ForbiddenError（403）
- getAccessibleBaseIds 项目不存在 → NotFoundError（404）

### 4. list() 额外边界测试（+6）
- 空字符串搜索不添加 OR 过滤
- admin 角色但 userId 为 undefined 不应用管理员过滤
- 验证 user.findFirst 包含 deletedAt: null 过滤
- 验证 projectOperator.findMany 包含 deletedAt: null 过滤
- page=1, pageSize=1 的分页计算
- 全部过滤参数 + admin 角色组合测试

### 5. getById() 额外边界测试（+3）
- role undefined 但 userId 有值 → 仍执行访问控制
- sysadmin 访问非活跃公司级知识库
- sysadmin 访问项目级知识库跳过 operator 检查

### 6. create() 额外边界测试（+4）
- description 有实际内容时正确传递
- company_id=0（falsy）时抛出 BusinessError
- project_id=0（falsy）时抛出 BusinessError
- description 仅含空格时的处理（truthy 值直接传递）

### 7. update() 额外边界测试（+6）
- description 非空内容更新
- description 空字符串更新为 null
- projectOperator findFirst 包含 deletedAt: null 验证
- user findFirst 包含 deletedAt: null 验证
- scope 改为 project 但不带 company_id
- scope 改为 company 使用现有 company_id

### 8. delete() 额外边界测试（+3）
- sysadmin 删除自己的知识库
- 非 owner 非 sysadmin 删除抛出 ForbiddenError
- view 角色删除抛出 ForbiddenError

### 9. getAccessibleBaseIds() 额外边界测试（+3）
- project.findFirst 包含 deletedAt: null 过滤验证
- 返回单个 base id
- project.companyId=0（falsy）不添加公司 scope

## 未覆盖说明

- **行 169 分支**：`request.project_id ?? null` 的 `?? null` 路径。由于 145-147 行已对 project scope 的 `!request.project_id` 进行验证抛出，此分支为不可达代码（dead code）。无法通过合法输入触发。

## 测试分类汇总

| 测试类别 | 用例数 |
|----------|--------|
| list() 基础 + admin 过滤 | 14 |
| list() 额外边界 | 6 |
| getById() 基础 + 访问控制 | 12 |
| getById() 额外边界 | 3 |
| create() 基础 + 所有权 | 12 |
| create() 额外边界 | 4 |
| update() 基础 + scope 变更 + 所有权 | 21 |
| update() 额外边界 | 6 |
| delete() 基础 | 5 |
| delete() 额外边界 | 3 |
| getAccessibleBaseIds() 基础 | 4 |
| getAccessibleBaseIds() 额外边界 | 3 |
| 字段映射 | 6 |
| 接口契约 | 7 |
| 错误类型 | 8 |
| **合计** | **128** |
