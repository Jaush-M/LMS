# LMS System Specification

This document captures the agreed product requirements for the college-style Learning Management System. It is separate from `CONTEXT.md`, which is only the domain glossary.

## Project Aim

Build a full web-based Learning Management System for an academic environment. The system must improve on a basic Moodle-style platform through a guided learning dashboard, role-specific workflows, attendance visibility, structured academic setup, assignment and grading workflows, module group chat with targeted notifications, auditability, and strong administrative control.

## Primary Users

- **Student**: accesses learning materials, assignments, submissions, attendance, grades, calendar, announcements, notifications, feedback, and module group chats.
- **Educator**: manages assigned module offerings, content, assignments, marking, offline assessment marks, attendance, module events, announcements, feedback reports, and module group chats.
- **Administrator**: manages academic setup, enrollment, calendars, class sessions, moderation, operational audit records, reports, and student/educator accounts.
- **Super Administrator**: manages administrators, system settings, system-level audit records, and has full oversight.

## Technology Decisions

- Use Next.js as the application framework.
- Read the local Next.js `node_modules/next/dist/docs/` guidance before implementing code because this project uses a newer Next.js version with changed conventions.
- Use PostgreSQL as the relational database.
- Use Prisma as the ORM.
- Use Better Auth for credentials-based authentication and database-backed sessions.
- Use institutional email and password login only.
- Do not use third-party OAuth in the first version.
- Store uploaded file metadata in PostgreSQL.
- Store uploaded file bytes through a storage abstraction:
  - local disk for local development/deployment
  - S3-compatible object storage for Vercel production
- Use in-app notifications only; no email notifications in the first version.

Relevant ADRs:

- `docs/adr/0001-s3-compatible-production-file-storage.md`
- `docs/adr/0002-better-auth-and-prisma.md`

## System Defaults

- Default assignment reminder period: `15 days` before deadline.
- Student-customizable assignment reminder period: enabled.
- Attendance correction window: `8 days`.
- Post-course marking window: `14 days`.
- Pass threshold: `50%`.
- Attendance risk threshold: below `80%`.
- Course offering capacity default/max: `24`.
- Seed course offering size target: `20 students`.
- Chat message edit window: `15 minutes`.
- Assignment deadlines use exact date and time in Maldives time.
- Class sessions use exact date, start time, and end time in Maldives time.
- Store timestamps consistently in UTC and display academic dates/times in Maldives time.
- Default generated institutional email domain: `@lms.edu.mv`.

## File Upload Policy

All upload categories allow any file type.

- Chat attachments: max `8 MB` per file.
- Assignment submissions: max `25 MB` per file.
- Module content attachments: max `25 MB` per file.
- Assignment attachments: max `25 MB` per file.
- Announcement attachments: max `25 MB` per file.
- Shared links must be supported in module content, assignments, module group chat, and announcements.

## Functional Requirements

### Identity And Access

- FR-001: The system must support four roles: Student, Educator, Administrator, and Super Administrator.
- FR-002: The first Super Administrator must be created through seed/setup, not through a public first-admin screen.
- FR-003: Super Administrators must create Administrator accounts.
- FR-004: Administrators must create Student and Educator accounts.
- FR-005: Public registration must not be available.
- FR-006: User accounts must use generated identifiers with prefixes:
  - `S` for Students
  - `E` for Educators
  - `A` for Administrators
  - `SA` for Super Administrators
- FR-007: Generated identifiers must be zero-padded, globally sequential per role, and never reused.
- FR-008: The system must generate default institutional emails from identifiers using `@lms.edu.mv`.
- FR-009: Institutional emails may be edited only by authorized Administrators or Super Administrators.
- FR-010: Generated identifiers must not be editable.
- FR-011: New accounts must start inactive until activated.
- FR-012: Temporary passwords must be changed after first login.
- FR-013: Disabled user accounts must not be able to sign in.
- FR-014: Disabled user accounts must remain attached to academic records and audit logs.
- FR-015: Users must not be able to change their own role.
- FR-016: Student profile visibility to other Students must be limited to display name and Student Identifier within shared module group chats.
- FR-017: Educators must only see student academic information relevant to their assigned module offerings.
- FR-018: Administrators must not impersonate users.
- FR-019: Super Administrators may view dashboards/read-only records for oversight without impersonation.

### Academic Structure

- FR-020: The system must support Faculties.
- FR-021: Faculties may be marked inactive instead of deleted.
- FR-022: Courses must belong to one Faculty.
- FR-023: Courses must have a unique code, name, Award Level, and optional Awarding Body.
- FR-024: Award Levels must include Foundation, Diploma, Degree, Masters, and PhD.
- FR-025: Courses may be marked inactive instead of deleted.
- FR-026: Modules must have a unique code and name.
- FR-027: Modules may be marked inactive instead of deleted.
- FR-028: Intakes must be configurable, with January, May, and September seeded as defaults.
- FR-029: Intakes may be marked inactive instead of deleted.
- FR-030: Courses must have Curriculum Templates.
- FR-031: Curriculum Templates must define course-specific Academic Levels.
- FR-032: Template Modules must connect Modules to Academic Levels, Credits, prerequisites, and optional default assessment structures.
- FR-033: Credits must be stored per Template Module, not globally per Module.
- FR-034: Learning hours may be derived as `credits x 10`.
- FR-035: Academic Levels should warn, not block, when total credits differ from the expected full-time target around `120 credits`.
- FR-036: Prerequisites must point to Template Modules inside the same Curriculum Template.
- FR-037: Prerequisite and progression checks must warn Administrators, not block enrollment.
- FR-038: Progression Review must remain administrative, not automatically enforced by the system.

### Course And Module Offerings

- FR-039: Administrators must create Course Offerings from Curriculum Templates.
- FR-040: Course Offerings must have Course, Intake, start date, finish date, default Study Mode, and capacity.
- FR-041: Study Modes must include Face-to-Face, Blended, and E-Learning.
- FR-042: Course Offering duration must be represented by start and finish dates.
- FR-043: Course Offering capacity must default to `24`.
- FR-044: Administrators may override capacity with a recorded reason.
- FR-045: Module Offerings must be created from Template Modules.
- FR-046: Module Offerings must have one primary assigned Educator.
- FR-047: Module Offerings must have start and finish dates inside the Course Offering date range.
- FR-048: Module Offerings may override the Course Offering's default Study Mode.
- FR-049: Educators may have a Home Faculty, but access must come from assigned Module Offerings.
- FR-050: Replacing a primary Educator must not move existing records away from the Module Offering.
- FR-051: Records must preserve the user responsible for creation or change.
- FR-052: Finished Course Offerings must be archived, not deleted.
- FR-053: Archived Course Offerings must preserve attendance, submissions, marking, content, chat history, and academic records.
- FR-054: Archived Course Offerings must be read-only for Students.
- FR-055: Archived Course Offerings must be read-only for Educators except during a post-course marking window.
- FR-056: Administrators and Super Administrators must be able to access archived records.

### Enrollment

- FR-057: Students must not self-enroll.
- FR-058: Educators must not self-assign to modules.
- FR-059: Administrators must enroll Students into Course Offerings.
- FR-060: Students may have multiple active enrollments.
- FR-061: One enrollment may be marked as the Student's Main Enrollment.
- FR-062: Enrolling a Student into a Course Offering must grant default access to its Module Offerings.
- FR-063: Administrators must be able to create Module Enrollment Exceptions.
- FR-064: Module Enrollment Exceptions must support both inclusion and exclusion of Module Offerings.
- FR-065: Effective Module Access must control access to attendance, assignments, module content, group chat, marking visibility, feedback, and notifications.
- FR-066: Administrators must be able to import Student enrollments by CSV.
- FR-067: CSV import must preview validation errors before committing.
- FR-068: CSV import must match existing Students by Student Identifier or Institutional Email.
- FR-069: CSV import may create missing Student user accounts.
- FR-070: Module Enrollment Exceptions may be managed manually after CSV import.

### Class Sessions And Attendance

- FR-071: Administrators must create official Class Sessions.
- FR-072: Educators must not create official Class Sessions.
- FR-073: Class Sessions must belong to one Module Offering.
- FR-074: Class Sessions must have date, start time, end time, Session Type, and optional Session Location.
- FR-075: Session Types must include Lecture, Practical Workshop, Tutorial, Lab, Exam, and Other.
- FR-076: E-Learning sessions may use a shared link as the Session Location.
- FR-077: The system must warn Administrators about overlapping Educator sessions.
- FR-078: The system must warn Administrators about overlapping Student sessions based on Effective Module Access.
- FR-079: Timetable conflict warnings must not block creation by default.
- FR-080: Room conflict checking is out of scope for the first version.
- FR-081: Educators must mark attendance for Students in their assigned Class Sessions.
- FR-082: Attendance statuses must be Present, Absent, Late, and Excused.
- FR-083: Excused attendance must be excluded from Attendance Percentage denominator.
- FR-084: Late attendance must count as attended for Attendance Percentage.
- FR-085: Educator Attendance must be inferred when the assigned Educator submits student attendance.
- FR-086: Educators may correct submitted attendance during the `8 day` Attendance Correction Window.
- FR-087: After the correction window, attendance must become locked for Educators.
- FR-088: Educators may submit Attendance Correction Requests for locked attendance.
- FR-089: Administrators may change locked attendance directly with a Correction Reason.
- FR-090: Attendance changes after lock must be audit logged.
- FR-091: Educators must be able to export attendance CSV for assigned Module Offerings.
- FR-092: Administrators must be able to export attendance CSV for Course Offerings and Module Offerings.
- FR-093: Students must be able to view their own attendance but not export class lists.

### Module Content

- FR-094: Educators must create Module Content only inside assigned Module Offerings.
- FR-095: Module Content must be organized into Content Sections.
- FR-096: Content Sections must be reorderable.
- FR-097: Module Content inside sections must be reorderable.
- FR-098: Module Content must support simple rich text descriptions, attachments, and shared links.
- FR-099: Rich text must not allow embedded scripts or unsafe HTML.
- FR-100: Module Content must support Draft and Published states.
- FR-101: Draft Content must be visible only to the assigned Educator and Administrators.
- FR-102: Published Content must be visible to Students with Effective Module Access.
- FR-103: Educators must be able to unpublish content.
- FR-104: Scheduled publishing is out of scope for the first version.
- FR-105: Students must not comment under Module Content.

### Assignments And Submissions

- FR-106: Educators must create Assignments only inside assigned Module Offerings.
- FR-107: Assignments must belong to Module Offerings, not generic Modules.
- FR-108: Assignments must support simple rich text instructions, attachments, shared links, deadline date/time, and maximum marks.
- FR-109: Assignments may be linked from Content Sections.
- FR-110: Assignments must remain independently visible in assignment lists, dashboards, and calendars.
- FR-111: Published Assignments must be visible to Students with Effective Module Access.
- FR-112: Students must be able to submit assignments through the LMS.
- FR-113: Assignment submissions must be individual only.
- FR-114: Students may replace an Active Submission before the deadline.
- FR-115: Students may submit late if no submission exists before deadline.
- FR-116: Marked submissions must not be replaceable.
- FR-117: Submission status must be one of not submitted, submitted, late, or marked.
- FR-118: Students must not comment under Assignments.
- FR-119: Educators may apply Assignment Deadline Extensions for the whole class/batch.
- FR-120: Assignment Deadline Extensions must apply to all Students with Effective Module Access.
- FR-121: Assignment Deadline Extensions may be applied before or after the current deadline.
- FR-122: Assignment Deadline Extensions must require a reason and be audit logged.
- FR-123: Student reminders, dashboards, calendars, and late status must use the extended deadline.
- FR-124: Submissions previously marked late must become on-time if they fall before the new extended deadline.
- FR-125: Released marks must not automatically change when a deadline is extended.

### Assessment And Grades

- FR-126: The system must support weighted Assessment Components per Module Offering.
- FR-127: Assessment Components may be Online Assignments or Offline Assessments.
- FR-128: Online Assignments require LMS submissions.
- FR-129: Offline Assessments allow Educators to enter marks without a submission.
- FR-130: Assessment Structures must total exactly `100%` before final grades can be released.
- FR-131: Default Assessment Structures may be defined in Curriculum Templates and copied into Module Offerings.
- FR-132: Administrators must define the initial Assessment Structure during Module Offering setup.
- FR-133: Assigned Educators may manage Assessment Structure details before marks exist.
- FR-134: Assessment Components with marks must become locked from structural Educator changes.
- FR-135: Educators must mark submissions with score and feedback.
- FR-136: Educators must enter marks for Offline Assessments.
- FR-137: Marks must not be visible to Students until released.
- FR-138: Released marks must be visible to the owning Student.
- FR-139: Changing a Released Mark must require a reason.
- FR-140: Final Grades must be calculated as weighted percentages from Assessment Components.
- FR-141: Final Grades must remain provisional until manually released.
- FR-142: Final Grades must not auto-release.
- FR-143: Released Final Grades must be visible to the owning Student.
- FR-144: Final Grade Corrections must require Administrator approval and a reason.
- FR-145: Pass Status must be pass when Final Grade is `>= 50%`, fail otherwise.
- FR-146: Educators must be able to export marks CSV for assigned Module Offerings.
- FR-147: Administrators must be able to export marks/final grades CSV for Course Offerings and Module Offerings.
- FR-148: Super Administrators must be able to export marks/final grades across the system.
- FR-149: Grade export must include Student Identifier, student name, component marks, Final Grade, and Pass Status.

### Academic Calendar

- FR-150: The Academic Calendar must show Course Offering start/finish dates, Module Offering events, Class Sessions, Assignment deadlines, and institution dates.
- FR-151: Administrators must create Institution Events.
- FR-152: Administrators must create Course Offering Events.
- FR-153: Assignment deadlines and Class Sessions must appear automatically in the calendar.
- FR-154: Educators may create informal Module Offering Events for assigned Module Offerings.
- FR-155: Educator-created Module Offering Events must not count as official Class Sessions and must not affect attendance.
- FR-156: Institution dates such as Eid and Ramadan days must be controlled by Administrators.

### Announcements

- FR-157: The system must support one-way Announcements.
- FR-158: Announcements may be institution-wide, Course Offering scoped, or Module Offering scoped.
- FR-159: Super Administrators may create institution-wide Announcements.
- FR-160: Administrators may create institution-wide and Course Offering Announcements.
- FR-161: Educators may create Module Offering Announcements for assigned Module Offerings.
- FR-162: Students must not create Announcements.
- FR-163: Announcements must support attachments and shared links.
- FR-164: Announcements must create In-App Notifications for relevant users.
- FR-165: Announcements may have optional expiry dates.
- FR-166: Expired Announcements must stop appearing in active dashboard feeds.
- FR-167: Expired Announcements must remain accessible to Administrators and Super Administrators.
- FR-168: Announcement acknowledgement/read-confirmation is out of scope for the first version.
- FR-169: Announcement comments/replies must not be supported.

### Module Group Chat

- FR-170: The system must create one Module Group Chat automatically for each Module Offering.
- FR-171: There must be no direct/private messaging in the first version.
- FR-172: There must be no separate chat thread per Assignment or Content Section.
- FR-173: Students with Effective Module Access must participate in the relevant Module Group Chat.
- FR-174: The assigned Educator must participate in the Module Group Chat for their Module Offering.
- FR-175: Administrators may view Module Group Chats for moderation/support.
- FR-176: Administrators may delete inappropriate chat messages.
- FR-177: Deleted/moderated messages must remain represented as removed content.
- FR-178: Senders may edit their own messages within a fixed `15 minute` edit window.
- FR-179: Edited messages must show an edited marker.
- FR-180: Senders may delete their own messages, leaving a removed message marker.
- FR-181: Module Group Chat must become read-only when the Course Offering is archived.
- FR-182: Chat attachments must support any file type up to `8 MB`.
- FR-183: Shared links must work inside chat messages.
- FR-184: Basic search must be available within a Module Group Chat.
- FR-185: Removed messages must not be searchable by Students or Educators.
- FR-186: Administrators and Super Administrators may search moderated records when needed.
- FR-187: Normal student messages must not notify the Educator by default.
- FR-188: Mentions must create notifications for the mentioned participant.
- FR-189: Unread chat activity may show without notifying every participant for every message.

### Notifications

- FR-190: The system must include a Notification Center.
- FR-191: Notifications must be in-app only.
- FR-192: Users must be able to mark notifications as read.
- FR-193: Mentions must create notifications.
- FR-194: Assignment reminders must create notifications based on each Student's Reminder Period.
- FR-195: Assignment deadline extensions must create notifications.
- FR-196: Released marks must create notifications.
- FR-197: Released final grades must create notifications.
- FR-198: Newly published content may create notifications.
- FR-199: Announcements must create notifications.

### Guided Learning Dashboards

- FR-200: The system must provide role-specific Guided Learning Dashboards.
- FR-201: Student dashboard must show due assignments sorted by nearest deadline.
- FR-202: Student dashboard must show Attendance Percentage per Module Offering.
- FR-203: Student dashboard must show latest Released Marks and Released Final Grades.
- FR-204: Student dashboard must show unread chat activity and mentions.
- FR-205: Student dashboard must show upcoming calendar events.
- FR-206: Student dashboard must show Course Offering progress by Academic Level.
- FR-207: Student dashboard must use supportive Attention Items rather than labelling the Student as at risk.
- FR-208: Educator dashboard must show assigned Module Offerings.
- FR-209: Educator dashboard must show Pending Marking.
- FR-210: Educator dashboard must show upcoming Class Sessions.
- FR-211: Educator dashboard must show attendance not yet submitted.
- FR-212: Educator dashboard must show educator mentions from Module Group Chats.
- FR-213: Educator dashboard must show Students with low attendance, missing submissions, or grade risk for assigned Module Offerings.
- FR-214: Administrator dashboard must show active Course Offerings, enrollment counts, upcoming events, missing educators/unassigned modules, moderation status, and attendance completion.
- FR-215: At-risk logic must flag attendance below `80%`.
- FR-216: At-risk logic must flag Released Final Grade below `50%`.
- FR-217: At-risk logic must flag overdue assignments without submission.
- FR-218: At-risk logic must flag pending work due within the Student's Reminder Period.

### Module Feedback

- FR-219: Administrators must be able to open a Feedback Period for a Module Offering.
- FR-220: Students with Effective Module Access may submit one Module Feedback response per Module Offering during the Feedback Period.
- FR-221: Feedback must support rating questions and optional comments.
- FR-222: Educators may see aggregated Feedback Reports after the Feedback Period closes.
- FR-223: Feedback Reports must hide Student identity from Educators.
- FR-224: Administrators and Super Administrators may access feedback identity only when needed for moderation or safety.

### Reports, Imports, And Bulk Actions

- FR-225: Administrators must be able to export operational academic data as CSV where specified.
- FR-226: PDF exports are optional/future enhancement.
- FR-227: Course, Module, and Curriculum setup CSV import is out of scope for the first version.
- FR-228: Administrators must be able to bulk disable selected Student/Educator accounts.
- FR-229: Administrators must be able to bulk enroll selected Students into a Course Offering.
- FR-230: Administrators must be able to bulk apply Module Enrollment Exceptions to selected Students.
- FR-231: Administrators must be able to bulk archive eligible finished Course Offerings.
- FR-232: Administrators must be able to export selected records.
- FR-233: Bulk delete must not be supported for academic records.

### Audit And Record Preservation

- FR-234: The system must audit sensitive account, academic setup, enrollment, attendance, marking, final grade, moderation, and file events.
- FR-235: Operational Audit Events must be visible to Administrators and Super Administrators.
- FR-236: System Audit Events must be visible only to Super Administrators.
- FR-237: Audit Logs must record who performed the action, what changed, when it changed, and the reason where required.
- FR-238: Deleted, disabled, inactive, archived, or moderated records must preserve historical attribution.
- FR-239: System Setting history must be tracked through Audit Logs rather than a separate settings history table.

### System Settings

- FR-240: Super Administrators must be able to manage system settings from the UI.
- FR-241: System settings must include default assignment Reminder Period.
- FR-242: System settings must include Attendance Correction Window.
- FR-243: System settings must include upload limits per category.
- FR-244: System settings must include Pass Threshold.
- FR-245: System settings must include Attendance Risk Threshold.
- FR-246: System settings must include Default Intakes.
- FR-247: System settings must include supported Study Modes.
- FR-248: System settings must include Session Types.
- FR-249: System settings must include Post-Course Marking Window.

## Non-Functional Requirements

- NFR-001: The app must be responsive, with Student dashboard and chat usable on mobile.
- NFR-002: Admin setup screens may be desktop-first but must remain usable on tablet.
- NFR-003: The app must use basic WCAG-minded accessibility: semantic structure, keyboard navigation, visible focus states, labelled forms, readable errors, sufficient contrast, and no color-only meaning.
- NFR-004: The app must protect academic privacy by scoping Student data to relevant roles.
- NFR-005: The app must preserve academic and audit records instead of deleting them.
- NFR-006: The app must use secure session and password handling through Better Auth.
- NFR-007: The app must validate upload size by category before accepting files.
- NFR-008: The app must avoid unsafe rich text such as scripts or arbitrary HTML.
- NFR-009: The app must be organized enough to support the required UML diagrams, ER diagram, test plan, documentation, and live demonstration.
- NFR-010: The app must support a clean light theme; dark mode is not required for the first version.
- NFR-011: Uploaded files must be served in a way that prevents inline execution of unsafe user-provided content.

## Seed Data Requirements

The seed dataset must support realistic local development, testing, and demonstration.

- 1 Super Administrator.
- 2 Administrators.
- 2 Faculties.
- 10 Courses across Foundation, Diploma, Degree, Masters, and PhD levels.
- January, May, and September Intakes.
- 10 Educators.
- 200 Students.
- Course Offerings with around 20 students each, while capacity defaults to 24.
- Curriculum Templates with Academic Levels, Template Modules, credits, prerequisites, and default assessment structures.
- Active Course Offerings with Module Offerings, assigned Educators, Class Sessions, Content Sections, Module Content, Assignments, submissions, offline assessment marks, attendance, grades, announcements, chat messages, notifications, and feedback examples.

## Out Of Scope For First Version

- Public registration.
- Student self-enrollment.
- Educator course/module creation.
- Third-party OAuth.
- Email notifications.
- Private/direct messaging.
- Comments under Module Content or Assignments.
- Per-assignment or per-content discussion threads.
- Student-specific assignment extension requests.
- Group submissions.
- Plagiarism checking.
- Full automatic progression enforcement.
- Resit, appeal, transcript, GPA, and degree classification workflows.
- Room booking or room conflict enforcement.
- Course/module/curriculum CSV import.
- PDF exports unless time permits.
- Uploaded profile images.
- Dark mode.
- User impersonation.
- Announcement acknowledgement/read-confirmation.
- Malware scanning and quarantine for uploaded files; document as a production recommendation.

## Internal Delivery Order

The final target is the full system, but implementation should proceed in phases:

1. Identity, roles, generated identifiers, and account lifecycle.
2. Faculties, courses, modules, intakes, curriculum templates, and academic setup.
3. Course offerings, module offerings, enrollment, and module enrollment exceptions.
4. Module content, content sections, shared links, and file storage.
5. Assignments, submissions, assessment structures, marking, and final grades.
6. Class sessions, attendance, educator attendance, correction windows, and reports.
7. Academic calendar, events, and announcements.
8. Module group chat, attachments, mentions, moderation, and notifications.
9. Guided learning dashboards, at-risk/attention logic, and feedback.
10. Archiving, audit logs, system settings, seed data, tests, UML/ER diagrams, and documentation.
