-- AlterTable
ALTER TABLE "users" ADD COLUMN     "selected_company_id" INTEGER,
ADD COLUMN     "selected_project_id" INTEGER;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_selected_company_id_fkey" FOREIGN KEY ("selected_company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_selected_project_id_fkey" FOREIGN KEY ("selected_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
