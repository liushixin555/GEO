# TDD 执行报告 — article.service.test.ts

**文件**: `tests/apis/article.service.test.ts`
**源文件**: `apis/service/article.service.ts` + `apis/service/impl/article.service.impl.ts`
**执行时间**: 2026-05-24

## 测试结果

| 指标 | 值 |
|------|-----|
| 测试套件 | 1 passed |
| 测试用例 | 49 passed |
| 快照 | 0 |
| 耗时 | ~6s |

## 覆盖率

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| article.service.impl.ts | 100% | 100% | 100% | 100% |

## 测试用例清单

### list（9个）
1. 应返回文章列表和总数
2. 应支持分页参数
3. 应支持搜索过滤
4. 应支持状态过滤
5. 应支持搜索和状态同时过滤
6. admin角色应添加项目操作员过滤
7. 非admin角色不添加项目操作员过滤
8. admin角色但没有userId不添加项目操作员过滤
9. 应返回空列表

### getById（3个）
10. 应返回指定ID的文章
11. 文章不存在时应抛出异常
12. 应传递userId和role参数

### create（7个）
13. 应创建文章并返回映射后的对象
14. 未提供title时应默认为空字符串
15. 未提供status时应默认为draft
16. 应支持所有可选字段
17. 空值字段应设为null
18. 有content时应创建版本快照
19. 无content时不应创建版本快照

### update（15个）
20. 应更新文章并返回映射后的对象
21. 文章不存在时应抛出异常
22. 只更新提供的字段
23. 应支持更新所有可选字段
24. 空字符串字段应设为null
25. images/platforms/skills为falsy值时应设为JsonNull或null
26. 应支持更新scheduled_publish_at
27. 应支持清除scheduled_publish_at（传null）
28. 内容变化时应递增版本号并创建版本快照
29. 内容未变化时不应递增版本号
30. AI生成文章内容更新且标题为空时应提取标题
31. AI生成文章内容无有效行时不应提取标题
32. 手动编写文章内容更新时不应自动提取标题
33. 已有标题的AI文章内容更新时不应覆盖标题
34. 内容更新但userId为空时版本快照createdBy应为null

### delete（2个）
35. 应软删除文章（设置deletedAt）
36. 文章不存在时应抛出异常

### review（5个）
37. 审核通过应将状态设为publishing
38. AI文章审核不通过应将状态设为draft
39. 手动文章审核不通过应将状态设为manual_writing
40. 文章不存在时应抛出异常
41. 文章状态不是pending_review时应抛出异常

### regenerate（3个）
42. 应将状态设为generating
43. 文章不存在时应抛出异常
44. 文章状态不是pending_review时应抛出异常

### listVersions（3个）
45. 应返回文章的版本列表（按版本号降序）
46. 应返回空版本列表
47. 版本映射应正确处理null的createdBy

### 字段映射（2个）
48. mapArticle应正确映射所有字段
49. mapArticle应正确处理null字段

## 测试策略

- 使用 Jest mock 模拟 Prisma 数据库操作
- 通过 `jest.mock` 模拟 `getPrisma` 返回可控的 mock 对象
- 每个测试用例 `beforeEach` 清除所有 mock
- 覆盖所有正常流程和异常流程
- 覆盖所有条件分支（包括 falsy 值、null、undefined 等边界情况）
