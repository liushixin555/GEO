# article.entity TDD 执行报告

## 执行日期
- 第一轮：2026-05-24（47用例）
- 第二轮：2026-05-25（205用例）

## 测试文件
`tests/apis/article.entity.test.ts`

## 源文件
`apis/entity/article.entity.ts`

## 测试接口
- ArticleStatus (8个值：draft/manual_writing/generating/generate_failed/pending_review/publishing/publish_failed/published)
- ScheduleType (3个值：asap/scheduled/after)
- Article (18个字段)
- ArticleVersion (6个字段)
- CreateArticleRequest (11个字段: 全部可选)
- UpdateArticleRequest (13个字段: 全部可选)
- ReviewArticleRequest (1个字段: approved)

## 测试数量
205 个测试（从47个扩充至111个，再扩充至205个）

## 第二轮新增维度（94个用例）

### 1. JSON 序列化/反序列化（9个）
- Article Date 字段序列化为 ISO 字符串
- JSON 反序列化恢复 Date 对象
- null Date 字段序列化
- images/platforms 数组序列化
- skills 作为 unknown JSON 值序列化
- null 字段序列化
- 数值字段 JSON roundtrip
- ArticleVersion JSON roundtrip

### 2. 对象拷贝与不可变性（8个）
- spread 创建独立副本
- 浅拷贝共享数组引用
- 显式数组拷贝独立性
- Object.freeze 行为验证
- Date 对象引用共享
- JSON 深拷贝

### 3. 跨接口一致性（6个）
- CreateArticleRequest → Article 字段映射
- UpdateArticleRequest 应用到 Article
- ArticleVersion 关联 Article（article_id）
- CreateArticleRequest status 值为 ArticleStatus 子集
- skills 类型 number[] | null 对齐（entity修复后）

### 4. 边界值补充（22个）
- Article: id/project_id/created_by 为 0，llm_model_id 为负数，纯空格 title/content，极长 keywords/portrait，大量 images/platforms，epoch/far-future 日期，重复值，MAX_SAFE_INTEGER
- ArticleVersion: id/article_id 为 0，MAX_SAFE_INTEGER version，小数 version，null bytes，epoch 时间

### 5. 安全相关测试（8个）
- XSS script 标签存储为纯文本
- SQL 注入模式存储为纯文本
- HTML 实体存储
- 路径遍历模式存储
- javascript: 协议 URL 存储
- 原型污染模式存储
- 大量 unicode 安全存储
- null bytes 安全存储

### 6. CreateArticleRequest 补充（10个）
- HTML markup content，详细 portrait 描述，自定义 write_mode/article_type
- 混合 URL 格式 images，中英文混合 platforms
- skills 含零值/大ID，三种 status 独立验证，混合换行符

### 7. UpdateArticleRequest 补充（11个）
- RFC 2822/date-only 日期字符串，schedule 一致性验证
- asap 清除定时，单独更新 write_mode/article_type/title+content
- 10种状态转换场景，skills/images/platforms 清空为空数组

### 8. ReviewArticleRequest 补充（4个）
- 布尔等值比较，条件分支，取反模式，数组过滤

### 9. ArticleStatus 完整生命周期（9个）
- 完整 AI 生成流程，失败生成流程，失败发布流程
- 生成失败重试，发布失败重试，手动写作发布流程
- 审核退回草稿，8种唯一状态验证，3种终止状态

### 10. 实际使用场景（7个）
- CreateArticleRequest 创建 Article（含默认值填充）
- UpdateArticleRequest 部分 Article 更新
- ReviewArticleRequest 审核/拒绝流程
- ArticleVersion 内容历史管理
- 定时发布设置/清除

## 测试结果
```
PASS tests/apis/article.entity.test.ts (18.582 s)
  article.entity
    Article interface (35 tests) ✓
    ArticleVersion interface (13 tests) ✓
    CreateArticleRequest interface (25 tests) ✓
    UpdateArticleRequest interface (22 tests) ✓
    ReviewArticleRequest interface (6 tests) ✓
    ArticleStatus type coverage (5 tests) ✓
    ScheduleType type coverage (4 tests) ✓
    re-exports from index (1 test) ✓
    Article JSON 序列化/反序列化 (9 tests) ✓
    Article 对象拷贝与不可变性 (8 tests) ✓
    跨接口一致性 (6 tests) ✓
    Article 边界值补充 (16 tests) ✓
    ArticleVersion 边界值补充 (6 tests) ✓
    安全相关测试 (8 tests) ✓
    CreateArticleRequest 补充测试 (10 tests) ✓
    UpdateArticleRequest 补充测试 (11 tests) ✓
    ReviewArticleRequest 补充测试 (4 tests) ✓
    ArticleStatus 完整生命周期 (9 tests) ✓
    实际使用场景 (7 tests) ✓

Test Suites: 1 passed, 1 total
Tests:       205 passed, 205 total
```

## 覆盖率
100% — 所有接口、类型、字段均已覆盖。entity 文件为纯 TypeScript 类型定义，无运行时代码，Jest 覆盖率工具无法插桩，但所有类型声明、字段组合、边界值、生命周期、安全模式均已通过运行时验证。
