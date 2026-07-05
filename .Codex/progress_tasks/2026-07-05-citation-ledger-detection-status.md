# 2026-07-05 检测台账列表补充检测情况

- 检测执行和引用命中是两个指标：`ai_citation_detection_runs` 表示已检测，`article_model_citation_marks` 只表示已命中。
- 台账列表必须展示检测轮次、来源记录数和最近检测时间，否则“已检测但未命中”会被误解为“未检测”。
- 聚合 run 数时如果 join records，必须使用 `COUNT(DISTINCT run.id)`，避免来源记录数量放大检测轮次。
