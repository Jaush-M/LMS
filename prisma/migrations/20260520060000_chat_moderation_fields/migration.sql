-- AlterTable: add moderation fields to ChatMessage
ALTER TABLE "ChatMessage" ADD COLUMN "moderationReason" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "removedById" TEXT;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
