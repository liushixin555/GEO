-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('draft', 'generating', 'generate_failed', 'pending_review', 'publishing', 'publish_failed', 'published');

-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "keywords" JSONB,
    "portrait" TEXT,
    "images" JSONB,
    "platforms" JSONB,
    "status" "ArticleStatus" NOT NULL DEFAULT 'draft',
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "articles_project_id_idx" ON "articles"("project_id");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- CreateIndex
CREATE INDEX "articles_created_by_idx" ON "articles"("created_by");

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
