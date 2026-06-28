# 项目规则与踩坑记录

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
