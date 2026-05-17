-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "created_by" INTEGER;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
