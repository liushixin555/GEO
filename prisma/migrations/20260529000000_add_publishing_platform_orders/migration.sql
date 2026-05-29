CREATE TABLE "publishing_platform_orders" (
  "id" SERIAL NOT NULL,
  "schedule_id" INTEGER NOT NULL,
  "platform_id" INTEGER NOT NULL,
  "rm_order_id" VARCHAR(100) NOT NULL,
  "rm_status" INTEGER NOT NULL DEFAULT 0,
  "rm_response_message" VARCHAR(1000),
  "rm_resource_name" VARCHAR(200),
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "publishing_platform_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "publishing_platform_orders_rm_order_id_key" ON "publishing_platform_orders"("rm_order_id");
CREATE INDEX "publishing_platform_orders_schedule_id_idx" ON "publishing_platform_orders"("schedule_id");
CREATE INDEX "publishing_platform_orders_platform_id_idx" ON "publishing_platform_orders"("platform_id");
CREATE INDEX "publishing_platform_orders_rm_status_idx" ON "publishing_platform_orders"("rm_status");

ALTER TABLE "publishing_platform_orders"
  ADD CONSTRAINT "publishing_platform_orders_schedule_id_fkey"
  FOREIGN KEY ("schedule_id") REFERENCES "publishing_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "publishing_platform_orders"
  ADD CONSTRAINT "publishing_platform_orders_platform_id_fkey"
  FOREIGN KEY ("platform_id") REFERENCES "publishing_platforms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
