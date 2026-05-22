-- Step 1: Create KnowledgeScope enum
CREATE TYPE "KnowledgeScope" AS ENUM ('platform', 'company', 'project');

-- Step 2: Create knowledge_bases table
CREATE TABLE "knowledge_bases" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "scope" "KnowledgeScope" NOT NULL DEFAULT 'project',
    "company_id" INTEGER,
    "project_id" INTEGER,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 3: Add foreign keys for knowledge_bases
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Create indexes for knowledge_bases
CREATE INDEX "knowledge_bases_scope_idx" ON "knowledge_bases"("scope");
CREATE INDEX "knowledge_bases_company_id_idx" ON "knowledge_bases"("company_id");
CREATE INDEX "knowledge_bases_project_id_idx" ON "knowledge_bases"("project_id");

-- Step 5: Migrate existing knowledge items: create a knowledge base per project
INSERT INTO "knowledge_bases" ("name", "description", "scope", "company_id", "project_id", "created_by")
SELECT
    p.short_name || ' - 知识库',
    '从项目迁移的默认知识库',
    'project'::"KnowledgeScope",
    p.company_id,
    p.id,
    NULL
FROM "projects" p
WHERE EXISTS (SELECT 1 FROM "knowledge_keywords" kk WHERE kk.project_id = p.id)
   OR EXISTS (SELECT 1 FROM "knowledge_portraits" kp WHERE kp.project_id = p.id)
   OR EXISTS (SELECT 1 FROM "knowledge_images" ki WHERE ki.project_id = p.id);

-- Step 6: Add base_id column to knowledge items
ALTER TABLE "knowledge_keywords" ADD COLUMN "base_id" INTEGER;
ALTER TABLE "knowledge_portraits" ADD COLUMN "base_id" INTEGER;
ALTER TABLE "knowledge_images" ADD COLUMN "base_id" INTEGER;

-- Step 7: Set base_id for existing items based on project_id
UPDATE "knowledge_keywords" kk SET "base_id" = kb.id FROM "knowledge_bases" kb WHERE kb.project_id = kk.project_id;
UPDATE "knowledge_portraits" kp SET "base_id" = kb.id FROM "knowledge_bases" kb WHERE kb.project_id = kp.project_id;
UPDATE "knowledge_images" ki SET "base_id" = kb.id FROM "knowledge_bases" kb WHERE kb.project_id = ki.project_id;

-- Step 8: Make base_id NOT NULL after migration (set default for safety)
ALTER TABLE "knowledge_keywords" ALTER COLUMN "base_id" SET NOT NULL;
ALTER TABLE "knowledge_portraits" ALTER COLUMN "base_id" SET NOT NULL;
ALTER TABLE "knowledge_images" ALTER COLUMN "base_id" SET NOT NULL;

-- Step 9: Drop old foreign keys and project_id columns
ALTER TABLE "knowledge_keywords" DROP CONSTRAINT IF EXISTS "knowledge_keywords_project_id_fkey";
ALTER TABLE "knowledge_portraits" DROP CONSTRAINT IF EXISTS "knowledge_portraits_project_id_fkey";
ALTER TABLE "knowledge_images" DROP CONSTRAINT IF EXISTS "knowledge_images_project_id_fkey";

-- Step 10: Add new foreign keys for base_id
ALTER TABLE "knowledge_keywords" ADD CONSTRAINT "knowledge_keywords_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_portraits" ADD CONSTRAINT "knowledge_portraits_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_images" ADD CONSTRAINT "knowledge_images_base_id_fkey" FOREIGN KEY ("base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 11: Create new indexes
CREATE INDEX "knowledge_keywords_base_id_idx" ON "knowledge_keywords"("base_id");
CREATE INDEX "knowledge_portraits_base_id_idx" ON "knowledge_portraits"("base_id");
CREATE INDEX "knowledge_images_base_id_idx" ON "knowledge_images"("base_id");

-- Step 12: Drop old indexes
DROP INDEX IF EXISTS "knowledge_keywords_project_id_idx";
DROP INDEX IF EXISTS "knowledge_portraits_project_id_idx";
DROP INDEX IF EXISTS "knowledge_images_project_id_idx";

-- Step 13: Drop old project_id columns
ALTER TABLE "knowledge_keywords" DROP COLUMN "project_id";
ALTER TABLE "knowledge_portraits" DROP COLUMN "project_id";
ALTER TABLE "knowledge_images" DROP COLUMN "project_id";
