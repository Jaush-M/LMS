import { prisma } from "./prisma";
import { calculateEffectiveModuleAccess } from "./enrollment";

// ── openFeedbackPeriod ────────────────────────────────────────────────────────

export type OpenFeedbackPeriodInput = {
  moduleOfferingId: string;
  openAt: Date;
  closeAt: Date;
  createdById: string;
};

export async function openFeedbackPeriod(input: OpenFeedbackPeriodInput) {
  const creator = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.createdById } });

  if (creator.role !== "ADMINISTRATOR" && creator.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Permission denied: only Administrators may open a Feedback Period");
  }

  const existing = await prisma.feedbackPeriod.findUnique({ where: { moduleOfferingId: input.moduleOfferingId } });
  if (existing) {
    throw new Error("Feedback Period already exists for this Module Offering");
  }

  return prisma.feedbackPeriod.create({
    data: {
      moduleOfferingId: input.moduleOfferingId,
      openAt: input.openAt,
      closeAt: input.closeAt,
      createdById: input.createdById,
    },
  });
}

// ── submitFeedbackResponse ────────────────────────────────────────────────────

export type SubmitFeedbackResponseInput = {
  moduleOfferingId: string;
  studentId: string;
  rating: number;
  comment?: string;
};

export async function submitFeedbackResponse(input: SubmitFeedbackResponseInput) {
  const period = await prisma.feedbackPeriod.findUnique({ where: { moduleOfferingId: input.moduleOfferingId } });
  if (!period) {
    throw new Error("No Feedback Period found for this Module Offering");
  }

  const now = new Date();
  if (now < period.openAt || now > period.closeAt) {
    throw new Error("Feedback Period is not open");
  }

  const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({
    where: { id: input.moduleOfferingId },
    include: { courseOffering: true },
  });

  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: input.studentId, courseOfferingId: moduleOffering.courseOfferingId, status: "ACTIVE" },
    include: { moduleEnrollmentExceptions: { select: { moduleOfferingId: true, exceptionType: true } } },
  });

  if (!enrollment) {
    throw new Error("Permission denied: Student is not enrolled in this Course Offering");
  }

  const allModuleOfferings = await prisma.moduleOffering.findMany({
    where: { courseOfferingId: moduleOffering.courseOfferingId },
    select: { id: true },
  });

  const effective = calculateEffectiveModuleAccess(allModuleOfferings, enrollment.moduleEnrollmentExceptions);
  if (!effective.some((mo) => mo.id === input.moduleOfferingId)) {
    throw new Error("Permission denied: Student does not have Effective Module Access to this Module Offering");
  }

  const existing = await prisma.feedbackResponse.findUnique({
    where: { feedbackPeriodId_studentId: { feedbackPeriodId: period.id, studentId: input.studentId } },
  });
  if (existing) {
    throw new Error("Student has already submitted feedback for this Feedback Period");
  }

  return prisma.feedbackResponse.create({
    data: {
      feedbackPeriodId: period.id,
      studentId: input.studentId,
      rating: input.rating,
      comment: input.comment ?? null,
    },
  });
}

// ── getFeedbackReport ─────────────────────────────────────────────────────────

export type GetFeedbackReportInput = {
  moduleOfferingId: string;
  requesterId: string;
};

export type FeedbackReportEducator = {
  responseCount: number;
  averageRating: number;
  comments: string[];
};

export type FeedbackReportAdmin = FeedbackReportEducator & {
  responses: Array<{
    id: string;
    studentId: string;
    rating: number;
    comment: string | null;
    status: string;
  }>;
};

export type FeedbackReport = FeedbackReportEducator | FeedbackReportAdmin;

export async function getFeedbackReport(input: GetFeedbackReportInput): Promise<FeedbackReport> {
  const requester = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.requesterId } });

  if (requester.role === "STUDENT") {
    throw new Error("Permission denied: Students may not view Feedback Reports");
  }

  if (requester.role === "EDUCATOR") {
    const moduleOffering = await prisma.moduleOffering.findUniqueOrThrow({ where: { id: input.moduleOfferingId } });
    if (moduleOffering.primaryEducatorId !== requester.id) {
      throw new Error("Permission denied: Educator is not assigned to this Module Offering");
    }
  }

  const period = await prisma.feedbackPeriod.findUnique({ where: { moduleOfferingId: input.moduleOfferingId } });
  if (!period) {
    return { responseCount: 0, averageRating: 0, comments: [] };
  }

  const activeResponses = await prisma.feedbackResponse.findMany({
    where: { feedbackPeriodId: period.id, status: "ACTIVE" },
  });

  const responseCount = activeResponses.length;
  const averageRating = responseCount > 0
    ? activeResponses.reduce((sum, r) => sum + r.rating, 0) / responseCount
    : 0;
  const comments = activeResponses.map((r) => r.comment).filter((c): c is string => c !== null);

  if (requester.role === "ADMINISTRATOR" || requester.role === "SUPER_ADMINISTRATOR") {
    const allResponses = await prisma.feedbackResponse.findMany({ where: { feedbackPeriodId: period.id } });
    return {
      responseCount,
      averageRating,
      comments,
      responses: allResponses.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
      })),
    };
  }

  return { responseCount, averageRating, comments };
}

// ── moderateFeedbackResponse ──────────────────────────────────────────────────

export type ModerateFeedbackResponseInput = {
  responseId: string;
  moderatedById: string;
};

export async function moderateFeedbackResponse(input: ModerateFeedbackResponseInput) {
  const moderator = await prisma.userAccount.findUniqueOrThrow({ where: { id: input.moderatedById } });

  if (moderator.role !== "ADMINISTRATOR" && moderator.role !== "SUPER_ADMINISTRATOR") {
    throw new Error("Permission denied: only Administrators may moderate feedback responses");
  }

  return prisma.feedbackResponse.update({
    where: { id: input.responseId },
    data: { status: "MODERATED" },
  });
}
