-- This app is now single-owner, but earlier testing created multiple
-- accounts (before that rule existed). Rather than guess which one should
-- become "the" owner, this clears all existing data so the next person to
-- sign in creates a clean, unambiguous owner account from scratch.
TRUNCATE TABLE "User" CASCADE;

-- DropForeignKey (Like references Spot and User)
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_spotId_fkey";
ALTER TABLE "Like" DROP CONSTRAINT IF EXISTS "Like_userId_fkey";

-- DropForeignKey (Follow references User twice)
ALTER TABLE "Follow" DROP CONSTRAINT IF EXISTS "Follow_followerId_fkey";
ALTER TABLE "Follow" DROP CONSTRAINT IF EXISTS "Follow_followingId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Like";

-- DropTable
DROP TABLE IF EXISTS "Follow";

-- AlterTable: mark spots that highlight a Black-owned business/experience
ALTER TABLE "Spot" ADD COLUMN "blackOwned" BOOLEAN NOT NULL DEFAULT false;
