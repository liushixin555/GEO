# 2026-07-03 引用检测来源过滤与命中加固

## 背景

检测详情中出现模型有回答但没有可用引用来源，或来源中混入软盟后台稿件链接、图片 CDN 等无效 URL。这类 URL 不能代表公开发布来源，也不能参与文章命中判定。

## 变更

- `citation-collector` 在来源抽取入口过滤 `ruan.net` 及其子域名。
- 来源抽取过滤图片、脚本、样式、字体、音视频、PDF 等静态资源 URL。
- 来源抽取过滤 `byteimg.com` 及其子域名，避免把搜索结果图片 CDN 当作引用来源。
- `saveDetectionRun` 的命中查询再次排除 `ruan.net` 及其子域名，防止历史脏数据被误判为命中。
- 补充专项回归用例，覆盖真实网页来源、软盟后台 URL、图片 CDN 混合时只保留公开网页来源。

## 验证

- `npx.cmd jest --config tests/apis/citation-collector.jest.config.cjs --runTestsByPath tests/apis/citation-collector.util.test.ts --no-cache`
- `npm.cmd run lint`
- `npx.cmd tsc -p tsconfig.api.json --noEmit`
