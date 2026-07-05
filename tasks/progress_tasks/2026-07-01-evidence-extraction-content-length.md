# 2026-07-01 EvidenceCard 抽取正文长度优化

## 背景

V1.1 抽取出的 EvidenceCard 草稿容易出现“正文只有一句话”的情况。该类证据可以进入系统链路，但对文章生成的事实支撑较弱，容易导致文章重新回到泛化表达。

## 本次调整

- 调整 `apis/utils/evidence-extraction.util.ts` 中的抽取 prompt：
  - `content` 默认要求写成 2-5 句话。
  - 正文长度建议约 80-250 个中文字符。
  - 要保留必要上下文、适用场景和意义。
  - 不允许为了凑长度编造材料中没有的信息。
- 对 LLM 返回的短正文候选增加 `CONTENT_SHORT_REVIEW_RECOMMENDED` 候选级 warning，保留候选但提示人工复核。
- 调整 `apis/service/impl/evidence-card.service.impl.ts` 的确定性回退抽取：
  - 相邻短句/短段会优先合并为更完整的证据正文。
  - 目标是减少“一句一卡”，但仍不扩写不存在的事实。

## 验证

- `npm.cmd run lint`：通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit`：通过。
- `npm.cmd run build:api`：未完成，失败点为 Prisma generate 阶段 Windows DLL 被运行中的 Node 进程占用：
  - `EPERM: operation not permitted, rename ... query_engine-windows.dll.node.tmp... -> query_engine-windows.dll.node`
  - 该错误与本次 TypeScript 修改无关，停止本地后端/dev server 后可重跑完整 build。

## 后续建议

- 第一批已保存的短草稿不建议直接全部审核为 verified。
- 优先挑选核心证据，人工补成 80-250 字后再审核。
- 后续新抽取的候选应更接近“可审核证据卡片”，减少人工补写成本。
