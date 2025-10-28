-- AlterTable
ALTER TABLE "LogEntry" ADD COLUMN     "recentExercise" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alcohol" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "illness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stress" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "menstruation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "highFatMeal" BOOLEAN NOT NULL DEFAULT false;

