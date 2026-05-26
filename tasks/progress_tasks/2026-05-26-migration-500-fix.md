# fix059: 文章列表+发布计划列表500错误——迁移脚本修复

## 问题描述
- `GET /api/v1/projects/1/articles?page=1&pageSize=12` 返回 `{"code":500,"message":"获取文章列表失败"}`
- `GET /api/v1/publishing-schedule?page=1&pageSize=12` 返回 `{"code":500,"message":"获取发布计划列表失败"}`

## 根因分析
数据库有 2 个未应用的迁移（`20260526000000_refactor_article_publishing_decouple` 和 `20260526000001_add_publishing_schedule_reject_reason`）：
1. `publishing_schedules` 表不存在 → Prisma 查询关联关系失败
2. 迁移脚本本身有 bug：在 `ArticleStatus` 枚举不包含 `approved` 的情况下，直接 `UPDATE SET status = 'approved'`，导致枚举校验失败（ERROR 22P02）
3. 第二次尝试时，`DROP TYPE "ArticleStatus"` 失败因为列默认值依赖该类型（ERROR 2BP01）

## 修复内容

### 1. 迁移脚本修复 (`migration.sql`)
- **新增步骤 5**：在数据迁移前，先将 `articles.status` 从枚举转为 `VARCHAR(20)`（先 `DROP DEFAULT` 再 `TYPE VARCHAR`）
- **步骤 6**：数据迁移（INSERT 到 publishing_schedules）
- **步骤 7**：更新文章状态为 `approved`（此时列是 VARCHAR，可设任意值）
- **步骤 8**：重建 `ArticleStatus` 枚举（DROP TYPE → CREATE TYPE 6值 → 转回枚举类型 → 设默认值）

### 2. Prisma Schema 同步 (`prisma/schema.prisma`)
- `ArticleStatus` 枚举从 9 值减少为 6 值：移除 `publishing`/`published`/`publish_failed`

### 3. Entity 同步 (`apis/entity/article.entity.ts`)
- `ARTICLE_STATUSES` 数组同步移除 3 个发布状态

## 涉及文件
- `prisma/migrations/20260526000000_refactor_article_publishing_decouple/migration.sql`
- `prisma/schema.prisma`
- `apis/entity/article.entity.ts`
- `apis/prisma-openapi/openapi.yaml`（自动生成）
- `apis/swagger-spec.json`（自动生成）

## 验证结果
- `npx prisma migrate deploy` — 两个迁移全部成功
- `GET /api/v1/projects/1/articles` — 返回 `code: 0`，文章列表正常
- `GET /api/v1/publishing-schedule` — 返回 `code: 0`，发布计划列表正常
- `pnpm run lint` — 通过
- `tsc -p tsconfig.api.json --noEmit` — 无类型错误
- 发布计划测试 440/440 全部通过
