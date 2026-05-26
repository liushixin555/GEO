# company.entity.ts 架构评审修复

## 日期
2026-05-26

## 评审文件
tasks/review/company.entity.ts.architecture.md

## 修复状态汇总

### 已在之前迭代修复（本次验证确认）

| # | 问题 | 状态 | 修复提交 |
|---|------|------|---------|
| CRITICAL-1 | UpdateCompanyRequest 全量替换→部分更新 | ✅ 已修复 | 之前迭代 |
| HIGH-1 | operator_ids/viewer_ids 计算字段 JSDoc | ✅ 已修复 | 之前迭代 |
| HIGH-2 | 提取 UserRef 命名类型 | ✅ 已修复 | 之前迭代 |
| HIGH-3 | address 三值 null 语义 | ✅ 已修复 | 之前迭代 |
| HIGH-4 | 添加 CompanyListItem 类型 | ✅ 已修复 | 之前迭代 |
| HIGH-5/质量 H-5 | 补全 JSDoc 文档 | ✅ 已修复 | 之前迭代 |
| B-1 | created_by/updated_by 审计追踪 | ✅ 已修复 | 之前迭代 |
| H-3(安全) | operator/viewer 互斥校验 | ✅ 已修复 | 之前迭代 |
| M-1(安全) | CompanyDetail 排除 deleted_at | ✅ 已修复 | 之前迭代 |

### 本次修复

| # | 问题 | 修改文件 |
|---|------|---------|
| MEDIUM-3 | 提取 CompanyRef 共享类型，替代 user.entity.ts 中内联 `{ id, short_name }` | apis/entity/company.entity.ts, apis/entity/user.entity.ts, apis/entity/index.ts |

### 未修复（需设计决策或大范围重构）

| # | 问题 | 原因 |
|---|------|------|
| H-5 | 统一 Project 的 operator/viewer 为 UserRef[] 模式 | 需修改 Project 全链路（entity/service/schema/controller/map/frontend），属破坏性变更 |
| MEDIUM-1 | status: boolean → union type | 需同步 Prisma schema + 前端，属设计决策 |
| MEDIUM-2 | 无分页类型 | 增强功能，非缺陷修复 |
| MEDIUM-4 | Create 混合关联操作 | 依赖全量替换模式消除，当前部分更新下可接受 |

## 变更详情

### MEDIUM-3: 提取 CompanyRef

**company.entity.ts** — 新增接口：
```typescript
export interface CompanyRef {
  id: number;
  short_name: string;
}
```

**user.entity.ts** — LoginResponse.selected_company 从内联类型改为 CompanyRef：
```typescript
// Before
selected_company: { id: number; short_name: string } | null;
// After
selected_company: CompanyRef | null;
```

**index.ts** — 新增 CompanyRef 导出

## 验证
- pnpm build ✅
- pnpm lint ✅
