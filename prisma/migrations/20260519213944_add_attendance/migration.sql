-- CreateEnum
CREATE TYPE "ChatMessageStatus" AS ENUM ('ACTIVE', 'EDITED', 'REMOVED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "CorrectionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "SystemSettings" ALTER COLUMN "attendanceCorrectionWindowDays" SET DEFAULT 8;

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ChatMessageStatus" NOT NULL DEFAULT 'ACTIVE',
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileAssetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessageSharedLink" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageSharedLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipantActivity" (
    "chatId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatParticipantActivity_pkey" PRIMARY KEY ("chatId","userId")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducatorAttendanceRecord" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "educatorId" TEXT NOT NULL,
    "submittedAttendanceAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducatorAttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCorrectionRequest" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedStatus" "AttendanceStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CorrectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_classSessionId_studentId_key" ON "AttendanceRecord"("classSessionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "EducatorAttendanceRecord_classSessionId_key" ON "EducatorAttendanceRecord"("classSessionId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "ModuleGroupChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageAttachment" ADD CONSTRAINT "ChatMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageAttachment" ADD CONSTRAINT "ChatMessageAttachment_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessageSharedLink" ADD CONSTRAINT "ChatMessageSharedLink_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipantActivity" ADD CONSTRAINT "ChatParticipantActivity_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "ModuleGroupChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipantActivity" ADD CONSTRAINT "ChatParticipantActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducatorAttendanceRecord" ADD CONSTRAINT "EducatorAttendanceRecord_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducatorAttendanceRecord" ADD CONSTRAINT "EducatorAttendanceRecord_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "UserAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
