# 引用诊断表缺失修复与容错优化

## 问题

进入检测管理时报“获取引用诊断数据失败”，数据库报错显示 `public.published_article_links` 不存在。后续 `ai_citation_detection_runs`、`article_model_citation_marks` 等表相关错误都是同一原因导致的连锁反应：引用诊断 migration 尚未应用到本地数据库。

## 处理结果

- 已确认并应用 `20260624000001_add_ai_citation_diagnosis` migration。
- 数据库当前已存在以下表：
  - `published_article_links`
  - `ai_citation_detection_runs`
  - `ai_citation_records`
  - `article_model_citation_marks`
- `prisma migrate status` 显示数据库 schema 已是最新。

## 代码优化

- 检测诊断服务改为使用 `$queryRaw` / `$executeRaw` 访问新增表。
- 这样即使 Windows 下 `npm.cmd run db:generate` 被运行中的 Node 进程锁住 Prisma DLL，也不会因为 Prisma Client delegate 未生成而导致检测接口不可用。
- 检测页数据加载从 `Promise.all` 改为 `Promise.allSettled`：
  - 单个接口失败不再导致整个检测页完全不可用。
  - 错误提示会明确指出是“发布链接 / 检测记录 / 引用标签”哪一部分失败。
- 表格空状态改为中文。

## 验证

- `node scripts/with-local-env.cjs npx prisma migrate status`：数据库 schema up to date。
- SQL 检查确认 4 张引用诊断表均存在。
- smoke 测试通过：
  - 新增临时发布链接。
  - 新增临时检测记录。
  - URL 规范化后成功匹配。
  - `article_model_citation_marks` 成功写入永久标签。
  - 测试数据已清理。
- `tsc --noEmit --project tsconfig.api.json` 通过。
- `tsc --noEmit --project tsconfig.page.json` 通过。
- `npm.cmd run lint` 通过。

## 后续优化建议

1. 增加检测模块状态接口，前端进入页面前显示数据库表、模型适配器、发布链接数据是否就绪。
2. 发布成功后自动把真实发布链接写入 `published_article_links`，减少手工录入。
3. 接入真实 AI 引用抓取适配器，优先接支持 citations/search references 的模型。
4. 增加 URL 人工确认匹配能力，处理短链、跳转链、移动端特殊链接。
5. 在文章管理或发布管理列表中展示“被某模型引用”的累计标签。
