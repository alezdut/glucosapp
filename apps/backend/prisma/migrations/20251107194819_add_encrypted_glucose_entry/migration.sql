-- AlterTable
-- Add mgdlEncrypted column to GlucoseEntry table
-- Initially add with a default to handle existing rows, then remove default
ALTER TABLE "GlucoseEntry" ADD COLUMN "mgdlEncrypted" TEXT NOT NULL DEFAULT '';

-- Note: Existing rows now have empty string in mgdlEncrypted
-- These will need to be migrated by encrypting their mgdl values
-- The application should handle this during read operations

