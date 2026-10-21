-- Hardening migration (hand-edited to preserve existing data).
-- Runs atomically: if any step fails nothing is applied and the backend will not start.
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Role: VARCHAR -> enum, converting in place (Prisma's default would DROP the column)
-- ---------------------------------------------------------------------------
CREATE TYPE "Role" AS ENUM ('user', 'admin');

UPDATE "users" SET "role" = 'user' WHERE "role" IS NULL OR "role" NOT IN ('user', 'admin');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';

ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 2. Fix orphan rows before making foreign keys mandatory
-- ---------------------------------------------------------------------------
-- Cars without owner are reassigned to the oldest admin (or oldest user) so no data is lost.
UPDATE "cars"
SET "user_id" = COALESCE(
  (SELECT "id" FROM "users" WHERE "role" = 'admin' ORDER BY "id" LIMIT 1),
  (SELECT "id" FROM "users" ORDER BY "id" LIMIT 1)
)
WHERE "user_id" IS NULL;
-- If there are no users at all, ownerless cars cannot be kept.
DELETE FROM "cars" WHERE "user_id" IS NULL;

-- These rows are unreachable from the application (no parent), so they are removed.
DELETE FROM "parts" WHERE "maintenance_id" IS NULL;
DELETE FROM "maintenances" WHERE "car_id" IS NULL;
DELETE FROM "maintenance_alerts" WHERE "car_id" IS NULL;
DELETE FROM "inventory_parts" WHERE "user_id" IS NULL;

ALTER TABLE "cars" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "maintenances" ALTER COLUMN "car_id" SET NOT NULL;
ALTER TABLE "inventory_parts" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "parts" ALTER COLUMN "maintenance_id" SET NOT NULL;
ALTER TABLE "maintenance_alerts" ALTER COLUMN "car_id" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Normalise checklist values stored as JSON strings into JSON arrays
-- ---------------------------------------------------------------------------
UPDATE "maintenances"
SET "checklist" = ("checklist" #>> '{}')::jsonb
WHERE jsonb_typeof("checklist") = 'string'
  AND ("checklist" #>> '{}') ~ '^\s*\[';
UPDATE "maintenances"
SET "checklist" = '[]'::jsonb
WHERE "checklist" IS NULL OR jsonb_typeof("checklist") <> 'array';

-- ---------------------------------------------------------------------------
-- 4. Per-share permissions
-- ---------------------------------------------------------------------------
ALTER TABLE "car_shares" ADD COLUMN "can_edit" BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------------
-- 5. New tables
-- ---------------------------------------------------------------------------
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "app_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- ---------------------------------------------------------------------------
-- 6. Indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "cars_user_id_idx" ON "cars"("user_id");
CREATE INDEX "maintenances_car_id_idx" ON "maintenances"("car_id");
CREATE INDEX "maintenances_document_path_idx" ON "maintenances"("document_path");
CREATE INDEX "inventory_parts_user_id_idx" ON "inventory_parts"("user_id");
CREATE INDEX "parts_maintenance_id_idx" ON "parts"("maintenance_id");
CREATE INDEX "parts_inventory_part_id_idx" ON "parts"("inventory_part_id");
CREATE INDEX "maintenance_alerts_car_id_idx" ON "maintenance_alerts"("car_id");
CREATE INDEX "fuel_logs_car_id_idx" ON "fuel_logs"("car_id");
CREATE INDEX "car_shares_user_id_idx" ON "car_shares"("user_id");

-- ---------------------------------------------------------------------------
-- 7. Foreign keys
-- ---------------------------------------------------------------------------
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
