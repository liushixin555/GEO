-- AlterTable
ALTER TABLE "publishing_platforms" ADD CONSTRAINT "publishing_platforms_rm_resource_id_key" UNIQUE ("rm_resource_id");
