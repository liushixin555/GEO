CREATE TABLE "article_generation_debugs" (
    "id" SERIAL NOT NULL,
    "article_id" INTEGER NOT NULL,
    "article_version_id" INTEGER,
    "model_name" VARCHAR(200),
    "skill_dirs" JSONB,
    "required_reference_files" JSONB,
    "system_prompt" TEXT NOT NULL,
    "user_prompt" TEXT NOT NULL,
    "tool_calls" JSONB,
    "raw_llm_output" TEXT,
    "cleaned_output" TEXT,
    "warnings" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_generation_debugs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "article_generation_debugs_article_id_idx" ON "article_generation_debugs"("article_id");
CREATE INDEX "article_generation_debugs_article_version_id_idx" ON "article_generation_debugs"("article_version_id");

ALTER TABLE "article_generation_debugs"
ADD CONSTRAINT "article_generation_debugs_article_id_fkey"
FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "article_generation_debugs"
ADD CONSTRAINT "article_generation_debugs_article_version_id_fkey"
FOREIGN KEY ("article_version_id") REFERENCES "article_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
