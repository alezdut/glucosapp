-- CreateIndex
CREATE INDEX IF NOT EXISTS "GlucoseEntry_userId_recordedAt_idx" ON "GlucoseEntry"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InsulinDose_userId_recordedAt_idx" ON "InsulinDose"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Meal_userId_createdAt_idx" ON "Meal"("userId", "createdAt");

