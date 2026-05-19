-- CreateTable
CREATE TABLE "AssignmentDeadlineExtension" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "oldDeadline" TIMESTAMP(3) NOT NULL,
    "newDeadline" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentDeadlineExtension_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AssignmentDeadlineExtension" ADD CONSTRAINT "AssignmentDeadlineExtension_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentDeadlineExtension" ADD CONSTRAINT "AssignmentDeadlineExtension_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
