# TDD 执行报告 — llm.service.impl.ts

## 源文件
`apis/service/impl/llm.service.impl.ts`

## 测试文件
`tests/apis/llm.service.test.ts`

## 测试时间
2026-05-23

## 测试结果
- **测试套件**: 1 passed
- **测试用例**: 42 passed, 0 failed
- **总耗时**: ~7.5s

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句 (Statements) | **100%** |
| 分支 (Branches) | **94.28%** |
| 函数 (Functions) | **100%** |
| 行 (Lines) | **100%** |

未覆盖分支: 第77-78行（`mineKeywordsFromContent` 中 error fallback 的短路分支，3个方法逻辑相同但 istanbul 分别统计）

## 测试用例清单

### expandKeywords() — 15 个测试
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

### mineKeywordsFromContent() — 12 个测试
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
12. 应查询status=true且deletedAt=null的模型

### generateArticle() — 15 个测试
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

## Mock 策略
- `getPrisma` — mock 返回包含 `llmModel.findFirst` 的 prisma 对象
- `axios` — mock `axios.post` 模拟 LLM API 调用
- 每个测试用例在 `beforeEach` 中重新创建 mock，`afterEach` 中清理
