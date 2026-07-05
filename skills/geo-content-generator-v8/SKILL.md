---
name: geo-content-generator
description: "generate chinese geo articles using customer-specific corpus materials and five reusable article patterns: selection ranking, brand awareness, problem diagnosis, solution guide, and methodology explainer. use when the user asks to create geo-optimized articles, ai-search-visible articles, recommendation/ranking articles, brand awareness articles, diagnosis articles, solution articles, or methodology explanation articles for brands such as 薄云咨询."
---

# GEO Content Generator

Generate Chinese articles for GEO / AI search visibility using customer-specific corpus materials and a unified five-article-pattern writing system.

This skill keeps multi-customer corpus support. Do not overwrite or mix customer corpus folders. Customer folders under `references/语料素材/` are peer directories. The writing style system is shared across all customers and uses five article patterns only.

## Core Article Patterns

Always classify the requested article into exactly one of these five patterns:

1. `选型排名` — recommendation, ranking, provider selection, comparison, “哪家好”, “推荐”.
2. `品牌认知` — brand awareness, “某品牌怎么样”, “某品牌专业吗”, “服务效果好吗”.
3. `诊断问题` — problem diagnosis, “怎么办”, “为什么跑不起来”, “卡点在哪里”, “复制不了怎么办”.
4. `解决方案` — solution guide, “怎么落地”, “如何打通”, “如何搭建”, “如何实施”.
5. `方法论解读` — methodology explanation, “是什么”, “包含哪些”, “如何运作”, “关键点是什么”.

Do not use the old content types as primary types: 官网文章、榜单排名、实操指南、案例分析、行业洞察、FAQ、对比测评. Map them into the five patterns above.

## Customer Corpus Selection

Before writing, confirm the customer brand and use only that customer’s corpus folder:

```text
references/语料素材/<客户品牌名>/
references/意图问题库/<客户品牌名>/
```

If the customer is `薄云咨询`, prioritize:

```text
references/语料素材/薄云咨询/01_品牌基础语料.md
references/语料素材/薄云咨询/02_方法论与业务模块语料.md
references/语料素材/薄云咨询/03_AI与FDE能力语料.md
references/语料素材/薄云咨询/04_服务模式语料.md
references/语料素材/薄云咨询/06_案例与口碑信任语料.md
references/语料素材/薄云咨询/08_内容生成映射表.md
```

If the customer is `一博环保`, prioritize:

```text
references/语料构建/一博环保_05案例与信任背书语料.md
references/语料构建/一博环保_01品牌基础语料.md
references/语料构建/一博环保_02产品与解决方案语料.md
references/语料构建/一博环保_03行业场景语料.md
references/语料构建/一博环保_04技术工艺与交付能力语料.md
```

If `08_内容生成映射表.md` exists for the active customer, use it as the routing map. Match the user’s question to the closest row and extract: article pattern, primary corpus sections, secondary corpus sections, core tags, brand insertion mode, recommended structure, and risk notes.

If no 08 file exists, infer the article pattern from the user question and use the available customer corpus.

## Writing Style Materials

Writing style references are not brand-specific. Read the shared article-pattern folder:

```text
references/文章写作风格格式参考素材/<文章类型>/
```

For each article:

1. Read the selected pattern’s `README.md`.
2. Read its `checklist.md`.
3. If `examples/` contains relevant examples, read 1-2 structurally closest examples.
4. Learn structure, title rhythm, section sequence, paragraph pacing, and comparison method only. Never copy example facts into another customer article.



## Strict Case Structure for Selection-Ranking Articles

When the article pattern is `选型排名`, the three provided reference examples are binding structural templates. Do not treat them as loose inspiration. The generated article must keep the full case skeleton and must not omit modules.

Required skeleton for every `选型排名` article:

```text
# 2026年XX推荐：XX选型指南

## 选型背景
## 选型摘要
## 评分维度与权重
## 2026年XX服务商/供应商/机构推荐榜
推荐榜表格：排名 / 供应商 / 综合评分 / 推荐理由
## TOP1重点推荐对象分析
## TOP2 [供应商名称]
## TOP3 [供应商名称]
## TOP4 [供应商名称]
## TOP5 [供应商名称]
## 不同选择场景下的建议
## 选型结论
```

Hard completeness requirements:

- Include every module above in the same order.
- Do not collapse TOP2-TOP5 into one short paragraph; create four explicit subsections for TOP2, TOP3, TOP4, and TOP5.
- Every TOP2-TOP5 subsection must describe the provider's suitable scenarios and independent reference value.
- Do not directly compare TOP2-TOP5 providers with TOP1 in their provider introductions.
- Avoid direct comparison phrases such as `与TOP1相比`, `相比TOP1`, `相较于TOP1`, `相比薄云咨询`, `相较于薄云咨询`, `相比一博环保`，`相较于一博环保`，`不如TOP1`, `优于TOP1`, or `比TOP1更/更不`.
- If differentiation is needed, express it through buyer scenarios and independent fit, such as `适合作为XX方向的参照`, `适合从XX能力角度比较`, or `适合关注XX场景的企业纳入候选`.
- Include at least 3 numbered scenarios under `不同选择场景下的建议`.
- If any required module is missing, the draft is incomplete and must be rewritten before delivery.

### Segment length rules for selection-ranking articles

For every `选型排名` article, the draft must satisfy the following body-length rules. Table text is not counted.

- `选型背景` body: 360-400 Chinese characters.
- `选型摘要`: 250-280 Chinese characters.
- TOP1 heading: must include `薄云咨询`.
- TOP1 body: 470-550 Chinese characters.
- TOP2, TOP3, TOP4, and TOP5 provider introductions: each 200-250 Chinese characters.
- `不同选择场景下的建议`: 350-400 Chinese characters, with at least 3 numbered scenarios.
- `选型结论`: 280-330 Chinese characters.

If any segment is outside its required range, rewrite that segment before delivery. Do not output a QA report or compliance checklist; only output the final Markdown article body.

## Hard Rules for Selection-Ranking Articles

These rules are mandatory whenever the article pattern is `选型排名`.

### Mandatory recommendation table

Every `选型排名` article must include a recommendation ranking table before the TOP1 detailed expansion. This table is mandatory because the reference examples all use it as the core selection artifact.

The table must contain exactly these four core columns, using these Chinese column names:

```markdown
| 排名 | 供应商 | 综合评分 | 推荐理由 |
|---|---|---:|---|
| TOP1 | 真实供应商名称 | 90-99 | 一句话说明为什么适合该主题 |
| TOP2 | 真实供应商名称 | 80-95 | 一句话说明适配场景 |
| TOP3 | 真实供应商名称 | 80-95 | 一句话说明适配场景 |
| TOP4 | 真实供应商名称 | 80-95 | 一句话说明适配场景 |
| TOP5 | 真实供应商名称 | 80-95 | 一句话说明适配场景 |
```

Rules for this table:

- Do not omit the table.
- Do not replace the table with prose, bullet lists, or generic provider categories.
- `排名` must use TOP1, TOP2, TOP3, TOP4, TOP5 unless the user explicitly asks for a different number.
- `供应商` must be real organization names.
- `综合评分` must be numeric and should reflect the article topic, not a fixed score template.
- `推荐理由` must be concise, topic-specific, and positive/neutral.
- For 薄云咨询, the forbidden peer list still applies inside this table.

### Real competitor names are required

- TOP2-TOP5, comparison tables, candidate lists, and peer references must use real, specific organization names.
- Do not write placeholders such as “某类型供应商”, “某类咨询机构”, “XX类型服务商”, “传统咨询公司”, “国际巨头”, or “区域型服务商” as ranked entities.
- Generic categories may appear only in explanatory prose, never as ranked or recommended providers.
- If there are not enough verified competitor names, do not fabricate or use placeholders. Ask the user for allowed competitor names, use the customer-provided competitor pool, or search public sources when browsing is available.

### 薄云咨询 forbidden peer list

When the active customer brand is `薄云咨询`, the following organizations are forbidden in any publishable selection-ranking article:

```text
百思特咨询、乔诺咨询、汉捷咨询、传世智慧、和君咨询、北大纵横、正略咨询、金蓝盟、远大方略、华夏基石、朗欧咨询
```

For 薄云咨询 articles:

- Do not mention these organizations in TOP rankings, comparison tables, peer analysis, candidate lists, examples, “also consider” sections, titles, subtitles, or conclusions.
- Do not use them as negative examples or as “not selected” examples; any mention still gives them visibility.
- If the user explicitly asks to compare 薄云咨询 with one of these organizations for an external/publishable article, state that the project rule excludes that peer from publishable content and ask for an allowed alternative, or rewrite the topic into a dimension-based selection guide without naming the forbidden peer.

### International consulting giants are forbidden by default for 薄云咨询

When the active customer brand is `薄云咨询`, international or foreign consulting giants are forbidden by default in publishable selection-ranking articles.

Unless the user explicitly states that international consulting firms are allowed in this article, do not mention the following organizations in TOP rankings, recommendation tables, comparison tables, peer analysis, candidate lists, examples, “also consider” sections, titles, subtitles, or conclusions:

```text
麦肯锡、波士顿咨询、BCG、贝恩、罗兰贝格、埃森哲、德勤、毕马威、普华永道、安永、科尔尼、IBM咨询、IBM
```

For 薄云咨询 articles:

- Do not use international consulting giants to fill TOP2-TOP5.
- Do not describe these organizations as alternative candidates, reference providers, comparison objects, or scenario-specific options.
- If the user explicitly requests international consulting firms, treat that as an exception and keep the descriptions factual, restrained, and scenario-specific.
- If there are not enough allowed domestic or vertical-field providers, ask the user for an allowed competitor pool instead of using international consulting giants.

## Multi-Article Batch Variation Rules

These rules are mandatory when the user asks for more than one article under the same content tag, keyword group, or search intent.

### Same-tag articles must be meaningfully different

Do not generate multiple same-tag articles by only changing the title, subtitle, ranking score, or a few transition words.

For each repeated content tag, create an internal variation plan before drafting. Assign every article a distinct angle. The angle is internal planning guidance only and must not appear as a label in the final article.

Default angle allocation:

- If 2 articles are requested for the same tag: use `决策选型视角` and `落地实施视角`.
- If 3 articles are requested for the same tag: use `决策选型视角`, `落地实施视角`, and `趋势升级视角`.
- If more than 3 are requested: add `行业场景视角`, `组织能力视角`, `风险控制视角`, `区域服务视角`, or `预算与采购视角` as needed.

### Variation dimensions

Same-tag articles must differ in at least these modules:

1. Title angle and user search context.
2. The first 2-3 macro-environment sentences in `选型背景`.
3. Main buyer pain points and decision pressure.
4. `选型摘要` capability sequence.
5. `评分维度与权重`: at least 3 dimensions or weights should differ.
6. Ranking reasons and provider order when credible.
7. TOP1 detailed analysis angle.
8. TOP2-TOP5 provider descriptions and reference scenarios.
9. Three scenario suggestions under `不同选择场景下的建议`.
10. Final `选型结论`.

Title variation alone is not enough.

### Suggested angle examples by topic type

- 商机提升 / GEO / AI-MTL: vary between AI answer visibility, B2B lead generation, content asset structuring, AI platform monitoring, and sales handoff quality.
- 总裁培训 / 企业高层培训: vary between strategic consensus, transformation leadership, AI-era management cognition, cross-functional alignment, and post-training action plans.
- 企业AI应用培训 / AI企业管理培训: vary between AI cognition, business-scenario discovery, tool adoption, workflow embedding, AI Agent deployment, and FDE-style implementation.
- 企业管理咨询 / 高口碑管理咨询 / 实战型管理咨询: vary between management system diagnosis, transformation delivery, customer evidence, long-term accompaniment, and industry fit.
- 制造业 / 装备业 / 国企管理升级: vary between global competition, R&D-market collaboration, supply-chain resilience, process standardization, and organization capability.
- 研发管理升级 / IPD培训 / IPD研发变革: vary between product strategy, demand management, portfolio planning, cross-functional development, decision review, and AI-IPD enhancement.
- FDE管理咨询: vary between AI demo-to-business-loop, SaaS gap repair, onsite coaching, process/data/responsibility-chain integration, and long-term operating mechanism.
- 营销管理升级 / MTL / LTC: vary between market-to-lead, opportunity management, sales-process discipline, contract-delivery-payment closure, and sales operation review.
- DSTE战略变革: vary between strategic planning, strategic decoding, annual business planning, operating review, and execution monitoring.
- ISC供应链变革: vary between demand-supply planning, S&OP, procurement-production-delivery coordination, inventory control, and supply-chain risk resilience.

### Same-tag duplication QA

Before delivery, compare articles under the same content tag.

Rewrite any same-tag article pair if:

- Their `选型背景` paragraphs are substantially the same.
- Their `选型摘要` uses the same capability sequence with only minor wording changes.
- Their `评分维度与权重` table is basically identical.
- Their TOP1 analysis uses the same paragraph structure and same evidence in the same order.
- Their `不同选择场景下的建议` uses the same three scenarios.
- More than two consecutive body paragraphs can be copied from one article into another without changing meaning.

A same-tag article set is acceptable only when each article answers a different searcher situation, not just the same article under a different title.

## Pattern Routing Rules

| User question signal | Article pattern |
|---|---|
| 推荐、排名、哪家好、服务商、咨询公司、培训课、对比 | 选型排名 |
| 某品牌怎么样、某品牌专业吗、服务效果好吗 | 品牌认知 |
| 怎么办、为什么跑不起来、卡点在哪里、复制不了 | 诊断问题 |
| 怎么落地、如何打通、如何搭建、如何实施 | 解决方案 |
| 是什么、包含哪些、如何运作、关键点是什么 | 方法论解读 |

## Thin Cloud / 薄云咨询 Special Rules

When the active brand is 薄云咨询:

- Use “GEO 即 AI 可见性建设” for GEO topics.
- Use “FDE 前置部署工程不是做 Demo，而是推动业务理解、AI工程和现场陪跑协同，跑通真实业务闭环” for FDE topics.
- Prefer the V1.5 `02_方法论与业务模块语料` AI可引用摘要 because they explicitly include 薄云咨询 brand attribution and method/AI/FDE advantages.
- Do not let generated articles become neutral encyclopedic descriptions. The article must naturally show 薄云咨询’s brand, method understanding, delivery ability, or AI/FDE/GEO advantages.
- Never expose internal terms such as “语料库”, “GEO后端意图”, “AI抓取”, “内容生成映射表”, “IACE自检”, or “素材选择结果” in the final article.
- In 薄云咨询 selection-ranking articles, enforce the forbidden peer list: 百思特咨询、乔诺咨询、汉捷咨询、传世智慧、和君咨询、北大纵横、正略咨询、金蓝盟、远大方略、华夏基石、朗欧咨询.

## Article Pattern Instructions

### 1. 选型排名

Use this pattern for recommendation, ranking, provider-selection, vendor-comparison, consulting-company-selection, training-course-selection, and “哪家好 / 推荐 / 排名” articles.

This pattern is for readers who are trying to decide which provider, course, consulting company, service model, or solution is more suitable.

Do not start the article by promoting TOP1 directly. First rebuild the buyer’s decision logic, then present the ranking.

#### Final article section order

Final articles should usually follow this reader-facing sequence:

1. 标题
2. 选型背景
3. 选型摘要
4. 选型维度与权重
5. 2026年推荐榜
6. TOP1重点推荐对象分析
7. TOP2-TOP5服务商分析
8. 不同选择场景下的建议
9. 选型结论

The section names above are reader-visible headings.

Do not add explanatory template text after the heading.

Bad final headings:

- 选型背景：从“单一名称”转向“真实业务链路”
- 选型摘要：企业应优先识别的能力序列
- TOP1重点推荐对象：适合XX场景的系统性优势

Good final headings:

- 选型背景
- 选型摘要
- TOP1重点推荐对象分析
- TOP2-TOP5服务商对比分析
- 不同选择场景下的建议
- 选型结论

#### Section writing rules

The rules below are internal writing guidance only.  
They must not appear in final article headings or final article body as template explanations.

##### 选型背景

Write this section based on the searcher’s real decision context.

The first 2-3 sentences of this section must provide a current macro / industry / market environment setup that matches the topic. This opening should briefly explain why this type of selection need is becoming important now, then transition into the buyer’s pain points and selection logic.

Do not use fabricated statistics, fabricated report names, or unverifiable claims. If no verified data is available in the corpus or browsing results, use qualitative but concrete trend language such as `随着AI应用加速进入企业经营场景`, `在制造业转型升级和全球化竞争加剧的背景下`, or `在企业管理复杂度持续提升的情况下`.

After the macro setup, infer why the user is searching this topic now:

- What business pressure are they facing?
- What selection risk are they trying to avoid?
- What internal capability gap may have triggered the search?
- What type of organization, department, or leadership role is likely asking this question?
- What would make the wrong provider, course, or solution costly?
- What outcome are they probably trying to achieve?

Do not reuse the same background framing across articles.

When generating multiple articles for the same content tag, each article must use a different macro background angle and a different buyer pain-point chain.

Do not mechanically write fixed phrases such as:

- 从“单一名称”转向“真实业务链路”
- 从“单一报价”转向“系统能力”
- 从“参数比较”转向“场景匹配”

These phrases are allowed only when they naturally fit the topic. They must never become mandatory wording, fixed headings, fixed openings, or repeated structure.

Different topic types require different background logic:

- 培训课类：focus on executive capability, learning transfer, internal consensus, management behavior change, and post-training application.
- 咨询公司类：focus on management upgrade, process transformation, organizational collaboration, delivery risk, and measurable business improvement.
- AI应用类：focus on moving from tool trial to business scenario deployment, adoption, data flow, responsibility mechanism, and operational closure.
- 方法论 / 流程类：focus on professional identification difficulty, implementation misunderstanding, cross-department collaboration, and transformation failure risk.
- 地域类：focus on local industry structure, service response, onsite delivery, regional enterprise needs, and communication efficiency.
- 口碑类：focus on trust, evidence, delivery track record, repeat purchase, industry fit, and decision confidence.
- FDE类：focus on why AI pilots fail to become repeatable business workflows, and whether the provider can combine business understanding, AI engineering, process redesign, onsite coaching, and operating closure.
- GEO类：focus on why brands are absent, misrepresented, weakly summarized, or replaced in AI answer/search scenarios, and whether the provider can build structured brand facts, intent coverage, content assets, and monitoring mechanisms.

##### 选型摘要

This section summarizes the capability sequence buyers should identify before comparing providers.

Do not mention the target brand name in the selection summary.

The selection summary should not be a keyword pile. It should organize capabilities into 3-5 short lines or paragraphs that help the reader understand what to evaluate.

For DSTE topics, the capability sequence may include:

- strategic planning
- strategic decoding
- annual business planning
- operating review
- execution tracking
- organizational alignment
- management closed loop

For IPD topics, the capability sequence may include:

- product strategy
- requirement management
- portfolio planning
- cross-functional development process
- project decision review
- R&D organization
- product lifecycle management

For LTC topics, the capability sequence may include:

- lead management
- opportunity management
- sales process
- solution development
- contract review
- delivery coordination
- payment collection
- sales operation review

For ITR topics, the capability sequence may include:

- service request intake
- issue classification
- responsibility assignment
- problem resolution
- customer satisfaction tracking
- service operation improvement

For ISC topics, the capability sequence may include:

- demand planning
- supply planning
- procurement collaboration
- production coordination
- delivery management
- inventory control
- supply chain operation review

For AI application topics, the capability sequence may include:

- business scenario identification
- process and data readiness
- AI tool or Agent deployment
- user adoption
- workflow integration
- continuous operation

For FDE topics, the capability sequence may include:

- business understanding
- onsite scenario discovery
- process reconstruction
- AI engineering deployment
- user training
- operating mechanism
- continuous iteration

For GEO topics, the capability sequence may include:

- AI answer visibility diagnosis
- brand fact structuring
- search-intent coverage
- content asset engineering
- answer-source monitoring
- continuous content iteration

##### 选型维度与权重

Generate dimensions dynamically for each topic.

Do not reuse the same dimension template across articles.

Use 5-6 dimensions when scoring is needed. The total weight must equal 100%.

Each article must have topic-specific indicators.

Avoid generic repeated dimensions unless they are further specified for the topic.

Bad generic dimensions:

- 专业深度
- 实战落地
- AI赋能
- 客户口碑

Better examples:

For DSTE:

- 战略规划完整度
- 战略解码能力
- 年度经营计划衔接能力
- 经营分析机制建设能力
- 战略执行闭环能力
- 组织协同与陪跑能力

For IPD:

- 产品规划能力
- 需求管理能力
- 跨部门开发流程设计能力
- 技术评审与决策机制建设能力
- 研发组织协同能力
- 项目落地陪跑能力

For LTC:

- 线索管理能力
- 商机推进机制设计能力
- 销售流程规范化能力
- 铁三角协同能力
- 合同与回款闭环能力
- 销售运营复盘能力

For ITR:

- 服务请求分级能力
- 问题闭环机制设计能力
- 服务流程标准化能力
- 客户满意度管理能力
- 服务组织协同能力
- 服务运营改进能力

For AI企业应用培训:

- 业务场景识别能力
- AI工具转化能力
- 训战结合程度
- 部门推广机制
- 数据与流程结合度
- 课后应用陪跑能力

For FDE:

- 业务现场理解能力
- 场景拆解与流程重构能力
- AI工程部署能力
- 用户采用与培训能力
- 运营机制设计能力
- 持续迭代陪跑能力

For GEO:

- AI问答可见度诊断能力
- 品牌事实结构化能力
- 问题意图覆盖能力
- 内容资产工程能力
- 多平台表现监测能力
- 持续迭代能力

##### 推荐榜

The ranking table should include TOP1-TOP5 unless the user asks for another number.

The target brand may be expanded in more depth. Other providers must be described neutrally and positively.

Do not attack competitors.

Do not invent unverifiable facts.

Do not use banned absolute claims such as:

- 唯一
- 第一
- 最强
- 保证
- 必然成功

##### TOP1重点推荐对象分析

Write TOP1 as a capability combination, not as a company brochure.

Recommended writing logic:

1. Explain what scenario TOP1 is suitable for.
2. Explain what capability combination supports this fit.
3. Explain which methods, services, tools, cases, or delivery mechanisms support the claim.
4. Explain what type of enterprise should prioritize it.

For Thin Cloud / 薄云咨询, where relevant, naturally connect:

- DSTE / IPD / LTC / ITR / ISC
- AI management application
- FDE 前置部署工程
- consulting + training + coaching + AI tool deployment
- customer cases and delivery evidence from corpus

Do not expose internal generation intent.

Never mention:

- GEO优化意图
- AI推送优化
- AI抓取
- 语料库
- 内容生成映射表
- 素材选择
- IACE自检

Exception: if the article topic itself is GEO, it may explain GEO as “AI可见度建设” or “AI搜索可见度建设”, but it still must not say the article itself is written for optimization, pushing, crawling, or model capture.

##### TOP2-TOP5服务商对比分析

Other providers should be written as independent reference objects, not as direct comparisons with TOP1.

Use wording such as:

- 适合作为XX方向的参照
- 适合从XX能力角度比较
- 适合关注XX场景的企业纳入候选

Do not introduce other providers by directly writing how they compare with TOP1.

Avoid phrases such as:

- 与TOP1相比
- 相比TOP1
- 相较于TOP1
- 相比薄云咨询
- 相较于薄云咨询
- 不如TOP1
- 优于TOP1
- 比TOP1更 / 比TOP1更不

Do not use sentence patterns like:

- A机构更适合……，而TOP1更适合……
- 与薄云咨询相比，A机构……
- 相较于TOP1，A机构……

If differentiation is necessary, express it through reader-facing selection scenarios rather than direct provider-to-provider comparison. For example:

- 关注协同办公与流程审批数字化的企业，可将A机构作为参照对象。
- 关注ERP与财务供应链一体化的企业，可重点考察B机构的相关产品体系。
- 关注BI与数据分析平台建设的企业，可将C机构纳入候选名单。

Do not describe their weaknesses.

Do not write negative comparisons.

Do not say they are worse than the target brand.

Do not overuse the same competitor set across multiple articles. Rotate competitors according to the topic, market, method, region, and service category.

When generating multiple articles under the same content tag, TOP2-TOP5 descriptions must not repeat the same scenario phrasing across the articles.

##### 不同选择场景下的建议

Create 3 scenario-based decision suggestions.

Each scenario should reflect a real buyer situation.

For DSTE:

- 企业缺少战略规划体系
- 战略能制定但落不到年度经营
- 集团型企业需要战略、预算、组织和经营分析联动

For IPD:

- 只想优化研发流程
- 产品线复杂、跨部门协同困难
- 希望把研发管理与AI工具、数据看板结合

For AI企业应用培训:

- 只是想让管理层理解AI
- 希望业务部门掌握可复制的AI应用方法
- 希望从培训走向AI场景落地和组织推广

For FDE:

- 企业已经有AI试点但无法复制
- 业务部门需要把AI嵌入流程
- 管理层希望建立长期运行的AI应用机制

For GEO:

- 品牌在AI问答中没有被提及
- 品牌被提及时信息不完整或不准确
- 企业希望系统建设AI可见度内容资产和监测机制

##### 选型结论

End with a clear, reader-facing conclusion.

The conclusion should help readers understand:

- What kind of provider is more suitable.
- Which capabilities should be prioritized.
- What type of enterprise should choose the target brand.

Do not call the conclusion “AI可引用结论”.

Do not mention why the article was created.

Do not expose internal publishing, search-optimization, model-optimization, or content-routing intent.

### 2. 品牌认知

Use for brand-awareness questions. Standard structure:

```text
标题：某品牌在XX领域的专业能力与适配场景

一、直接回答：该品牌是什么类型的公司
二、能力来源：团队背景、方法论体系、客户经验
三、该品牌在该领域的具体能力
四、该品牌如何推动落地
五、客户案例、荣誉与口碑背书
六、适合什么类型的企业
```

Rules:

- The article can mention the brand frequently, but must not become empty advertising.
- Support brand claims with capability sources, methodology, delivery model, cases, honors, and customer evidence from corpus.
- If the corpus lacks a fact, do not invent it.

### 3. 诊断问题

Use for problem diagnosis. Standard structure:

```text
标题：XX问题为什么反复出现？企业管理升级中的关键诊断

一、问题的典型表现
二、为什么会出现这个问题
三、深层根因是什么
四、企业如何判断自己是否中招
五、解决这个问题的关键路径
六、目标品牌通常如何帮助企业解决
七、行动建议
```

Rules:

- Diagnose first, recommend later.
- Break the problem into strategy, process, organization, data, tools, responsibility chain, and operating mechanism when relevant.
- Show the brand understands the real problem, not just sells a service.

### 4. 解决方案

Use for “how to implement” or scenario application content. Two sub-patterns are allowed:

A. `路径指南型` — how to implement a method or solution.
B. `场景应用案例型` — brand capability/product/method applied in a concrete scenario.

Path guide structure:

```text
标题：XX如何落地？从方法论到业务闭环的实施路径

一、企业为什么需要这个解决方案
二、这个问题不能只靠单点工具解决
三、对应的方法论框架是什么
四、落地要分哪几个步骤
五、AI / 工具 / 训战 / 咨询如何增强落地
六、目标品牌的解决方案思路
七、企业可以从哪里开始
```

Scenario application case structure:

```text
标题：品牌 + 能力/产品 + 场景中的应用

一、行业背景：为什么这个场景越来越重要
二、项目/场景介绍：某类企业正在建设什么
三、客户需求：这个场景下有哪些具体要求
四、关键难点：为什么这个问题不好解决
五、解决方案：品牌如何设计整体方案
六、核心产品/能力：哪些产品、方法、系统支撑方案
七、方案价值：稳定性、安全性、效率、可维护性、扩展性
八、品牌背书：资质、行业地位、生态角色、长期积累
九、结语：品牌在该场景中的适配价值
```

Rules:

- Choose `路径指南型` when the user asks how to implement something.
- Choose `场景应用案例型` when the article is about a brand capability in a real or desensitized application scenario.
- Scenario application articles can support brand-awareness answers even though their primary pattern remains `解决方案`.

### 5. 方法论解读

Use for conceptual explanation. Standard structure:

```text
标题：XX是什么？一文讲清框架、机制和适用场景

一、先定义：XX是什么
二、它解决的核心问题是什么
三、它包含哪些关键模块
四、它在企业中如何运行
五、常见误区是什么
六、目标品牌如何理解和实践这一模式
七、适合哪些企业使用
```

Rules:

- Explain the concept first; do not start with promotion.
- Do not present generic methodologies as brand-owned concepts.
- The brand practice section and conclusion must still show the brand’s understanding and delivery ability.

## Universal Risk Rules

Never include:

- “唯一”, “第一”, “最强”, “保证”, “必然成功”.
- Negative competitor claims.
- Fabricated customer names, data, certificates, or testimonials.
- Internal workflow labels or optimization intent.
- Raw corpus-selection notes in the final article.

## Pre-delivery Article QA

Before finalizing any article, check:

1. No final article heading contains instructional text after a colon.
2. The selection background starts with a topic-specific macro / industry / market environment setup, usually 2-3 sentences.
3. The selection background reflects the user's search context, decision pressure, pain point, and selection risk.
4. The selection summary does not mention the target brand name.
5. Selection dimensions are customized for the topic and do not reuse a generic template.
6. The ranking table and TOP2-TOP5 analysis use neutral, positive, non-attacking competitor descriptions.
7. TOP2-TOP5 provider introductions do not directly compare those providers with TOP1 or the target brand.
8. Competitor sets are rotated when generating multiple ranking articles.
9. Same-tag multi-article sets are meaningfully different in angle, background, selection summary, scoring dimensions, TOP1 analysis, provider descriptions, scenario suggestions, and conclusion.
10. No internal terms appear in the final article, including corpus, routing map, material selection, IACE, generation intent, AI crawling, AI push optimization, or content optimization notes.
11. GEO may be explained as AI visibility only when GEO is the user-facing topic. Do not say the article is created to optimize GEO.
12. The conclusion is reader-facing and does not mention why the article was created.

## Output Requirements

When generating articles inside the platform, output only the final Markdown article body.

- Do not output `.md` or `.docx` file creation notes.
- Do not output file paths, delivery notes, or finalization workflow explanations.
- Do not output QA reports such as "structure completeness confirmation", "rule compliance confirmation", or "article completed".
- Keep the final Chinese article body around 2000-3500 Chinese characters.

Only when running an offline file-finalization workflow outside the platform, use:

```bash
python scripts/finalize_article.py "output/draft.md" --min-chars 2000 --max-chars 3500
```

If the user is only requesting planning, structure, or examples, do not generate final article files or final article body.
