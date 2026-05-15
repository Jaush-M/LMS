# LMS UML Plan

This plan defines the required diagrams for the LMS submission and what each diagram must include. The diagrams must match the implemented system, `docs/specification.md`, and `docs/er-model.md`.

## Use Case Diagram

Actors:
- Student
- Educator
- Administrator
- Super Administrator

Student use cases:
- Sign in
- View Guided Learning Dashboard
- View Module Content
- View Assignments
- Submit Assignment
- View Attendance
- View Released Marks and Final Grades
- View Academic Calendar
- View Announcements
- Use Module Group Chat
- Receive and read Notifications
- Submit Module Feedback

Educator use cases:
- Sign in
- View Educator Dashboard
- Manage Module Content
- Create and publish Assignments
- Apply Assignment Deadline Extension
- Mark Submissions
- Enter Offline Assessment Marks
- Release Marks and Final Grades
- Mark Attendance
- Request locked attendance correction
- Create Module Offering Events
- Create Module Offering Announcements
- Use Module Group Chat
- View Module Feedback Report
- Export attendance and marks

Administrator use cases:
- Sign in
- Create Student and Educator accounts
- Manage Faculties, Courses, Modules, Intakes, and Curriculum Templates
- Create Course Offerings and Module Offerings
- Assign Educators
- Create Class Sessions
- Enrol Students
- Import enrolments by CSV
- Manage Module Enrolment Exceptions
- Manage Institution and Course Offering calendar events
- Create Institution and Course Offering announcements
- Moderate Module Group Chat
- Correct locked attendance
- Approve final grade corrections
- View operational Audit Log
- Export reports
- Archive Course Offerings

Super Administrator use cases:
- Sign in
- Create and manage Administrator accounts
- Manage System Settings
- View system-wide dashboards and records
- View operational and system Audit Logs
- Create institution-wide Announcements
- Export system-wide reports

## Class Diagram

The class diagram should focus on core domain classes, not every implementation table.

Identity:
- UserAccount
- StudentProfile
- EducatorProfile
- AdministratorProfile

Academic structure:
- Faculty
- AwardingBody
- Course
- Module
- Intake
- StudyMode
- CurriculumTemplate
- AcademicLevel
- TemplateModule
- TemplateModulePrerequisite

Delivery:
- CourseOffering
- ModuleOffering
- Enrolment
- ModuleEnrolmentException
- CapacityOverride

Attendance:
- SessionType
- ClassSession
- AttendanceRecord
- EducatorAttendanceRecord
- AttendanceCorrectionRequest

Content and assessment:
- ContentSection
- ModuleContentItem
- Assignment
- AssignmentDeadlineExtension
- AssessmentComponent
- Submission
- ComponentMark
- FinalGrade

Communication:
- CalendarEvent
- Announcement
- ModuleGroupChat
- ChatMessage
- Mention
- Notification

Governance:
- ModuleFeedbackPeriod
- ModuleFeedbackResponse
- FileAsset
- SharedLink
- AuditLogEntry
- SystemSetting

Key relationships to show:
- Faculty 1..* Course
- Course 1..1 CurriculumTemplate
- CurriculumTemplate 1..* AcademicLevel
- CurriculumTemplate 1..* TemplateModule
- Course 1..* CourseOffering
- CourseOffering 1..* ModuleOffering
- ModuleOffering 1..1 primary EducatorProfile
- StudentProfile 1..* Enrolment
- Enrolment *..1 CourseOffering
- Enrolment 1..* ModuleEnrolmentException
- ModuleOffering 1..* ClassSession
- ClassSession 1..* AttendanceRecord
- ModuleOffering 1..* AssessmentComponent
- AssessmentComponent 0..1 Assignment
- Assignment 1..* Submission
- ModuleOffering 1..1 ModuleGroupChat
- ModuleGroupChat 1..* ChatMessage
- UserAccount 1..* Notification

## Sequence Diagrams

Create at least these sequence diagrams.

### 1. User Sign In

Participants:
- User
- Next.js App
- Better Auth
- PostgreSQL

Flow:
1. User submits institutional email and password.
2. Next.js App sends credentials to Better Auth.
3. Better Auth verifies credentials and account status.
4. Better Auth creates session.
5. App loads LMS role/profile.
6. User is routed to role-specific dashboard.

### 2. Administrator Creates Course Offering

Participants:
- Administrator
- LMS App
- PostgreSQL
- Notification Service

Flow:
1. Administrator selects Course, Intake, dates, Study Mode, capacity, and Curriculum Template.
2. App validates active Course, Intake, Template, dates, and capacity.
3. App creates CourseOffering.
4. App copies TemplateModules into ModuleOfferings.
5. Administrator assigns primary Educators.
6. App creates ModuleGroupChat for each ModuleOffering.
7. App copies DefaultAssessmentComponents into AssessmentComponents.
8. App records AuditLogEntry.

### 3. Administrator Enrols Student

Participants:
- Administrator
- LMS App
- PostgreSQL
- Notification Service

Flow:
1. Administrator selects Student and CourseOffering.
2. App checks capacity and prerequisite warnings.
3. Administrator confirms enrolment or capacity override with reason.
4. App creates Enrolment and optional CapacityOverride.
5. App derives EffectiveModuleAccess.
6. App grants access to module content, assignments, calendar, and ModuleGroupChats.
7. App records AuditLogEntry.
8. App creates Notification for Student.

### 4. Educator Marks Attendance

Participants:
- Educator
- LMS App
- PostgreSQL
- Audit Log

Flow:
1. Educator opens assigned ClassSession.
2. App loads Students with EffectiveModuleAccess.
3. Educator records Attendance Status for each Student.
4. App saves AttendanceRecords.
5. App creates EducatorAttendanceRecord.
6. App starts Attendance Correction Window.
7. App updates Attendance Completion and dashboard data.

### 5. Student Submits Assignment

Participants:
- Student
- LMS App
- Storage Driver
- PostgreSQL
- Notification Service

Flow:
1. Student opens Published Assignment.
2. Student uploads file.
3. App validates EffectiveModuleAccess and file size.
4. Storage Driver stores file bytes.
5. App stores FileAsset metadata.
6. App creates or replaces Active Submission.
7. App determines submitted or late status from current deadline.
8. App notifies assigned Educator or updates Pending Marking.

### 6. Educator Releases Final Grade

Participants:
- Educator
- LMS App
- PostgreSQL
- Notification Service
- Audit Log

Flow:
1. Educator reviews Assessment Structure and Component Marks.
2. App verifies weights total 100%.
3. App calculates Provisional Final Grade.
4. Educator releases Final Grade.
5. App stores Released Final Grade and Pass Status.
6. App creates Student Notification.
7. App records AuditLogEntry.

### 7. Student Mentions Educator In Group Chat

Participants:
- Student
- LMS App
- PostgreSQL
- Notification Service
- Educator

Flow:
1. Student sends ChatMessage in ModuleGroupChat.
2. App validates EffectiveModuleAccess.
3. App stores ChatMessage and attachments/links.
4. App detects Mention of assigned Educator.
5. App creates Mention and Notification.
6. Educator sees notification and module card badge.

## Activity Diagrams

### Student Assignment Workflow

Start:
- Student views dashboard or assignment list.

Activities:
- Open Assignment.
- Review instructions, attachments, and shared links.
- Upload submission.
- Validate file size.
- Submit before/after deadline.
- Replace submission if before deadline and unmarked.
- View released mark and feedback.

Decision points:
- Is assignment published?
- Does Student have EffectiveModuleAccess?
- Is file within size limit?
- Is deadline passed?
- Is submission already marked?

End:
- Submission status becomes submitted, late, or marked.

### Educator Attendance Workflow

Start:
- Educator opens upcoming or past ClassSession.

Activities:
- Load class list.
- Mark Present, Absent, Late, or Excused.
- Submit attendance.
- Correct within 8-day window if needed.
- Submit correction request after lock if needed.

Decision points:
- Is Educator primary assigned Educator?
- Is session official?
- Is correction within 8 days?
- Is attendance locked?

End:
- Attendance Completion updated and Educator Attendance inferred.

### Administrator Course Offering Setup Workflow

Start:
- Administrator chooses Course and Intake.

Activities:
- Enter date range, capacity, and Study Mode.
- Validate Curriculum Template.
- Create CourseOffering.
- Generate ModuleOfferings.
- Assign Educators.
- Confirm Assessment Structures.
- Create ClassSessions.
- Enrol Students or import CSV.

Decision points:
- Are Course/Intake active?
- Are dates valid?
- Are module dates inside course dates?
- Are assessment weights valid?
- Are capacity warnings present?

End:
- CourseOffering becomes planned or active.

### Chat Moderation Workflow

Start:
- Administrator opens reported or reviewed ModuleGroupChat.

Activities:
- Inspect message and attachments.
- Remove inappropriate message if needed.
- Preserve removed marker.
- Record moderation reason.
- Create AuditLogEntry.

Decision points:
- Is content inappropriate or unsafe?
- Should attachment access be removed?

End:
- Moderated content remains represented in chat history.

## ER Diagram

The ER diagram should be generated from `docs/er-model.md`.

Required clusters:
- Identity and roles
- Academic catalogue
- Curriculum templates
- Course delivery
- Enrolment and access
- Sessions and attendance
- Content and files
- Assignments and assessment
- Calendar and announcements
- Chat and notifications
- Feedback
- Audit and settings

For readability, produce either:
- one full ER diagram plus smaller cluster diagrams, or
- one high-level ER diagram and several detailed diagrams.

The final submitted ER diagram must include enough cardinality to prove the model supports Course Offerings, Module Offerings, Effective Module Access, assessment components, attendance, and module group chats.
