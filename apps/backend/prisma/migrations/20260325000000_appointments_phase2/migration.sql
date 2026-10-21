-- CreateEnum
CREATE TYPE "AppointmentModality" AS ENUM ('IN_PERSON', 'VIRTUAL');

-- AlterTable
ALTER TABLE "Appointment"
ADD COLUMN "location" TEXT,
ADD COLUMN "meetingUrl" TEXT,
ADD COLUMN "modality" "AppointmentModality" NOT NULL DEFAULT 'IN_PERSON',
ADD COLUMN "reminderSentAt" TIMESTAMP(3);
