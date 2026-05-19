-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('SYSTEM', 'OPERATIONAL');

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "eventType" "AuditEventType" NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "defaultReminderPeriodDays" INTEGER NOT NULL DEFAULT 15,
    "attendanceCorrectionWindowDays" INTEGER NOT NULL DEFAULT 7,
    "passThresholdPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "attendanceRiskThresholdPercent" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "postCourseMarkingWindowDays" INTEGER NOT NULL DEFAULT 14,
    "maxUploadBytesChatAttachment" INTEGER NOT NULL DEFAULT 10485760,
    "maxUploadBytesSubmission" INTEGER NOT NULL DEFAULT 104857600,
    "maxUploadBytesContentAttachment" INTEGER NOT NULL DEFAULT 52428800,
    "maxUploadBytesAnnouncementAttachment" INTEGER NOT NULL DEFAULT 20971520,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
