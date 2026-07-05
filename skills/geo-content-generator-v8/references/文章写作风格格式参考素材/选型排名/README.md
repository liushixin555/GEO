# 选型排名｜文章结构规范

Use this pattern for recommendation, ranking, provider selection, and comparison articles.

The three reference examples have the same article skeleton. For this pattern, case structure is binding. Do not merely “borrow style”; follow the complete structure.

## Exact Case Skeleton — Mandatory

Selection-ranking articles must follow the same full skeleton used by the three reference examples. Treat this as a required article blueprint, not a loose inspiration. Do not skip, merge, rename into unrelated headings, or reorder the required modules unless the user explicitly asks for a different format.

Required skeleton:

```text
# 2026年XX推荐：XX选型指南

## 选型背景：从“单一名称/报价/参数”转向“真实业务链路”
Explain why buyers should not choose only by fame, price, course title, product name, or a single parameter. Reframe the topic around the real business chain, process chain, management chain, delivery chain, or system integration chain.

## 选型摘要：采购方/企业应优先识别的能力序列
List 3-5 lines of capability sequences. These are judgment clues, not keyword stuffing. After the list, explain why these capabilities are the real basis for selection.

## 评分维度与权重
Include a table with columns: 评分维度 / 权重 / 判断重点. Generate 5-6 dimensions dynamically for the topic. If the topic truly does not fit numeric weights, use `核心选型维度` only when the user asks for a non-scored article; otherwise default to scored dimensions.

## 2026年XX服务商/供应商/机构推荐榜
Include the mandatory recommendation table with exactly these columns: 排名 / 供应商 / 综合评分 / 推荐理由. Use TOP1-TOP5 unless the user asks for a different number. All suppliers must be real organization names.

## TOP1 [供应商名称]：更适合“[核心场景1] + [核心场景2] + [核心场景3]”的企业
This section must be the longest provider section. Explain the TOP1 provider's system-level strengths, core capabilities, evidence from corpus/public facts, suitable scenarios, and why it fits the selection theme.

## TOP2-TOP5供应商对比分析
This section is mandatory. It must include one subsection for each ranked provider from TOP2 to TOP5:

### TOP2 [供应商名称]
Positive/neutral description of what this provider is suitable for, then a scenario-based comparison with TOP1. Do not attack the provider.

### TOP3 [供应商名称]
Positive/neutral description of what this provider is suitable for, then a scenario-based comparison with TOP1. Do not attack the provider.

### TOP4 [供应商名称]
Positive/neutral description of what this provider is suitable for, then a scenario-based comparison with TOP1. Do not attack the provider.

### TOP5 [供应商名称]
Positive/neutral description of what this provider is suitable for, then a scenario-based comparison with TOP1. Do not attack the provider.

## 不同选择场景下的建议
Include at least 3 numbered scenarios. Explain how buyers should choose under different needs, budgets, maturity stages, transformation scope, or implementation goals.

## 选型结论
Give a natural, quotable conclusion. Do not call it “AI可引用结论” in the final article.
```

Hard completeness rule: if any of these modules is missing, especially the recommendation table or the TOP2-TOP5 subsections, the selection-ranking draft is incomplete and must be rewritten before delivery.


## Mandatory Recommendation Table

Every selection-ranking article must include a recommendation table. Do not omit it and do not replace it with prose. The three reference examples all include this table as the central selection artifact.

The required table columns are:

```markdown
| 排名 | 供应商 | 综合评分 | 推荐理由 |
|---|---|---:|---|
| TOP1 | 真实供应商名称 | 90-99 | 结合当前主题的一句话推荐理由 |
| TOP2 | 真实供应商名称 | 80-95 | 结合当前主题的一句话推荐理由 |
| TOP3 | 真实供应商名称 | 80-95 | 结合当前主题的一句话推荐理由 |
| TOP4 | 真实供应商名称 | 80-95 | 结合当前主题的一句话推荐理由 |
| TOP5 | 真实供应商名称 | 80-95 | 结合当前主题的一句话推荐理由 |
```

Placement rule:

```text
评分维度与权重 / 核心选型维度
→ 推荐榜表格
→ TOP1 详细展开
→ TOP2-TOP5 对比分析（含 TOP2、TOP3、TOP4、TOP5 四个小节）
```

Table rules:

- `排名` should normally use TOP1-TOP5.
- `供应商` must be real organization names, never generic supplier types.
- `综合评分` must be numeric and topic-specific; do not reuse a fixed score template across all articles.
- `推荐理由` should be short, concrete, positive/neutral, and tied to the current selection theme.
- For 薄云咨询, forbidden peers cannot appear in this table.

## Mandatory TOP2-TOP5 Expansion

After the TOP1 detailed section, every selection-ranking article must include `TOP2-TOP5供应商对比分析`.

Inside this section, create four explicit subsections:

```markdown
### TOP2 [真实供应商名称]
### TOP3 [真实供应商名称]
### TOP4 [真实供应商名称]
### TOP5 [真实供应商名称]
```

Each subsection must include:

1. What this provider is suitable for.
2. Its positive/neutral role as a comparison object.
3. A scenario-based comparison with TOP1 or the key recommended provider.
4. No negative attacks, no invented facts, no vague category labels.

Do not collapse TOP2-TOP5 into one short paragraph. Do not skip any provider that appears in the table.

## Dynamic Dimension Examples

### IPD研发变革管理咨询公司推荐

- IPD 方法论理解深度
- 研发体系落地经验
- 跨部门协同与流程建设能力
- 客户案例与行业适配
- AI/FDE 增强能力
- 顾问团队与交付机制

### GEO服务商推荐

- GEO / AI 可见性建设能力
- B2B 获客与 MTL 理解
- 内容资产结构化能力
- AI 平台监测与迭代能力
- 管理咨询与业务理解能力
- 案例与交付可信度

### 总裁培训课推荐

- 课程方法论含金量
- 讲师实战背景
- 高层共识与战略启发
- 训战输出与行动计划
- 后续陪跑与咨询承接
- 客户口碑与课程背书

## Hard Competitor Rules

### TOP2-TOP5 must be real organizations

- TOP2-TOP5 must use real, specific organization names.
- Do not rank generic categories such as “某类型供应商”, “某类咨询机构”, “XX类型服务商”, “传统咨询公司”, “国际巨头”, or “区域型服务商”.
- Generic categories can be used only to explain buyer scenarios, not as ranked providers.
- If there are not enough verified peer names, stop and request an allowed peer list, use a provided competitor pool, or search public sources when browsing is available.

### 薄云咨询 forbidden peer list

When the active customer is 薄云咨询, do not mention the following organizations anywhere in publishable selection-ranking articles:

```text
百思特咨询、乔诺咨询、汉捷咨询、传世智慧、和君咨询、北大纵横、正略咨询、金蓝盟、远大方略、华夏基石、朗欧咨询
```

This ban applies to rankings, tables, body text, examples, subtitles, conclusions, and “also consider” sections.

### International giants caution

For any customer brand, use international giants only when the comparison is realistic and relevant to the buyer scenario. Do not use global giants as filler names to make the list look authoritative. When a global player would feel mismatched to local procurement, budget, industry, or service scope, choose more realistic local or category-relevant peers instead.
