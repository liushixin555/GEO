# 项目规则与踩坑记录

## 2026-06-30 EvidenceCard 文章生成规则

- 文章生成时必须由后端实时检索 EvidenceCard，并以实际检索结果作为 prompt 注入和 debug / ArticleEvidenceCard 写入依据；前端预览只能作为预览，不能作为最终依据。
- EvidenceCard V1 不做联网搜索、不做向量库、不做 ContentMission、不判断模型实际用了哪条证据。
- ArticleEvidenceCard V1 只写 `usageType = injected`；重复生成时用 `[articleId, evidenceCardId]` upsert，禁止重复插入同一文章与同一证据关系。
- ArticleGenerationDebug 的 `retrievedEvidenceCards` 必须是 compact snapshot，禁止保存超长全文；证据不足时写 `evidenceWarnings`，但不阻塞文章生成。

## 2026-06-24 上传前整理

- `.env`、`.env.local`、`.env.development.local` 只能作为本地配置文件使用，必须由 `.gitignore` 忽略，不应继续提交到远程仓库。
- LLM 模型配置接口返回的 `api_key` 是掩码值 `****`，编辑保存时不能把掩码重新加密写回数据库；后端也需要兜底忽略 `****`，避免覆盖真实 API Key。
- Windows 下 `npm.cmd run build` 可能在 `prisma generate` 阶段遇到 `query_engine-windows.dll.node` rename 的 `EPERM` 文件锁问题；可先用 `npm.cmd run lint`、`npx tsc -p tsconfig.api.json --noEmit`、`npm.cmd run build:page` 分别验证源码。

## 2026-06-24 文章生成 skill 链路
- 文章表的 `skills` 字段由前端保存为技能 ID 数组，例如 `[1]`；生成任务必须先解析 ID，再根据 `skills.skillDir` 加载 `skills/<skillDir>/SKILL.md`，不能只按技能名称字符串匹配。
- 当前项目生文核心品牌是“薄云咨询”：关键词决定主题，画像决定受众，skill 决定结构，薄云咨询决定品牌主线；选型/推荐/排名类文章应以薄云咨询作为核心推荐对象。
- 如果技能上传包带有同名顶层目录，实际 SKILL 可能落在 `skills/<skillDir>/<skillDir>/SKILL.md`；生成链路必须自动兜底识别这类一层内嵌目录，避免只传 `skills/<skillDir>/SKILL.md` 而读取失败。
- 文章生成保存前必须清理 Agent 过程性说明，例如 `Now I have... Let me write...`、`下面是文章正文` 等，确保入库内容从文章标题或正文开始。
- 文章生成图片必须可控：只允许使用文章设置中已选的知识库图片；未选图片时不得传入项目全部图片，也必须在保存前过滤模型编造的 Markdown 外部图片链接。
- 文章表格问题优先用后处理修复，不要在生文提示词中追加过重的表格硬规则，避免模型输出“规则检查/完成报告”而不是文章正文。

## 2026-06-25 AI 引用诊断隐藏后台

- 引用诊断第一版复用 `geo-monitorv12`：题库从 `geo-monitorv12/GEO/题库/供应商题库A.md`、`供应商题库B.md` 读取；多平台采集参数参考 `geo_monitor_v8_package 2`。
- 多平台引用检测 API Key 优先读取系统 LLM 配置；缺失时允许运行时读取 `geo-monitorv12/GEO/geo_monitor_v8_package 2/config.py` 作为本机兜底，但不得写入 Git、不得返回前端、不得打印完整 Key。
- 引用命中沿用 `article_model_citation_marks` 永久标签规则：某文章被某模型引用过一次后保留模型标签，后续未命中不能删除标签。
- 软盟订单同步提取到最终发布 URL 时写入 `published_article_links`；软盟未返回 URL 时保留原同步流程，隐藏后台展示“待补发布链接”。
- `/citation-diagnosis` 是隐藏后台路由，不放入侧边栏；入口为长按侧边栏品牌名 5 秒。

## 2026-06-29 知识库画像内容校验

- 知识库画像 `content` 后端参数校验上限为 300000 个字符；边界测试必须保持一致，避免长画像资料在保存时被 10000 字符旧限制拦截。

## 2026-06-29 启动脚本

- 桌面和项目根目录的 `启动项目.bat` 必须使用 `npm run dev:api` 启动后端源码，禁止再用 `node dist/apis/server.js` 作为日常开发入口，避免旧编译产物覆盖最新源码行为。

## 2026-06-30 EvidenceCard V1 规则

- EvidenceCard V1 是知识库证据化第一版，只要求完成证据卡片 CRUD、文章生成前检索、prompt 注入、debug 记录、ArticleEvidenceCard 注入关系和文章详情展示。
- ArticleEvidenceCard V1 第一阶段只写 `usageType = injected`，暂不落库 `retrieved` / `rejected`。
- ArticleEvidenceCard 必须使用 `[articleId, evidenceCardId]` 唯一约束，禁止同一文章重复关联同一证据卡片。
- EvidenceCard.keywords 入库前必须规范为 `string[]`：只保留字符串、trim、过滤空字符串、去重。
- 前端“预计注入证据”只作为预览，不作为最终文章生成依据；最终结果以后端生成时实时检索和实际注入记录为准。
- 文档正文抽取、联网搜索、ContentMission、EntityGraph 后置，不进入 V1 验收范围。

## 2026-06-30 EvidenceCard V1 数据模型

- EvidenceCard V1 只落数据模型与迁移时，不新增业务接口和前端；`EvidenceCard.keywords` 使用 `Json?`，后续 service 层需规范为字符串数组。
- `ArticleEvidenceCard` 唯一约束必须保持为 `[articleId, evidenceCardId]`，不要把 `usageType` 放进唯一键；V1 实际只写 `injected`，但枚举保留 `retrieved` / `injected` / `rejected`。
- `ArticleGenerationDebug` 用 `retrievedEvidenceCards`、`evidenceRetrievalQuery`、`evidenceWarnings` 记录证据检索快照、检索条件和告警。

## 2026-06-30 EvidenceCard V1.0.5 证据验证规则

- EvidenceCard status 默认 `draft`；正式文章生成 retrieval 默认只检索 `verified`，不要让未审核证据进入正式 prompt。
- `verifiedAt` / `verifiedBy` 只在 status 从非 `verified` 改为 `verified` 时写入；从 verified 改为 draft/deprecated 时保留历史审核痕迹。
- `articleTypes` 必须像 `keywords` 一样在 service 层规范为字符串数组；为空时默认 `["general"]`。
- `ArticleEvidenceCard.evidenceSnapshot` 必须保存生成当次注入 prompt 的 compact snapshot，不能依赖后续被编辑过的 EvidenceCard 当前值来还原历史。
- `injectedCount` / `lastInjectedAt` 不反写主表，统一通过 `ArticleEvidenceCard` 查询时聚合。
- `ArticleGenerationDebug.evidencePromptPreview` 和 `evidenceStats` 用于 Prompt Inspection，只做可观察，不代表模型实际 used 判断。

## 2026-06-30 EvidenceCard V1.1 抽取预览规则

- V1.1 统一抽取接口为 `POST /api/v1/evidence-cards/extract`。
- `save=false` 只返回候选预览，不写入 EvidenceCard，也不影响正式文章生成 retrieval。
- `save=true` 只能把候选保存为 `draft`，抽取结果不得直接成为 `verified`。
- `manual-text` 是最高优先级来源；portrait/image 只能作为次优先候选来源。
- 抽取候选必须避免空泛营销表达，缺少具体事实支撑的口号不应成为 EvidenceCard。
- 未授权客户名、未证实数据、资质、荣誉、排名或案例不得被抽取为证据。
- 文档正文解析、联网搜索、external evidence 自动采集、ContentMission、EntityGraph 后置，不进入 V1.1。
- 第一批验收按 30 条原始材料 -> 20 条 `verified` EvidenceCard -> 3-5 篇文章重生成执行。
- V1.1 交接方案以 `version-plans/V1.1-Evidence-Extraction-Preview.md` 为准，任务记录见 `tasks/progress_tasks/2026-06-30-evidence-extraction-v11.md`。

## 2026-06-30 EvidenceCard V1.1 抽取规则

- EvidenceCard 自动抽取的 LLM 输出永远不可信，必须先经过 JSON fence 剥离、JSON.parse 防御、字段枚举校验、数组规范化、分数钳制和候选过滤。
- 抽取候选不得直接入库，不得把模型生成的 `verified` 当作有效审核状态；所有自动抽取结果必须强制为 `draft`。
- 自动抽取不得保留空泛营销表达，例如“专业可靠、经验丰富、助力企业发展、提升竞争力、行业领先、优质服务”等；候选必须能支撑具体事实、方法、流程、场景、案例、数据、客户问题或服务能力。
- `save=true` 可以接收前端人工编辑后的 `candidates`，但后端仍必须二次清洗、去重并强制保存为 `draft`；前端预览结果不能绕过 service 层校验。

## 2026-06-30 EvidenceCard V1.1.1 LLM 抽取规则

- `POST /api/v1/evidence-cards/extract` 自动抽取路径优先调用 LLM 抽取；LLM 未配置、调用失败、输出不可解析或无有效候选时，必须回退 deterministic 抽取。
- LLM prompt 必须要求只输出 `{ "cards": [...] }` JSON，最多 8 条；材料不足返回空数组；不得编造客户、数据、资质、荣誉、排名、案例、合作结果或承诺。
- 每条候选应带 `extractionReason`，存在事实边界或授权风险时带 `warnings`，并随接口结果返回给前端预览。
- parser 必须把 LLM 输出当作不可信输入处理：fence 剥离、JSON.parse 防御、非法枚举丢弃、数组规范化、分数钳制、`verified` 强制降为 `draft`。

## 2026-06-30 EvidenceCard V1.1.1 抽取质量规则

- LLM 抽取只是候选生成，不是事实确认；不得用模型输出替代人工审核，也不得允许模型直接生成 `verified`。
- deterministic fallback 必须保留，LLM 配置缺失、调用失败、超时或输出不可解析时仍要有稳定兜底，并继续遵守候选过滤规则。
- `save=false` 只做候选预览，绝不写入 EvidenceCard、ArticleEvidenceCard 或 ArticleGenerationDebug，也不影响正式文章生成 retrieval。
- `save=true` 只能保存 `draft`；请求体或模型输出中的 `verified` 必须被忽略或降级。
- portrait 抽取只读取画像 `title/content`；image 抽取只读取图片 `title/description/imageUrl`，不得从文本字段之外推导业务事实。
- 真实材料验收仍按 30 条原始材料 -> 20 条 `verified` EvidenceCard -> 3-5 篇文章重生成执行，未跑完前不得宣称文章质量已改善。
- V1.1.1 交接方案见 `version-plans/V1.1.1-Evidence-Extraction-Quality.md`，任务记录见 `tasks/progress_tasks/2026-06-30-evidence-extraction-v111.md`。
## 2026-07-01 EvidenceCard V1.1 抽取正文长度规则

- EvidenceCard 自动抽取的 `content` 默认应为 2-5 句话、约 80-250 个中文字符，用于保留事实、方法、流程、场景、能力或案例的必要上下文；不要把证据压缩成一句口号。
- LLM 抽取和 deterministic fallback 都不得为了凑长度编造材料中没有的信息；短证据候选可以保留，但应提示人工复核后再审核为 `verified`。

## 2026-07-01 文章生成状态与风险词规则

- 文章生成调度器捕获单篇异常后，写入 `generate_failed` 前必须先回读确认是否已经存在已提交的生成结果；若文章状态已离开 `generating`，或版本/ArticleVersion/带版本 debug 显示生成成功，不得覆盖为失败。
- 基础风险词 warning 只作为人工审核提示，不阻塞文章生成，不改变 EvidenceCard retrieval、ArticleEvidenceCard `injected` 写入或 `qualityPassed` 判定。
- 当前基础风险词包括：`唯一`、`保证`、`确保`、`承诺`、`绝对`、`最佳`、`第一`、`No.1`、`100%`/`百分之百`、`行业领先`。
## 2026-07-01 引用诊断编码规则

- 引用诊断模块的后端错误信息、日志、检测问题、prompt、平台名称、题库路径和前端页面文案必须以 UTF-8 中文原文保存，禁止提交常见 mojibake 片段。
- 引用诊断题库路径固定为 `geo-monitorv12/GEO/题库/供应商题库A.md` 和 `geo-monitorv12/GEO/题库/供应商题库B.md`；路径乱码会导致无法读取题库。
- Windows PowerShell 默认输出可能把正确 UTF-8 中文显示为乱码，排查时优先用 `rg` 或显式 UTF-8 输出确认源码实际内容。
- 修改引用诊断中文文案后必须运行 `tests/apis/citation-diagnosis-encoding.test.js` 对关键文件做乱码防回归扫描。

## 2026-07-01 引用诊断来源解析规则

- run-auto 的检测问题应模拟真实用户咨询，不要使用“是否被引用”这类检测口吻。
- 自动检测 prompt 不得把我方已发布 URL 直接提供给模型，也不得强迫或诱导模型引用我方链接。
- 引用命中只能基于 URL 标准化匹配；没有 URL 的标题、来源名、摘要或模型口头提及不能算作命中。
- `extractSources` 应兼容嵌套的 sources/citations/references/search_results/Responses annotations 等结构，并保留 raw/snippet/index 供存库追溯。
- 缺少 API Key 或模型配置应返回 `skipped`，单模型 API 报错应返回 `error`；二者都不能阻断同批次其他模型检测。

## 2026-07-01 引用检测 V1.2 自动检测规则

- 发布链接写入 `published_article_links` 后，引用检测必须异步执行，不得阻塞发布或订单同步流程。
- 自动检测默认每 30 分钟扫描一次，每轮最多处理 5 条发布链接；每条最多 2 个问题，模型范围为系统 LLM 中全部启用、未删除且配置完整的模型。
- `ai_citation_detection_runs.target_article_link_id` 是 articleLink 级 24 小时防重复依据，不能只按 articleId 去重。
- 单条发布链接检测失败不得影响同批次其他链接；平台 `skipped` 代表缺模型配置或 API Key，不算系统失败。
- 自动检测日志不得打印 API Key、完整请求配置或其他敏感信息。

## 2026-07-01 文章生成 Prompt Builder 规则

- 文章生成 prompt 组装归口到 `apis/utils/article-prompt-builder.util.ts`；`llm.service.impl.ts` 继续负责模型调用、EvidenceCard retrieval、debug 写入、重写和修复流程。
- Prompt builder 只负责组装 prompt 和 skill 专属规则，不得把 EvidenceCard 检索逻辑迁入 builder。
- Builder 必须返回最终 `systemPrompt` / `userPrompt` / `requiredReferenceFiles` / `promptWarnings`，并保留 `evidencePromptSection` 和 `evidenceStats` 供 debug 追溯。
- 按 skill 拆分时先保持文章生成行为一致，再逐步补齐 ranking / comparison / guide / faq / brand / case 等专属规则，避免文章质量退化。

## 2026-07-01 一键启动脚本规则

- 桌面一键启动脚本必须先确认 PostgreSQL ready，再启动后端源码 dev server；否则登录接口可能因数据库启动/恢复中的异常被统一包装成“用户名或密码错误”。
- 后端启动后应等待 `/api/health` 返回 200 再打开前端页面，避免用户过早登录触发假性失败。
- VS Code / package `dev:api` 启动路径也必须先执行数据库就绪检查；数据库不可达时应在后端启动前失败并给出 PostgreSQL 未就绪提示，避免前端登录页误导用户排查账号密码。
## 2026-07-02 引用诊断固定检测问题规则

- `/citation-diagnosis` 自动检测问题必须来自 `apis/utils/citation-question-bank.util.ts` 内置的 30 条固定题库，按 `question_count` 顺序截取；不得再由文章标题或关键词生成动态问题抢占名额。
- 诊断固定题库不再读取 `geo-monitorv12/GEO/题库/供应商题库A.md` 或 `供应商题库B.md`，避免外部题库覆盖当前诊断管理指定问题。
- “GEO服务商推荐”在该题库中是用户检索意图原文，仅用于检测问题样本，不代表项目产品命名规则放宽。
## 2026-07-03 发布后检测闭环规则

- 发布后引用检测只扫描 `published_article_links`；发布成功后必须有软盟订单或发布链接作为追踪锚点。
- 手动把发布计划标记为 `published` 前必须已存在 `publishing_platform_orders` 或 `published_article_links`。
- `published_article_links` 写入必须按 `article_id + normalized_url` upsert，避免同一文章同一链接重复检测。
- 自动检测 run 必须写入 `target_article_id` 与 `target_article_link_id`；平台 `skipped` 不算系统失败。
- 引用检测模型默认来自启用的系统 LLM 配置，入库标识使用 `${provider}:${modelName}`；OpenAI 兼容 baseUrl 必须规范到 `/chat/completions` 后再请求。

## 2026-07-03 引用检测延迟与发布链接规则

- `ruan.net` 及其子域名是软盟后台/订单/稿件系统链接，不是最终公开发布链接；不得写入 active `published_article_links`，也不得触发引用检测。
- 自动引用检测只扫描真实公开发布链接，并要求链接写入或更新满 24 小时后再检测，避免平台尚未发布或 AI 检索尚未收录时提前打空。
- `published_article_links.normalized_url` 必须与 `normalizeCitationUrl()` 保持一致，不带 `http(s)://` 协议前缀；历史数据需通过迁移或兼容匹配处理。
- 模型 HTTP 400 需要记录 provider 返回的简短错误详情；默认请求体优先使用标准 OpenAI chat completions 字段，谨慎添加厂商扩展字段。

## 2026-07-03 Git 推送规则

- 用户明确要求：以后项目中未明确要求推送时，任务结束只执行本地 commit，不执行 `git push`。

## 2026-07-03 软盟最终发布链接迟到规则
- 软盟订单同步不能只扫描 `rm_status = 0`；近 7 天内尚无公开发布链接的订单必须继续轮询，避免订单状态先变化、最终 URL 后返回时漏入库。
- `response_message`、`url`、`link`、`publish_url`、`article_url`、`source_url` 或完整响应体中只要出现非 `ruan.net` 公开 URL，就应规范化后 upsert 到 `published_article_links`。
- 每次软盟订单同步都要清理同文章/同计划下的 `ruan.net` 内部稿件链接；这类链接只能显示为待补，不得触发引用检测。

## 2026-07-03 引用检测来源过滤规则
- 引用来源必须是可作为引用依据的公开网页 URL；`ruan.net` / `*.ruan.net`、图片 CDN、静态资源 URL 不得作为 citation source 入库，也不得参与命中。
- 引用命中仍只按标准化 URL 匹配 `published_article_links`；模型回答中只提到标题、品牌名、摘要或非 URL “参考”文本时不得计为命中。

## 2026-07-05 Raw SQL JOIN 字段限定规则
- Prisma `$queryRaw` 中只要使用 JOIN，SELECT / ORDER BY / WHERE 里的 `id`、`created_at`、`updated_at` 等常见重复字段必须加表别名，避免 PostgreSQL `42702` 字段歧义。

## 2026-07-05 检测台账指标规则
- 检测执行状态来自 `ai_citation_detection_runs`，引用命中状态来自 `article_model_citation_marks`，两个指标不能混用。
- 台账列表必须展示“检测情况”，即使当前命中次数为 0，也要让用户看到是否已检测、检测轮次、来源记录数和最近检测时间。
- 检测轮次聚合如需 join `ai_citation_records`，必须用 `COUNT(DISTINCT run.id)` 统计 run 数。

## 2026-07-05 引用来源 URL 清洗规则
- `ai_citation_records.source_url` 入库前必须清理 markdown 列表尾巴、换行转义和智能引号，避免 `https://domain\n-`、`https://domain”` 这类脏 URL 污染台账。

## 2026-07-05 引用检测模型 temperature 兼容规则
- 引用检测默认请求体保持标准 OpenAI chat completions 字段和 `temperature=0.2`。
- 若模型明确返回 `invalid temperature` 且只允许 `1`，采集器可以对同一次请求重试一次 `temperature=1`。
- 该重试只解决模型参数兼容问题；命中仍必须按标准化 URL 匹配发布链接，不能把文本提及算作命中。
