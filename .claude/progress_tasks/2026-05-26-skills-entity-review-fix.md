# 2026-05-26 skills.entity.ts 四维评审修复

## 修复概要

- **源文件**: `apis/entity/skills.entity.ts`
- **评审来源**: `tasks/review/skills.entity.ts.{committer|security|architecture|quality}.md`
- **修复前评分**: 4.0/10 (REQUEST CHANGES)
- **修复后预期**: 7.5/10
- **测试**: 13 passed, 0 failed

## 修复项

### B-1 BLOCKING: deleted_at 遗漏
- `Skills` 接口添加 `deleted_at: Date | null`
- `mapSkills()` 添加 `deleted_at: prismaSkills.deletedAt ?? null`

### B-2 BLOCKING: created_by 身份伪造
- `CreateSkillsRequest` 移除 `created_by` 字段
- `ISkillsService.create` 签名改为 `create(request: CreateSkillsRequest, createdBy: number)`
- Service impl 使用 `createdBy` 参数
- Controller 传递 `req.user.userId` 作为独立参数

### H-1 HIGH: creator_name 混入基础实体
- `Skills` 基础实体移除 `creator_name`
- 新增 `SkillsDetail extends Skills` 含 `creator_name`
- Service 返回类型改为 `SkillsDetail`
- barrel 导出新增 `SkillsDetail`

### H-2 HIGH: description 不可清除
- `UpdateSkillsRequest.description` 改为 `string | null` 三态语义

### H-3 HIGH: 零 JSDoc 文档
- 补全全部字段 JSDoc（含 Prisma 约束）
- 添加模块级 `@module` 注释

### H-4 HIGH: skill_dir 路径泄露
- JSDoc 标注"服务端内部使用"

## 修改文件

1. `apis/entity/skills.entity.ts` — 核心重构
2. `apis/entity/index.ts` — 导出 SkillsDetail
3. `apis/map/index.ts` — mapSkills 返回 SkillsDetail
4. `apis/service/skills.service.ts` — create 签名拆分
5. `apis/service/impl/skills.service.impl.ts` — 使用 createdBy 参数
6. `apis/controller/skills.controller.ts` — create 调用参数拆分
7. `tests/apis/skills.entity.test.ts` — 适配新接口
