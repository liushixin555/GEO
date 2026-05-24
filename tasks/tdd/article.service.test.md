# TDD 执行报告 — article.service.test.ts

**文件**: `tests/apis/article.service.test.ts`
**源文件**: `apis/service/article.service.ts` + `apis/service/impl/article.service.impl.ts`
**执行时间**: 2026-05-24（第2轮补全）

## 测试结果

| 指标 | 第1轮 | 第2轮 |
|------|-------|-------|
| 测试套件 | 1 passed | 1 passed |
| 测试用例 | 49 passed | **105 passed** |
| 快照 | 0 | 0 |
| 耗时 | ~6s | ~6s |

## 覆盖率

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| article.service.impl.ts | 100% | 100% | 100% | 100% |

## 测试用例清单（105个）

### list（15个）
1. 应返回文章列表和总数
2. 应支持分页参数
3. 应支持搜索过滤
4. 应支持状态过滤
5. 应支持搜索和状态同时过滤
6. admin角色应添加项目操作员过滤
7. 非admin角色不添加项目操作员过滤
8. admin角色但没有userId不添加项目操作员过滤
9. 应返回空列表
10. search为空字符串时不应添加搜索过滤
11. status为空字符串时不应添加状态过滤
12. view角色不应添加项目操作员过滤
13. admin角色同时带搜索、状态和userId时应组合所有过滤
14. 第一页skip应为0
15. page为2 pageSize为5时skip应为5

### getById（3个）
16. 应返回指定ID的文章
17. 文章不存在时应抛出异常
18. 应传递userId和role参数

### create（19个）
19. 应创建文章并返回映射后的对象
20. 未提供title时应默认为空字符串
21. 未提供status时应默认为draft
22. 应支持所有可选字段
23. 空值字段应设为null
24. 有content时应创建版本快照
25. 无content时不应创建版本快照
26. content为空字符串时不应创建版本快照
27. images未提供时应设为Prisma.JsonNull
28. platforms未提供时应设为Prisma.JsonNull
29. skills未提供时应设为Prisma.JsonNull
30. images为空数组时应保留空数组
31. platforms为空数组时应保留空数组
32. skills为空数组时应保留空数组
33. status为generating时应正确设置
34. status为manual_writing时应正确设置
35. llm_model_id为0时应设为null
36. images为null时应设为Prisma.JsonNull
37. content有值时版本快照应记录正确的articleId

### update（25个）
38. 应更新文章并返回映射后的对象
39. 文章不存在时应抛出异常
40. 只更新提供的字段
41. 应支持更新所有可选字段
42. 空字符串字段应设为null
43. images/platforms/skills为falsy值时应设为JsonNull或null
44. 应支持更新scheduled_publish_at
45. 应支持清除scheduled_publish_at（传null）
46. 内容变化时应递增版本号并创建版本快照
47. 内容未变化时不应递增版本号
48. AI生成文章内容更新且标题为空时应提取标题
49. AI生成文章内容无有效行时不应提取标题
50. 手动编写文章内容更新时不应自动提取标题
51. 已有标题的AI文章内容更新时不应覆盖标题
52. 内容更新但userId为空时版本快照createdBy应为null
53. 版本号为非整数时Math.floor应正确计算新版本号
54. 标题提取应正确处理##开头的二级标题
55. 标题提取应正确处理###开头的三级标题
56. 标题提取应正确处理无#标记的普通行
57. 标题提取应跳过空行和纯空格行
58. 内容为null时更新为新内容应触发版本递增
59. 只更新status不触发版本递增
60. 同时更新content和其他字段时应正确处理
61. images为空数组时应保留空数组
62. scheduled_publish_at为空字符串时应设为null

### delete（4个）
63. 应软删除文章（设置deletedAt）
64. 文章不存在时应抛出异常
65. 已软删除的文章再次删除应抛出异常
66. 软删除应设置deletedAt为Date实例

### review（12个）
67. 审核通过应将状态设为publishing
68. AI文章审核不通过应将状态设为draft
69. 手动文章审核不通过应将状态设为manual_writing
70. 文章不存在时应抛出异常
71. 文章状态不是pending_review时应抛出异常
72. writeMode为null时审核不通过应设为draft
73. writeMode为undefined时审核不通过应设为draft
74. generating状态的文件不能审核
75. published状态的文件不能审核
76. publish_failed状态的文件不能审核
77. manual_writing状态的文件不能审核
78. 审核操作应传递userId和role参数

### regenerate（11个）
79. 应将状态设为generating
80. 文章不存在时应抛出异常
81. 文章状态不是pending_review时应抛出异常
82. generate_failed状态应允许重新生成
83. draft状态不能重新生成
84. manual_writing状态不能重新生成
85. generating状态不能重新生成
86. publishing状态不能重新生成
87. publish_failed状态不能重新生成
88. published状态不能重新生成
89. 重新生成应传递userId和role参数

### listVersions（5个）
90. 应返回文章的版本列表（按版本号降序）
91. 应返回空版本列表
92. 版本映射应正确处理null的createdBy
93. 应正确映射版本的所有字段
94. 多个版本应按版本号降序排列

### 字段映射（2个）
95. mapArticle应正确映射所有字段
96. mapArticle应正确处理null字段

### 接口合规性（8个）
97. 应实现list方法
98. 应实现getById方法
99. 应实现create方法
100. 应实现update方法
101. 应实现delete方法
102. 应实现review方法
103. 应实现regenerate方法
104. 应实现listVersions方法

### 状态枚举边界（1个）
105. 所有ArticleStatus值都应被支持

## 第2轮新增测试分类

| 分类 | 新增数 | 补充内容 |
|------|--------|----------|
| list | +6 | 空字符串过滤、view角色、组合过滤、分页边界 |
| create | +12 | JsonNull/空数组/null处理、status枚举、llm_model_id=0 |
| update | +10 | Math.floor版本号、多级标题提取、组合更新、空数组、空字符串 |
| delete | +2 | 已软删除二次删除、Date实例验证 |
| review | +7 | null/undefined writeMode、全状态拒绝审核 |
| regenerate | +8 | generate_failed允许、6种状态拒绝 |
| listVersions | +2 | 全字段映射、多版本排序 |
| 接口合规 | +8 | IArticleService全部方法存在性验证 |
| 状态枚举 | +1 | 8种ArticleStatus遍历 |

## 测试策略

- 使用 Jest mock 模拟 Prisma 数据库操作
- 通过 `jest.mock` 模拟 `getPrisma` 返回可控的 mock 对象
- 每个测试用例 `beforeEach` 清除所有 mock
- 覆盖所有正常流程和异常流程
- 覆盖所有条件分支（包括 falsy 值、null、undefined、空数组、空字符串等边界情况）
- 全状态枚举遍历验证
- 接口合规性验证确保 IArticleService 所有方法均已实现
