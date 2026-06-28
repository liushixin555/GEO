-- 诊断管理模块（替代 geo-audit Redis KV 持久化）
CREATE TABLE "audits" (
  "id" SERIAL PRIMARY KEY,
  "job_id" VARCHAR(40) NOT NULL,
  "user_id" INTEGER NOT NULL,
  "company_id" INTEGER,
  "brand" VARCHAR(200) NOT NULL,
  "website" VARCHAR(500),
  "industry" VARCHAR(200),
  "description" TEXT,
  "competitors" JSONB,
  "keywords" JSONB,
  "features" JSONB,
  "tier" VARCHAR(20) NOT NULL DEFAULT 'pro',
  "status" VARCHAR(20) NOT NULL DEFAULT 'processing',
  "score" INTEGER,
  "grade" VARCHAR(2),
  "result" JSONB,
  "aio_result" JSONB,
  "technical_result" JSONB,
  "seo_score_result" JSONB,
  "content_optimizer_result" JSONB,
  "engine_count" INTEGER NOT NULL DEFAULT 0,
  "prompt_total" INTEGER NOT NULL DEFAULT 0,
  "prompt_done" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMPTZ
);

CREATE UNIQUE INDEX "audits_job_id_key" ON "audits"("job_id");
CREATE INDEX "audits_user_id_created_at_idx" ON "audits"("user_id", "created_at");
CREATE INDEX "audits_company_id_idx" ON "audits"("company_id");
CREATE INDEX "audits_status_idx" ON "audits"("status");

CREATE TABLE "audit_prompts" (
  "id" SERIAL PRIMARY KEY,
  "audit_id" INTEGER NOT NULL,
  "prompt_index" INTEGER NOT NULL,
  "category" VARCHAR(40) NOT NULL,
  "engine" VARCHAR(40) NOT NULL,
  "llm_model_id" INTEGER,
  "prompt" TEXT NOT NULL
);

CREATE UNIQUE INDEX "audit_prompts_audit_id_prompt_index_engine_key" ON "audit_prompts"("audit_id", "prompt_index", "engine");
CREATE INDEX "audit_prompts_audit_id_idx" ON "audit_prompts"("audit_id");

CREATE TABLE "audit_prompt_results" (
  "id" SERIAL PRIMARY KEY,
  "audit_prompt_id" INTEGER NOT NULL,
  "mentioned" BOOLEAN NOT NULL DEFAULT false,
  "snippet" TEXT,
  "full_response" TEXT,
  "sentiment" VARCHAR(20),
  "source_type" VARCHAR(40),
  "blind_spot" BOOLEAN NOT NULL DEFAULT false,
  "latency_ms" INTEGER,
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "audit_prompt_results_audit_prompt_id_key" ON "audit_prompt_results"("audit_prompt_id");

-- 外键
ALTER TABLE "audits" ADD CONSTRAINT "audits_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_prompts" ADD CONSTRAINT "audit_prompts_audit_id_fkey"
  FOREIGN KEY ("audit_id") REFERENCES "audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_prompt_results" ADD CONSTRAINT "audit_prompt_results_audit_prompt_id_fkey"
  FOREIGN KEY ("audit_prompt_id") REFERENCES "audit_prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
