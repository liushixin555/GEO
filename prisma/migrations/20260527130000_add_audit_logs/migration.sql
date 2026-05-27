-- CreateEnum
CREATE TYPE "AuditLogLevel" AS ENUM ('debug', 'info', 'warn', 'error');

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "level" "AuditLogLevel" NOT NULL DEFAULT 'info',
    "event" VARCHAR(100) NOT NULL,
    "user_id" INTEGER,
    "ip" VARCHAR(45),
    "method" VARCHAR(10),
    "url" VARCHAR(500),
    "status" INTEGER,
    "duration" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_level_idx" ON "audit_logs"("level");
CREATE INDEX "audit_logs_event_idx" ON "audit_logs"("event");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
