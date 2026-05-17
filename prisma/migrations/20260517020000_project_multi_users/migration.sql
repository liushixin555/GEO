-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_operator_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "projects_operator_id_idx";

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "operator_id";

-- CreateTable
CREATE TABLE "project_operators" (
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "project_operators_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateTable
CREATE TABLE "project_viewers" (
    "project_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "project_viewers_pkey" PRIMARY KEY ("project_id","user_id")
);

-- CreateIndex
CREATE INDEX "project_operators_user_id_idx" ON "project_operators"("user_id");

-- CreateIndex
CREATE INDEX "project_viewers_user_id_idx" ON "project_viewers"("user_id");

-- AddForeignKey
ALTER TABLE "project_operators" ADD CONSTRAINT "project_operators_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_operators" ADD CONSTRAINT "project_operators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_viewers" ADD CONSTRAINT "project_viewers_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_viewers" ADD CONSTRAINT "project_viewers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
