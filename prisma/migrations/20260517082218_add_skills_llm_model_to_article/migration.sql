-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "llm_model_id" INTEGER,
ADD COLUMN     "skills" JSONB;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_llm_model_id_fkey" FOREIGN KEY ("llm_model_id") REFERENCES "llm_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
