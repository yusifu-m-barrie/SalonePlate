-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Backfill approval date for already-approved restaurants
UPDATE "Restaurant"
SET "approvedAt" = "updatedAt"
WHERE "status" = 'APPROVED' AND "approvedAt" IS NULL;
