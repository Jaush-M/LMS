import { hashPassword } from "better-auth/crypto";
import { LmsRole } from "@prisma/client";

import {
  emailForIdentifier,
  formatGeneratedIdentifier,
} from "../lib/identifiers";
import { prisma } from "../lib/prisma";

const seedPassword = "Password123!";

type SeedAccount = {
  authUserId: string;
  userAccountId: string;
  profileId?: string;
  identifier: string;
  email: string;
};

async function resetDatabase() {
  await prisma.auditLogEntry.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.mention.deleteMany();
  await prisma.fileAsset.deleteMany();
  await prisma.sharedLink.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.moduleGroupChat.deleteMany();
  await prisma.moduleFeedbackResponse.deleteMany();
  await prisma.moduleFeedbackPeriod.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.finalGradeCorrection.deleteMany();
  await prisma.finalGrade.deleteMany();
  await prisma.markCorrection.deleteMany();
  await prisma.componentMark.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignmentDeadlineExtension.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.assessmentComponent.deleteMany();
  await prisma.moduleContentItem.deleteMany();
  await prisma.contentSection.deleteMany();
  await prisma.attendanceCorrectionRequest.deleteMany();
  await prisma.educatorAttendanceRecord.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.capacityOverride.deleteMany();
  await prisma.moduleEnrolmentException.deleteMany();
  await prisma.enrolment.deleteMany();
  await prisma.moduleOffering.deleteMany();
  await prisma.courseOffering.deleteMany();
  await prisma.defaultAssessmentComponent.deleteMany();
  await prisma.templateModulePrerequisite.deleteMany();
  await prisma.templateModule.deleteMany();
  await prisma.academicLevel.deleteMany();
  await prisma.curriculumTemplate.deleteMany();
  await prisma.sessionType.deleteMany();
  await prisma.studyMode.deleteMany();
  await prisma.intake.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.awardingBody.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.educatorProfile.deleteMany();
  await prisma.administratorProfile.deleteMany();
  await prisma.userAccount.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.identifierCounter.deleteMany();
}

async function createSeedAccount(
  role: LmsRole,
  sequence: number,
  fullName: string,
  homeFacultyId?: string,
): Promise<SeedAccount> {
  const identifier = formatGeneratedIdentifier(role, sequence);
  const email = emailForIdentifier(identifier);
  const authUserId = crypto.randomUUID();
  const password = await hashPassword(seedPassword);

  const authUser = await prisma.user.create({
    data: {
      id: authUserId,
      name: fullName,
      email,
      emailVerified: true,
      accounts: {
        create: {
          id: crypto.randomUUID(),
          accountId: authUserId,
          providerId: "credential",
          password,
        },
      },
    },
  });

  const userAccount = await prisma.userAccount.create({
    data: {
      authUserId: authUser.id,
      role,
      generatedIdentifier: identifier,
      institutionalEmail: email,
      fullName,
      status: "ACTIVE",
      mustChangePassword: false,
    },
  });

  let profileId: string | undefined;
  if (role === "STUDENT") {
    const profile = await prisma.studentProfile.create({
      data: { userAccountId: userAccount.id },
    });
    profileId = profile.id;
  }

  if (role === "EDUCATOR") {
    const profile = await prisma.educatorProfile.create({
      data: { userAccountId: userAccount.id, homeFacultyId },
    });
    profileId = profile.id;
  }

  if (role === "ADMINISTRATOR" || role === "SUPER_ADMINISTRATOR") {
    const profile = await prisma.administratorProfile.create({
      data: { userAccountId: userAccount.id },
    });
    profileId = profile.id;
  }

  return {
    authUserId,
    userAccountId: userAccount.id,
    profileId,
    identifier,
    email,
  };
}

function addWeeks(date: Date, weeks: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

async function main() {
  await resetDatabase();

  await prisma.identifierCounter.createMany({
    data: [
      { role: "SUPER_ADMINISTRATOR", nextValue: 2 },
      { role: "ADMINISTRATOR", nextValue: 3 },
      { role: "EDUCATOR", nextValue: 11 },
      { role: "STUDENT", nextValue: 201 },
    ],
  });

  const faculties = await Promise.all([
    prisma.faculty.create({
      data: { code: "FCS", name: "Faculty of Computer Science" },
    }),
    prisma.faculty.create({
      data: { code: "FBM", name: "Faculty of Business and Management" },
    }),
  ]);

  const [villaCollege, uweBristol] = await Promise.all([
    prisma.awardingBody.create({ data: { name: "Villa College" } }),
    prisma.awardingBody.create({ data: { name: "UWE Bristol" } }),
  ]);

  const intakes = await Promise.all(
    ["January", "May", "September"].map((name) =>
      prisma.intake.create({ data: { name } }),
    ),
  );

  const studyModes = await Promise.all(
    ["Face-to-Face", "Blended", "E-Learning"].map((name) =>
      prisma.studyMode.create({ data: { name } }),
    ),
  );

  const sessionTypes = await Promise.all(
    ["Lecture", "Practical Workshop", "Tutorial", "Lab", "Exam", "Other"].map(
      (name) => prisma.sessionType.create({ data: { name } }),
    ),
  );

  const superAdmin = await createSeedAccount(
    "SUPER_ADMINISTRATOR",
    1,
    "Super Administrator",
  );

  const admins = await Promise.all([
    createSeedAccount("ADMINISTRATOR", 1, "Aisha Rasheed"),
    createSeedAccount("ADMINISTRATOR", 2, "Ibrahim Waheed"),
  ]);

  const educators: SeedAccount[] = [];
  for (let i = 1; i <= 10; i += 1) {
    educators.push(
      await createSeedAccount(
        "EDUCATOR",
        i,
        `Educator ${String(i).padStart(2, "0")}`,
        faculties[i % faculties.length].id,
      ),
    );
  }

  const students: SeedAccount[] = [];
  for (let i = 1; i <= 200; i += 1) {
    students.push(
      await createSeedAccount(
        "STUDENT",
        i,
        `Student ${String(i).padStart(3, "0")}`,
      ),
    );
  }

  const courses = [
    ["FND-IT", "Foundation in Information Technology", "FOUNDATION", faculties[0]],
    ["FND-BUS", "Foundation in Business", "FOUNDATION", faculties[1]],
    ["DIP-CS", "Diploma in Computer Science", "DIPLOMA", faculties[0]],
    ["DIP-BM", "Diploma in Business Management", "DIPLOMA", faculties[1]],
    ["BSC-CS", "BSc Computer Science", "DEGREE", faculties[0]],
    ["BA-BUS", "BA Business Administration", "DEGREE", faculties[1]],
    ["MSC-DS", "MSc Data Science", "MASTERS", faculties[0]],
    ["MBA", "Master of Business Administration", "MASTERS", faculties[1]],
    ["PHD-CS", "PhD Computer Science", "PHD", faculties[0]],
    ["PHD-MGT", "PhD Management", "PHD", faculties[1]],
  ] as const;

  const moduleCatalog = new Map<string, string>();

  for (const [courseIndex, [code, name, awardLevel, faculty]] of courses.entries()) {
    const course = await prisma.course.create({
      data: {
        code,
        name,
        awardLevel,
        facultyId: faculty.id,
        awardingBodyId: courseIndex % 3 === 0 ? uweBristol.id : villaCollege.id,
      },
    });

    const template = await prisma.curriculumTemplate.create({
      data: {
        courseId: course.id,
        versionLabel: "2026",
        status: "ACTIVE",
      },
    });

    const levelLabels =
      awardLevel === "MASTERS"
        ? ["Semester 1", "Semester 2"]
        : awardLevel === "PHD"
          ? ["Year 1", "Year 2", "Year 3+"]
          : awardLevel === "FOUNDATION"
            ? ["Foundation"]
            : awardLevel === "DIPLOMA"
              ? ["Year 1", "Year 2"]
              : ["Year 1", "Year 2", "Year 3"];

    const levels = [];
    for (const [index, label] of levelLabels.entries()) {
      levels.push(
        await prisma.academicLevel.create({
          data: {
            curriculumTemplateId: template.id,
            label,
            sortOrder: index + 1,
            expectedCredits: 120,
          },
        }),
      );
    }

    const templateModules = [];
    for (let moduleIndex = 1; moduleIndex <= 4; moduleIndex += 1) {
      const moduleCode = `${code.replace(/-/g, "")}${moduleIndex}01`;
      const moduleName = `${name} Module ${moduleIndex}`;
      let moduleId = moduleCatalog.get(moduleCode);
      if (!moduleId) {
        const moduleRecord = await prisma.module.create({
          data: {
            code: moduleCode,
            name: moduleName,
            description: `Seed module for ${name}.`,
          },
        });
        moduleId = moduleRecord.id;
        moduleCatalog.set(moduleCode, moduleRecord.id);
      }

      const level = levels[(moduleIndex - 1) % levels.length];
      const templateModule = await prisma.templateModule.create({
        data: {
          curriculumTemplateId: template.id,
          academicLevelId: level.id,
          moduleId,
          credits: awardLevel === "MASTERS" ? 30 : 20,
          sortOrder: moduleIndex,
          defaultAssessmentComponents: {
            create: [
              {
                title: "Coursework",
                type: "ONLINE_ASSIGNMENT",
                weightPercent: "60",
                maximumMark: "100",
                sortOrder: 1,
              },
              {
                title: "Final Exam",
                type: "OFFLINE_ASSESSMENT",
                weightPercent: "40",
                maximumMark: "100",
                sortOrder: 2,
              },
            ],
          },
        },
        include: { defaultAssessmentComponents: true },
      });
      templateModules.push(templateModule);
    }

    for (let i = 1; i < templateModules.length; i += 1) {
      await prisma.templateModulePrerequisite.create({
        data: {
          templateModuleId: templateModules[i].id,
          prerequisiteTemplateModuleId: templateModules[i - 1].id,
        },
      });
    }

    const start = new Date(Date.UTC(2026, courseIndex % 3 === 0 ? 0 : courseIndex % 3 === 1 ? 4 : 8, 5, 4));
    const finish = addWeeks(start, 15);
    const courseOffering = await prisma.courseOffering.create({
      data: {
        courseId: course.id,
        intakeId: intakes[courseIndex % intakes.length].id,
        studyModeId: studyModes[courseIndex % studyModes.length].id,
        name: `${name} - ${intakes[courseIndex % intakes.length].name} 2026`,
        startsAt: start,
        finishesAt: finish,
        capacity: 24,
        status: "ACTIVE",
      },
    });

    for (const [moduleIndex, templateModule] of templateModules.entries()) {
      const educator = educators[(courseIndex + moduleIndex) % educators.length];
      const moduleOffering = await prisma.moduleOffering.create({
        data: {
          courseOfferingId: courseOffering.id,
          templateModuleId: templateModule.id,
          primaryEducatorId: educator.profileId!,
          studyModeId: moduleIndex % 2 === 0 ? null : studyModes[1].id,
          startsAt: addWeeks(start, moduleIndex),
          finishesAt: addWeeks(start, moduleIndex + 12),
          status: "ACTIVE",
          groupChat: { create: {} },
          assessmentComponents: {
            create: templateModule.defaultAssessmentComponents.map((component) => ({
              title: component.title,
              type: component.type,
              weightPercent: component.weightPercent,
              maximumMark: component.maximumMark,
              sortOrder: component.sortOrder,
            })),
          },
        },
        include: {
          assessmentComponents: true,
          groupChat: true,
        },
      });

      const contentSection = await prisma.contentSection.create({
        data: {
          moduleOfferingId: moduleOffering.id,
          title: "Week 1",
          sortOrder: 1,
        },
      });

      await prisma.moduleContentItem.create({
        data: {
          moduleOfferingId: moduleOffering.id,
          contentSectionId: contentSection.id,
          title: "Module introduction",
          bodyRichText: "Overview, learning outcomes, and key resources.",
          visibility: "PUBLISHED",
          sortOrder: 1,
          publishedAt: new Date(),
          sharedLinks: {
            create: {
              url: "https://villacollege.edu.mv/",
              label: "Villa College",
              createdById: educator.userAccountId,
            },
          },
        },
      });

      const onlineComponent = moduleOffering.assessmentComponents.find(
        (component) => component.type === "ONLINE_ASSIGNMENT",
      )!;
      const offlineComponent = moduleOffering.assessmentComponents.find(
        (component) => component.type === "OFFLINE_ASSESSMENT",
      )!;
      const assignment = await prisma.assignment.create({
        data: {
          moduleOfferingId: moduleOffering.id,
          assessmentComponentId: onlineComponent.id,
          contentSectionId: contentSection.id,
          title: "Coursework 1",
          instructionsRichText: "Submit your coursework as a single file.",
          deadlineAt: addWeeks(start, 6),
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
      });

      await prisma.classSession.create({
        data: {
          moduleOfferingId: moduleOffering.id,
          sessionTypeId: sessionTypes[0].id,
          title: "Week 1 Lecture",
          startsAt: addWeeks(start, moduleIndex),
          endsAt: new Date(addWeeks(start, moduleIndex).getTime() + 2 * 60 * 60 * 1000),
          location: moduleIndex % 2 === 0 ? "Room A-101" : "https://meet.example/lms",
          attendanceRecords: {
            create: students
              .slice(courseIndex * 20, courseIndex * 20 + 20)
              .map((student, studentIndex) => ({
                studentId: student.profileId!,
                status:
                  studentIndex % 12 === 0
                    ? "EXCUSED"
                    : studentIndex % 7 === 0
                      ? "ABSENT"
                      : studentIndex % 5 === 0
                        ? "LATE"
                        : "PRESENT",
                submittedById: educator.userAccountId,
              })),
          },
          educatorAttendance: {
            create: {
              educatorId: educator.profileId!,
              submittedAttendanceAt: new Date(),
            },
          },
        },
      });

      const enrolledStudents = students.slice(courseIndex * 20, courseIndex * 20 + 20);
      for (const [studentIndex, student] of enrolledStudents.slice(0, 5).entries()) {
        const submission = await prisma.submission.create({
          data: {
            assignmentId: assignment.id,
            studentId: student.profileId!,
            submittedAt: addWeeks(start, 5),
            status: "MARKED",
            isActive: true,
          },
        });
        await prisma.componentMark.create({
          data: {
            assessmentComponentId: onlineComponent.id,
            studentId: student.profileId!,
            submissionId: submission.id,
            mark: String(65 + studentIndex),
            feedback: "Seed feedback for coursework.",
            status: "RELEASED",
            releasedAt: new Date(),
            markedById: educator.profileId!,
          },
        });
        await prisma.componentMark.create({
          data: {
            assessmentComponentId: offlineComponent.id,
            studentId: student.profileId!,
            mark: String(55 + studentIndex),
            feedback: "Seed exam mark.",
            status: "RELEASED",
            releasedAt: new Date(),
            markedById: educator.profileId!,
          },
        });
        await prisma.finalGrade.create({
          data: {
            moduleOfferingId: moduleOffering.id,
            studentId: student.profileId!,
            percentage: String(61 + studentIndex),
            passStatus: "PASS",
            status: "RELEASED",
            releasedAt: new Date(),
          },
        });
      }

      const chatMessage = await prisma.chatMessage.create({
        data: {
          moduleGroupChatId: moduleOffering.groupChat!.id,
          senderId: enrolledStudents[0].userAccountId,
          body: `@${educator.identifier} Could you confirm the coursework requirements?`,
          mentions: {
            create: {
              mentionedUserId: educator.userAccountId,
              notification: {
                create: {
                  recipientId: educator.userAccountId,
                  type: "MENTION",
                  title: "You were mentioned in a module chat",
                  body: "A student asked about coursework requirements.",
                  relatedEntityType: "ChatMessage",
                },
              },
            },
          },
        },
        include: { mentions: { include: { notification: true } } },
      });

      await prisma.notification.updateMany({
        where: { mentionId: chatMessage.mentions[0]?.id },
        data: { relatedEntityId: chatMessage.id },
      });
    }

    const enrolledStudents = students.slice(courseIndex * 20, courseIndex * 20 + 20);
    for (const [studentIndex, student] of enrolledStudents.entries()) {
      await prisma.enrolment.create({
        data: {
          studentId: student.profileId!,
          courseOfferingId: courseOffering.id,
          isMain: studentIndex === 0,
          status: "ACTIVE",
        },
      });
    }

    await prisma.calendarEvent.create({
      data: {
        scope: "COURSE_OFFERING",
        courseOfferingId: courseOffering.id,
        title: "Orientation",
        description: "Course offering orientation session.",
        startsAt: start,
        endsAt: new Date(start.getTime() + 60 * 60 * 1000),
        createdById: admins[0].userAccountId,
      },
    });

    await prisma.announcement.create({
      data: {
        scope: "COURSE_OFFERING",
        courseOfferingId: courseOffering.id,
        title: "Welcome to the intake",
        bodyRichText: "Please review your modules, calendar, and assignment deadlines.",
        createdById: admins[0].userAccountId,
      },
    });
  }

  await prisma.calendarEvent.create({
    data: {
      scope: "INSTITUTION",
      title: "Eid Holiday",
      description: "Institution-wide holiday.",
      startsAt: new Date(Date.UTC(2026, 2, 20, 0)),
      endsAt: new Date(Date.UTC(2026, 2, 22, 23, 59)),
      createdById: admins[0].userAccountId,
    },
  });

  await prisma.systemSetting.createMany({
    data: [
      { key: "defaultReminderPeriodDays", valueJson: 15, updatedById: superAdmin.userAccountId },
      { key: "attendanceCorrectionWindowDays", valueJson: 8, updatedById: superAdmin.userAccountId },
      { key: "postCourseMarkingWindowDays", valueJson: 14, updatedById: superAdmin.userAccountId },
      { key: "passThresholdPercent", valueJson: 50, updatedById: superAdmin.userAccountId },
      { key: "attendanceRiskThresholdPercent", valueJson: 80, updatedById: superAdmin.userAccountId },
      {
        key: "uploadLimits",
        valueJson: {
          chatAttachmentMb: 8,
          assignmentSubmissionMb: 25,
          moduleContentMb: 25,
          announcementAttachmentMb: 25,
        },
        updatedById: superAdmin.userAccountId,
      },
    ],
  });

  await prisma.auditLogEntry.create({
    data: {
      eventType: "SYSTEM",
      action: "seed.completed",
      actorId: superAdmin.userAccountId,
      entityType: "SeedData",
      entityId: "initial",
      afterJson: {
        superAdministrators: 1,
        administrators: 2,
        faculties: 2,
        courses: 10,
        educators: 10,
        students: 200,
      },
    },
  });

  console.log("Seed complete");
  console.log(`Super Administrator: ${superAdmin.email} / ${seedPassword}`);
  console.log(`Administrator: ${admins[0].email} / ${seedPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
