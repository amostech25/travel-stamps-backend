-- AlterTable: existing spots (all admin-added so far) are treated as
-- already approved; new public submissions will explicitly set "pending".
ALTER TABLE "Spot" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'approved';
