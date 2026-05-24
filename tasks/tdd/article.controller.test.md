# TDD 执行报告：article.controller.test.ts

## 源文件
`apis/controller/article.controller.ts`

## 测试文件
`tests/apis/article.controller.test.ts`

## 执行日期
2026-05-24（第五轮补全）

## 测试概览

| 指标 | 数值 |
|------|------|
| 总测试数 | 257 |
| 通过 | 257 |
| 失败 | 0 |
| 跳过 | 0 |

## 覆盖率

### article.controller.ts

| 类型 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 91.66% |
| 分支 (Branches) | 83% |
| 函数 (Functions) | 100% |
| 行 (Lines) | **99.27%** |

### 未覆盖行

| 行号 | 代码 | 原因 |
|------|------|------|
| 442-443 | `isValidStatusTransition(existing.status, 'pending_review')` 在 submitForReview 中 | **死代码**：前面已校验 `status === 'manual_writing'`，而 `STATUS_TRANSITIONS['manual_writing'] = ['pending_review']` 始终为 true，此分支不可达 |

### 覆盖率趋势

| 轮次 | 语句 | 分支 | 函数 | 行 | 测试数 |
|------|------|------|------|-----|--------|
| 第一轮 | 92.85% | 86.44% | 100% | 100% | 154 |
| 第二轮 | 92.85% | 86.44% | 100% | 100% | 213 |
| 第三轮 | 92.85% | 86.44% | 100% | 100% | 213 |
| 第四轮 | 92.83% | 85.45% | 100% | 99.36% | 231 |
| **第五轮** | **91.66%** | **83%** | **100%** | **99.27%** | **257** |

> 注：第五轮修复了 7 个错误测试用例（错误消息不匹配、skills 字段类型错误），新增 26 个测试覆盖路由中间件拦截的 Zod 验证分支和 submitForReview 空内容检查。覆盖率变化源于直接调用控制器函数的测试路径与 HTTP 集成测试路径在覆盖率计算上的差异。

## 第五轮修复内容

### 修复 7 个失败测试

1. **regenerate 状态检查**（行 1514）：`'文章当前状态不支持重新生成'` → `'当前文章状态不支持重新生成'`（匹配控制器消息）
2. **handleServerError regenerate**（行 3610）：同上错误消息修复
3. **regenerate BusinessError**（行 3995）：同上错误消息修复
4. **createArticle 全字段**（行 2809）：`skills: 5` → `skills: [5]`（schema 要求 array）
5. **updateArticle 全字段**（行 2903）：`skills: 2` → `skills: [2]`
6. **updateArticle 空字段**（行 2198）：`skills: 0` → `skills: []`
7. **updateArticle all fields set**（行 2230）：`skills: 2` → `skills: [2]`

### 新增测试用例（26个）

#### submitForReview 内容为空检查（覆盖行 436-437）- 3个
- content 为 null → 400 "文章内容不能为空"
- content 为空字符串 → 400 "文章内容不能为空"
- content 为纯空白 → 400 "文章内容不能为空"

#### HTTP 层 Zod 验证补充 - 9个
- listArticles：page=0、pageSize=0、page=1.5
- createArticle：extra field、invalid status
- updateArticle：extra field、skills 非 array
- updateArticleContent：extra field
- reviewArticle：extra field

#### 直接调用控制器函数（绕过路由 validate 中间件）- 14个
发现路由配置中 `validate()` 中间件在控制器之前执行 Zod 验证，导致控制器的 Zod 验证分支在 HTTP 测试中不可达。添加直接调用控制器函数的单元测试覆盖这些分支：
- listArticles direct：page=0、pageSize=200、invalid status（3个）
- createArticle direct：extra field、invalid status、title超长（3个）
- updateArticle direct：extra field、skills非array（2个）
- updateArticleContent direct：missing content、empty content、extra field（3个）
- reviewArticle direct：missing approved、string approved、extra field（3个）

## 测试覆盖的端点（10个）

### 端点列表
1. **GET /projects/:projectId/articles** — 文章列表
2. **GET /projects/:projectId/articles/:id** — 文章详情
3. **POST /projects/:projectId/articles** — 创建文章
4. **PUT /projects/:projectId/articles/:id** — 更新文章
5. **PUT /projects/:projectId/articles/:id/content** — 更新正文
6. **DELETE /projects/:projectId/articles/:id** — 删除文章
7. **PUT /projects/:projectId/articles/:id/review** — 审核文章
8. **PUT /projects/:projectId/articles/:id/regenerate** — 重新生成
9. **PUT /projects/:projectId/articles/:id/submit-review** — 提交审核
10. **GET /projects/:projectId/articles/:id/versions** — 版本历史

### 覆盖维度

| 维度 | 覆盖情况 |
|------|---------|
| 认证（401） | 每个端点 |
| 角色（403 view） | 每个端点 |
| 参数验证（400） | Zod schema、projectId、articleId |
| 权限控制（403） | admin非operator、非创建者 |
| 业务规则 | 状态转换、内容可编辑性、创建者限制 |
| 错误处理 | NotFoundError、BusinessError、ForbiddenError、通用Error |
| 数据完整性 | 字段白名单、project_id校验 |
| 边界值 | 分页参数、内容大小限制、字段长度限制 |
