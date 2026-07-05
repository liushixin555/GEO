ALTER TABLE "ai_citation_detection_runs"
ADD COLUMN IF NOT EXISTS "target_article_link_id" INTEGER;

CREATE INDEX IF NOT EXISTS "ai_citation_detection_runs_target_article_link_id_idx"
  ON "ai_citation_detection_runs"("target_article_link_id");
