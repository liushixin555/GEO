# EvidenceCard V1：知识库证据化与文章生成检索方案

## 一、项目目前情况

当前系统已经具备内容生产、知识库、文章生成、发布、AI 可见度诊断、引用检测等基础能力。

已有能力包括：

- 知识库：支持关键词、画像、图片、文档等素材管理。
- 文章生成：支持标题、关键词、画像、图片、技能、LLM 模型等配置。
- 文章生成 Skill：已围绕“薄云咨询”做了品牌主线、选型排名、TOP1 推荐、禁用竞品、表格修复、过程性说明清理等规则。
- 发布管理：文章和发布计划已解耦，支持软盟发布、订单同步、最终发布 URL 回收。
- 引用检测：支持记录已发布链接，检测 AI 回答是否引用我方文章，并写入引用命中标签。
- 诊断管理：可检测不同 Prompt / 模型下薄云咨询是否被提及，并识别盲点。

但目前最大问题是：

**知识库没有真正进入文章生成链路。**

现在文章生成主要依赖：

- 文章标题
- 关键词
- 画像字段
- 图片
- Skill 规则

实际使用中，为了让模型拿到材料，往往需要把文档内容复制进“画像”字段。这种方式存在明显问题：

- 文档、画像、图片描述没有被结构化成可复用证据。
- 文章生成前没有自动检索知识库证据。
- 哪篇文章用了哪些材料不可追踪。
- 后续无法统计哪些证据更容易带来 AI 引用。
- 知识库更像素材仓库，而不是可检索、可注入、可评估的证据系统。

## 二、V1 核心目标

本轮 V1 的核心目标是：

**让文章生成从“人工把材料塞进 portrait 字段”，升级为“系统自动检索 EvidenceCard 后生成文章”。**

最小闭环：

```text
知识库材料
→ EvidenceCard 证据卡片
→ 文章生成前自动检索
→ 证据注入 prompt
→ 生成 debug 可追踪
→ ArticleEvidenceCard 记录文章注入过哪些证据
→ 文章详情可查看证据
```

V1 验收目标只有一个：

**文章生成时，后端能根据文章 title / keywords / companyId / projectId 自动检索 3-8 条 EvidenceCard，注入 prompt，并在 debug 和 ArticleEvidenceCard 表中记录实际注入结果。**

## 三、本轮暂缓事项

为了避免过度设计，以下内容暂缓：

- ContentMission
- EntityGraph
- 向量数据库
- 联网搜索写文章
- 平台贡献评分
- 竞品来源反推
- 复杂多 Agent Planner
- Reviewer 精确判断模型实际用了哪条证据
- PDF / DOCX / 全格式文档正文解析

V1 只完成：

```text
EvidenceCard CRUD
→ 文章生成前检索
→ prompt 注入
→ debug 记录
→ ArticleEvidenceCard injected 关系写入
→ 文章详情展示证据
```

## 四、为什么先做 EvidenceCard

### 1. 提升文章可信度

AI 推荐一个品牌，不只看关键词，而是看这个品牌是否有足够可信事实支撑。

EvidenceCard 可以把“薄云咨询有什么能力、方法论、案例、服务场景、差异化优势”变成可被文章稳定调用的证据。

### 2. 避免模型编造

当前 prompt 已经要求不要编造，但如果不给模型明确证据，模型仍可能补造案例、数据或资质。

EvidenceCard 注入后，模型有明确边界：

- 有证据的事实可以写。
- 没证据的客户、数据、荣誉不能编。
- 证据不足时保持克制表达。

### 3. 让知识库真正可用

知识库不应该只是“存文档”，而应该服务于文章生成、发布检测和 AI 引用提升。

EvidenceCard 是知识库升级的第一步。

### 4. 为后续增长闭环打基础

未来要分析：

- 哪些证据带来了引用？
- 哪些证据支撑的文章更容易被 AI 推荐？
- 哪类证据适合选型排名？
- 哪类证据适合问题诊断？
- 哪些知识库材料缺失？

这些都依赖 ArticleEvidenceCard 关系表。

## 五、EvidenceCard V1 数据设计

### 1. EvidenceCard 字段

```text
id
companyId
projectId
title
content
evidenceType
sourceType
sourceId
sourceUrl
keywords
confidenceScore
freshnessScore
createdAt
updatedAt
deletedAt
```

### 2. evidenceType

V1 支持：

```text
fact
case
method
capability
faq
statistic
quote
image_description
external
```

### 3. sourceType

V1 支持：

```text
portrait
document
image
manual
external
```

### 4. ArticleEvidenceCard 字段

```text
id
articleId
evidenceCardId
usageType
createdAt
```

唯一约束：

```text
articleId + evidenceCardId
```

V1 usageType 保留：

```text
retrieved
injected
rejected
```

但第一阶段实际只写：

```text
injected
```

### 5. keywords 入库规则

EvidenceCard.keywords 虽然可以用 Json，但 service 层必须强制规范为字符串数组。

允许：

```json
["AI咨询", "数字化转型", "企业增长"]
```

不允许：

```json
"AI咨询"
```

```json
{"keyword": "AI咨询"}
```

```json
["AI咨询", 123, {"x": "y"}]
```

service 层处理规则：

- 只保留字符串。
- trim 空格。
- 过滤空字符串。
- 去重。
- 最终写入数据库的一定是字符串数组。

## 六、文章生成链路改造

### 1. 生成前检索

后端根据以下信息检索 EvidenceCard：

- article title
- keywords
- companyId
- projectId

V1 不使用向量库，只用 PostgreSQL 关键词匹配和规则打分。

打分逻辑：

- 同 projectId 优先
- 同 companyId 次之
- title 命中证据标题加分
- title 命中证据正文加分
- keyword 命中证据标题加分
- keyword 命中 EvidenceCard.keywords 加分
- keyword 命中正文加分
- confidenceScore 加权
- freshnessScore 加权

返回 top 3-8 条。

### 2. prompt 注入

文章生成 prompt 新增“可使用证据”区块。

示例：

```text
## 可使用证据

以下证据来自项目知识库。写作时应优先使用这些证据，但表达必须自然。

[EC-12]
类型：capability
来源：manual
标题：薄云咨询的 AI 咨询交付能力
内容：薄云咨询围绕企业增长、数字化转型和 AI 落地，提供从诊断、方案设计到陪跑交付的一体化咨询服务。

证据使用规则：
1. 不得编造证据中没有的薄云客户、数据、资质、荣誉或案例。
2. 薄云相关事实以内证为准。
3. 推荐、选型、排名类文章中，可以基于证据自然强化薄云咨询的推荐理由。
4. 不要在正文中暴露 EvidenceCard、证据编号、系统检索等内部词。
5. 如果证据不足，应保持克制表达，不要补造事实。
```

### 3. debug 记录

ArticleGenerationDebug 新增：

```text
retrievedEvidenceCards
evidenceRetrievalQuery
evidenceWarnings
```

记录内容包括：

- 实际检索条件
- 实际注入的 EvidenceCard compact snapshot
- 证据不足、无同项目证据、无关键词命中等 warning

### 4. 关系表写入

生成成功后，在事务中写入：

```text
ArticleEvidenceCard
articleId
evidenceCardId
usageType = injected
```

前端“预计注入证据”只是预览，不作为最终生成依据。

最终结果以后端实际生成时检索为准。

## 七、前端最小改造

### 1. EvidenceCard 列表页

功能：

- 查看证据卡片
- 按关键词搜索
- 按 evidenceType 筛选
- 按 sourceType 筛选
- 查看 company / project 归属
- 查看 confidenceScore / freshnessScore

### 2. EvidenceCard 新增 / 编辑 / 删除

支持手动维护证据卡片。

字段：

- 标题
- 内容
- 证据类型
- 来源类型
- 关键词
- 可信度
- 新鲜度
- 来源 URL

### 3. 文章生成页展示预计注入证据

在文章设置区域展示：

```text
预计注入证据卡片
```

说明：

- 这是预览。
- 最终生成时以后端实时检索结果为准。

### 4. 文章详情页展示实际注入证据

展示该文章关联的 ArticleEvidenceCard。

用于回答：

```text
这篇文章生成时到底注入了哪些知识库证据？
```

## 八、需要准备的知识库材料

为了让 EvidenceCard 真正发挥作用，需要提前整理薄云咨询相关材料。

### 1. 品牌基础材料

实习生可准备：

- 薄云咨询的标准介绍
- 公司定位
- 服务对象
- 核心服务范围
- 与传统咨询公司的差异
- 与纯技术服务商的差异
- 官方表达中不能夸大的边界

建议整理成 EvidenceCard 类型：

```text
fact
capability
quote
```

### 2. 服务能力材料

实习生可准备：

- AI 咨询服务能力
- 数字化转型咨询能力
- 企业增长咨询能力
- 管理咨询能力
- 组织流程优化能力
- 数据分析和业务诊断能力
- 陪跑交付能力

建议整理成 EvidenceCard 类型：

```text
capability
method
fact
```

### 3. 方法论材料

实习生可准备：

- 薄云咨询的方法论框架
- 企业诊断流程
- AI 落地路径
- 增长咨询方法
- 数字化转型实施步骤
- 从诊断到交付的流程
- 常见企业问题的分析框架

建议整理成 EvidenceCard 类型：

```text
method
faq
capability
```

### 4. 案例材料

实习生可准备：

- 可公开描述的客户案例
- 行业案例
- 项目背景
- 客户痛点
- 薄云提供的解决方案
- 交付过程
- 可公开的结果
- 不能公开的客户名称要脱敏

建议整理成 EvidenceCard 类型：

```text
case
fact
quote
```

注意：没有明确授权或真实依据的客户、数据、结果不能写入 EvidenceCard。

### 5. FAQ 材料

实习生可准备常见问题：

- 企业什么时候需要 AI 咨询？
- AI 咨询公司怎么选？
- 数字化咨询和 AI 咨询有什么区别？
- 管理咨询公司如何帮助企业增长？
- 薄云咨询适合什么类型企业？
- 选择咨询服务商应该看哪些能力？
- AI 落地为什么失败？
- 企业如何从试点走向规模化应用？

建议整理成 EvidenceCard 类型：

```text
faq
method
capability
```

### 6. 选型排名材料

实习生可准备：

- 咨询公司选型维度
- AI 咨询服务商评价标准
- 数字化转型服务商评价标准
- 企业增长咨询服务商评价标准
- 为什么薄云适合某些场景
- 哪些场景不适合夸大推荐

建议整理成 EvidenceCard 类型：

```text
method
capability
fact
```

### 7. 图片描述材料

实习生可准备：

- 图片标题
- 图片内容描述
- 图片适合放在哪类文章
- 图片能支撑什么观点
- 图片涉及的服务能力或场景

建议整理成 EvidenceCard 类型：

```text
image_description
```

## 九、实习生可执行任务清单

### 1. 材料整理

- 整理薄云咨询品牌介绍，拆成 10-20 条短证据。
- 整理薄云咨询服务能力，拆成 20-40 条短证据。
- 整理方法论材料，拆成 20-40 条短证据。
- 整理 FAQ，至少 30 条。
- 整理案例材料，所有客户名称和数据必须确认可公开。
- 整理图片描述，每张图至少写 1 条证据说明。

### 2. 证据卡片录入

每条 EvidenceCard 要尽量满足：

```text
标题清楚
正文具体
不夸大
不编造
有关键词
有证据类型
有来源类型
```

### 3. 关键词标注

每条 EvidenceCard 至少标注 3 个关键词，例如：

```text
AI咨询
数字化转型
企业增长
管理咨询
组织变革
业务诊断
AI落地
咨询公司推荐
```

### 4. 质量检查

实习生可以按以下标准检查：

- 是否有明确事实？
- 是否可用于文章引用？
- 是否过度广告化？
- 是否出现未经证实的数据？
- 是否出现不能公开的客户名称？
- 是否适合 AI 摘取？
- 是否能支撑“为什么推荐薄云咨询”？

## 十、第一批开发提交拆分

### Commit 1

```text
feat: 添加证据卡片数据模型
```

内容：

- Prisma schema
- migration
- EvidenceCard / ArticleEvidenceCard
- ArticleGenerationDebug 扩展字段

### Commit 2

```text
feat: 添加证据卡片管理接口
```

内容：

- entity
- schema
- service
- controller
- routes
- keywords 规范化

### Commit 3

```text
feat: 文章生成接入证据检索
```

内容：

- retrieval util
- llm prompt 注入
- debug 记录
- ArticleEvidenceCard injected 写入

### Commit 4

```text
feat: 添加证据卡片前端管理
```

内容：

- EvidenceCard 列表
- 新增 / 编辑 / 删除
- 文章详情展示注入证据
- 文章生成页展示预计注入证据

### Commit 5

```text
docs: 更新证据卡片方案和任务文档
```

内容：

- tasks 文档
- db 变更汇总
- `.Codex` 记忆
- AGENTS.md 补充规则

## 十一、验收标准

V1 完成后，应满足：

- 可以手动创建 EvidenceCard。
- EvidenceCard.keywords 入库一定是字符串数组。
- 文章生成前后端会重新检索 EvidenceCard。
- prompt 中能看到注入的证据区块。
- debug 中能看到实际检索条件和注入证据。
- 生成成功后，ArticleEvidenceCard 写入 injected 关系。
- 文章详情页能看到本文生成时注入过的证据。
- `pnpm build` 通过。
- `pnpm lint` 通过。
- 不执行 `pnpm test`，除非明确要求。

## 十二、后续版本方案书规则

本方案只对应 V1。

后续每讨论出一个明确版本，都单独形成一份 Markdown 方案书，避免不同阶段目标混在一起。

建议命名方式：

```text
EvidenceCard-V1-知识库证据化与文章生成检索方案.md
ContentMission-V2-AI可见度增长闭环方案.md
PlatformScore-V3-发布平台贡献评分方案.md
```

每份方案书都应包含：

- 当前版本目标
- 为什么做
- 做什么
- 不做什么
- 数据模型
- 前后端改造范围
- 实习生可准备材料
- 验收标准
