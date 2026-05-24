# TDD 执行记录：article-generation.scheduler.test.ts

## 文件路径
- 源码：`apis/scheduler/article-generation.scheduler.ts`
- 测试：`tests/apis/scheduler/article-generation.scheduler.test.ts`

## 执行时间
2026-05-24（第二轮补全）

## 测试框架
Jest + @jest-environment node

## 测试结果
- **测试套件**: 1 passed
- **测试用例**: 62 passed, 0 failed
- **耗时**: ~6s

## 覆盖率
| 指标 | 覆盖率 |
|------|--------|
| Statements | 100% |
| Branch | 100% |
| Functions | 100% |
| Lines | 100% |

## 测试用例清单

### 1. startArticleGenerationCron (5个)
- 应在启用时启动定时任务
- 应在禁用时不启动定时任务
- 应在无效cron表达式时不启动定时任务
- 应使用配置的cron表达式
- 定时回调应调用 processNextGeneratingArticle

### 2. stopArticleGenerationCron (3个)
- 应在任务存在时停止定时任务
- 应在任务不存在时不报错
- 应能正确停止后重新启动

### 3. processNextGeneratingArticle - 基本流程 (3个)
- 应在没有待处理文章时直接返回
- 应正确查询状态为 generating 的文章
- 应在正在运行时跳过调度（并发控制）

### 4. processNextGeneratingArticle - 成功处理 (11个)
- 应成功处理单篇文章
- 应查询项目的知识库
- 应查询知识库的图片
- 应调用 LLM 生成文章并传递正确参数
- 应使用事务保存文章版本和更新状态
- 应正确递增版本号
- 应在没有标题时从内容提取标题
- 应正确处理技能字段（对象格式）
- 应正确处理技能字段（数字格式）
- 应处理空知识库的情况
- 应处理图片没有描述的情况

### 5. processNextGeneratingArticle - 批量处理 (2个)
- 应顺序处理多篇文章
- 应限制每批最多10篇文章

### 6. processNextGeneratingArticle - 错误处理 (5个)
- 应在文章处理失败时标记为 generate_failed
- 应在更新失败状态也失败时不抛出异常
- 应在部分文章失败时继续处理其他文章
- 应在查询文章失败时不抛出异常
- 应在错误后重置 isRunning 标志

### 7. 技能字段边界情况 (3个)
- 应处理 skills 为 null 的情况
- 应处理 skills 对象但 id 为 null 的情况
- 应处理 skills 记录不存在的情况

### 8. 标题提取边界情况 (3个)
- 应在内容以 ## 开头时正确提取标题
- 应在内容只有空行时不修改原始标题
- 应在文章已有标题时保留原标题

### 9. 版本号处理 (2个)
- 应正确处理版本号为0的文章
- 应正确处理版本号为5的文章

### 10. 默认 portrait 处理 (2个)
- 应在 portrait 为空时使用默认值 通用读者
- 应在 portrait 为 null 时使用默认值 通用读者

### 11. Skills 字段额外边界情况 (3个) [新增]
- 应处理 skills 为字符串数字的情况
- 应处理 skills 为空对象的情况
- 应处理 skills id 为 0（falsy）的情况

### 12. Keywords 默认值处理 (2个) [新增]
- 应在 keywords 为 null 时使用空字符串
- 应在 keywords 为 undefined 时使用空字符串

### 13. 标题提取额外边界情况 (4个) [新增]
- 应在内容以 ### 三级标题开头时正确提取标题
- 应在内容首行无 # 前缀时直接使用首行文本
- 应在标题行有额外空格时正确去除
- 应在内容首行为空行、第二行有文本时提取第二行

### 14. 版本号额外边界情况 (2个) [新增]
- 应正确处理版本号为小数的文章（Math.floor 取整）
- 应正确处理版本号为负数的文章

### 15. 事务数据完整性验证 (3个) [新增]
- 应通过事务同时创建版本记录和更新文章状态
- 应在事务中正确传递多张图片资源
- 应在图片描述为 undefined 时使用空字符串

### 16. processSingleArticle 内部错误路径 (4个) [新增]
- 应在知识库查询失败时标记文章为 generate_failed
- 应在图片查询失败时标记文章为 generate_failed
- 应在技能查询失败时标记文章为 generate_failed
- 应在事务执行失败时标记文章为 generate_failed

### 17. 定时任务生命周期 (2个) [新增]
- 应支持多次启动停止循环
- 应在连续停止两次时不报错

### 18. 并发调度防护 (2个) [新增]
- isRunning 标志应在成功完成后重置
- isRunning 标志应在部分失败后重置

### 19. 多项目文章处理 (1个) [新增]
- 应为不同项目的文章查询对应的知识库

## Mock 策略
- **node-cron**: mock schedule/validate 方法，模拟定时任务调度
- **prisma**: mock article/knowledgeBase/knowledgeImage/skills/articleVersion 模型
- **LlmServiceImpl**: mock generateArticle 方法
- **utils**: mock getPrisma 返回 mockPrisma 对象

## 关键测试场景
1. **并发控制**: isRunning 标志防止并发执行
2. **错误容错**: 单篇文章失败不影响其他文章处理
3. **事务完整性**: 文章版本创建和状态更新在同一事务中
4. **标题提取**: 从生成内容中提取标题，支持 markdown 标题格式（#、##、###、无前缀）
5. **技能字段**: 兼容对象、数字、字符串数字、空对象、null、id 为 0 等格式
6. **版本递增**: 正确计算新版本号（含小数 Math.floor、负数边界）
7. **错误路径全覆盖**: 知识库查询、图片查询、技能查询、LLM 生成、事务执行全链路失败处理
8. **多项目隔离**: 不同项目文章查询各自独立的知识库
9. **生命周期管理**: 多次启停循环、连续停止幂等性

## 本轮新增用例统计
- 新增测试用例：23个（从 39 增至 62）
- 新增测试分组：9个（从 10 增至 19）
- 覆盖率维持：100% Stmts / 100% Branch / 100% Funcs / 100% Lines
