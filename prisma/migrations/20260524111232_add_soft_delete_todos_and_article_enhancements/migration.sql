-- CreateEnum
CREATE TYPE "TodoSource" AS ENUM ('manual', 'content_iteration', 'smart_link', 'daily_check', 'risk_warning');

-- CreateEnum
CREATE TYPE "TodoPriority" AS ENUM ('P0', 'P1', 'P2', 'P3', 'P4');

-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('open', 'closed', 'draft');

-- CreateEnum
CREATE TYPE "TodoLogAction" AS ENUM ('submit', 'close', 'reopen', 'transfer', 'reject');

-- AlterTable
ALTER TABLE "article_versions" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "article_type" VARCHAR(50),
ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "schedule_type" VARCHAR(20),
ADD COLUMN     "scheduled_publish_at" TIMESTAMPTZ,
ADD COLUMN     "write_mode" VARCHAR(20);

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "keyword_expanded_words" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "knowledge_bases" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "knowledge_images" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "knowledge_keywords" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "knowledge_portraits" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "llm_models" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "project_operators" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "project_viewers" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "publishing_platforms" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "system_configs" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "mined_keywords" (
    "id" SERIAL NOT NULL,
    "base_id" INTEGER NOT NULL,
    "keyword" VARCHAR(200) NOT NULL,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "mined_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" SERIAL NOT NULL,
    "base_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "file_url" VARCHAR(500) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_type" VARCHAR(20) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todos" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "project_id" INTEGER,
    "object_type" VARCHAR(100) NOT NULL,
    "object_id" INTEGER,
    "action" VARCHAR(500) NOT NULL,
    "source" "TodoSource" NOT NULL DEFAULT 'manual',
    "priority" "TodoPriority" NOT NULL DEFAULT 'P2',
    "assignee_id" INTEGER NOT NULL,
    "status" "TodoStatus" NOT NULL DEFAULT 'open',
    "due_at" TIMESTAMPTZ,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todo_logs" (
    "id" SERIAL NOT NULL,
    "todo_id" INTEGER NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "action" "TodoLogAction" NOT NULL,
    "object_type" VARCHAR(100),
    "object_id" INTEGER,
    "remark" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "todo_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mined_keywords_base_id_idx" ON "mined_keywords"("base_id");

-- CreateIndex
CREATE UNIQUE INDEX "mined_keywords_base_id_keyword_key" ON "mined_keywords"("base_id", "keyword");

-- CreateIndex
CREATE INDEX "knowledge_documents_base_id_idx" ON "knowledge_documents"("base_id");

-- CreateIndex
CREATE INDEX "todos_company_id_idx" ON "todos"("company_id");

-- CreateIndex
CREATE INDEX "todos_assignee_id_idx" ON "todos"("assignee_id");

-- CreateIndex
CREATE INDEX "todos_status_idx" ON "todos"("status");

-- CreateIndex
CREATE INDEX "todos_priority_idx" ON "todos"("priority");

-- CreateIndex
CREATE INDEX "todos_source_idx" ON "todos"("source");

-- CreateIndex
CREATE INDEX "todo_logs_todo_id_idx" ON "todo_logs"("todo_id");

-- AddForeignKey
ALTER TABLE "mined_keywords" ADD CONSTRAINT "mined_keywords_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todos" ADD CONSTRAINT "todos_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_logs" ADD CONSTRAINT "todo_logs_todo_id_fkey" FOREIGN KEY ("todo_id") REFERENCES "todos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todo_logs" ADD CONSTRAINT "todo_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
