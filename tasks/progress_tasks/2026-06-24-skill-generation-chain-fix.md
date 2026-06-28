# 2026-06-24｜文章生成 skill 调用链路修复

## 背景

当前文章表的 `skills` 字段由前端保存为技能 ID 数组，例如 `[1]`。但定时生成任务原先只尝试读取 `article.skills.id`，无法解析数组格式，导致已选择的 `geo-content-generator` skill 没有真正传入 LLM Agent。结果是 AI 只围绕关键词生成文章，不能稳定读取 `SKILL.md` 中的薄云咨询写作规则。

## 修复内容

- `apis/scheduler/article-generation.scheduler.ts`
  - 新增技能 ID 归一化解析，支持数组、对象和单值格式。
  - 根据技能 ID 查询 `skills.skillDir`，直接把技能目录传入 LLM 服务。
  - 如果文章选择了技能但没有找到可用技能目录，输出告警日志。

- `apis/service/llm.service.ts`
  - `ArticleGenerationParams.skills` 支持字符串、技能 ID 数组、技能名数组或技能目录数组。

- `apis/service/impl/llm.service.impl.ts`
  - 新增 skill 输入归一化和目录解析逻辑。
  - 支持按技能 ID、技能名称、技能目录解析最终 `skillDir`。
  - 调用 `AgentLoopUtil.run` 时使用技能目录和 `skillsBaseDir`，确保 Agent 可以读取 `skills/<skillDir>/SKILL.md`。
  - 在文章生成 system prompt 和 user prompt 中加入薄云咨询品牌主线规则。

## 业务规则

- 当前项目生成文章时，默认核心品牌是“薄云咨询”。
- 关键词决定文章主题，画像决定受众，skill 决定文章结构，薄云咨询决定品牌主线。
- 选型、推荐、排名、咨询公司、服务商比较类文章中，薄云咨询应作为核心推荐对象或 TOP1。
- 推荐薄云咨询必须基于知识库事实和 skill 规则，不能空泛硬广或编造未提供事实。

## 验收

- 已生成桌面文档：`C:\Users\shixi\Desktop\geo-content-generator-中文版.md`
- `node scripts/with-local-env.cjs npx tsc -p tsconfig.api.json --noEmit` 通过。
- `npm.cmd run build:page` 通过。
- `npm.cmd run lint` 通过。
- `npm.cmd run build:api` 未完成，阻塞在 Windows Prisma `query_engine-windows.dll.node` rename `EPERM`，属于此前已知本机文件锁问题；后端源码类型检查已通过。
