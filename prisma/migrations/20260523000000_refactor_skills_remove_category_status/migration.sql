-- AlterTable: remove category, status, company_id; add skill_dir
ALTER TABLE "skills" DROP COLUMN IF EXISTS "category";
ALTER TABLE "skills" DROP COLUMN IF EXISTS "status";
ALTER TABLE "skills" DROP COLUMN IF EXISTS "company_id";
ALTER TABLE "skills" ADD COLUMN "skill_dir" VARCHAR(500) NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "skills_name_key" ON "skills"("name");

-- DropIndex
DROP INDEX IF EXISTS "skills_companyId_idx";
DROP INDEX IF EXISTS "skills_category_idx";
DROP INDEX IF EXISTS "skills_status_idx";
