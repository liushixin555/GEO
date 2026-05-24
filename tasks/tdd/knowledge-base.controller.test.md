# TDD 执行报告 — knowledge-base.controller.ts

## 文件信息
- **源文件**: `apis/controller/knowledge-base.controller.ts`
- **测试文件**: `tests/apis/knowledge-base.controller.test.ts`
- **执行时间**: 2026-05-24（第三轮补全 — 100%覆盖率）
- **历史执行**: 2026-05-23（初始48个测试）、2026-05-24（第二轮补全88个测试）

## 测试结果

| 指标 | 结果 |
|------|------|
| 测试用例总数 | 93 |
| 通过 | 93 |
| 失败 | 0 |
| 跳过 | 0 |
| 测试套件 | 1 passed |

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句覆盖率 (Statements) | **100%** |
| 分支覆盖率 (Branches) | **100%** |
| 函数覆盖率 (Functions) | **100%** |
| 行覆盖率 (Lines) | **100%** |

> 第三轮新增 5 个直接函数测试，覆盖了此前因 auth 中间件拦截而不可达的 `!user` 防御性分支（行29, 48, 81, 129, 152），实现全覆盖。

## 测试分布

### Auth & Role Guards (6 个测试)
- 未登录访问返回 401
- view 角色访问列表/详情/创建/更新/删除均返回 403

### GET /api/knowledge-bases — listKnowledgeBases (18 个测试)
- sysadmin 获取知识库列表成功
- 带分页参数查询（page, pageSize）
- pageSize 超过上限被限制为 100
- 带搜索参数查询（search）
- 带 scope 参数过滤
- 带 status=true / status=false 参数过滤
- 不传 status 参数时不做状态过滤
- admin 角色获取列表（带权限过滤）
- admin 角色无对应用户记录返回空列表
- 数据库异常返回 500
- 异常无 message 返回默认错误
- page=0 / 负数 page 被修正为 1
- pageSize=0 被修正为默认值 10 / 负数 pageSize 被修正为 1
- search 超过100字符被截断
- service 抛出 "知识库不存在" 返回 404

### GET /api/knowledge-bases/:id — getKnowledgeBase (10 个测试)
- sysadmin 获取知识库详情成功
- 无效 ID 返回 400
- 知识库不存在返回 404
- admin 获取 platform 知识库详情成功（可见性控制）
- admin 获取不属自己公司的 company 知识库返回 404
- admin 获取不属自己项目的 project 知识库返回 404
- 数据库异常返回 500
- 异常无 message 返回默认错误
- ID=0 / 负数 ID / 小数 ID 的解析行为

### POST /api/knowledge-bases — createKnowledgeBase (20 个测试)
- sysadmin 创建 platform 知识库成功（201）
- admin 创建 company / project 知识库成功
- 名称为空/纯空格/非字符串返回 400
- 名称超过200字符返回 400
- 描述超过2000字符返回 400
- scope 为空/无效值返回 400
- company 知识库未选公司 / project 知识库未选项目返回 400
- 数据库异常返回 500 / 异常无 message 返回默认错误
- name 恰好200字符 / description 恰好2000字符边界值通过
- description=null 不报错
- company_id/project_id 为非整数/负数/0被忽略
- name 有前后空格被 trim
- 额外字段不会注入到数据库（mass assignment 防护）

### PUT /api/knowledge-bases/:id — updateKnowledgeBase (17 个测试)
- sysadmin / admin 更新知识库成功
- 无效 ID / 无效 scope 值返回 400
- 更新时名称为空字符串/非字符串/超过200字符返回 400
- 更新时描述超过2000字符返回 400 / description=null 不报错
- 知识库不存在返回 404
- 非 sysadmin 修改他人知识库返回 403
- 数据库异常返回 500 / 异常无 message 返回默认错误
- 更新 scope 为 platform 时清除 company 和 project
- 更新 scope 为 company/project 缺少对应 ID 返回 400
- name 恰好200字符 / description 恰好2000字符边界值通过
- sysadmin 可修改任意知识库（绕过创建者限制）
- 不传 name 时不做名称验证 / company_id 为非整数被忽略

### DELETE /api/knowledge-bases/:id — deleteKnowledgeBase (9 个测试)
- sysadmin / admin 删除知识库成功
- 无效 ID 返回 400
- 知识库不存在返回 404
- 非 sysadmin 删除他人知识库返回 403
- 数据库异常返回 500 / 异常无 message 返回默认错误
- ID=0 查询DB / sysadmin 可删除任意知识库

### Controller !user 防御性分支 — 直接函数测试 (5 个测试) [第三轮新增]
- listKnowledgeBases: req.user 不存在返回 401
- getKnowledgeBase: req.user 不存在返回 401
- createKnowledgeBase: req.user 不存在返回 401
- updateKnowledgeBase: req.user 不存在返回 401
- deleteKnowledgeBase: req.user 不存在返回 401

## 本轮新增测试 (5 个)

### 覆盖方式
- 通过直接导入 controller 函数（`listKnowledgeBases` 等），构造无 `user` 属性的 mock `req` 对象，直接调用函数
- 绕过 auth 中间件，覆盖此前不可达的防御性 `if (!user)` 分支

### 新增测试清单
1. `listKnowledgeBases` 无 req.user → 401 '未登录'
2. `getKnowledgeBase` 无 req.user → 401 '未登录'
3. `createKnowledgeBase` 无 req.user → 401 '未登录'
4. `updateKnowledgeBase` 无 req.user → 401 '未登录'
5. `deleteKnowledgeBase` 无 req.user → 401 '未登录'

## 结论

测试全部通过（93/93），四项覆盖率指标均达 **100%**。所有 5 个 controller 函数的主路径、边界值、安全检查、错误处理和防御性分支均已全面覆盖。
