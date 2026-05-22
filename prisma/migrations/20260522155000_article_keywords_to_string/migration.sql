-- AlterTable
ALTER TABLE "articles" ALTER COLUMN "keywords" DROP NOT NULL;
ALTER TABLE "articles" ALTER COLUMN "keywords" SET DATA TYPE character varying(500);
