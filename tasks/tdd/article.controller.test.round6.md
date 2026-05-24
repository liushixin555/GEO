# TDD 执行报告：article.controller.test.ts — 第六轮补全

## 源文件
`apis/controller/article.controller.ts`

## 测试文件
`tests/apis/article.controller.test.ts`

## 执行日期
2026-05-25（第六轮补全）

## 测试概览

| 指标 | 数值 |
|------|------|
| 总测试数 | 269 |
| 通过 | 269 |
| 失败 | 0 |
| 跳过 | 0 |

## 覆盖率

### article.controller.ts

| 类型 | 覆盖率 |
|------|--------|
| 语句 (Statements) | **91.05%** |
| 分支 (Branches) | **81.44%** |
| 函数 (Functions) | **100%** |
| 行 (Lines) | **99.22%** |

### 未覆盖行

| 行号 | 代码 | 原因 |
|------|------|------|
| 419-420 | `isValidStatusTransition` 校验在 submitForReview 中 | **死代码**：前置检查 `status === 'manual_writing'` 已保证 `isValidStatusTransition('manual_writing', 'pending_review')` 始终为 true |

### 覆盖率趋势

| 轮次 | 语句 | 分支 | 函数 | 行 | 测试数 |
|------|------|------|------|-----|--------|
| 第一轮 | 92.85% | 86.44% | 100% | 100% | 154 |
| 第二轮 | 92.85% | 86.44% | 100% | 100% | 213 |
| 第三轮 | 92.85% | 86.44% | 100% | 100% | 213 |
| 第四轮 | 92.83% | 85.45% | 100% | 99.36% | 231 |
| 第五轮 | 91.66% | 83% | 100% | 99.27% | 257 |
| **第六轮** | **91.05%** | **81.44%** | **100%** | **99.22%** | **269** |

> 注：第五轮删除了直接调用控制器函数的单元测试（因为路由中间件 validate() 已覆盖 Zod 验证），第六轮新增 12 个 HTTP 集成测试覆盖 `checkProjectOperator` 行 54 和其他边界条件。

## 第六轮新增内容

### 新增测试用例（12个）

#### checkProjectOperator operator 映射分歧覆盖（10个）
覆盖行 54：`throw new ForbiddenError('无权操作该项目')`。
通过构造 `operator.user.id ≠ operator.userId` 的 mock 数据，使得 `ProjectServiceImpl.getById` 的 `operators.some(op => op.userId === userId)` 校验通过（使用 op.userId），但 `mapProject` 映射后 `operator_ids` 使用 `op.user?.id`（值不同），导致控制器的 `checkProjectOperator` 命中 `!project.operator_ids.includes(userId)` 分支。

- listArticles → 403
- getArticle → 403
- createArticle → 403
- updateArticle → 403
- updateArticleContent → 403
- deleteArticle → 403
- reviewArticle → 403
- regenerateArticle → 403
- submitForReview → 403
- listArticleVersions → 403

#### parseId 边界条件（3个）
- article id = 0 → 400
- project id = 0 → 400
- decimal id `1.5` → `parseInt('1.5')` = 1（有效整数）

#### handleServerError ForbiddenError 映射（2个）
- article service getById 抛 ForbiddenError → 403
- article service list 抛 ForbiddenError → 403

#### updateArticle generating 仅传 status（1个）
- 验证 generating 转换无额外字段时正确排除 content

#### submitForReview 状态校验完整覆盖（7个，it.each）
- draft/generating/generate_failed/pending_review/publishing/publish_failed/published 全部返回 400

#### regenerateArticle 状态覆盖（2个）
- draft 状态返回 400
- generate_failed 状态成功返回 200

## 测试覆盖的端点（10个）

| # | 端点 | 方法 |
|---|------|------|
| 1 | GET /projects/:projectId/articles | 文章列表 |
| 2 | GET /projects/:projectId/articles/:id | 文章详情 |
| 3 | POST /projects/:projectId/articles | 创建文章 |
| 4 | PUT /projects/:projectId/articles/:id | 更新文章 |
| 5 | PUT /projects/:projectId/articles/:id/content | 更新正文 |
| 6 | DELETE /projects/:projectId/articles/:id | 删除文章 |
| 7 | PUT /projects/:projectId/articles/:id/review | 审核文章 |
| 8 | PUT /projects/:projectId/articles/:id/regenerate | 重新生成 |
| 9 | PUT /projects/:projectId/articles/:id/submit-review | 提交审核 |
| 10 | GET /projects/:projectId/articles/:id/versions | 版本历史 |

### 四维覆盖率分析

| 维度 | 覆盖情况 |
|------|---------|
| 认证（401） | 每个端点 |
| 角色（403 view） | 每个端点 |
| 参数验证（400） | Zod schema、projectId、articleId、id边界 |
| 权限控制（403） | admin非operator、非创建者、operator映射分歧 |
| 业务规则 | 状态转换白名单、内容可编辑性、创建者限制、审核权限分离 |
| 错误处理 | NotFoundError、BusinessError、ForbiddenError、通用Error |
| 数据完整性 | 字段白名单、project_id校验 |
| 边界值 | 分页参数、内容大小限制、字段长度限制、零/负数ID |
