-- CreateTable
CREATE TABLE "DeadlineExtensionRequest" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeadlineExtensionRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DeadlineExtensionRequest" ADD CONSTRAINT "DeadlineExtensionRequest_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeadlineExtensionRequest" ADD CONSTRAINT "DeadlineExtensionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
