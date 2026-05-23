# TDD 执行报告 — knowledge-base.controller.ts

## 文件信息
- **源文件**: `apis/controller/knowledge-base.controller.ts`
- **测试文件**: `tests/apis/knowledge-base.controller.test.ts`
- **执行时间**: 2026-05-23

## 测试结果

| 指标 | 结果 |
|------|------|
| 测试用例总数 | 48 |
| 通过 | 48 |
| 失败 | 0 |
| 跳过 | 0 |
| 测试套件 | 1 passed |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句覆盖率 (Statements) | 100% |
| 分支覆盖率 (Branches) | 100% |
| 函数覆盖率 (Functions) | 100% |
| 行覆盖率 (Lines) | 100% |

## 测试分布

### Auth & Role Guards (6 个测试)
- 未登录访问返回 401
- view 角色访问列表/详情/创建/更新/删除均返回 403

### GET /api/knowledge-bases — listKnowledgeBases (11 个测试)
- sysadmin 获取知识库列表成功
- 带分页参数查询（page, pageSize）
- 带搜索参数查询（search）
- 带 scope 参数过滤
- 带 status=true / status=false 参数过滤
- 不传 status 参数时不做状态过滤
- admin 角色获取列表（带权限过滤）
- admin 角色无对应用户记录返回空列表
- 数据库异常返回 500
- 异常无 message 返回默认错误

### GET /api/knowledge-bases/:id — getKnowledgeBase (5 个测试)
- sysadmin 获取知识库详情成功
- 无效 ID 返回 400
- 知识库不存在返回 404
- 数据库异常返回 500
- 异常无 message 返回默认错误

### POST /api/knowledge-bases — createKnowledgeBase (9 个测试)
- sysadmin 创建 platform 知识库成功（201）
- admin 创建 company 知识库成功
- admin 创建 project 知识库成功
- 名称为空返回 400
- scope 为空返回 400
- company 知识库未选公司返回 400
- project 知识库未选项目返回 400
- 数据库异常返回 500
- 异常无 message 返回默认错误

### PUT /api/knowledge-bases/:id — updateKnowledgeBase (10 个测试)
- sysadmin 更新知识库成功
- admin 更新自己创建的知识库成功
- 无效 ID 返回 400
- 知识库不存在返回 404
- 非 sysadmin 修改他人知识库返回 403
- 数据库异常返回 500
- 异常无 message 返回默认错误
- 更新 scope 为 platform 时清除 company 和 project
- 更新 scope 为 company 且无 company_id 返回 500（controller 未映射为 400）
- 更新 scope 为 project 且无 project_id 返回 500（controller 未映射为 400）

### DELETE /api/knowledge-bases/:id — deleteKnowledgeBase (7 个测试)
- sysadmin 删除知识库成功
- admin 删除自己创建的知识库成功
- 无效 ID 返回 400
- 知识库不存在返回 404
- 非 sysadmin 删除他人知识库返回 403
- 数据库异常返回 500
- 异常无 message 返回默认错误

## 发现的问题

1. **updateKnowledgeBase 的 scope 校验错误未映射为 400**：当 scope 更新为 company/project 但缺少对应的 company_id/project_id 时，service 层抛出的校验错误（'公司公共知识库必须选择公司' / '项目私有知识库必须选择项目'）在 controller 的 catch 块中没有对应的 400 映射，最终走 500 兜底。这与 createKnowledgeBase 的处理方式不一致（create 有明确的 400 映射）。

## 结论

测试全部通过，覆盖率达到 100%。5 个 controller 函数（list、getById、create、update、delete）的所有分支和错误路径均已覆盖。
