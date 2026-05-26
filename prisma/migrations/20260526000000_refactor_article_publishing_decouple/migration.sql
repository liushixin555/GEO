-- 1. 创建 PublishingScheduleStatus 枚举
CREATE TYPE "PublishingScheduleStatus" AS ENUM ('pending', 'publishing', 'published', 'publish_failed');

-- 2. 创建 publishing_schedules 表
CREATE TABLE "publishing_schedules" (
    "id" SERIAL NOT NULL,
    "article_id" INTEGER NOT NULL,
    "platforms" JSONB,
    "schedule_type" VARCHAR(20),
    "scheduled_publish_at" TIMESTAMPTZ,
    "status" "PublishingScheduleStatus" NOT NULL DEFAULT 'pending',
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "publishing_schedules_pkey" PRIMARY KEY ("id")
);

-- 3. 创建索引
CREATE INDEX "publishing_schedules_article_id_idx" ON "publishing_schedules"("article_id");
CREATE INDEX "publishing_schedules_status_idx" ON "publishing_schedules"("status");

-- 4. 添加外键约束
ALTER TABLE "publishing_schedules" ADD CONSTRAINT "publishing_schedules_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publishing_schedules" ADD CONSTRAINT "publishing_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 5. 先移除 articles.status 的默认值和枚举约束，转为 VARCHAR
ALTER TABLE "articles" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "articles" ALTER COLUMN "status" TYPE VARCHAR(20);

-- 6. 迁移现有文章的发布数据到 publishing_schedules 表
INSERT INTO "publishing_schedules" ("article_id", "platforms", "schedule_type", "scheduled_publish_at", "status", "created_by", "created_at", "updated_at")
SELECT
    a."id",
    a."platforms",
    a."schedule_type",
    a."scheduled_publish_at",
    CASE a."status"
        WHEN 'publishing' THEN 'pending'::"PublishingScheduleStatus"
        WHEN 'published' THEN 'published'::"PublishingScheduleStatus"
        WHEN 'publish_failed' THEN 'publish_failed'::"PublishingScheduleStatus"
    END,
    a."created_by",
    a."created_at",
    a."updated_at"
FROM "articles" a
WHERE a."status" IN ('publishing', 'publish_failed', 'published')
  AND a."deleted_at" IS NULL;

-- 7. 更新文章状态：将 publishing/publish_failed/published 改为 approved
UPDATE "articles" SET "status" = 'approved' WHERE "status" IN ('publishing', 'publish_failed', 'published');

-- 8. 重建 ArticleStatus 枚举（仅保留 6 个内容生命周期状态）
DROP TYPE "ArticleStatus";
CREATE TYPE "ArticleStatus" AS ENUM ('draft', 'manual_writing', 'generating', 'generate_failed', 'pending_review', 'approved');
ALTER TABLE "articles" ALTER COLUMN "status" TYPE "ArticleStatus" USING ("status"::"ArticleStatus");
ALTER TABLE "articles" ALTER COLUMN "status" SET DEFAULT 'draft';

-- 9. 从 articles 表中移除发布相关字段
ALTER TABLE "articles" DROP COLUMN IF EXISTS "platforms";
ALTER TABLE "articles" DROP COLUMN IF EXISTS "scheduled_publish_at";
ALTER TABLE "articles" DROP COLUMN IF EXISTS "schedule_type";
