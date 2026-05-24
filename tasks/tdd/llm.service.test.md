# TDD 执行报告 — llm.service.impl.ts

## 源文件
`apis/service/impl/llm.service.impl.ts`

## 测试文件
`tests/apis/llm.service.test.ts`

## 测试时间
2026-05-25（第3轮更新）

## 测试结果
- **测试套件**: 1 passed
- **测试用例**: 145 passed, 0 failed（第1轮 60 + 第2轮 37 + 第3轮 48）
- **总耗时**: ~6.0s

## 覆盖率

| 指标 | 覆盖率 |
|------|--------|
| 语句 (Statements) | **100%** |
| 分支 (Branches) | **100%** |
| 函数 (Functions) | **100%** |
| 行 (Lines) | **100%** |

## 测试用例清单

### expandKeywords() — 34 个测试
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
22. prompt应包含原始关键词和扩展要求（第2轮新增）
23. 应处理编号后跟tab分隔符的情况（第2轮新增）
24. 编号后跟冒号不应被去除（冒号不在正则中）（第2轮新增）
25. 应处理三位数编号前缀（第2轮新增）
26. 应处理axios错误中data为字符串的情况（回退到err.message）（第2轮新增）
27. 应处理axios错误中data.error为字符串的情况（回退到err.message）（第2轮新增）
28. 应处理axios错误中data.error.message为空字符串（回退到err.message）（第2轮新增）
29. 应处理response.data为undefined的情况（第2轮新增）
30. 应处理LLM返回choices为undefined的情况（第2轮新增）
31. 应处理LLM返回message为undefined的情况（第2轮新增）
32. 应处理空关键词输入（第2轮新增）
33. 应处理恰好100个字符的关键词（应被过滤）（第2轮新增）
34. 应使用不同的模型配置进行调用（第2轮新增）
35. 应处理仅包含编号和分隔符的行（去除后为空）（第2轮新增）

### mineKeywordsFromContent() — 29 个测试
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
19. prompt应包含内容提取要求（第2轮新增）
20. 应处理编号后跟tab分隔符的情况（第2轮新增）
21. 应处理axios错误中data为字符串的情况（回退到err.message）（第2轮新增）
22. 应处理axios错误中data.error为字符串的情况（回退到err.message）（第2轮新增）
23. 应处理axios错误中data.error.message为空字符串（回退到err.message）（第2轮新增）
24. 应处理response.data为undefined的情况（第2轮新增）
25. 应处理LLM返回choices为undefined的情况（第2轮新增）
26. 应过滤恰好100个字符的关键词（第2轮新增）
27. 应保留恰好99个字符的关键词（第2轮新增）
28. 应处理空内容输入（第2轮新增）
29. 应使用不同的模型配置进行调用（第2轮新增）

### generateArticle() — 34 个测试
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
22. 图片description为null时应显示"无描述"（第2轮新增）
23. 图片description为undefined时应显示"无描述"（第2轮新增）
24. skills为undefined时应显示"无特殊要求"（第2轮新增）
25. 图片编号应从1开始递增（第2轮新增）
26. 应使用不同的模型配置进行调用（第2轮新增）
27. 应处理axios错误中data为字符串的情况（回退到err.message）（第2轮新增）
28. 应处理axios错误中data.error为字符串的情况（回退到err.message）（第2轮新增）
29. 应处理axios错误中data.error.message为空字符串（回退到err.message）（第2轮新增）
30. 应处理response.data为undefined时返回空内容错误（第2轮新增）
31. system prompt应包含图片使用和字数要求（第2轮新增）
32. 应验证完整user prompt结构（标题+关键词+受众+图片+技能）（第2轮新增）
33. 应处理baseUrl末尾有多个斜杠的情况（第2轮新增）

## Mock 策略
- `getPrisma` — mock 返回包含 `llmModel.findFirst` 的 prisma 对象
- `axios` — mock `axios.post` 模拟 LLM API 调用
- 每个测试用例在 `beforeEach` 中重新创建 mock，`afterEach` 中清理

## 第2轮新增测试用例说明（+37 个）

| 方法 | 原有 | 新增 | 覆盖场景 |
|------|------|------|---------|
| expandKeywords | 21 | +14 | prompt内容验证、tab分隔符、冒号不分隔、三位数编号、错误链路全分支（data为字符串/error为字符串/空message）、response.data undefined、choices undefined、message undefined、空输入、100字符边界值、不同模型配置、纯编号行 |
| mineKeywordsFromContent | 18 | +11 | prompt内容验证、tab分隔符、错误链路全分支、response.data undefined、choices undefined、100/99字符边界值、空内容输入、不同模型配置 |
| generateArticle | 21 | +13 | description null/undefined、skills undefined、图片编号递增、不同模型配置、错误链路全分支、response.data undefined、system prompt详细验证、user prompt完整结构、多斜杠baseUrl |

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
- 图片 description 为 null/undefined/空字符串均显示"无描述"（`||` 运算符的 falsy 行为）

### 错误处理链路优先级

`err.response?.data?.error?.message` > `err.response?.data?.message` > `err.message`

- `data` 为字符串时：`data.error` = undefined → `data.message` = undefined → 回退到 `err.message`
- `data.error` 为字符串时：`data.error.message` = undefined → 检查 `data.message` → 回退到 `err.message`
- `data.error.message` 为空字符串 `""` 时：falsy → 回退到 `data.message` → 若也为空则回退到 `err.message`

### 编号前缀正则 `^[\d]+[.、)\s]+`

- 匹配：`1.` `2、` `3)` `4 ` `5\t` `10.` `100.`
- 不匹配：`1:`（冒号不在字符类中）、`1-`（破折号不在字符类中）

## 第3轮新增测试用例——接口契约合规性验证（+48 个）

| 测试类别 | 用例数 | 覆盖场景 |
|---------|-------|---------|
| 接口方法签名验证 | 10 | 3个方法存在性、方法数量、参数数量、返回类型（Promise\<string[]\> vs Promise\<string\>） |
| ArticleGenerationParams 字段完整性 | 4 | title、keywords、portrait、images元素结构（title+description+imageUrl） |
| 异步行为验证 | 6 | 3个方法异步执行不阻塞、错误通过Promise rejection传递 |
| 错误类型与继承层次 | 5 | Error实例验证、axios错误包装、LLM空内容错误、三方法模型不存在错误消息一致性 |
| temperature 差异验证 | 3 | expandKeywords=0、mineKeywordsFromContent=0、generateArticle=0.7 |
| 消息结构差异验证 | 3 | expandKeywords/mineKeywordsFromContent=单user消息、generateArticle=system+user双消息 |
| 过滤行为差异验证 | 3 | expandKeywords保留单字符（>0）、mineKeywordsFromContent过滤单字符（>1）、同输入不同结果 |
| 实例独立性与构造函数 | 3 | 无参构造、多实例独立工作、instanceof验证 |
| 错误消息格式一致性 | 3 | 三方法axios错误消息正则匹配（状态码+详情） |
| 导出与类型验证 | 4 | ILlmService导出、ArticleGenerationParams导出、LlmServiceImpl导出、鸭子类型接口实现 |
| 超时配置一致性 | 2 | 三方法相同timeout=300000ms、相同认证头格式 |
| 模型查询一致性 | 2 | 三方法相同查询条件（status+deletedAt+orderBy）、每次调用独立查询不缓存 |

### 第3轮关键验证发现

1. **接口契约完整性**：LlmServiceImpl 恰好实现 ILlmService 的 3 个方法，方法签名、参数数量、返回类型完全匹配
2. **行为差异已确认**：expandKeywords(>0) vs mineKeywordsFromContent(>1) 的过滤阈值差异通过对比测试验证
3. **temperature 设计意图**：关键词提取类方法使用 temperature=0 确保确定性输出，文章生成使用 0.7 增加创意性
4. **无状态设计**：每次方法调用独立查询模型配置，不缓存模型信息，支持运行时模型切换
5. **错误一致性**：三方法共享相同的错误处理链路和格式，错误均为 Error 实例
