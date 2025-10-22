-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'CORRECTION');

-- AlterTable: Remove old carbRatio, add time-specific IC ratios and DIA
ALTER TABLE "User" DROP COLUMN IF EXISTS "carbRatio";
ALTER TABLE "User" ADD COLUMN "icRatioBreakfast" DOUBLE PRECISION NOT NULL DEFAULT 15;
ALTER TABLE "User" ADD COLUMN "icRatioLunch" DOUBLE PRECISION NOT NULL DEFAULT 12;
ALTER TABLE "User" ADD COLUMN "icRatioDinner" DOUBLE PRECISION NOT NULL DEFAULT 10;
ALTER TABLE "User" ADD COLUMN "diaHours" DOUBLE PRECISION NOT NULL DEFAULT 4;

-- AlterTable: Add meal type and calculation breakdown to InsulinDose
ALTER TABLE "InsulinDose" ADD COLUMN "mealType" "MealType";
ALTER TABLE "InsulinDose" ADD COLUMN "isCorrection" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InsulinDose" ADD COLUMN "carbInsulin" DOUBLE PRECISION;
ALTER TABLE "InsulinDose" ADD COLUMN "correctionInsulin" DOUBLE PRECISION;
ALTER TABLE "InsulinDose" ADD COLUMN "iobSubtracted" DOUBLE PRECISION;

-- AlterTable: Add meal type to Meal
ALTER TABLE "Meal" ADD COLUMN "mealType" "MealType";

