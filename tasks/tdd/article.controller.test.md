# TDD 执行报告：article.controller.test.ts

## 源文件
`apis/controller/article.controller.ts` + `apis/service/impl/article.service.impl.ts` + `apis/entity/article.entity.ts`

## 测试文件
`tests/apis/article.controller.test.ts`

## 执行日期
2026-05-24（第三轮补全）

## 测试概览

| 指标 | 数值 |
|------|------|
| 总测试数 | 213 |
| 通过 | 213 |
| 失败 | 0 |
| 跳过 | 0 |

## 覆盖率

### article.controller.ts

| 类型 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 92.85% |
| 分支 (Branches) | 86.44% |
| 函数 (Functions) | 100% |
| 行 (Lines) | **100%** |

### article.service.impl.ts

| 类型 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 95.55% |
| 分支 (Branches) | 93.5% |
| 函数 (Functions) | 100% |
| 行 (Lines) | **100%** |

### article.schema.ts

| 类型 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 100% |
| 分支 (Branches) | 100% |
| 函数 (Functions) | 100% |
| 行 (Lines) | **100%** |

## 测试覆盖的端点（10个）

### 第一轮测试（154个）
1. **Auth & Role checks** - 4个：401未认证、403 view角色限制
2. **GET /articles** - 7个：列表查询、参数验证、搜索过滤、admin权限、500错误
3. **GET /articles/:id** - 7个：详情查询、参数验证、404、admin权限、500错误
4. **POST /articles** - 7个：创建文章、admin权限、无效状态、多状态创建、500错误
5. **PUT /articles/:id** - 13个：更新文章、权限、状态校验、AI生成提交、scheduled_publish_at
6. **DELETE /articles/:id** - 14个：删除文章、多状态覆盖、权限校验
7. **PUT .../review** - 10个：审核通过/拒绝、manual文章拒绝、参数验证、权限
8. **PUT .../content** - 16个：正文更新、参数验证、权限、可编辑状态校验
9. **PUT .../regenerate** - 9个：重新生成、参数验证、权限、状态校验
10. **PUT .../submit-review** - 10个：提交审核、参数验证、权限、状态校验
11. **GET .../versions** - 9个：版本历史查询、参数验证、权限
12. **Service分支覆盖** - 10个：版本快照、定时发布、AI标题提取、错误回退
13. **错误处理回退** - 9个：各端点无message错误的500回退
14. **空字段默认值** - 2个：空字符串→null、全字段更新
15. **相同内容不升级版本** - 1个
16. **AI标题无提取内容** - 1个
17. **projectService generic error** - 10个：所有10个端点admin下500
18. **非法状态转换** - 3个
19. **Content超过500KB** - 2个
20. **非创建者regenerate** - 2个
21. **有效状态转换** - 4个
22. **分页边界** - 2个
23. **Generating排除content** - 1个
24. **Search参数处理** - 2个

### 第二轮新增测试（27个）
25. **字段白名单验证（create）** - 3个：剥离非法字段、全字段创建、默认状态
26. **字段白名单验证（update）** - 2个：剥离非法字段、全UpdateArticleRequest字段
27. **null可选字段** - 1个：最小化创建
28. **Content更新边界** - 1个：空字符串content
29. **各端点401认证** - 7个：content/regenerate/submit-review/versions/delete/review/getArticle
30. **有效generating转换细节** - 1个：draft→generating时metadata保留但content剥离
31. **Review参数验证** - 3个：字符串approved/数字approved/无效articleId
32. **Submit-review状态检查** - 3个：generating/pending_review/published状态拒绝
33. **Content不可编辑状态** - 3个：pending_review/publishing/manual_writing+非创建者
34. **Regenerate sysadmin** - 1个：sysadmin可重新生成任何文章
35. **Delete补充** - 2个：published文章admin删除拒绝、manual_writing状态sysadmin删除成功

### 本轮新增测试（32个）
36. **Zod验证边界（create）** - 12个：title超500、article_type超50、keywords超500、portrait超2000、images超20项、platforms超10项、content超500000、llm_model_id负数/小数、Zod strict拒绝extra字段、image URL超2000、platform name超100
37. **Zod验证边界（update）** - 4个：title超500、scheduled_publish_at格式错误、content超500000、schedule_type通过Zod但被pickAllowedFields剥离
38. **Zod验证边界（list）** - 1个：无效status枚举值
39. **Sysadmin自审** - 2个：sysadmin审核/拒绝自己的文章（绕过SoD检查）
40. **handleServerError错误映射** - 7个：update/delete/content/review/versions抛出'文章不存在'→404、regenerate抛出'状态不支持'→400、submit-review抛出'状态不支持审核'→400
41. **Content类型验证** - 3个：null/boolean/array→400
42. **Admin projectService异常** - 1个：content端点admin下projectService抛出→500
43. **Delete补充状态** - 2个：generate_failed/draft sysadmin删除

## 未覆盖分支说明

未覆盖的分支行号（24,61,83,100,127,131,162,173,204,287,333-336,392,435,478,525）均为：
- **Line 24**: `isValidStatusTransition` 中 `?? false` — SETTINGS_EDITABLE_STATUSES=['draft'] 保证 `from` 状态必在 STATUS_TRANSITIONS 中，此分支为死代码
- **Line 61**: `checkProjectOperator` 中 `projectService.getById` — sysadmin角色直接return跳过，admin角色测试已通过其他路径覆盖
- **Line 83**: `getAuthUser` 中 `req.user ?? null` — auth middleware 保证 `req.user` 非空，防御性代码
- **Lines 100,127,131,162,173,etc.**: 各端点的 `if (!user)` 防御性空值检查 — auth middleware 在此之前已拦截未认证请求
- 通过 supertest 集成测试无法触发这些防御性分支，所有业务逻辑路径已被完整覆盖，行覆盖率100%

## 踩坑记录

### anti-crawl 中间件封禁IP
- **问题**：`antiCrawlMiddleware` 的 `SUSPICIOUS_THRESHOLD=200`，213个测试全部来自同一IP（127.0.0.1），超过阈值后IP被封禁10分钟，后续测试全部返回403
- **解决**：在测试文件中mock掉anti-crawl中间件 `jest.mock('../../apis/middleware/anti-crawl.middleware', ...)`
- **影响范围**：当测试总数超过200时必现

### mock缺少articleVersion模型
- **问题**：service.update内部会调用`articleVersion.create`（版本快照），如果mock只有`article`没有`articleVersion`，会抛出TypeError而非预期的Error
- **解决**：在需要触发service.update的测试中，补充`articleVersion: { create: jest.fn().mockResolvedValue({}) }`

## Entity 字段覆盖情况

### Article 接口字段
| 字段 | create | update | content | list | getById |
|------|--------|--------|---------|------|---------|
| id | - (auto) | - | - | ✓ | ✓ |
| project_id | ✓ (path) | ✓ (path) | ✓ (path) | ✓ (path) | ✓ (path) |
| title | ✓ | ✓ | ✓ (AI) | ✓ | ✓ |
| article_type | ✓ | ✓ | - | ✓ | ✓ |
| write_mode | ✓ | ✓ | - | - | ✓ |
| keywords | ✓ | ✓ | - | ✓ | ✓ |
| portrait | ✓ | ✓ | - | - | ✓ |
| images | ✓ | ✓ | - | - | ✓ |
| platforms | ✓ | ✓ | - | - | ✓ |
| skills | ✓ | ✓ | - | - | ✓ |
| llm_model_id | ✓ | ✓ | - | - | ✓ |
| content | ✓ | - (stripped) | ✓ | - | ✓ |
| version | - (auto) | - (auto) | - (auto) | - | ✓ |
| status | ✓ | ✓ | - | ✓ | ✓ |
| scheduled_publish_at | - | ✓ | - | - | ✓ |
| created_by | - (auto) | - | - | ✓ | ✓ |
| created_at | - (auto) | - | - | - | ✓ |
| updated_at | - (auto) | - | - | - | ✓ |

### CreateArticleRequest 字段（白名单验证）
| 字段 | 测试覆盖 |
|------|---------|
| title | ✓ (含500字符上限) |
| article_type | ✓ (含50字符上限) |
| write_mode | ✓ |
| keywords | ✓ (含500字符上限) |
| portrait | ✓ (含2000字符上限) |
| images | ✓ (含20项上限、URL 2000字符上限) |
| platforms | ✓ (含10项上限、名称100字符上限) |
| skills | ✓ |
| llm_model_id | ✓ (含负数/小数拒绝) |
| content | ✓ (含500000字符上限) |
| status | ✓ (draft/generating/manual_writing) |

### UpdateArticleRequest 字段（白名单验证）
| 字段 | 测试覆盖 |
|------|---------|
| title | ✓ (含500字符上限) |
| article_type | ✓ |
| write_mode | ✓ |
| keywords | ✓ |
| portrait | ✓ |
| images | ✓ |
| platforms | ✓ |
| skills | ✓ |
| llm_model_id | ✓ |
| content | ✓ (stripped when generating) |
| status | ✓ (whitelist transition) |
| scheduled_publish_at | ✓ (set + clear null + 格式校验) |
| schedule_type | ✓ (Zod通过但pickAllowedFields剥离) |

### ReviewArticleRequest 字段
| 字段 | 测试覆盖 |
|------|---------|
| approved | ✓ (true/false/string/number/missing) |

## 测试分类统计

| 分类 | 数量 |
|------|------|
| 参数验证（400） | 59 |
| 权限不足（403） | 33 |
| 资源不存在（404） | 29 |
| 成功操作（200/201） | 48 |
| 服务器错误（500） | 44 |
