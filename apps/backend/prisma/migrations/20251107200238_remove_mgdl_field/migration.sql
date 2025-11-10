-- AlterTable
-- Remove deprecated mgdl column from GlucoseEntry table
-- All glucose values are now stored encrypted in mgdlEncrypted
ALTER TABLE "GlucoseEntry" DROP COLUMN "mgdl";

