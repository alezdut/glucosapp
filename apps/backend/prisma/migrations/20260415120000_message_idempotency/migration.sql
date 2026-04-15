ALTER TABLE "Message"
ADD COLUMN "clientMessageId" TEXT,
ADD COLUMN "createdAtClient" TIMESTAMP(3);

UPDATE "Message"
SET "clientMessageId" = CONCAT('legacy-', "id")
WHERE "clientMessageId" IS NULL;

ALTER TABLE "Message"
ALTER COLUMN "clientMessageId" SET NOT NULL;

CREATE UNIQUE INDEX "Message_senderId_clientMessageId_key"
ON "Message"("senderId", "clientMessageId");
