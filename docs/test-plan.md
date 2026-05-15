# LMS Test Plan

This test plan covers the core workflows and quality risks for the Learning Management System. It includes more than the required minimum of three detailed test cases so the final submission can demonstrate stronger QA coverage.

## Test Scope

In scope:
- Authentication and role routing
- Academic setup
- Course offering and module offering creation
- Enrolment and capacity handling
- Attendance marking and correction behavior
- Assignment submission and deadline behavior
- Assessment, marking, and final grade release
- Module group chat, mentions, and notifications
- File upload size validation
- Guided Learning Dashboard risk/attention logic
- Audit logging for sensitive actions

Out of scope for first-version testing:
- Email notifications
- Third-party OAuth
- Malware scanning
- Direct/private messaging
- Room booking conflict enforcement
- Plagiarism checking
- Automatic progression enforcement

## Test Environment

- App framework: Next.js
- Database: PostgreSQL
- ORM: Prisma
- Auth: Better Auth
- File storage:
  - local disk in local development
  - S3-compatible storage in Vercel production
- Timezone display: Maldives time
- Seed data should include the agreed realistic dataset from `docs/specification.md`.

## Test Cases

### TC-001: Login Routes User To Correct Dashboard

Objective:
Verify that active users can sign in and are routed to the correct role-specific dashboard.

Preconditions:
- Active Student, Educator, Administrator, and Super Administrator accounts exist.
- Each account has changed its temporary password.

Steps:
1. Open the login page.
2. Sign in as Student using institutional email and password.
3. Confirm Student dashboard is shown.
4. Sign out.
5. Repeat for Educator, Administrator, and Super Administrator.

Expected result:
- Each user can sign in successfully.
- Each user lands on the correct dashboard for their role.
- Users cannot access dashboards for other roles by changing the URL.

### TC-002: Inactive And Disabled Accounts Cannot Sign In

Objective:
Verify account lifecycle restrictions.

Preconditions:
- One inactive Student account exists.
- One disabled Educator account exists.

Steps:
1. Attempt to sign in with the inactive Student account.
2. Attempt to sign in with the disabled Educator account.

Expected result:
- Inactive account sign-in is rejected.
- Disabled account sign-in is rejected.
- Error message does not reveal sensitive internal state.

### TC-003: Administrator Creates Course Offering From Curriculum Template

Objective:
Verify Course Offering creation generates the expected delivery structure.

Preconditions:
- Active Faculty, Course, Intake, Study Mode, Curriculum Template, Academic Levels, Template Modules, and Default Assessment Components exist.
- Active Educator accounts exist.

Steps:
1. Administrator opens Course Offering creation.
2. Select Course, Intake, start date, finish date, Study Mode, and capacity.
3. Confirm creation from Curriculum Template.
4. Assign primary Educators to generated Module Offerings.
5. Save the Course Offering.

Expected result:
- Course Offering is created.
- Module Offerings are generated from Template Modules.
- Module Offering dates fall inside Course Offering dates.
- Module Group Chat is created for each Module Offering.
- Assessment Components are copied from Default Assessment Components.
- Audit Log records the setup action.

### TC-004: Enrolment Capacity Warning And Override

Objective:
Verify capacity rules and override auditability.

Preconditions:
- Course Offering capacity is `24`.
- 24 Students are already enrolled.
- Another active Student exists.

Steps:
1. Administrator attempts to enrol the 25th Student.
2. Observe capacity warning.
3. Enter Capacity Override reason.
4. Confirm enrolment.

Expected result:
- System warns that capacity is exceeded.
- Administrator can continue only with a recorded reason.
- Enrolment is created.
- CapacityOverride record is created.
- Audit Log records the override.

### TC-005: CSV Enrolment Import Preview

Objective:
Verify CSV import validates before committing.

Preconditions:
- Course Offering exists.
- CSV contains valid students, a duplicate student, and a row with invalid email format.

Steps:
1. Administrator uploads enrolment CSV.
2. Review import preview.
3. Confirm import only after validation.

Expected result:
- Preview shows valid rows and validation errors.
- Duplicate is matched by Student Identifier or Institutional Email.
- Invalid row is not imported.
- Valid rows create or match Student accounts and create Enrolments.

### TC-006: Educator Marks Attendance

Objective:
Verify attendance submission and educator attendance inference.

Preconditions:
- Module Offering has a primary Educator.
- Official Class Session exists.
- Students have Effective Module Access.

Steps:
1. Educator opens Class Session attendance page.
2. Mark students as Present, Absent, Late, and Excused.
3. Submit attendance.

Expected result:
- AttendanceRecords are saved.
- EducatorAttendanceRecord is created.
- Attendance Completion updates.
- Attendance Percentage excludes Excused and counts Late as attended.

### TC-007: Attendance Correction After Lock

Objective:
Verify locked attendance correction flow.

Preconditions:
- Attendance was submitted more than 8 days ago.
- Attendance is locked.

Steps:
1. Educator attempts to edit locked attendance.
2. Educator submits Attendance Correction Request.
3. Administrator reviews and applies correction with Correction Reason.

Expected result:
- Educator cannot directly edit locked attendance.
- Correction request is created.
- Administrator can change attendance with reason.
- Audit Log records the post-lock change.

### TC-008: Student Submits And Replaces Assignment Before Deadline

Objective:
Verify active submission replacement rules.

Preconditions:
- Published Assignment exists.
- Deadline is in the future.
- Student has Effective Module Access.

Steps:
1. Student uploads a valid submission file.
2. Student uploads a replacement file before deadline.
3. Educator opens submissions list.

Expected result:
- First upload creates Active Submission.
- Replacement becomes the Active Submission.
- Only latest Active Submission is considered for marking.
- Submission status is `submitted`.

### TC-009: Late Submission And Deadline Extension

Objective:
Verify late status and class-wide deadline extension recalculation.

Preconditions:
- Published Assignment deadline has passed.
- Student has not submitted.

Steps:
1. Student submits after deadline.
2. Confirm status is late.
3. Educator applies Assignment Deadline Extension with reason to a future date.
4. Recheck Student submission status.

Expected result:
- Initial submission status is `late`.
- Deadline extension applies to all Students with Effective Module Access.
- Submission becomes on-time if submitted before the extended deadline.
- Students receive In-App Notification.
- Audit Log records extension reason.

### TC-010: Mark Release And Final Grade Notification

Objective:
Verify mark visibility and final grade release.

Preconditions:
- Module Offering has Assessment Components totaling 100%.
- Student has marks entered for components.

Steps:
1. Educator enters component marks as draft.
2. Student checks marks page.
3. Educator releases marks.
4. Educator calculates and releases Final Grade.
5. Student checks Notification Center and marks page.

Expected result:
- Draft marks are not visible to Student.
- Released marks become visible.
- Final Grade is calculated as weighted percentage.
- Pass Status uses 50% threshold.
- Student receives notifications for released mark/final grade.

### TC-011: Released Final Grade Correction Requires Approval

Objective:
Verify grade correction governance.

Preconditions:
- Released Final Grade exists.

Steps:
1. Educator attempts to change Released Final Grade.
2. Administrator applies Final Grade Correction with reason.

Expected result:
- Educator cannot directly change Released Final Grade.
- Administrator-approved correction updates the grade.
- Correction reason is stored.
- Audit Log records before/after values.

### TC-012: Module Group Chat Mention Notifies Educator

Objective:
Verify targeted chat notification behavior.

Preconditions:
- Module Group Chat exists.
- Student and assigned Educator participate in the chat.

Steps:
1. Student sends normal chat message.
2. Confirm Educator is not directly notified.
3. Student sends message mentioning Educator.
4. Educator opens Notification Center.

Expected result:
- Normal message creates unread activity only.
- Mention creates In-App Notification for Educator.
- Module card can show mention badge.

### TC-013: Chat Moderation Leaves Removed Marker

Objective:
Verify moderation preserves chat history.

Preconditions:
- Module Group Chat contains inappropriate message.

Steps:
1. Administrator opens Module Group Chat.
2. Remove the message with moderation reason.
3. Student views chat.

Expected result:
- Message body is not visible to Student.
- Chat shows removed message marker.
- Audit Log records moderation.
- Removed message is not searchable by Student/Educator.

### TC-014: File Upload Size Limits

Objective:
Verify upload limits by category.

Preconditions:
- Test files exist above and below 8 MB and 25 MB.

Steps:
1. Upload 9 MB file to chat.
2. Upload 8 MB or smaller file to chat.
3. Upload 26 MB file as assignment submission.
4. Upload 25 MB or smaller file as assignment submission.
5. Upload 26 MB file as module content attachment.
6. Upload 25 MB or smaller file as module content attachment.

Expected result:
- Chat rejects files over 8 MB.
- Assignment submissions reject files over 25 MB.
- Module content rejects files over 25 MB.
- Valid files are accepted.
- File metadata is stored.

### TC-015: Student Dashboard Attention Items

Objective:
Verify at-risk signals are shown supportively to Students.

Preconditions:
- Student has one Module Offering with Attendance Percentage below 80%.
- Student has one overdue Assignment without submission.
- Student has one Released Final Grade below 50%.

Steps:
1. Student opens Guided Learning Dashboard.
2. Educator opens dashboard for assigned Module Offering.

Expected result:
- Student sees supportive Attention Items, not "At-Risk Student" label.
- Educator sees at-risk indicators for relevant Module Offering.
- Dashboard shows low attendance, missing submission, and grade risk.

### TC-016: Module Feedback Identity Visibility

Objective:
Verify feedback reporting privacy.

Preconditions:
- Feedback Period has closed.
- Students submitted feedback.

Steps:
1. Educator opens Feedback Report.
2. Administrator opens Feedback Report.

Expected result:
- Educator sees aggregated feedback without Student identities.
- Administrator can access identity only for moderation/safety workflow.

## Acceptance Criteria Summary

- Core role workflows function end to end.
- Students cannot self-enrol or create academic records outside their allowed actions.
- Educators can manage only assigned Module Offerings.
- Administrators control academic setup and enrolment.
- Super Administrators control administrator accounts and system settings.
- Attendance, grades, files, moderation, and system settings are auditable.
- Dashboards expose due work, attendance, marks, notifications, and risk/attention signals.
- Upload limits and access rules are enforced.
