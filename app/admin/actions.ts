"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/session";

const adminRoles = ["ADMINISTRATOR", "SUPER_ADMINISTRATOR"];

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length > 0 ? value : undefined;
}

function redirectToAdmin(kind: "success" | "error", message: string): never {
  redirect(`/admin?${kind}=${encodeURIComponent(message)}`);
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function requireAcademicAdmin() {
  return requireRoles(adminRoles);
}

const courseSchema = z.object({
  facultyId: z.string().min(1),
  awardingBodyId: z.string().optional(),
  code: z.string().min(2).max(24),
  name: z.string().min(3).max(160),
  awardLevel: z.enum(["FOUNDATION", "DIPLOMA", "DEGREE", "MASTERS", "PHD"]),
});

export async function createCourse(formData: FormData) {
  const { account } = await requireAcademicAdmin();
  const parsed = courseSchema.safeParse({
    facultyId: text(formData, "facultyId"),
    awardingBodyId: optionalText(formData, "awardingBodyId"),
    code: text(formData, "code").toUpperCase(),
    name: text(formData, "name"),
    awardLevel: text(formData, "awardLevel"),
  });

  if (!parsed.success) {
    redirectToAdmin("error", "Course details are incomplete.");
  }

  try {
    const course = await prisma.course.create({
      data: parsed.data,
    });

    await prisma.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "course.created",
        actorId: account.id,
        entityType: "Course",
        entityId: course.id,
        afterJson: parsed.data,
      },
    });
  } catch {
    redirectToAdmin("error", "Course could not be created. Check for duplicate course codes.");
  }

  revalidatePath("/admin");
  redirectToAdmin("success", "Course created.");
}

const moduleSchema = z.object({
  code: z.string().min(2).max(24),
  name: z.string().min(3).max(160),
  description: z.string().optional(),
});

export async function createModule(formData: FormData) {
  const { account } = await requireAcademicAdmin();
  const parsed = moduleSchema.safeParse({
    code: text(formData, "code").toUpperCase(),
    name: text(formData, "name"),
    description: optionalText(formData, "description"),
  });

  if (!parsed.success) {
    redirectToAdmin("error", "Module details are incomplete.");
  }

  try {
    const moduleRecord = await prisma.module.create({ data: parsed.data });
    await prisma.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "module.created",
        actorId: account.id,
        entityType: "Module",
        entityId: moduleRecord.id,
        afterJson: parsed.data,
      },
    });
  } catch {
    redirectToAdmin("error", "Module could not be created. Check for duplicate module codes.");
  }

  revalidatePath("/admin");
  redirectToAdmin("success", "Module created.");
}

const curriculumSchema = z.object({
  courseId: z.string().min(1),
  versionLabel: z.string().min(1).max(40),
  levels: z.string().min(1),
});

function parseLevels(rawLevels: string) {
  return rawLevels
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [label, credits] = line.split("|").map((part) => part.trim());
      const expectedCredits = credits ? Number.parseInt(credits, 10) : undefined;

      if (!label || (credits && Number.isNaN(expectedCredits))) {
        throw new Error("Invalid academic level format.");
      }

      return {
        label,
        expectedCredits,
        sortOrder: index + 1,
      };
    });
}

export async function createCurriculumTemplate(formData: FormData) {
  const { account } = await requireAcademicAdmin();
  const parsed = curriculumSchema.safeParse({
    courseId: text(formData, "courseId"),
    versionLabel: text(formData, "versionLabel"),
    levels: text(formData, "levels"),
  });

  if (!parsed.success) {
    redirectToAdmin("error", "Curriculum template details are incomplete.");
  }

  let levels: ReturnType<typeof parseLevels>;
  try {
    levels = parseLevels(parsed.data.levels);
  } catch {
    redirectToAdmin("error", "Use one academic level per line, like Level 4|120.");
  }

  try {
    const template = await prisma.curriculumTemplate.create({
      data: {
        courseId: parsed.data.courseId,
        versionLabel: parsed.data.versionLabel,
        status: "DRAFT",
        academicLevels: {
          create: levels,
        },
      },
    });

    await prisma.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "curriculum_template.created",
        actorId: account.id,
        entityType: "CurriculumTemplate",
        entityId: template.id,
        afterJson: { ...parsed.data, levels },
      },
    });
  } catch {
    redirectToAdmin("error", "Curriculum template could not be created.");
  }

  revalidatePath("/admin");
  redirectToAdmin("success", "Curriculum template created.");
}

const templateModuleSchema = z.object({
  curriculumTemplateId: z.string().min(1),
  academicLevelId: z.string().min(1),
  moduleId: z.string().min(1),
  credits: z.coerce.number().int().min(1).max(120),
  sortOrder: z.coerce.number().int().min(1).max(100),
});

export async function addTemplateModule(formData: FormData) {
  const { account } = await requireAcademicAdmin();
  const parsed = templateModuleSchema.safeParse({
    curriculumTemplateId: text(formData, "curriculumTemplateId"),
    academicLevelId: text(formData, "academicLevelId"),
    moduleId: text(formData, "moduleId"),
    credits: text(formData, "credits"),
    sortOrder: text(formData, "sortOrder"),
  });

  if (!parsed.success) {
    redirectToAdmin("error", "Template module details are incomplete.");
  }

  const level = await prisma.academicLevel.findFirst({
    where: {
      id: parsed.data.academicLevelId,
      curriculumTemplateId: parsed.data.curriculumTemplateId,
    },
  });

  if (!level) {
    redirectToAdmin("error", "Academic level does not belong to that curriculum template.");
  }

  try {
    const templateModule = await prisma.templateModule.create({
      data: parsed.data,
    });

    await prisma.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "template_module.added",
        actorId: account.id,
        entityType: "TemplateModule",
        entityId: templateModule.id,
        afterJson: parsed.data,
      },
    });
  } catch {
    redirectToAdmin("error", "Template module could not be added. Check duplicate module or sort order.");
  }

  revalidatePath("/admin");
  redirectToAdmin("success", "Template module added.");
}

const offeringSchema = z.object({
  courseId: z.string().min(1),
  curriculumTemplateId: z.string().min(1),
  intakeId: z.string().min(1),
  studyModeId: z.string().min(1),
  name: z.string().min(3).max(180),
  startsAt: z.string().min(1),
  finishesAt: z.string().min(1),
  capacity: z.coerce.number().int().min(1).max(24),
  status: z.enum(["PLANNED", "ACTIVE"]),
});

export async function createCourseOffering(formData: FormData) {
  const { account } = await requireAcademicAdmin();
  const parsed = offeringSchema.safeParse({
    courseId: text(formData, "courseId"),
    curriculumTemplateId: text(formData, "curriculumTemplateId"),
    intakeId: text(formData, "intakeId"),
    studyModeId: text(formData, "studyModeId"),
    name: text(formData, "name"),
    startsAt: text(formData, "startsAt"),
    finishesAt: text(formData, "finishesAt"),
    capacity: text(formData, "capacity"),
    status: text(formData, "status"),
  });

  if (!parsed.success) {
    redirectToAdmin("error", "Course offering details are incomplete.");
  }

  const startsAt = parseDate(parsed.data.startsAt);
  const finishesAt = parseDate(parsed.data.finishesAt);

  if (!startsAt || !finishesAt || finishesAt <= startsAt) {
    redirectToAdmin("error", "Course offering dates are invalid.");
  }

  const template = await prisma.curriculumTemplate.findFirst({
    where: {
      id: parsed.data.curriculumTemplateId,
      courseId: parsed.data.courseId,
    },
    include: {
      templateModules: {
        include: {
          defaultAssessmentComponents: true,
        },
        orderBy: [{ academicLevel: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      },
    },
  });

  if (!template || template.templateModules.length === 0) {
    redirectToAdmin("error", "Selected curriculum template has no modules.");
  }

  const educatorIds = template.templateModules.map((templateModule) =>
    text(formData, `educator_${templateModule.id}`),
  );

  if (educatorIds.some((educatorId) => !educatorId)) {
    redirectToAdmin("error", "Select one primary educator for every module.");
  }

  const educatorCount = await prisma.educatorProfile.count({
    where: { id: { in: educatorIds } },
  });

  if (educatorCount !== new Set(educatorIds).size) {
    redirectToAdmin("error", "One or more selected educators do not exist.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const offering = await tx.courseOffering.create({
        data: {
          courseId: parsed.data.courseId,
          intakeId: parsed.data.intakeId,
          studyModeId: parsed.data.studyModeId,
          name: parsed.data.name,
          startsAt,
          finishesAt,
          capacity: parsed.data.capacity,
          status: parsed.data.status,
        },
      });

      await tx.calendarEvent.create({
        data: {
          scope: "COURSE_OFFERING",
          courseOfferingId: offering.id,
          title: `${offering.name} course dates`,
          description: "Course offering start and finish dates.",
          startsAt,
          endsAt: finishesAt,
          createdById: account.id,
        },
      });

      for (const [index, templateModule] of template.templateModules.entries()) {
        const moduleStartsAt =
          parseDate(text(formData, `starts_${templateModule.id}`)) ?? startsAt;
        const moduleFinishesAt =
          parseDate(text(formData, `finishes_${templateModule.id}`)) ?? finishesAt;

        if (moduleFinishesAt <= moduleStartsAt) {
          throw new Error("Invalid module dates.");
        }

        const moduleOffering = await tx.moduleOffering.create({
          data: {
            courseOfferingId: offering.id,
            templateModuleId: templateModule.id,
            primaryEducatorId: educatorIds[index],
            studyModeId: parsed.data.studyModeId,
            startsAt: moduleStartsAt,
            finishesAt: moduleFinishesAt,
            status: parsed.data.status,
          },
        });

        await tx.moduleGroupChat.create({
          data: {
            moduleOfferingId: moduleOffering.id,
          },
        });

        if (templateModule.defaultAssessmentComponents.length > 0) {
          await tx.assessmentComponent.createMany({
            data: templateModule.defaultAssessmentComponents.map((component) => ({
              moduleOfferingId: moduleOffering.id,
              title: component.title,
              type: component.type,
              weightPercent: component.weightPercent,
              maximumMark: component.maximumMark,
              sortOrder: component.sortOrder,
            })),
          });
        }
      }

      await tx.auditLogEntry.create({
        data: {
          eventType: "OPERATIONAL",
          action: "course_offering.created",
          actorId: account.id,
          entityType: "CourseOffering",
          entityId: offering.id,
          afterJson: {
            courseId: parsed.data.courseId,
            curriculumTemplateId: parsed.data.curriculumTemplateId,
            moduleCount: template.templateModules.length,
          },
        },
      });
    });
  } catch {
    redirectToAdmin("error", "Course offering could not be created. Check module dates and duplicate offerings.");
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirectToAdmin("success", "Course offering created with module group chats.");
}

export async function enrollStudents(formData: FormData) {
  const { account } = await requireAcademicAdmin();
  const courseOfferingId = text(formData, "courseOfferingId");
  const selectedStudentIds = formData
    .getAll("studentId")
    .filter((value): value is string => typeof value === "string");
  const allowCapacityOverride = text(formData, "allowCapacityOverride") === "on";
  const overrideReason = optionalText(formData, "overrideReason");

  if (!courseOfferingId || selectedStudentIds.length === 0) {
    redirectToAdmin("error", "Select an offering and at least one student.");
  }

  const offering = await prisma.courseOffering.findUnique({
    where: { id: courseOfferingId },
    include: {
      enrolments: {
        where: { status: "ACTIVE" },
        select: { studentId: true },
      },
    },
  });

  if (!offering) {
    redirectToAdmin("error", "Course offering not found.");
  }

  const uniqueStudentIds = [...new Set(selectedStudentIds)];
  const existingStudentIds = new Set(offering.enrolments.map((enrolment) => enrolment.studentId));
  const newStudentIds = uniqueStudentIds.filter((studentId) => !existingStudentIds.has(studentId));

  if (newStudentIds.length === 0) {
    redirectToAdmin("error", "Selected students are already enrolled.");
  }

  const activeStudents = await prisma.studentProfile.findMany({
    where: {
      id: { in: newStudentIds },
      userAccount: { status: "ACTIVE" },
    },
    select: {
      id: true,
      userAccountId: true,
    },
  });

  if (activeStudents.length !== newStudentIds.length) {
    redirectToAdmin("error", "One or more selected students are not active.");
  }

  const overCapacityBy =
    offering.enrolments.length + activeStudents.length - offering.capacity;

  if (overCapacityBy > 0 && (!allowCapacityOverride || !overrideReason)) {
    redirectToAdmin("error", "This enrolment exceeds capacity. Add an override reason to continue.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const [index, student] of activeStudents.entries()) {
        const enrolment = await tx.enrolment.create({
          data: {
            studentId: student.id,
            courseOfferingId,
            isMain: true,
            status: "ACTIVE",
          },
        });

        if (overCapacityBy > 0 && index >= activeStudents.length - overCapacityBy) {
          await tx.capacityOverride.create({
            data: {
              courseOfferingId,
              studentId: student.id,
              reason: overrideReason ?? "Capacity override approved by administrator.",
              approvedById: account.id,
            },
          });
        }

        await tx.notification.create({
          data: {
            recipientId: student.userAccountId,
            type: "ENROLMENT",
            title: "Course enrolment confirmed",
            body: "You have been enrolled into a course offering.",
            relatedEntityType: "Enrolment",
            relatedEntityId: enrolment.id,
          },
        });
      }

      await tx.auditLogEntry.create({
        data: {
          eventType: "OPERATIONAL",
          action: "students.enrolled",
          actorId: account.id,
          entityType: "CourseOffering",
          entityId: courseOfferingId,
          afterJson: {
            studentCount: activeStudents.length,
            capacityOverrideCount: Math.max(overCapacityBy, 0),
          },
          reason: overrideReason,
        },
      });
    });
  } catch {
    redirectToAdmin("error", "Students could not be enrolled.");
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirectToAdmin("success", `${activeStudents.length} student(s) enrolled.`);
}

const exceptionSchema = z.object({
  enrolmentId: z.string().min(1),
  moduleOfferingId: z.string().min(1),
  type: z.enum(["INCLUDE", "EXCLUDE"]),
  reason: z.string().min(3).max(500),
});

export async function saveModuleEnrolmentException(formData: FormData) {
  const { account } = await requireAcademicAdmin();
  const parsed = exceptionSchema.safeParse({
    enrolmentId: text(formData, "enrolmentId"),
    moduleOfferingId: text(formData, "moduleOfferingId"),
    type: text(formData, "type"),
    reason: text(formData, "reason"),
  });

  if (!parsed.success) {
    redirectToAdmin("error", "Module exception details are incomplete.");
  }

  const enrolment = await prisma.enrolment.findUnique({
    where: { id: parsed.data.enrolmentId },
  });

  const moduleOffering = await prisma.moduleOffering.findUnique({
    where: { id: parsed.data.moduleOfferingId },
  });

  if (!enrolment || !moduleOffering || enrolment.courseOfferingId !== moduleOffering.courseOfferingId) {
    redirectToAdmin("error", "Module exception must belong to the selected student's course offering.");
  }

  try {
    const exception = await prisma.moduleEnrolmentException.upsert({
      where: {
        enrolmentId_moduleOfferingId: {
          enrolmentId: parsed.data.enrolmentId,
          moduleOfferingId: parsed.data.moduleOfferingId,
        },
      },
      update: {
        type: parsed.data.type,
        reason: parsed.data.reason,
      },
      create: parsed.data,
    });

    await prisma.auditLogEntry.create({
      data: {
        eventType: "OPERATIONAL",
        action: "module_enrolment_exception.saved",
        actorId: account.id,
        entityType: "ModuleEnrolmentException",
        entityId: exception.id,
        afterJson: parsed.data,
        reason: parsed.data.reason,
      },
    });
  } catch {
    redirectToAdmin("error", "Module enrolment exception could not be saved.");
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirectToAdmin("success", "Module enrolment exception saved.");
}

const classSessionSchema = z.object({
  moduleOfferingId: z.string().min(1),
  sessionTypeId: z.string().min(1),
  title: z.string().min(2).max(160),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  location: z.string().optional(),
  isAttendanceRequired: z.boolean(),
});

export async function createClassSession(formData: FormData) {
  const { account } = await requireAcademicAdmin();
  const parsed = classSessionSchema.safeParse({
    moduleOfferingId: text(formData, "moduleOfferingId"),
    sessionTypeId: text(formData, "sessionTypeId"),
    title: text(formData, "title"),
    startsAt: text(formData, "startsAt"),
    endsAt: text(formData, "endsAt"),
    location: optionalText(formData, "location"),
    isAttendanceRequired: text(formData, "isAttendanceRequired") === "on",
  });

  if (!parsed.success) {
    redirectToAdmin("error", "Class session details are incomplete.");
  }

  const startsAt = parseDate(parsed.data.startsAt);
  const endsAt = parseDate(parsed.data.endsAt);

  if (!startsAt || !endsAt || endsAt <= startsAt) {
    redirectToAdmin("error", "Class session dates are invalid.");
  }

  const moduleOffering = await prisma.moduleOffering.findUnique({
    where: { id: parsed.data.moduleOfferingId },
    include: { courseOffering: true },
  });

  if (!moduleOffering) {
    redirectToAdmin("error", "Module offering not found.");
  }

  if (
    startsAt < moduleOffering.startsAt ||
    endsAt > moduleOffering.finishesAt ||
    startsAt < moduleOffering.courseOffering.startsAt ||
    endsAt > moduleOffering.courseOffering.finishesAt
  ) {
    redirectToAdmin("error", "Class session must fall within the module and course offering dates.");
  }

  const classSession = await prisma.classSession.create({
    data: {
      moduleOfferingId: parsed.data.moduleOfferingId,
      sessionTypeId: parsed.data.sessionTypeId,
      title: parsed.data.title,
      startsAt,
      endsAt,
      location: parsed.data.location,
      isAttendanceRequired: parsed.data.isAttendanceRequired,
    },
  });

  await prisma.calendarEvent.create({
    data: {
      scope: "MODULE_OFFERING",
      moduleOfferingId: parsed.data.moduleOfferingId,
      title: parsed.data.title,
      description: parsed.data.location,
      startsAt,
      endsAt,
      createdById: account.id,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      eventType: "OPERATIONAL",
      action: "class_session.created",
      actorId: account.id,
      entityType: "ClassSession",
      entityId: classSession.id,
      afterJson: {
        moduleOfferingId: parsed.data.moduleOfferingId,
        title: parsed.data.title,
        startsAt,
        endsAt,
      },
    },
  });

  revalidatePath("/admin");
  revalidatePath("/educator");
  redirectToAdmin("success", "Class session created.");
}
