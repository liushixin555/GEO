# 2026-06-30 EvidenceCard V1 文档与整合验收记录

## 任务范围

- 本次只负责 EvidenceCard V1 的文档、任务记录、记忆更新和最终整合验收。
- 不实现核心业务代码，不修改 `.agents/`，不保存到 `~/.Codex/projects/`。
- 进度详细内容记录在本文件，`progress.md` 如存在仅保留索引。

## 本次记录的核心规则

- EvidenceCard V1 是知识库证据化第一版，目标是让知识库材料进入文章生成链路。
- ArticleEvidenceCard V1 第一阶段只写入 `usageType = injected`，暂不写 `retrieved` / `rejected`。
- ArticleEvidenceCard 必须设置 `[articleId, evidenceCardId]` 唯一约束，防止同一文章重复关联同一证据卡片。
- EvidenceCard.keywords 入库前必须规范为 `string[]`：只保留字符串、trim、过滤空字符串、去重。
- 前端“预计注入证据”只作为预览，不作为最终文章生成依据；最终结果以后端生成时实时检索和注入记录为准。
- 文档正文抽取、联网搜索、ContentMission、EntityGraph 均后置，不进入 V1 验收范围。

## 文档更新

- 更新 `tasks/dev015.AI知识库.md`：补充 EvidenceCard V1 功能说明、业务规则和验收标准。
- 更新 `tasks/db.数据模型变更汇总.md`：补充 EvidenceCard / ArticleEvidenceCard / ArticleGenerationDebug 数据模型记录。
- 更新 `.Codex/rules.md`：补充 EvidenceCard V1 规则边界和后置事项。
- 新增 `.Codex/architecture.md`：记录证据卡片数据模型、生成链路和持久化边界。
- 新增 `.Codex/frontend.md`：记录前端预览、管理页和文章详情展示规则。
- 更新 `AGENTS.md`：补充 EvidenceCard V1 长期协作规则。

## 待整合验收

- 已执行 `pnpm build`：通过。输出包含 npm 配置项、Prisma 配置弃用、Vite CJS API 和大 chunk 体积警告，但无编译失败。
- 已执行 `pnpm lint`：通过。
- 未执行 `pnpm test`，符合本次约束。

## 当前风险记录

- 工作区存在其他会话产生的未提交代码与未跟踪文件，最终验收需要确认这些变更是否全部属于 EvidenceCard V1 或其他并行任务。
- 发现 `.agents/` 下存在未跟踪文件；本次任务不修改该目录，最终汇总时需要提醒处理来源。
- 已发现并合并 `tasks/dev015.AI知识库.md` 与 `tasks/db.数据模型变更汇总.md` 中的重复 EvidenceCard 段落，当前各保留一个完整章节。
- 快速检索显示 EvidenceCard 数据模型、CRUD 接口、路由、前端列表/详情和 keywords 规范化已出现；文章生成链路中的证据检索、prompt 注入、debug 写入、ArticleEvidenceCard 写入仍未在当前代码中检索到，需要后续会话补齐或确认。
