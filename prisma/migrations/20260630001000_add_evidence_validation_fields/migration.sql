CREATE TYPE "EvidenceCardStatus" AS ENUM (
  'draft',
  'verified',
  'deprecated'
);

CREATE TYPE "EvidenceSourceQuality" AS ENUM (
  'official',
  'customer',
  'research',
  'third_party',
  'manual',
  'portrait',
  'image',
  'unknown'
);

ALTER TABLE "evidence_cards"
ADD COLUMN "status" "EvidenceCardStatus" NOT NULL DEFAULT 'draft',
ADD COLUMN "source_quality" "EvidenceSourceQuality" NOT NULL DEFAULT 'unknown',
ADD COLUMN "article_types" JSONB,
ADD COLUMN "verified_at" TIMESTAMPTZ,
ADD COLUMN "verified_by" INTEGER;

ALTER TABLE "article_evidence_cards"
ADD COLUMN "evidence_snapshot" JSONB;

ALTER TABLE "article_generation_debugs"
ADD COLUMN "evidence_prompt_preview" TEXT,
ADD COLUMN "evidence_stats" JSONB;

CREATE INDEX "evidence_cards_status_idx" ON "evidence_cards"("status");
CREATE INDEX "evidence_cards_source_quality_idx" ON "evidence_cards"("source_quality");
CREATE INDEX "evidence_cards_verified_by_idx" ON "evidence_cards"("verified_by");

ALTER TABLE "evidence_cards"
ADD CONSTRAINT "evidence_cards_verified_by_fkey"
FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
