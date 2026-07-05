# 2026-07-05 检测台账列表补充检测情况

## 背景

检测管理页面只展示 `article_model_citation_marks` 聚合出的引用模型和命中次数。实际已经生成 `ai_citation_detection_runs` 的文章，如果尚未命中公开发布 URL，列表仍显示“暂无/0”，用户会误判为没有检测。

## 根因

- 引用命中与检测执行是两个不同指标。
- 后端 `listLedger()` 只返回命中模型和命中次数，未返回检测轮次、来源记录数和最近检测时间。
- 前端列表没有“检测情况”列，无法区分“待检测”“已检测但未命中”“待补发布链接”。

## 修复

- `listLedger()` 增加 `ai_citation_detection_runs` 聚合，返回 `detection_run_count`、`citation_record_count`、`last_detection_at`。
- 聚合检测轮次时使用 `COUNT(DISTINCT run.id)`，避免 join records 后放大 run 数。
- 台账列表新增“检测情况”列，显示“待补链接 / 待检测 / 已检测 N 轮”。
- 详情描述和 CSV 导出同步包含检测情况字段。

## 验证

- `npx.cmd jest --config tests/apis/citation-collector.jest.config.cjs --runTestsByPath tests/apis/citation-diagnosis-ledger.service.test.ts --no-cache`
- service 级查询确认文章 58、71、75 等返回检测轮次；未检测文章返回 0。
- `npm.cmd run lint`
- `npx.cmd tsc -p tsconfig.api.json --noEmit`
- `npx.cmd tsc -p tsconfig.page.json --noEmit`
