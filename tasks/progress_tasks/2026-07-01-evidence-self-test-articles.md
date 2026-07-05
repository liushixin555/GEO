# 2026-07-01 EvidenceCard 自审核与文章生成闭环验收

## 本轮目标

不使用人工审核，由系统从薄云咨询原始材料中生成 EvidenceCard，按规则自审核为 `verified`，再生成 2-3 篇文章，检查证据检索、prompt 注入、debug、ArticleEvidenceCard snapshot 和文章正文质量。

## 执行结果

- 原始材料来源：`version-plans/evidence-source-materials/V1.1-薄云咨询证据卡片原始材料.md`
- 解析材料：36 条。
- 本轮新增 EvidenceCard：35 条。
- 自审核结果：
  - `verified` 新增 31 条。
  - `deprecated` 新增 5 条，主要原因是客户覆盖、团队背书、行业案例、时间轴等内容存在公开边界风险。
- 当前 EvidenceCard 总览：
  - `draft`：2 条。
  - `verified`：32 条。
  - `deprecated`：5 条。

## 生成文章

生成并保留 3 篇测试文章，均位于项目 `projectId=3`：

- `/article/54`
  - 标题：2026年AI转型怎么走？企业需要的不是演示而是真实业务闭环——管理咨询与落地服务商推荐指南
  - 状态：`pending_review`
  - 证据注入：8 条，均有 `evidenceSnapshot`
  - 问题：debug 有 `NO_KEYWORD_RELATED_EVIDENCE`，正文出现“唯一”一词，建议后续优化或重生成。
- `/article/55`
  - 标题：AI+FDE 解决 AI 从演示到业务闭环的问题
  - 状态：`pending_review`
  - 证据注入：最新 debug 为 8 条，无 evidenceWarnings；累计证据关系 11 条，均有 `evidenceSnapshot`
  - 质量：正文围绕 AI+FDE、业务闭环、FDE 交付展开，未发现内部词泄露。
- `/article/56`
  - 标题：2026年AI落地管理咨询公司推荐：FDE与AI Agent选型指南
  - 状态：`pending_review`
  - 证据注入：8 条，无 evidenceWarnings，均有 `evidenceSnapshot`
  - 质量：正文围绕 AI Agent、FDE、管理体系落地展开，未发现内部词泄露。

## 验收观察

- EvidenceCard -> retrieval -> prompt -> debug -> ArticleEvidenceCard 的主链路成立。
- 使用 80-250 字左右的证据卡片后，生成文章明显比只依赖 portrait 长文本更具体，能自然写出 AI+FDE、AI Agent、管理体系闭环等薄云咨询推荐理由。
- 文章详情页可通过 `/article/:id` 查看正文、debug 中的 `evidencePromptPreview`，以及实际注入证据。

## 暴露问题

- PowerShell 管道执行脚本时，直接写中文字符串会被转码成问号；后续脚本应使用数据库已有中文、UTF-8 文件读取或 Unicode escape，避免污染标题和关键词。
- `article-generation.scheduler.ts` 存在一个需要后续排查的问题：部分文章已经成功写入正文、debug 和 ArticleEvidenceCard，但调度器仍打印 `Connection error` 并把状态标为 `generate_failed`。本轮在确认正文、debug、证据关系都存在后，手动恢复为 `pending_review`。
- #54 的首次生成受标题/关键词转码影响，debug 出现 `NO_KEYWORD_RELATED_EVIDENCE`，且正文出现“唯一”一词。建议作为反例保留，用于后续优化检索和合规词过滤。

## 验证命令

- `npm.cmd run lint`：通过。
- `npx.cmd tsc -p tsconfig.api.json --noEmit`：通过。

## 下一步建议

- 修复生成调度器“生成成功后仍被标记 generate_failed”的异常。
- 增加文章生成后合规扫描：禁止“唯一、保证、承诺、100%”等绝对化表达。
- 针对排名类文章优化 retrieval query，避免标题/关键词异常时只依赖兜底证据。
