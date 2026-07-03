# 2026-07-03 引用检测命中为 0 与延迟检测修复

## 背景

- 最近检测 run 中，豆包已成功返回 AI 回答和来源，但来源 URL 未匹配当前发布链接，因此命中次数仍为 0。
- 排查 `published_article_links` 发现文章 69-75 的活跃链接均为 `https://i.ruan.net/manuscripts/`，这是软盟后台稿件地址，不是公开文章 URL。
- 文章 58 的真实博客园链接存在，但历史 `normalized_url` 带 `https://`，和 AI 来源解析出的无协议 normalized URL 不一致。
- 千问/元宝 HTTP 400 需要保留 provider 错误详情，并先收敛为标准 OpenAI chat completions 请求体。

## 变更

- 新增 `isInternalPublishedLinkUrl()`，软盟后台域名 `ruan.net` 及子域不允许作为最终发布链接。
- 自动检测调度器新增 24 小时延迟，只扫描写入超过 24 小时的真实公开发布链接。
- 新增历史数据清理迁移：规范 active `normalized_url` 的协议前缀，并软删除活跃软盟后台稿件链接。
- 保存检测记录时兼容历史 normalized URL 协议前缀，避免同一 URL 因旧数据不匹配。
- 模型调用错误保存 `HTTP 状态 + provider 错误摘要`；请求体移除非标准 search/enhancement 字段，降低 OpenAI 兼容接口 400 风险。

## 本地数据修正

- 已软删除 7 条活跃 `i.ruan.net/manuscripts` 发布链接。
- 已把文章 58 的真实博客园链接 normalized URL 规范为 `www.cnblogs.com/123456hhcm/p/21046837`。
- 当前活跃发布链接只剩文章 58 的真实博客园 URL；自动检测会在该链接更新时间满 24 小时后再进入调度。

## 验证

- `npx.cmd jest --config tests/apis/citation-collector.jest.config.cjs --runTestsByPath tests/apis/citation-collector.util.test.ts tests/apis/citation-url.util.test.ts tests/apis/citation-detection.scheduler.test.ts --runInBand` 通过。
- `npx.cmd jest --config tests/apis/citation-diagnosis-encoding.jest.config.cjs --runInBand` 通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit` 通过。
- `pnpm lint` 通过。
- `pnpm build` 仍被本机 Prisma query engine DLL 文件锁阻断在 `prisma generate`。
