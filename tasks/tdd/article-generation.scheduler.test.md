# TDD 执行报告：article-generation.scheduler.test.ts

## 源文件
`apis/scheduler/article-generation.scheduler.ts`

## 测试文件
`tests/apis/article-generation.test.ts`

## 执行日期
2026-05-23

## 测试概览
| 指标 | 数值 |
|------|------|
| 总测试数 | 19 |
| 通过 | 19 |
| 失败 | 0 |
| 跳过 | 0 |

## 覆盖率
### article-generation.scheduler.ts
| 类型 | 覆盖率 |
|------|--------|
| 语句 | 98.63% |
| 分支 | 94.44% |
| 函数 | 88.88% |
| 行 | 98.5% |

**未覆盖行**: 第25行 — `cron.schedule` 回调函数体（因 mock cron.schedule 导致回调不会执行，但回调内的 `processNextGeneratingArticle` 已被直接测试覆盖）

## 测试覆盖的功能点（19个）

### startArticleGenerationCron（3个）
1. **应在启用且表达式有效时启动定时任务** — 验证 cron.validate 和 cron.schedule 被正确调用
2. **应在禁用时不启动定时任务** — 验证 config.cron.articleGenerationEnabled=false 时跳过启动
3. **应在cron表达式无效时不启动** — 验证 cron.validate 返回 false 时不启动

### stopArticleGenerationCron（2个）
4. **应停止运行中的定时任务** — 验证 task.stop() 被调用
5. **应在没有运行中的任务时不执行任何操作** — 验证无 task 时不报错

### processNextGeneratingArticle — 并发控制（2个）
6. **应在上一批次仍在执行时跳过** — 验证 isRunning=true 时跳过并输出日志
7. **应完成处理后重置isRunning标志** — 验证 finally 块正确重置标志

### processNextGeneratingArticle — 批次处理（5个）
8. **应在没有待生成文章时直接返回** — findMany 返回空数组
9. **应成功处理单篇文章的完整流程** — 覆盖知识库查找、图片获取、LLM调用、事务保存全流程
10. **应按顺序处理多篇文章** — 验证多篇文章逐篇处理和成功计数
11. **应在文章处理失败时标记为generate_failed并继续处理下一篇** — 验证错误隔离和状态标记
12. **应在更新失败状态也出错时处理异常** — 验证双重错误处理
13. **应处理findMany的批次级错误** — 验证外层 try-catch

### processSingleArticle 分支覆盖（7个）
14. **应在没有知识库时使用空图片列表** — knowledgeBase.findMany 返回空数组
15. **应在skills为对象时查找技能名称** — skills={id:42} 分支
16. **应在skills为数字ID时查找技能名称** — skills=99 分支
17. **应在skillsID查不到记录时使用空字符串** — skills 查无记录
18. **应在文章标题为空时从内容中提取标题** — title 提取逻辑
19. **应正确递增版本号** — version 计算逻辑

## Mock 策略
- **config**: mock `../../apis/config`，可动态修改 cron 配置
- **node-cron**: mock `cron.validate` 和 `cron.schedule`
- **getPrisma**: mock `../../apis/utils/db.util`
- **LlmServiceImpl**: mock `../../apis/service/impl/llm.service.impl`，提供 `mockGenerateArticle`
- **console**: spy + mockImplementation 抑制测试输出

## 辅助函数
- `createDefaultPrisma(overrides)`: 创建包含所有必要 mock 的 prisma 对象，支持子属性级别覆盖（不会因顶层 spread 覆盖默认值）
