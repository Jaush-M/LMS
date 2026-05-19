-- AlterEnum
ALTER TYPE "NotificationSourceType" ADD VALUE 'CHAT_MENTION';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "chatMessageId" TEXT;

-- AlterTable
ALTER TABLE "UserAccount" ADD COLUMN     "reminderPeriodDays" INTEGER;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
