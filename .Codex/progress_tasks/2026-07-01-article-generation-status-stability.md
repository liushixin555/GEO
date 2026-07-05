# 2026-07-01 文章生成状态稳定性修复

- 调度器外层异常处理新增成功结果回读确认，避免事务已提交后因连接异常把文章误标为 `generate_failed`。
- 判断依据包括文章当前状态、版本是否前进、最新版本内容、以及带 `articleVersionId` 的生成 debug。
- LLM 生成 debug warnings 增加基础风险词扫描，命中绝对化或承诺类词汇时写入 `RISK_TERMS_FOUND`，仅供人工审核。
- 未修改 EvidenceCard V1/V1.1 规则，未引入联网搜索、向量库或 ContentMission。

