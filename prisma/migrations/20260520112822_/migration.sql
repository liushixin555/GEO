-- CreateTable
CREATE TABLE "publishing_platforms" (
    "id" SERIAL NOT NULL,
    "rm_resource_id" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "taxonomy" VARCHAR(100) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remark" VARCHAR(500),
    "include_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "publish_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publishing_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_keywords" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "keyword" VARCHAR(200) NOT NULL,
    "group_id" INTEGER,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_expanded_words" (
    "id" SERIAL NOT NULL,
    "keyword_id" INTEGER NOT NULL,
    "word" VARCHAR(200) NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keyword_expanded_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_portraits" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_portraits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_images" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "image_url" VARCHAR(500) NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publishing_platforms_rm_resource_id_idx" ON "publishing_platforms"("rm_resource_id");

-- CreateIndex
CREATE INDEX "publishing_platforms_taxonomy_idx" ON "publishing_platforms"("taxonomy");

-- CreateIndex
CREATE INDEX "knowledge_keywords_project_id_idx" ON "knowledge_keywords"("project_id");

-- CreateIndex
CREATE INDEX "keyword_expanded_words_keyword_id_idx" ON "keyword_expanded_words"("keyword_id");

-- CreateIndex
CREATE INDEX "knowledge_portraits_project_id_idx" ON "knowledge_portraits"("project_id");

-- CreateIndex
CREATE INDEX "knowledge_images_project_id_idx" ON "knowledge_images"("project_id");

-- AddForeignKey
ALTER TABLE "knowledge_keywords" ADD CONSTRAINT "knowledge_keywords_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_keywords" ADD CONSTRAINT "knowledge_keywords_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword_expanded_words" ADD CONSTRAINT "keyword_expanded_words_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "knowledge_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_portraits" ADD CONSTRAINT "knowledge_portraits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_portraits" ADD CONSTRAINT "knowledge_portraits_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_images" ADD CONSTRAINT "knowledge_images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_images" ADD CONSTRAINT "knowledge_images_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
