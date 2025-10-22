-- AlterTable
ALTER TABLE "InsulinDose" ADD COLUMN "calculatedUnits" DOUBLE PRECISION,
ADD COLUMN "wasManuallyEdited" BOOLEAN NOT NULL DEFAULT false;

-- Initialize calculatedUnits with current units value for existing records
UPDATE "InsulinDose" SET "calculatedUnits" = "units" WHERE "calculatedUnits" IS NULL;

