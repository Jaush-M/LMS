-- CreateTable
CREATE TABLE "FinalGradeCorrection" (
    "id" TEXT NOT NULL,
    "finalGradeId" TEXT NOT NULL,
    "oldPercentage" DOUBLE PRECISION NOT NULL,
    "oldIsPassing" BOOLEAN NOT NULL,
    "newPercentage" DOUBLE PRECISION NOT NULL,
    "newIsPassing" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinalGradeCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarkCorrection" (
    "id" TEXT NOT NULL,
    "componentMarkId" TEXT NOT NULL,
    "oldScore" DOUBLE PRECISION NOT NULL,
    "oldFeedback" TEXT,
    "newScore" DOUBLE PRECISION NOT NULL,
    "newFeedback" TEXT,
    "reason" TEXT NOT NULL,
    "correctedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarkCorrection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FinalGradeCorrection" ADD CONSTRAINT "FinalGradeCorrection_finalGradeId_fkey" FOREIGN KEY ("finalGradeId") REFERENCES "FinalGrade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinalGradeCorrection" ADD CONSTRAINT "FinalGradeCorrection_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkCorrection" ADD CONSTRAINT "MarkCorrection_componentMarkId_fkey" FOREIGN KEY ("componentMarkId") REFERENCES "ComponentMark"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarkCorrection" ADD CONSTRAINT "MarkCorrection_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "UserAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
