-- AlterTable: Split name into firstName and lastName
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;

-- Migrate existing data: copy name to firstName
UPDATE "User" SET "firstName" = "name" WHERE "name" IS NOT NULL;

-- Drop the old name column
ALTER TABLE "User" DROP COLUMN "name";

