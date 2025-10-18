-- CreateEnum
CREATE TYPE "DiabetesType" AS ENUM ('TYPE_1', 'TYPE_2');
CREATE TYPE "GlucoseUnit" AS ENUM ('MG_DL', 'MMOL_L');
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK');
CREATE TYPE "Language" AS ENUM ('ES', 'EN');
CREATE TYPE "InsulinType" AS ENUM ('BASAL', 'BOLUS');

-- AlterTable User: Convert columns to enums
-- Drop defaults before changing types
ALTER TABLE "User" ALTER COLUMN "glucoseUnit" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "theme" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "language" DROP DEFAULT;

-- Convert columns to enums
ALTER TABLE "User" ALTER COLUMN "diabetesType" TYPE "DiabetesType" USING ("diabetesType"::"DiabetesType");
ALTER TABLE "User" ALTER COLUMN "glucoseUnit" TYPE "GlucoseUnit" USING ("glucoseUnit"::"GlucoseUnit");
ALTER TABLE "User" ALTER COLUMN "theme" TYPE "Theme" USING ("theme"::"Theme");
ALTER TABLE "User" ALTER COLUMN "language" TYPE "Language" USING ("language"::"Language");

-- Set new defaults
ALTER TABLE "User" ALTER COLUMN "glucoseUnit" SET DEFAULT 'MG_DL';
ALTER TABLE "User" ALTER COLUMN "theme" SET DEFAULT 'LIGHT';
ALTER TABLE "User" ALTER COLUMN "language" SET DEFAULT 'ES';

-- AlterTable InsulinDose: Convert type column to enum
ALTER TABLE "InsulinDose" ALTER COLUMN "type" TYPE "InsulinType" USING ("type"::"InsulinType");

