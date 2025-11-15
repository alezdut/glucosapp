-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "glucoseEntryId" TEXT,
    "insulinDoseId" TEXT,
    "mealId" TEXT,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LogEntry_glucoseEntryId_key" ON "LogEntry"("glucoseEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "LogEntry_insulinDoseId_key" ON "LogEntry"("insulinDoseId");

-- CreateIndex
CREATE UNIQUE INDEX "LogEntry_mealId_key" ON "LogEntry"("mealId");

-- CreateIndex
CREATE INDEX "LogEntry_userId_idx" ON "LogEntry"("userId");

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_glucoseEntryId_fkey" FOREIGN KEY ("glucoseEntryId") REFERENCES "GlucoseEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_insulinDoseId_fkey" FOREIGN KEY ("insulinDoseId") REFERENCES "InsulinDose"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

