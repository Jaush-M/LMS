import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.auditLogEntry.deleteMany();
  await prisma.systemSettings.deleteMany();

  // deepest leaves first
  await prisma.notification.deleteMany();
  await prisma.finalGradeCorrection.deleteMany();
  await prisma.finalGrade.deleteMany();
  await prisma.markCorrection.deleteMany();
  await prisma.componentMark.deleteMany();
  await prisma.assessmentComponent.deleteMany();
  await prisma.assignmentDeadlineExtension.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignmentSharedLink.deleteMany();
  await prisma.assignmentAttachment.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.contentSharedLink.deleteMany();
  await prisma.contentAttachment.deleteMany();
  await prisma.moduleContent.deleteMany();
  await prisma.contentSection.deleteMany();
  await prisma.feedbackResponse.deleteMany();
  await prisma.feedbackPeriod.deleteMany();
  await prisma.attendanceCorrectionRequest.deleteMany();
  await prisma.educatorAttendanceRecord.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.chatParticipantActivity.deleteMany();
  await prisma.chatMessageAttachment.deleteMany();
  await prisma.chatMessageSharedLink.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.capacityOverride.deleteMany();
  await prisma.moduleEnrollmentException.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.announcementAttachment.deleteMany();
  await prisma.announcementSharedLink.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.moduleOfferingEvent.deleteMany();
  await prisma.courseOfferingEvent.deleteMany();
  await prisma.institutionEvent.deleteMany();
  await prisma.moduleGroupChat.deleteMany();
  await prisma.moduleOffering.deleteMany();
  await prisma.courseOffering.deleteMany();
  await prisma.fileAsset.deleteMany();
  await prisma.defaultAssessmentComponent.deleteMany();
  await prisma.templateModulePrerequisite.deleteMany();
  await prisma.templateModule.deleteMany();
  await prisma.academicLevel.deleteMany();
  await prisma.curriculumTemplate.deleteMany();
  await prisma.course.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.module.deleteMany();
  await prisma.intake.deleteMany();
  await prisma.studyMode.deleteMany();
  await prisma.sessionType.deleteMany();

  await prisma.userAccount.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  console.log("Teardown complete");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
