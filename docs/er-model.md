# LMS ER Model

This document is the first-pass data model for the LMS. It is intended to guide the ER diagram, Prisma schema, migrations, and implementation planning.

## Conventions

- Primary keys are `id` unless a stable business identifier is explicitly listed.
- Most records should include `createdAt` and `updatedAt`.
- Sensitive or historical records should include `createdById` and preserve attribution when related users are disabled.
- Records that should not be deleted should use status fields such as `active`, `inactive`, `archived`, `disabled`, or `removed`.
- Timestamps are stored in UTC and displayed in Maldives time.

## Identity And Roles

### UserAccount

Represents a login identity managed through Better Auth plus LMS role metadata.

Fields:
- `id`
- `role`: `student | educator | administrator | super_administrator`
- `generatedIdentifier`: unique, never reused, e.g. `S000001`, `E000001`
- `institutionalEmail`: unique
- `fullName`
- `phone`
- `status`: `inactive | active | disabled`
- `mustChangePassword`

Relationships:
- one `UserAccount` may have one `StudentProfile`
- one `UserAccount` may have one `EducatorProfile`
- one `UserAccount` may have one `AdministratorProfile`
- one `UserAccount` may create many `AuditLogEntries`
- one `UserAccount` may receive many `Notifications`

### StudentProfile

Fields:
- `id`
- `userAccountId`

Relationships:
- belongs to one `UserAccount`
- has many `Enrolments`
- has many `Submissions`
- has many `ComponentMarks`
- has many `FinalGrades`
- has many `AttendanceRecords`
- has many `ModuleFeedbackResponses`

### EducatorProfile

Fields:
- `id`
- `userAccountId`
- `homeFacultyId` nullable

Relationships:
- belongs to one `UserAccount`
- optionally belongs to one `Faculty`
- has many `ModuleOfferings` as primary educator

### AdministratorProfile

Fields:
- `id`
- `userAccountId`

Relationships:
- belongs to one `UserAccount`

## Academic Catalogue

### Faculty

Fields:
- `id`
- `name`
- `code`
- `status`: `active | inactive`

Relationships:
- has many `Courses`
- has many `EducatorProfiles` as home faculty

### AwardingBody

Fields:
- `id`
- `name`
- `status`: `active | inactive`

Relationships:
- has many `Courses`

### Course

Fields:
- `id`
- `facultyId`
- `awardingBodyId` nullable
- `code`: unique among all courses and never reused
- `name`
- `awardLevel`: `foundation | diploma | degree | masters | phd`
- `status`: `active | inactive`

Relationships:
- belongs to one `Faculty`
- optionally belongs to one `AwardingBody`
- has one `CurriculumTemplate`
- has many `CourseOfferings`

### Module

Fields:
- `id`
- `code`: unique among all modules and never reused
- `name`
- `description`
- `status`: `active | inactive`

Relationships:
- has many `TemplateModules`
- has many `ModuleOfferings` through `TemplateModule`

### Intake

Fields:
- `id`
- `name`: e.g. `January`, `May`, `September`
- `status`: `active | inactive`

Relationships:
- has many `CourseOfferings`

### StudyMode

Fields:
- `id`
- `name`: e.g. `Face-to-Face`, `Blended`, `E-Learning`
- `status`: `active | inactive`

Relationships:
- has many `CourseOfferings`
- has many `ModuleOfferings`

## Curriculum Templates

### CurriculumTemplate

Fields:
- `id`
- `courseId`
- `versionLabel`
- `status`: `draft | active | inactive`

Relationships:
- belongs to one `Course`
- has many `AcademicLevels`
- has many `TemplateModules`

### AcademicLevel

Fields:
- `id`
- `curriculumTemplateId`
- `label`: e.g. `Year 1`, `Semester 1`, `Dissertation`
- `sortOrder`
- `expectedCredits` nullable

Relationships:
- belongs to one `CurriculumTemplate`
- has many `TemplateModules`

### TemplateModule

Fields:
- `id`
- `curriculumTemplateId`
- `academicLevelId`
- `moduleId`
- `credits`
- `sortOrder`

Relationships:
- belongs to one `CurriculumTemplate`
- belongs to one `AcademicLevel`
- belongs to one `Module`
- has many `TemplateModulePrerequisites`
- has many `DefaultAssessmentComponents`
- produces many `ModuleOfferings`

### TemplateModulePrerequisite

Fields:
- `id`
- `templateModuleId`
- `prerequisiteTemplateModuleId`

Relationships:
- belongs to one `TemplateModule`
- references one prerequisite `TemplateModule` inside the same `CurriculumTemplate`

### DefaultAssessmentComponent

Fields:
- `id`
- `templateModuleId`
- `title`
- `type`: `online_assignment | offline_assessment`
- `weightPercent`
- `maximumMark`
- `sortOrder`

Relationships:
- belongs to one `TemplateModule`

## Course Delivery

### CourseOffering

Fields:
- `id`
- `courseId`
- `intakeId`
- `studyModeId`
- `name`
- `startAt`
- `finishAt`
- `capacity`: default `24`
- `status`: `planned | active | archived`

Relationships:
- belongs to one `Course`
- belongs to one `Intake`
- belongs to one default `StudyMode`
- has many `ModuleOfferings`
- has many `Enrolments`
- has many `CourseOfferingEvents`
- has many `CourseOfferingAnnouncements`

### ModuleOffering

Fields:
- `id`
- `courseOfferingId`
- `templateModuleId`
- `primaryEducatorId`
- `studyModeId` nullable
- `startAt`
- `finishAt`
- `status`: `planned | active | archived`

Relationships:
- belongs to one `CourseOffering`
- belongs to one `TemplateModule`
- belongs to one primary `EducatorProfile`
- optionally overrides one `StudyMode`
- has one `ModuleGroupChat`
- has many `ClassSessions`
- has many `AssessmentComponents`
- has many `Assignments`
- has many `ContentSections`
- has many `ModuleOfferingEvents`
- has many `ModuleOfferingAnnouncements`
- has many `ModuleFeedbackPeriods`

## Enrolment And Access

### Enrolment

Fields:
- `id`
- `studentId`
- `courseOfferingId`
- `isMain`
- `status`: `active | withdrawn | completed`
- `enrolledAt`

Relationships:
- belongs to one `StudentProfile`
- belongs to one `CourseOffering`
- has many `ModuleEnrolmentExceptions`

Constraints:
- one Student should have at most one active `isMain` enrolment
- one Student should not have duplicate active enrolments in the same Course Offering

### ModuleEnrolmentException

Fields:
- `id`
- `enrolmentId`
- `moduleOfferingId`
- `type`: `include | exclude`
- `reason`

Relationships:
- belongs to one `Enrolment`
- belongs to one `ModuleOffering`

Derived access:
- `EffectiveModuleAccess` is not a table by default.
- It is calculated from Course Offering enrolment, active Module Offerings, and include/exclude exceptions.

### CapacityOverride

Fields:
- `id`
- `courseOfferingId`
- `studentId`
- `reason`
- `approvedById`
- `approvedAt`

Relationships:
- belongs to one `CourseOffering`
- belongs to one `StudentProfile`
- belongs to one approving `UserAccount`

## Sessions And Attendance

### SessionType

Fields:
- `id`
- `name`
- `status`: `active | inactive`

Relationships:
- has many `ClassSessions`

### ClassSession

Fields:
- `id`
- `moduleOfferingId`
- `sessionTypeId`
- `title`
- `startsAt`
- `endsAt`
- `location`
- `isAttendanceRequired`

Relationships:
- belongs to one `ModuleOffering`
- belongs to one `SessionType`
- has many `AttendanceRecords`
- has one `EducatorAttendanceRecord`

### AttendanceRecord

Fields:
- `id`
- `classSessionId`
- `studentId`
- `status`: `present | absent | late | excused`
- `submittedById`
- `submittedAt`
- `lockedAt` nullable

Relationships:
- belongs to one `ClassSession`
- belongs to one `StudentProfile`
- belongs to one submitting `UserAccount`
- has many `AttendanceCorrectionRequests`

### EducatorAttendanceRecord

Fields:
- `id`
- `classSessionId`
- `educatorId`
- `submittedAttendanceAt`

Relationships:
- belongs to one `ClassSession`
- belongs to one `EducatorProfile`

### AttendanceCorrectionRequest

Fields:
- `id`
- `attendanceRecordId`
- `requestedById`
- `requestedStatus`
- `reason`
- `status`: `pending | approved | rejected`
- `resolvedById` nullable
- `resolvedAt` nullable

Relationships:
- belongs to one `AttendanceRecord`
- belongs to requesting `EducatorProfile`
- optionally belongs to resolving `UserAccount`

## Content And Files

### ContentSection

Fields:
- `id`
- `moduleOfferingId`
- `title`
- `sortOrder`
- `status`: `active | hidden`

Relationships:
- belongs to one `ModuleOffering`
- has many `ModuleContentItems`
- may link many `Assignments`

### ModuleContentItem

Fields:
- `id`
- `moduleOfferingId`
- `contentSectionId`
- `title`
- `bodyRichText`
- `visibility`: `draft | published`
- `sortOrder`
- `publishedAt` nullable

Relationships:
- belongs to one `ModuleOffering`
- belongs to one `ContentSection`
- has many `FileAssets`
- has many `SharedLinks`

### FileAsset

Represents uploaded file metadata. File bytes live in local disk or S3-compatible object storage.

Fields:
- `id`
- `storageDriver`: `local | s3`
- `storageKey`
- `originalFilename`
- `mimeType`
- `sizeBytes`
- `category`: `chat_attachment | assignment_submission | module_content | assignment_attachment | announcement_attachment | feedback_attachment`
- `uploadedById`
- `status`: `active | removed | moderated`

Relationships:
- belongs to uploading `UserAccount`
- may belong to one `ChatMessage`
- may belong to one `Submission`
- may belong to one `ModuleContentItem`
- may belong to one `Assignment`
- may belong to one `Announcement`

### SharedLink

Fields:
- `id`
- `url`
- `label`
- `createdById`

Relationships:
- belongs to creating `UserAccount`
- may belong to one `ModuleContentItem`
- may belong to one `Assignment`
- may belong to one `ChatMessage`
- may belong to one `Announcement`

## Assignments And Assessment

### AssessmentComponent

Fields:
- `id`
- `moduleOfferingId`
- `title`
- `type`: `online_assignment | offline_assessment`
- `weightPercent`
- `maximumMark`
- `sortOrder`
- `lockedAt` nullable

Relationships:
- belongs to one `ModuleOffering`
- may have one `Assignment`
- has many `ComponentMarks`

### Assignment

Fields:
- `id`
- `moduleOfferingId`
- `assessmentComponentId`
- `contentSectionId` nullable
- `title`
- `instructionsRichText`
- `deadlineAt`
- `publishedAt` nullable
- `status`: `draft | published | archived`

Relationships:
- belongs to one `ModuleOffering`
- belongs to one `AssessmentComponent`
- optionally linked from one `ContentSection`
- has many `Submissions`
- has many `AssignmentDeadlineExtensions`
- has many `FileAssets`
- has many `SharedLinks`

### AssignmentDeadlineExtension

Fields:
- `id`
- `assignmentId`
- `oldDeadlineAt`
- `newDeadlineAt`
- `reason`
- `createdById`
- `createdAt`

Relationships:
- belongs to one `Assignment`
- belongs to creating `UserAccount`

### Submission

Fields:
- `id`
- `assignmentId`
- `studentId`
- `submittedAt`
- `status`: `submitted | late | marked`
- `isActive`

Relationships:
- belongs to one `Assignment`
- belongs to one `StudentProfile`
- has one or many `FileAssets`
- may have one `ComponentMark`

Constraints:
- one active Submission per Student per Assignment

### ComponentMark

Fields:
- `id`
- `assessmentComponentId`
- `studentId`
- `submissionId` nullable
- `mark`
- `feedback`
- `status`: `draft | released`
- `releasedAt` nullable
- `markedById`

Relationships:
- belongs to one `AssessmentComponent`
- belongs to one `StudentProfile`
- optionally belongs to one `Submission`
- belongs to marking `EducatorProfile`
- has many `MarkCorrections`

### MarkCorrection

Fields:
- `id`
- `componentMarkId`
- `oldMark`
- `newMark`
- `reason`
- `changedById`
- `changedAt`

Relationships:
- belongs to one `ComponentMark`
- belongs to changing `UserAccount`

### FinalGrade

Fields:
- `id`
- `moduleOfferingId`
- `studentId`
- `percentage`
- `passStatus`: `pass | fail`
- `status`: `provisional | released`
- `releasedAt` nullable

Relationships:
- belongs to one `ModuleOffering`
- belongs to one `StudentProfile`
- has many `FinalGradeCorrections`

### FinalGradeCorrection

Fields:
- `id`
- `finalGradeId`
- `oldPercentage`
- `newPercentage`
- `oldPassStatus`
- `newPassStatus`
- `reason`
- `approvedById`
- `changedAt`

Relationships:
- belongs to one `FinalGrade`
- belongs to approving `UserAccount`

## Calendar And Announcements

### CalendarEvent

Fields:
- `id`
- `scope`: `institution | course_offering | module_offering`
- `courseOfferingId` nullable
- `moduleOfferingId` nullable
- `title`
- `description`
- `startsAt`
- `endsAt` nullable
- `createdById`

Relationships:
- optionally belongs to one `CourseOffering`
- optionally belongs to one `ModuleOffering`
- belongs to creating `UserAccount`

Derived calendar items:
- Course Offering start/finish dates
- Module Offering start/finish dates
- Class Sessions
- Assignment deadlines

### Announcement

Fields:
- `id`
- `scope`: `institution | course_offering | module_offering`
- `courseOfferingId` nullable
- `moduleOfferingId` nullable
- `title`
- `bodyRichText`
- `expiresAt` nullable
- `createdById`

Relationships:
- optionally belongs to one `CourseOffering`
- optionally belongs to one `ModuleOffering`
- belongs to creating `UserAccount`
- has many `FileAssets`
- has many `SharedLinks`

## Chat And Notifications

### ModuleGroupChat

Fields:
- `id`
- `moduleOfferingId`
- `status`: `active | read_only`

Relationships:
- belongs to one `ModuleOffering`
- has many `ChatMessages`

### ChatMessage

Fields:
- `id`
- `moduleGroupChatId`
- `senderId`
- `body`
- `status`: `active | removed`
- `editedAt` nullable
- `removedAt` nullable
- `removedById` nullable
- `moderationReason` nullable

Relationships:
- belongs to one `ModuleGroupChat`
- belongs to sending `UserAccount`
- optionally belongs to removing `UserAccount`
- has many `FileAssets`
- has many `SharedLinks`
- has many `Mentions`

### Mention

Fields:
- `id`
- `chatMessageId`
- `mentionedUserId`

Relationships:
- belongs to one `ChatMessage`
- belongs to mentioned `UserAccount`
- may create one `Notification`

### Notification

Fields:
- `id`
- `recipientId`
- `type`: `mention | assignment_reminder | assignment_deadline_extension | released_mark | released_final_grade | published_content | announcement`
- `title`
- `body`
- `readAt` nullable
- `relatedEntityType`
- `relatedEntityId`

Relationships:
- belongs to one recipient `UserAccount`

## Feedback

### ModuleFeedbackPeriod

Fields:
- `id`
- `moduleOfferingId`
- `opensAt`
- `closesAt`
- `status`: `planned | open | closed`
- `createdById`

Relationships:
- belongs to one `ModuleOffering`
- belongs to creating `UserAccount`
- has many `ModuleFeedbackResponses`

### ModuleFeedbackResponse

Fields:
- `id`
- `feedbackPeriodId`
- `studentId`
- `submittedAt`
- `rating`
- `comment`
- `status`: `active | moderated`

Relationships:
- belongs to one `ModuleFeedbackPeriod`
- belongs to one `StudentProfile`

Constraints:
- one response per Student per Module Feedback Period

## Audit And Settings

### AuditLogEntry

Fields:
- `id`
- `eventType`: `operational | system`
- `action`
- `actorId`
- `entityType`
- `entityId`
- `beforeJson`
- `afterJson`
- `reason` nullable
- `createdAt`

Relationships:
- belongs to one actor `UserAccount`

### SystemSetting

Fields:
- `id`
- `key`
- `valueJson`
- `updatedById`
- `updatedAt`

Relationships:
- belongs to updating `UserAccount`

Initial keys:
- `defaultReminderPeriodDays`
- `attendanceCorrectionWindowDays`
- `uploadLimits`
- `passThresholdPercent`
- `attendanceRiskThresholdPercent`
- `defaultIntakes`
- `studyModes`
- `sessionTypes`
- `postCourseMarkingWindowDays`

## Main Cardinalities

- One Faculty has many Courses.
- One Course has one Curriculum Template.
- One Curriculum Template has many Academic Levels and Template Modules.
- One Course has many Course Offerings.
- One Course Offering has many Module Offerings.
- One Module Offering has one primary Educator.
- One Course Offering has many Enrolments.
- One Enrolment belongs to one Student and one Course Offering.
- One Enrolment has many Module Enrolment Exceptions.
- One Module Offering has many Class Sessions.
- One Class Session has many Attendance Records.
- One Module Offering has many Assessment Components.
- One Online Assignment maps to one Assessment Component.
- One Student has at most one active Submission per Assignment.
- One Final Grade belongs to one Student and one Module Offering.
- One Module Offering has one Module Group Chat.
- One Module Group Chat has many Chat Messages.
- One User Account has many Notifications.
- One Module Offering has many Content Sections.
- One Content Section has many Module Content Items.
- One Module Offering has many Module Feedback Periods.

## Derived Concepts

These should not start as physical tables unless implementation proves they need caching:

- **Effective Module Access**: derived from active Enrolment, Course Offering Module Offerings, and Module Enrolment Exceptions.
- **Attendance Percentage**: derived from Attendance Records, excluding excused statuses and counting late as attended.
- **Educator Attendance**: derived when the primary Educator submits Attendance for a Class Session, optionally materialized in `EducatorAttendanceRecord`.
- **At-Risk Student**: derived from attendance below 80%, overdue missing submissions, released final grade below 50%, or work due within Reminder Period.
- **Guided Learning Dashboard**: derived from enrolment, assignments, attendance, marks, calendar, chat, notifications, and announcements.
- **Calendar Feed**: combines Calendar Events, Course Offering dates, Module Offering dates, Class Sessions, and Assignment deadlines.

## Open Questions

- Post-course marking window default is `14 days` and should be configurable by Super Administrator.
- Uploaded file malware scanning is out of scope for the first version and should be documented as a production recommendation.
- Chat message edit window is fixed at `15 minutes` for the first version.
- System Settings do not need a separate version history table; Audit Log before/after JSON is enough.
