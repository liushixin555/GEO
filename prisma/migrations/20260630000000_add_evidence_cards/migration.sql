CREATE TYPE "EvidenceType" AS ENUM (
  'fact',
  'case',
  'method',
  'capability',
  'faq',
  'statistic',
  'quote',
  'image_description',
  'external'
);

CREATE TYPE "EvidenceSourceType" AS ENUM (
  'portrait',
  'document',
  'image',
  'manual',
  'external'
);

CREATE TYPE "ArticleEvidenceUsageType" AS ENUM (
  'retrieved',
  'injected',
  'rejected'
);

CREATE TABLE "evidence_cards" (
  "id" SERIAL NOT NULL,
  "company_id" INTEGER,
  "project_id" INTEGER,
  "title" VARCHAR(300) NOT NULL,
  "content" TEXT NOT NULL,
  "evidence_type" "EvidenceType" NOT NULL,
  "source_type" "EvidenceSourceType" NOT NULL,
  "source_id" INTEGER,
  "source_url" VARCHAR(1000),
  "keywords" JSONB,
  "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "freshness_score" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMPTZ,

  CONSTRAINT "evidence_cards_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "article_evidence_cards" (
  "id" SERIAL NOT NULL,
  "article_id" INTEGER NOT NULL,
  "evidence_card_id" INTEGER NOT NULL,
  "usage_type" "ArticleEvidenceUsageType" NOT NULL DEFAULT 'injected',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "article_evidence_cards_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "article_generation_debugs"
ADD COLUMN "retrieved_evidence_cards" JSONB,
ADD COLUMN "evidence_retrieval_query" JSONB,
ADD COLUMN "evidence_warnings" JSONB;

CREATE INDEX "evidence_cards_company_id_idx" ON "evidence_cards"("company_id");
CREATE INDEX "evidence_cards_project_id_idx" ON "evidence_cards"("project_id");
CREATE INDEX "evidence_cards_evidence_type_idx" ON "evidence_cards"("evidence_type");
CREATE INDEX "evidence_cards_source_type_idx" ON "evidence_cards"("source_type");
CREATE INDEX "evidence_cards_source_id_idx" ON "evidence_cards"("source_id");

CREATE UNIQUE INDEX "article_evidence_cards_article_id_evidence_card_id_key"
ON "article_evidence_cards"("article_id", "evidence_card_id");

CREATE INDEX "article_evidence_cards_article_id_idx" ON "article_evidence_cards"("article_id");
CREATE INDEX "article_evidence_cards_evidence_card_id_idx" ON "article_evidence_cards"("evidence_card_id");

ALTER TABLE "evidence_cards"
ADD CONSTRAINT "evidence_cards_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "evidence_cards"
ADD CONSTRAINT "evidence_cards_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "article_evidence_cards"
ADD CONSTRAINT "article_evidence_cards_article_id_fkey"
FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "article_evidence_cards"
ADD CONSTRAINT "article_evidence_cards_evidence_card_id_fkey"
FOREIGN KEY ("evidence_card_id") REFERENCES "evidence_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
