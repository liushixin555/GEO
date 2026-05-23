# TDD 执行报告：article.controller.test.ts

## 源文件
`apis/controller/article.controller.ts` + `apis/service/impl/article.service.impl.ts`

## 测试文件
`tests/apis/article.controller.test.ts`

## 执行日期
2026-05-23

## 测试概览

| 指标 | 数值 |
|------|------|
| 总测试数 | 126 |
| 通过 | 126 |
| 失败 | 0 |
| 跳过 | 0 |

## 覆盖率

### article.controller.ts

| 类型 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 96.89% |
| 分支 (Branches) | 94.44% |
| 函数 (Functions) | 100% |
| 行 (Lines) | **100%** |

### article.service.impl.ts

| 类型 | 覆盖率 |
|------|--------|
| 语句 (Statements) | 95.55% |
| 分支 (Branches) | 93.5% |
| 函数 (Functions) | 100% |
| 行 (Lines) | **100%** |

## 测试覆盖的端点（10个）

### 原有测试（107个）
1. **Auth & Role checks** - 4个测试：401未认证、403 view角色限制
2. **GET /api/projects/:projectId/articles** - 7个测试：列表查询、参数验证、搜索过滤、admin权限、500错误
3. **GET /api/projects/:projectId/articles/:id** - 7个测试：详情查询、参数验证、404、admin权限、500错误
4. **POST /api/projects/:projectId/articles** - 7个测试：创建文章、admin权限、无效状态、多状态创建、500错误
5. **PUT /api/projects/:projectId/articles/:id** - 13个测试：更新文章、权限、状态校验、AI生成提交、scheduled_publish_at
6. **DELETE /api/projects/:projectId/articles/:id** - 14个测试：删除文章、多状态覆盖、权限校验
7. **PUT .../review** - 10个测试：审核通过/拒绝、manual文章拒绝、参数验证、权限
8. **PUT .../content** - 16个测试：正文更新、参数验证、权限、可编辑状态校验
9. **PUT .../regenerate** - 9个测试：重新生成、参数验证、权限、状态校验
10. **PUT .../submit-review** - 10个测试：提交审核、参数验证、权限、状态校验
11. **GET .../versions** - 9个测试：版本历史查询、参数验证、权限

### 本次新增测试（19个）
12. **POST with content** - 1个：创建带content的文章，验证版本快照
13. **PUT with scheduled_publish_at** - 2个：设置/清除定时发布时间
14. **PUT content - AI title extraction** - 3个：AI文章标题提取、手动文章跳过提取、无可用标题内容
15. **PUT review - manual reject** - 1个：手动文章审核拒绝回到manual_writing
16. **Error fallback messages** - 9个：所有endpoint的错误回退消息（err.message为空时的fallback）
17. **PUT empty field defaults** - 2个：空字符串字段转null、全字段更新
18. **PUT content same content** - 1个：相同内容不触发版本号递增

## 未覆盖分支说明

剩余未覆盖分支均为 service 层防御性检查（`if (!existing) throw`），由于 controller 在调用 service 方法前已通过 `getById` 验证文章存在性，这些分支在正常流程中不可达，属于合理忽略。

## 测试分类统计

| 分类 | 数量 |
|------|------|
| 参数验证（400） | 30 |
| 权限不足（403） | 24 |
| 资源不存在（404） | 20 |
| 成功操作（200/201） | 33 |
| 服务器错误（500） | 19 |
