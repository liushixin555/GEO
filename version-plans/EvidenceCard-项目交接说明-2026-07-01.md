# EvidenceCard 项目交接说明（2026-07-01）

## 一、当前目标

本阶段围绕“提升薄云咨询在 AI 回答中的可见度、推荐概率和引用命中率”推进。当前选择的基础路线不是先做复杂任务规划系统，而是先把知识库材料证据化，让文章生成从“把长文本塞进 portrait”升级为：

```text
知识库材料
-> EvidenceCard
-> 生成前检索
-> prompt 注入
-> debug 可观察
-> ArticleEvidenceCard 可追溯
-> 文章质量验证
```

核心判断：后续无论做自动抽取、联网搜索、向量库、Reviewer、平台评分还是 ContentMission，都应该建立在 EvidenceCard 这一层稳定之后。

## 二、已经完成的工作

### 1. EvidenceCard V1 基线

已完成：

- 新增 EvidenceCard 数据模型。
- 新增 ArticleEvidenceCard 关系表。
- ArticleGenerationDebug 增加证据检索和 debug 字段。
- EvidenceCard 后端 CRUD。
- EvidenceCard 前端列表、详情、新增/编辑/删除。
- 文章生成前自动 retrieval。
- 文章 prompt 中注入 3-8 条证据。
- debug 中记录：
  - `retrievedEvidenceCards`
  - `evidenceRetrievalQuery`
  - `evidenceWarnings`
  - `evidencePromptPreview`
  - `evidenceStats`
- 生成成功后写入 ArticleEvidenceCard，并保存 `evidenceSnapshot`。
- 文章详情页展示实际注入证据。

关键约束：

- ArticleEvidenceCard 唯一约束是 `[articleId, evidenceCardId]`。
- V1 只写 `usageType = injected`。
- EvidenceCard.keywords 必须规范为 `string[]`。
- 前端“预计注入证据”只做预览，最终以后端生成时实时检索为准。

### 2. Evidence Validation V1.0.5

已完成：

- EvidenceCard 增加：
  - `status`: `draft / verified / deprecated`
  - `sourceQuality`
  - `articleTypes`
  - `verifiedAt`
  - `verifiedBy`
- retrieval 默认只检索 `verified`。
- ArticleEvidenceCard 增加 `evidenceSnapshot`。
- EvidenceCard 列表按查询聚合：
  - injectedCount
  - lastInjectedAt
- Debug / 文章详情能看 Evidence Prompt Preview 和统计。

关键原则：

- 自动抽取出的证据不能直接进入正式生成，必须变成 `verified` 才能被正式 retrieval 使用。
- `draft` 是候选，`deprecated` 是不建议再使用。

### 3. Evidence Extraction V1.1 / V1.1.1

已完成：

- 统一抽取接口：

```http
POST /api/v1/evidence-cards/extract
```

- 支持来源：
  - `manual`
  - `portrait`
  - `image`
- `save=false`：只返回候选，不写库。
- `save=true`：保存为 `draft`。
- manual-text 前端支持候选预览、编辑、删除、勾选、保存草稿。
- 画像/图片入口支持抽取证据并跳转 draft 审核列表。
- 后端抽取逻辑升级为：
  - LLM 优先
  - LLM 不可用或无有效候选时 deterministic fallback
- 抽取 prompt 已调整：
  - EvidenceCard.content 默认 2-5 句话。
  - 建议 80-250 个中文字符。
  - 不再鼓励压缩成一句话。
  - 不得为凑长度编造材料中没有的信息。
- 短候选会带 `CONTENT_SHORT_REVIEW_RECOMMENDED` warning。

### 4. 薄云咨询材料整理

已整理材料包：

- `version-plans/evidence-source-materials/V1.1-薄云咨询证据卡片原始材料.md`

材料来源：

- `skills/geo-content-generator-v8/references/语料素材/薄云咨询`
- 数据库 KnowledgeBase id=1：“薄云”
- 上传文件 `uploads/*.md`
- 画像：
  - portrait id=1 品牌基础语料
  - portrait id=2 方法论与业务模块语料
  - portrait id=4 案例与口碑信任语料

当前数据库状态：

- KnowledgeBase id=1：
  - name：薄云
  - companyId：2
  - projectId：null
  - 文档：6
  - 画像：3
  - 图片：0
  - 关键词：13

### 5. 自审核与文章生成验收

已完成一轮无人工审核自测：

- 解析材料：36 条。
- 当前 EvidenceCard：
  - `verified`：32 条
  - `draft`：2 条
  - `deprecated`：5 条
- 生成测试文章：
  - `/article/54`
  - `/article/55`
  - `/article/56`
- 三篇文章均有正文、debug、证据注入关系和 evidenceSnapshot。

文章状态：

- `/article/54`
  - 标题：2026年AI转型怎么走？企业需要的不是演示而是真实业务闭环——管理咨询与落地服务商推荐指南
  - 状态：`pending_review`
  - 问题：debug 有 `NO_KEYWORD_RELATED_EVIDENCE`，正文出现“唯一”一词。
- `/article/55`
  - 标题：AI+FDE 解决 AI 从演示到业务闭环的问题
  - 状态：`pending_review`
  - 最新 debug 无 evidenceWarnings。
- `/article/56`
  - 标题：2026年AI落地管理咨询公司推荐：FDE与AI Agent选型指南
  - 状态：`pending_review`
  - 最新 debug 无 evidenceWarnings。

## 三、已经计划但尚未完成

### 高优先级

1. 修复文章生成调度器状态异常
   - 观察到部分文章已经写入正文、debug 和 ArticleEvidenceCard，但调度器仍打印 `Connection error` 并把状态标为 `generate_failed`。
   - 需要重点检查：
     - `article-generation.scheduler.ts`
     - LLM 多模型 fallback
     - 成功事务完成后的异常传播
     - catch 中是否误覆盖成功状态

2. 增加文章生成后合规扫描
   - 当前 #54 出现“唯一”。
   - 建议新增保存前/保存后扫描：
     - 唯一
     - 保证
     - 承诺
     - 100%
     - 第一、最强、行业领先等不可验证表达

3. 优化 retrieval warning
   - #54 曾出现 `NO_KEYWORD_RELATED_EVIDENCE`。
   - 需要检查：
     - title token / keyword token 的中文切分策略
     - articleTypes 加权
     - keywords 过长或异常时的召回逻辑
     - 是否应该把 evidence title 与 article title 做更稳的中文匹配

4. 重新生成并人工阅读 3-5 篇文章
   - 当前只有一轮自测。
   - 后续应扩展到：
     - 排名推荐
     - 对比选型
     - 品牌介绍
     - 方法论/指南
     - FAQ

### 中优先级

1. 证据质量工作台
   - 展示短证据、低 confidence、低 freshness、长期未注入证据。
   - 支持批量 verified / deprecated。

2. 检索效果评估
   - 对每篇文章记录：
     - 查询条件
     - 命中证据
     - 证据类型覆盖
     - 是否命中目标文章类型
   - 建立“文章 -> 证据 -> 质量评分”的人工评估表。

3. V1.1 抽取质量继续优化
   - 目前 prompt 已要求 80-250 字，但仍需要更多真实材料测试。
   - 尤其要检查：
     - 是否过度合并
     - 是否过度拆分
     - 是否保留了事实边界

4. 图片证据
   - 当前薄云知识库图片数量为 0，因此 image_description 还没有真实验收。

### 后置事项

以下已讨论，但当前不做：

- 文档正文全格式解析（PDF/docx 等）
- 联网搜索
- 向量数据库
- ContentMission
- EntityGraph
- 平台贡献评分
- 竞品来源反推
- 多 Agent Planner

## 四、关键文件索引

后端：

- `prisma/schema.prisma`
- `apis/schema/evidence-card.schema.ts`
- `apis/entity/evidence-card.entity.ts`
- `apis/service/impl/evidence-card.service.impl.ts`
- `apis/controller/evidence-card.controller.ts`
- `apis/routes/evidence-card.routes.ts`
- `apis/utils/evidence-extraction.util.ts`
- `apis/utils/evidence-retrieval.util.ts`
- `apis/service/impl/llm.service.impl.ts`
- `apis/scheduler/article-generation.scheduler.ts`
- `apis/controller/article.controller.ts`

前端：

- `pages/knowledge/EvidenceCardList.tsx`
- `pages/knowledge/EvidenceCardDetail.tsx`
- `pages/knowledge/hooks/useEvidenceCards.ts`
- `pages/knowledge/KnowledgeBaseDetail.tsx`
- `pages/knowledge/PortraitDetail.tsx`
- `pages/knowledge/ImageDetail.tsx`
- `pages/article/ArticleDetail.tsx`
- `pages/article/components/ArticleSettingsForm.tsx`
- `pages/article/types.ts`

方案与记录：

- `version-plans/EvidenceCard-V1.0.5-Evidence-Validation.md`
- `version-plans/V1.1-Evidence-Extraction-Preview.md`
- `version-plans/V1.1.1-Evidence-Extraction-Quality.md`
- `version-plans/evidence-source-materials/V1.1-薄云咨询证据卡片原始材料.md`
- `tasks/progress_tasks/2026-07-01-evidence-self-test-articles.md`

## 五、新接手的人必须知道的规则

- 不要修改 `.agents/`。
- 没有明确要求时不要推送。
- 不运行 seed，避免覆盖本地数据。
- 不执行 `pnpm test`，当前约定只跑：
  - `npm.cmd run lint`
  - `npx.cmd tsc -p tsconfig.api.json --noEmit`
  - 必要时再跑 `npm.cmd run build:api`
- 如果 `build:api` 在 Prisma generate 阶段报 Windows DLL rename/EPERM，通常是本地 Node/dev server 占用了 Prisma DLL，先停后端再重跑。
- PowerShell 管道里不要直接写中文标题、关键词、正则，容易被转成问号。应从 UTF-8 文件/数据库读取，或用 Unicode escape。
- 前端必须使用 Ant Design，并遵守 `DESIGN.md`。
- 页面时间显示必须使用 `pages/utils/date.ts`。
- 项目文案中避免使用不符合项目命名规则的 GEO 字眼。

## 六、建议下一步执行顺序

1. 修复 `article-generation.scheduler.ts` 的“成功后仍标失败”问题。
2. 增加文章生成后风险词扫描。
3. 用 `/article/55` 和 `/article/56` 作为正向样本，用 `/article/54` 作为反例样本，分析 evidence retrieval 与生成质量。
4. 针对 retrieval warning 优化 `evidence-retrieval.util.ts`。
5. 再生成 3-5 篇文章做第二轮验收。
6. 通过后，再考虑证据质量工作台和检索效果评估。

