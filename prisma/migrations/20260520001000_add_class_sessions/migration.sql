-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "moduleOfferingId" TEXT NOT NULL,
    "sessionTypeId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "finishAt" TIMESTAMP(3) NOT NULL,
    "sessionLocation" TEXT,
    "attendanceRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_moduleOfferingId_fkey" FOREIGN KEY ("moduleOfferingId") REFERENCES "ModuleOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "SessionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
