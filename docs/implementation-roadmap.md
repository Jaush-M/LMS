# LMS Implementation Roadmap

This roadmap turns the LMS specification into build phases. The final target is the full system, but implementation should proceed in dependency order so later workflows are built on stable data and permission foundations.

## Phase 0: Project Foundation

Goals:
- Confirm current Next.js conventions from local `node_modules/next/dist/docs/`.
- Add Prisma, Better Auth, PostgreSQL configuration, and environment validation.
- Establish database migration workflow.
- Establish local file storage driver and storage abstraction interface.
- Add baseline layout, navigation shell, and role-aware route protection.

Exit criteria:
- App runs locally.
- PostgreSQL connection works.
- Prisma migrations run.
- Better Auth credentials login works for seeded Super Administrator.
- Protected routes reject unauthenticated access.

Primary tests:
- TC-001
- TC-002

## Phase 1: Identity, Roles, And Settings

Goals:
- Implement UserAccount role metadata and profile tables.
- Generate never-reused identifiers with role prefixes.
- Generate default institutional emails using `@lms.edu.mv`.
- Implement account activation, temporary password change, disable/reactivate.
- Implement Super Administrator settings UI.
- Implement Audit Log foundation.

Exit criteria:
- Super Administrator can create and manage Administrators.
- Administrators can create Students and Educators.
- Disabled and inactive accounts cannot sign in.
- System Setting changes are audit logged.

Primary tests:
- TC-001
- TC-002

## Phase 2: Academic Catalogue And Curriculum Templates

Goals:
- Implement Faculties, Awarding Bodies, Courses, Modules, Intakes, Study Modes, and Session Types.
- Implement inactive lifecycle for catalogue records.
- Implement Curriculum Templates, Academic Levels, Template Modules, credits, prerequisites, and Default Assessment Components.
- Add warning for Academic Level credit totals that differ from expected full-time target.

Exit criteria:
- Administrator can create complete Course curriculum structures.
- Course and Module codes are unique and never reused.
- Template Module prerequisites are limited to the same Curriculum Template.

Primary tests:
- Add unit/integration tests for catalogue validation and template prerequisites.

## Phase 3: Course Offerings, Module Offerings, And Enrolment

Goals:
- Create Course Offerings from Curriculum Templates.
- Generate Module Offerings, Module Group Chats, and Assessment Components from templates.
- Assign primary Educators.
- Implement Course Offering capacity, capacity warnings, and capacity override reason.
- Implement Enrolments, Main Enrolment, Module Enrolment Exceptions, and Effective Module Access.
- Implement CSV enrolment import preview and commit.

Exit criteria:
- Administrator can set up a Course Offering with Module Offerings and educators.
- Students can be enrolled and receive correct Effective Module Access.
- Capacity override and enrolment changes are audit logged.

Primary tests:
- TC-003
- TC-004
- TC-005

## Phase 4: Module Content, Files, And Shared Links

Goals:
- Implement storage abstraction with local driver.
- Add file metadata table and category-specific size validation.
- Implement Content Sections.
- Implement Draft/Published Module Content with rich text, attachments, and shared links.
- Prevent unsafe rich text and unsafe inline file execution.

Exit criteria:
- Educators can manage content for assigned Module Offerings.
- Students see only Published Content for modules they can access.
- Upload limits are enforced.

Primary tests:
- TC-014

## Phase 5: Assignments, Submissions, Assessment, And Grades

Goals:
- Implement Assignments linked to Assessment Components.
- Implement assignment attachments, shared links, rich text instructions, publishing, and Content Section links.
- Implement assignment submissions and replacement before deadline.
- Implement class-wide Assignment Deadline Extensions.
- Implement Component Marks, Released Marks, Final Grades, Pass Status, and corrections.
- Implement CSV grade exports.

Exit criteria:
- Students can submit assignments.
- Educators can mark submissions and offline assessments.
- Final Grades cannot release unless weights total 100%.
- Grade visibility and correction rules are enforced.

Primary tests:
- TC-008
- TC-009
- TC-010
- TC-011

## Phase 6: Class Sessions And Attendance

Goals:
- Implement Class Sessions with Session Type, time, location, and attendance-required flag.
- Add timetable conflict warnings.
- Implement attendance marking, Attendance Percentage, Educator Attendance inference, correction window, locked corrections, and CSV exports.

Exit criteria:
- Administrators create official sessions.
- Educators mark attendance for assigned sessions.
- Attendance locks after 8 days.
- Locked corrections require Administrator reason.

Primary tests:
- TC-006
- TC-007

## Phase 7: Calendar And Announcements

Goals:
- Implement Academic Calendar feed from events, Class Sessions, Assignment deadlines, and offering dates.
- Implement Institution, Course Offering, and Module Offering Events.
- Implement Announcements with scopes, attachments, shared links, optional expiry, and notifications.

Exit criteria:
- Users see calendar items relevant to their role/access.
- Announcements notify relevant users and expire from active feeds.
- Assignment deadlines and Class Sessions appear automatically.

Primary tests:
- Add integration tests for calendar feed visibility and announcement notification.

## Phase 8: Module Group Chat And Notifications

Goals:
- Implement one Module Group Chat per Module Offering.
- Implement chat messages, edit window, sender delete, moderation, removed markers, attachments, shared links, basic search, unread activity, mentions, and notifications.
- Implement Notification Center and mark-read behavior.

Exit criteria:
- Students and Educators can use chats only through Effective Module Access.
- Normal messages create unread activity, not educator pings.
- Mentions create notifications.
- Moderation preserves removed message markers and audit logs.

Primary tests:
- TC-012
- TC-013

## Phase 9: Dashboards, Feedback, Reports, And Archiving

Goals:
- Implement Student, Educator, Administrator, and Super Administrator dashboards.
- Implement Attention Items and At-Risk Student logic.
- Implement Module Feedback periods, responses, educator reports, and admin identity access for safety.
- Implement Course Offering archiving and post-course marking window.
- Complete reports/exports across attendance and grades.

Exit criteria:
- Role dashboards expose the agreed status and attention items.
- Feedback identity is hidden from Educators.
- Archived Course Offerings are read-only except post-course marking.
- Reports and exports work for permitted roles.

Primary tests:
- TC-015
- TC-016

## Phase 10: Seed Data, Documentation, UML, QA, And Demo

Goals:
- Build realistic seed dataset:
  - 1 Super Administrator
  - 2 Administrators
  - 2 Faculties
  - 10 Courses across Foundation, Diploma, Degree, Masters, and PhD
  - January, May, and September Intakes
  - 10 Educators
  - 200 Students
  - Course Offerings with around 20 Students each
  - Module Offerings, sessions, content, assignments, submissions, marks, attendance, chats, notifications, and feedback
- Generate final UML and ER diagrams from implemented model.
- Execute and document test plan results.
- Finalize brief system documentation.
- Prepare live demo flow.

Exit criteria:
- Seed command creates a realistic demo system.
- Diagrams match implementation.
- Test plan has execution results.
- Demo can show end-to-end workflows for all roles.

Primary tests:
- Full test plan regression.

## Suggested Demo Flow

1. Super Administrator signs in, views settings, creates Administrator.
2. Administrator creates academic catalogue and Course Offering.
3. Administrator enrols Students and assigns Educators.
4. Educator publishes content and assignment.
5. Student views dashboard and submits assignment.
6. Educator marks attendance and grades submission.
7. Student sees released mark, attendance, notification, and dashboard Attention Items.
8. Student mentions Educator in Module Group Chat.
9. Administrator reviews moderation/audit/reporting.
10. Course Offering is archived and records remain accessible.

## Roadmap Rules

- Do not build dashboard summaries before the underlying records exist.
- Do not add new scope without updating `docs/specification.md`.
- Do not change domain language without updating `CONTEXT.md`.
- Do not introduce hard-to-reverse implementation choices without considering an ADR.
- Keep tests aligned with `docs/test-plan.md`.
- Keep diagrams aligned with implementation, not just the original plan.
