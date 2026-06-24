# 项目规则与踩坑记录

## 2026-06-24 上传前整理

- `.env`、`.env.local`、`.env.development.local` 只能作为本地配置文件使用，必须由 `.gitignore` 忽略，不应继续提交到远程仓库。
- LLM 模型配置接口返回的 `api_key` 是掩码值 `****`，编辑保存时不能把掩码重新加密写回数据库；后端也需要兜底忽略 `****`，避免覆盖真实 API Key。
- Windows 下 `npm.cmd run build` 可能在 `prisma generate` 阶段遇到 `query_engine-windows.dll.node` rename 的 `EPERM` 文件锁问题；可先用 `npm.cmd run lint`、`npx tsc -p tsconfig.api.json --noEmit`、`npm.cmd run build:page` 分别验证源码。

## 2026-06-24 文章生成 skill 链路
- 文章表的 `skills` 字段由前端保存为技能 ID 数组，例如 `[1]`；生成任务必须先解析 ID，再根据 `skills.skillDir` 加载 `skills/<skillDir>/SKILL.md`，不能只按技能名称字符串匹配。
- 当前项目生文核心品牌是“薄云咨询”：关键词决定主题，画像决定受众，skill 决定结构，薄云咨询决定品牌主线；选型/推荐/排名类文章应以薄云咨询作为核心推荐对象。