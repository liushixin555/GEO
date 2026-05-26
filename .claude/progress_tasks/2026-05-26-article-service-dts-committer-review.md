# article.service.d.ts Committer 评审记录

**日期**: 2026-05-26
**文件**: `apis/service/article.service.ts`（接口 32 行）+ 实现 534 行
**评审类型**: Committer 审核
**综合评分**: 5.5/10 CONDITIONAL APPROVE

## 三份已有评审

| 评审 | 评分 | 裁决 |
|------|------|------|
| 安全评审 | 3.9/10 | REQUEST CHANGES — IDOR(C1)+auth可选(C2)+role过宽(C3)+4项HIGH |
| 架构评审 | 5.2/10 | CONDITIONAL APPROVE — ISP违反(C1)+4项HIGH |
| 质量评审 | 6.8/10 | CONDITIONAL APPROVE — AuthContext不一致(H1)+role过宽(H2)+缺projectId(H3) |

## Committer 关键裁定

| 编号 | 原评审 | Committer 裁定 | 理由 |
|------|--------|---------------|------|
| C-1 IDOR | 安全 CRITICAL | **维持 CRITICAL** | 三份评审一致认定，Controller 补偿≠service 安全 |
| C-2 auth可选 | 安全 CRITICAL | **降级 HIGH** | Controller withArticleAuth 强制传入 ctx，HTTP 路径不可利用 |
| C-3 role:string | 安全 CRITICAL | **降级 HIGH** | 运行时 JWT+Prisma enum 保护到位，编译期类型安全丧失 |
| ISP 违反 | 架构 CRITICAL | **降级 HIGH** | 技术债非运行时安全漏洞 |

## P0 阻断合并（4 项，预估 3h）

1. C-1: getById/listVersions 添加 projectId
2. H-1: role: string → Role 联合类型
3. H-2: list() auth 改为必填
4. H-3: updateSchedule 统一 AuthContext

## P1 建议修复（2 项，预估 4h）

5. H-4: AuthContext 移至独立模块
6. H-5: ISP 拆分接口

修复后预期 8.0/10。
