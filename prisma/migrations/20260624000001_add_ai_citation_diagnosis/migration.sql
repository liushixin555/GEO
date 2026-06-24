CREATE TABLE "published_article_links" (
  "id" SERIAL PRIMARY KEY,
  "article_id" INTEGER NOT NULL,
  "schedule_id" INTEGER,
  "platform_name" VARCHAR(200),
  "url" VARCHAR(1000) NOT NULL,
  "normalized_url" VARCHAR(1000) NOT NULL,
  "domain" VARCHAR(200),
  "created_by" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ
);

CREATE INDEX "published_article_links_article_id_idx" ON "published_article_links"("article_id");
CREATE INDEX "published_article_links_schedule_id_idx" ON "published_article_links"("schedule_id");
CREATE INDEX "published_article_links_normalized_url_idx" ON "published_article_links"("normalized_url");

CREATE TABLE "ai_citation_detection_runs" (
  "id" SERIAL PRIMARY KEY,
  "project_id" INTEGER,
  "model_name" VARCHAR(100) NOT NULL,
  "prompt" TEXT,
  "answer" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'completed',
  "created_by" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ
);

CREATE INDEX "ai_citation_detection_runs_project_id_idx" ON "ai_citation_detection_runs"("project_id");
CREATE INDEX "ai_citation_detection_runs_model_name_idx" ON "ai_citation_detection_runs"("model_name");
CREATE INDEX "ai_citation_detection_runs_created_at_idx" ON "ai_citation_detection_runs"("created_at");

CREATE TABLE "ai_citation_records" (
  "id" SERIAL PRIMARY KEY,
  "run_id" INTEGER NOT NULL REFERENCES "ai_citation_detection_runs"("id") ON DELETE CASCADE,
  "model_name" VARCHAR(100) NOT NULL,
  "source_url" VARCHAR(1000) NOT NULL,
  "normalized_source_url" VARCHAR(1000) NOT NULL,
  "source_title" VARCHAR(500),
  "domain" VARCHAR(200),
  "matched" BOOLEAN NOT NULL DEFAULT FALSE,
  "article_id" INTEGER,
  "article_link_id" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "ai_citation_records_run_id_idx" ON "ai_citation_records"("run_id");
CREATE INDEX "ai_citation_records_article_id_idx" ON "ai_citation_records"("article_id");
CREATE INDEX "ai_citation_records_article_link_id_idx" ON "ai_citation_records"("article_link_id");
CREATE INDEX "ai_citation_records_normalized_source_url_idx" ON "ai_citation_records"("normalized_source_url");

CREATE TABLE "article_model_citation_marks" (
  "id" SERIAL PRIMARY KEY,
  "article_id" INTEGER NOT NULL,
  "model_name" VARCHAR(100) NOT NULL,
  "first_matched_at" TIMESTAMPTZ NOT NULL,
  "last_matched_at" TIMESTAMPTZ NOT NULL,
  "match_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "article_model_citation_marks_article_id_model_name_key" ON "article_model_citation_marks"("article_id", "model_name");
CREATE INDEX "article_model_citation_marks_article_id_idx" ON "article_model_citation_marks"("article_id");
CREATE INDEX "article_model_citation_marks_model_name_idx" ON "article_model_citation_marks"("model_name");
