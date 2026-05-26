# skills.entity.ts Committer 评审第二轮修复

**日期**: 2026-05-26
**评审文件**: `tasks/review/skills.entity.ts.committer.md`
**修复范围**: H-4 + H-2补充 + M-2 + 附带修复

## 修复项

### H-4 [HIGH] skill_dir API 响应暴露服务器路径
- `SkillsDetail` 改为 `Omit<Skills, 'skill_dir'>`，API 响应不再包含 skill_dir
- `mapSkills` 返回值移除 skill_dir 字段
- 添加 `getSkillDirById` 内部方法供控制器 delete 操作使用

### H-2补充 [HIGH] 控制器 description=null 验证缺失
- `updateSkills` 控制器验证逻辑增加 `description !== null` 检查，允许 null 清除描述

### M-2 [MEDIUM] mapSkills 参数类型改用 Prisma payload
- `PrismaSkills & { creator?: ... }` 替换为 `Prisma.SkillsGetPayload<{ include: { creator: true } }>`

### 附带修复
- `article.schema.ts`: article_type/write_mode/status Zod 枚举对齐 Entity 类型
- `map/index.ts`: 补充缺失的 ArticleDetail 导入
- `article.schema.test.ts`: 适配枚举 schema 变更

## 修改文件
- `apis/entity/skills.entity.ts`
- `apis/map/index.ts`
- `apis/service/skills.service.ts`
- `apis/service/impl/skills.service.impl.ts`
- `apis/controller/skills.controller.ts`
- `apis/schema/article.schema.ts`
- `tests/apis/skills.entity.test.ts`
- `tests/apis/article.schema.test.ts`
- `tasks/dev003.技能管理.md`

## 验证
- `pnpm build` 通过
- `pnpm lint` 通过
- skills 相关测试 22 通过
