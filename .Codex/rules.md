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
