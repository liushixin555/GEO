# 2026-06-25 已发布文章 AI 引用诊断隐藏后台

## 功能说明

- 复用 `geo-monitorv12` 的题库和多平台联网搜索采集思路，为已发布文章建立 AI 引用诊断能力。
- 新增隐藏后台入口：长按侧边栏品牌名“薄云商机倍增服务”5 秒进入 `/citation-diagnosis`，侧边栏不公开展示入口。
- 隐藏后台以发布台账为主视图，展示发布时间、发布平台、文章标题、主题词、语义标签、文章类型、发布渠道类型、发布链接、发布人、状态、是否有被引用记录。

## 后端规则

- 题库优先读取 `geo-monitorv12/GEO/题库/供应商题库A.md` 和 `供应商题库B.md`，不存在时使用内置兜底问题。
- 多平台采集优先使用系统内已启用 LLM 配置；缺失时允许本地读取 `geo-monitorv12/GEO/geo_monitor_v8_package 2/config.py` 作为兜底。
- 兜底 API Key 只在后端运行时读取，不写入 Git、不返回前端、不打印完整 Key。
- AI 返回的引用 URL 继续使用 `normalizeCitationUrl` 标准化，并写入已有的 `article_model_citation_marks` 永久标签表。
- 同一文章被某模型命中过一次后永久保留该模型标签，后续命中只累计次数和最近命中时间。

## 软盟同步

- 软盟订单同步时会从订单详情和响应消息中提取最终发布 URL。
- 如果提取到 URL，则自动写入 `published_article_links`。
- 如果未提取到 URL，则不阻断原有订单同步，隐藏后台显示为“待补发布链接”。

## 验证

- `npm.cmd run build:page` 通过。
- `node scripts/with-local-env.cjs npx tsc -p tsconfig.api.json --noEmit` 通过。
- `npm.cmd run lint` 通过。
- `npm.cmd run build:api` 在 Prisma generate 阶段遇到 Windows 文件占用 `EPERM query_engine-windows.dll.node`，未进入 TypeScript 编译；该问题通常需要关闭正在运行的 Node/Prisma 进程后重试。
