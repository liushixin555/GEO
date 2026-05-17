-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "short_name" VARCHAR(50) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "company_id" INTEGER NOT NULL,
    "operator_id" INTEGER,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_company_id_idx" ON "projects"("company_id");

-- CreateIndex
CREATE INDEX "projects_operator_id_idx" ON "projects"("operator_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
