# 2026-05-26 文章定时生成批量模式改造

## 变更内容

将文章定时生成 cron 从"每次最多10篇"改为"一次获取所有待生成文章"，并增加历史版本内容参考和标题保护。

### 修改文件

| 文件 | 变更 |
|------|------|
| `apis/service/llm.service.ts` | ArticleGenerationParams 新增 previousContent 字段 |
| `apis/service/impl/llm.service.impl.ts` | 提示词增强：标题固定指令 + 历史版本参考内容节 |
| `apis/scheduler/article-generation.scheduler.ts` | 去掉 BATCH_SIZE 限制 + 获取最近版本内容 + 已有标题不可修改 |
| `tests/apis/scheduler/article-generation.scheduler.test.ts` | 49→65 用例，覆盖新场景 |
| `tasks/dev017.文章定时生成.md` | 任务文档更新 |

### 核心改动

1. **去掉 BATCH_SIZE=10 限制** — findMany 不再 take 限制数量
2. **获取历史版本内容** — articleVersion.findFirst({ orderBy: { version: 'desc' } }) 查询最近版本
3. **已有标题不可修改** — article.title 存在时始终保留，拼接到 LLM 提示词要求使用指定标题
4. **逐篇处理** — 调用 LLM → 写入数据库 → 更新状态 → 下一篇

### 测试结果

- 65 用例全部通过
- lint 通过
- build:api + build:page 通过
