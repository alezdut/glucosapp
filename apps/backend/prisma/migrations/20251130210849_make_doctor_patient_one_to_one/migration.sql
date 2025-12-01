-- First, remove duplicate patient assignments (keep only the most recent one per patient)
-- This handles existing data that might violate the 1:1 constraint
DELETE FROM "DoctorPatient" dp1
WHERE EXISTS (
  SELECT 1
  FROM "DoctorPatient" dp2
  WHERE dp2."patientId" = dp1."patientId"
    AND dp2."createdAt" > dp1."createdAt"
);

-- Add unique constraint on patientId to enforce 1:1 relationship
CREATE UNIQUE INDEX IF NOT EXISTS "DoctorPatient_patientId_key" ON "DoctorPatient"("patientId");

