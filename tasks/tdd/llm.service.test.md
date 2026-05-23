# TDD 执行报告 — llm.service.impl.ts

## 源文件
`apis/service/impl/llm.service.impl.ts`

## 测试文件
`tests/apis/llm.service.test.ts`

## 测试时间
2026-05-24（更新）

## 测试结果
- **测试套件**: 1 passed
- **测试用例**: 60 passed, 0 failed
- **总耗时**: ~5.1s

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句 (Statements) | **100%** |
| 分支 (Branches) | **100%** |
| 函数 (Functions) | **100%** |
| 行 (Lines) | **100%** |

## 测试用例清单

### expandKeywords() — 21 个测试
1. 应正确扩展关键词并返回解析后的关键词数组
2. 应去除编号前缀（数字+点/顿号/括号等）
3. 应过滤掉空行和超长行（>=100字符）
4. 应对trim后为空的行进行过滤
5. 应保留长度1的关键词（>0 即可）
6. 没有可用模型时应抛出错误
7. 应使用正确的模型参数调用LLM API
8. LLM返回空内容时应返回空数组
9. LLM返回null内容时应返回空数组
10. 应处理baseUrl末尾有斜杠的情况
11. 应处理baseUrl末尾有多个斜杠的情况
12. axios调用失败时应抛出包含状态码和错误信息的错误
13. axios调用失败且response.data.message存在时应使用该message
14. axios调用失败且无response时应显示未知状态码
15. 应查询status=true且deletedAt=null的模型（按id升序）
16. 应正确处理Windows风格的\r\n换行符
17. 应正确处理混合换行符（\r\n和\n混用）
18. 编号前缀去除后为空的行应被过滤
19. 应处理两位数编号前缀
20. 应保留不以数字开头的行（如带破折号的列表项）
21. 应处理恰好99个字符的关键词（刚好在限制内）

### mineKeywordsFromContent() — 18 个测试
1. 应正确从内容中提取关键词
2. 应去除编号前缀
3. 应过滤掉长度<=1和>=100的行
4. 应保留长度为2的关键词
5. 应过滤空行和纯空白行
6. 没有可用模型时应抛出错误
7. 应使用正确的参数调用LLM API
8. LLM返回空内容时应返回空数组
9. LLM返回null内容时应返回空数组
10. axios调用失败且response.data.message存在时应使用该message
11. axios调用失败时应抛出包含状态码的错误
12. axios调用失败且response存在但无status时应显示未知状态码
13. axios调用失败且response.data无error.message和message时应使用err.message
14. 应查询status=true且deletedAt=null的模型
15. 应正确处理Windows风格的\r\n换行符
16. 应明确过滤长度为1的关键词（与expandKeywords不同）
17. 应处理两位数编号前缀
18. 应正确处理超长内容输入

### generateArticle() — 21 个测试
1. 应成功生成文章并返回内容
2. 应使用system和user双消息调用LLM API
3. 应使用temperature 0.7调用
4. 应正确格式化图片列表到prompt中
5. 当images为空时应显示"无可用图片"
6. 当图片无描述时应显示"无描述"
7. 当skills为空时应显示"无特殊要求"
8. 没有可用模型时应抛出错误
9. LLM返回空内容时应抛出错误
10. LLM返回纯空白内容时应抛出错误
11. axios调用失败时应抛出包含状态码的错误
12. axios调用失败且无response时应显示未知状态码
13. 应使用正确的认证头和超时配置
14. 应处理baseUrl末尾有斜杠的情况
15. 应查询status=true且deletedAt=null的模型
16. LLM返回null内容时应抛出"LLM返回内容为空"错误
17. LLM返回undefined内容时应抛出"LLM返回内容为空"错误
18. LLM返回空choices数组时应抛出"LLM返回内容为空"错误
19. 应正确在prompt中包含标题和目标受众
20. 应正确格式化多张图片信息到prompt中
21. system prompt应包含GEO和Markdown相关指导

## Mock 策略
- `getPrisma` — mock 返回包含 `llmModel.findFirst` 的 prisma 对象
- `axios` — mock `axios.post` 模拟 LLM API 调用
- 每个测试用例在 `beforeEach` 中重新创建 mock，`afterEach` 中清理

## 新增测试用例说明（本次新增 16 个）

| 方法 | 新增数量 | 新增内容 |
|------|---------|---------|
| expandKeywords | +6 | Windows换行符、混合换行符、编号前缀去空、两位数编号、破折号列表项、99字符边界值 |
| mineKeywordsFromContent | +4 | Windows换行符、长度1过滤确认、两位数编号、超长内容输入 |
| generateArticle | +6 | null/undefined/空choices错误、标题受众验证、多图片格式化、system prompt验证 |

## 关键设计发现

### expandKeywords vs mineKeywordsFromContent 的差异

| 行为 | expandKeywords | mineKeywordsFromContent |
|------|---------------|------------------------|
| 最小关键词长度 | `> 0`（保留单字符） | `> 1`（过滤单字符） |
| LLM temperature | 0 | 0 |
| 空结果处理 | 返回空数组 | 返回空数组 |

### generateArticle 特殊行为

- 使用 **system + user 双消息**模式，其余方法仅 user 单消息
- temperature 为 **0.7**（创造性），其余方法为 0（确定性）
- 空内容时**抛出错误**，而非返回空（因为文章必须有内容）
- 空图片时显示"无可用图片"，空描述显示"无描述"，空技能显示"无特殊要求"
