-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "content" TEXT,
ADD COLUMN     "version" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- CreateTable
CREATE TABLE "article_versions" (
    "id" SERIAL NOT NULL,
    "article_id" INTEGER NOT NULL,
    "version" DOUBLE PRECISION NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_versions_article_id_idx" ON "article_versions"("article_id");

-- AddForeignKey
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_versions" ADD CONSTRAINT "article_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
