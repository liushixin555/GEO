---
name: service-index-arch-review
description: apis/service/index.ts 软件架构专家评审结果：3.3/10 CRITICAL，8项问题
metadata:
  type: project
---

## apis/service/index.ts 软件架构评审（2026-05-26）

**综合评分**: 3.3/10 — CRITICAL / REJECT

### 发现问题（8 项）

| 编号 | 级别 | 问题 |
|------|------|------|
| A-1 | CRITICAL | Barrel 封装破损：14 个服务中遗漏 4 个（knowledge/knowledge-base/llm/skills-file），36% 未导出 |
| A-2 | CRITICAL | 三种消费模式并存：工厂函数 via barrel（4 个 controller）、直接 new impl（6 个）、混合穿透（2 个），58% 消费者绕过 barrel |
| A-3 | HIGH | 工厂函数策略不完整：10 个已导出服务仅 4 个有工厂函数 |
| A-4 | HIGH | 双重导入反模式：export from + import 同一符号 |
| A-5 | HIGH | skills-file.service.ts 内联实现类，违反 interface→impl 分层约定 |
| A-6 | MEDIUM | knowledge.service.ts 承载 5 个独立接口（关键词/人像/图片/文档/挖掘关键词），职责边界模糊 |
| A-7 | MEDIUM | 无排序规则无分组策略 |
| A-8 | LOW | 无架构文档 |

### Why: 项目 Service 层的 barrel 文件未能履行封装职责，超过一半消费者绕过它直接引用内部路径
### How to apply: 后续修改 service/index.ts 时参考评审中的三阶段改进路线图（补全导出 → 统一消费模式 → 清理反模式）
