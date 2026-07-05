ALTER TABLE "ai_citation_detection_runs"
  ADD COLUMN IF NOT EXISTS "target_article_id" INTEGER;

CREATE INDEX IF NOT EXISTS "ai_citation_detection_runs_target_article_id_idx"
  ON "ai_citation_detection_runs"("target_article_id");

ALTER TABLE "ai_citation_records"
  ADD COLUMN IF NOT EXISTS "answer_snippet" TEXT,
  ADD COLUMN IF NOT EXISTS "citation_snippet" TEXT,
  ADD COLUMN IF NOT EXISTS "source_index" INTEGER,
  ADD COLUMN IF NOT EXISTS "raw_source" JSONB;

CREATE INDEX IF NOT EXISTS "ai_citation_records_run_id_source_index_idx"
  ON "ai_citation_records"("run_id", "source_index");
