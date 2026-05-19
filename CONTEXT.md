# Learning Management System

This context defines the academic language for a college-style Learning Management System used by administrators, educators, and students.

## Language

**Learning Management System**:
A web platform where academic users access course materials, assignments, attendance, calendars, communication, and progress information.
_Avoid_: Moodle clone

**Student**:
A learner enrolled by an administrator into a specific course intake.
_Avoid_: Learner, pupil

**Enrollment**:
An administrator-created relationship between a student and a course offering.
_Avoid_: Registration, self-enrollment

**Main Enrollment**:
The enrollment treated as the student's default active course offering.
_Avoid_: Primary course

**Module Enrollment Exception**:
An administrator-defined change to the module offerings a student takes within a course offering.
_Avoid_: Module override

**Effective Module Access**:
The module offerings available to a student after enrollment and module enrollment exceptions are applied.
_Avoid_: Actual access

**Educator**:
A teaching staff member assigned to deliver one or more modules.
_Avoid_: Lecturer, teacher, instructor

**Academic Record**:
Historical course, module, attendance, submission, marking, content, and chat information that must remain attributable.
_Avoid_: History, audit data

**Audit Log**:
A record of sensitive system or academic changes visible to administrators and super administrators.
_Avoid_: Activity log

**Operational Audit Event**:
An audit log entry about academic setup, enrollment, attendance, marking, moderation, or file activity.
_Avoid_: Admin event

**System Audit Event**:
An audit log entry about administrator accounts, security-sensitive activity, or system-wide settings.
_Avoid_: Super admin event

**Administrator**:
A staff user who controls course setup, module assignments, academic dates, and student enrollment.
_Avoid_: Admin

**Super Administrator**:
A privileged staff user who manages administrators and system-level control.
_Avoid_: Super admin, owner

**System Setting**:
A configurable system-wide value controlled by a super administrator.
_Avoid_: Config

**User Account**:
A login identity assigned to one role in the learning management system.
_Avoid_: Account, profile

**Disabled User Account**:
A user account that cannot sign in but remains attached to historical records.
_Avoid_: Deleted user

**Inactive User Account**:
A created user account that cannot sign in until activated.
_Avoid_: Pending account

**Temporary Password**:
A password used only to complete first sign-in or password reset.
_Avoid_: Default password

**Institutional Email**:
The email address used by a user account to sign in.
_Avoid_: Login email

**Student Identifier**:
The institution-issued identifier for a student.
_Avoid_: Student ID

**Staff Identifier**:
The institution-issued identifier for an educator or administrator.
_Avoid_: Staff ID

**Generated Identifier**:
A system-assigned institutional identifier with a role-specific prefix.
_Avoid_: Manual ID

**Course**:
An academic programme that contains modules and runs for a defined duration.
_Avoid_: Class

**Award Level**:
The qualification level of a course.
_Avoid_: Programme level

**Awarding Body**:
The institution that awards a course qualification.
_Avoid_: Partner institution

**Faculty**:
An academic division that owns courses.
_Avoid_: Department, school

**Inactive Faculty**:
A faculty that cannot be used for new courses but remains attached to historical records.
_Avoid_: Deleted faculty

**Home Faculty**:
The faculty an educator is primarily associated with.
_Avoid_: Assigned faculty

**Course Offering**:
A course running for a specific intake and duration.
_Avoid_: Batch, running course

**Course Offering Date Range**:
The start and finish dates for a course offering.
_Avoid_: Course duration

**Course Offering Capacity**:
The expected maximum number of students in a course offering.
_Avoid_: Class size

**Capacity Override**:
An administrator-approved enrollment beyond course offering capacity.
_Avoid_: Over-enrollment

**Archived Course Offering**:
A finished course offering hidden from normal day-to-day views while preserving its academic records.
_Avoid_: Deleted course, removed course

**Post-Course Marking Window**:
A limited period after course offering completion when educators may finish marking existing submissions.
_Avoid_: Grace period

**Module**:
A subject within a course that is delivered by an assigned educator.
_Avoid_: Unit, subject, class

**Inactive Course**:
A course that cannot be used for new course offerings but remains attached to historical records.
_Avoid_: Deleted course

**Inactive Module**:
A module that cannot be used for new module offerings but remains attached to historical records.
_Avoid_: Deleted module

**Curriculum Template**:
The reusable academic structure of a course before it is delivered as a course offering.
_Avoid_: Course template

**Template Module**:
A module's planned place in a curriculum template.
_Avoid_: Module template

**Module Offering**:
A module delivered within a specific course offering by an assigned educator.
_Avoid_: Running module

**Module Offering Date Range**:
The start and finish dates for a module offering.
_Avoid_: Module duration

**Intake**:
A scheduled entry point for students beginning a course.
_Avoid_: Semester, cohort start

**Default Intake**:
A standard intake commonly available for course offerings.
_Avoid_: Hardcoded intake

**Inactive Intake**:
An intake that cannot be used for new course offerings but remains attached to historical records.
_Avoid_: Deleted intake

**Study Mode**:
The delivery format for a course offering or module offering.
_Avoid_: Delivery mode

**Academic Level**:
A course-specific curriculum tier that groups modules by expected progression stage.
_Avoid_: Year, global level, tier

**Credit**:
A measure of academic value earned by completing a module.
_Avoid_: Points

**Prerequisite**:
A module that must be completed before a student can progress to a dependent module.
_Avoid_: Precursor

**Progression Rule**:
A requirement that determines whether a student may move from one academic level to another.
_Avoid_: Promotion rule

**Progression Review**:
An administrative assessment of whether a student may move from one academic level to another.
_Avoid_: Automatic progression

**Module Feedback**:
A student's end-of-module response about a module offering.
_Avoid_: Course feedback

**Feedback Period**:
The time window when students may submit module feedback.
_Avoid_: Feedback window

**Feedback Report**:
A summary of submitted module feedback.
_Avoid_: Survey report

**Attendance**:
A record of whether a student attended a module session.
_Avoid_: Presence

**Class Session**:
A scheduled teaching event for a module offering.
_Avoid_: Class, lesson

**Session Type**:
The teaching format of a class session.
_Avoid_: Class type

**Session Location**:
The physical room or online location for a class session.
_Avoid_: Room

**Educator Attendance**:
A record that an educator attended a class session by submitting student attendance.
_Avoid_: Lecturer attendance

**Attendance Status**:
The outcome recorded for a student's attendance at a class session.
_Avoid_: Attendance state

**Attendance Percentage**:
The share of counted class sessions where a student was present or late.
_Avoid_: Attendance rate

**Attendance Correction Window**:
A limited period after attendance submission when an educator may correct attendance.
_Avoid_: Edit window

**Locked Attendance**:
Attendance that can no longer be changed by an educator without administrator approval.
_Avoid_: Frozen attendance

**Attendance Correction Request**:
An educator's request to change locked attendance.
_Avoid_: Attendance edit request

**Correction Reason**:
The explanation recorded for changing locked attendance.
_Avoid_: Edit reason

**Assignment**:
A piece of assessed work with a deadline.
_Avoid_: Task, homework

**Assignment Deadline Extension**:
A change to an assignment deadline for all students with effective module access.
_Avoid_: Extension request, extension form

**Deadline Extension Reason**:
The explanation recorded for changing an assignment deadline.
_Avoid_: Extension reason

**Published Assignment**:
An assignment visible to enrolled students.
_Avoid_: Released assignment

**Maximum Mark**:
The highest score available for an assignment.
_Avoid_: Total marks, max score

**Submission**:
A student's uploaded response to an assignment.
_Avoid_: Upload, answer

**Active Submission**:
The latest submission that is considered for marking.
_Avoid_: Current upload

**Submission Status**:
The state of a student's submission for an assignment.
_Avoid_: Submission state

**Marking**:
An educator's score and feedback for a submission.
_Avoid_: Grading

**Assessment Component**:
A weighted assessed item that contributes to a module offering's final grade.
_Avoid_: Grade item

**Online Assignment**:
An assessment component that requires a student submission through the learning management system.
_Avoid_: Upload assignment

**Offline Assessment**:
An assessment component marked without a student submission through the learning management system.
_Avoid_: Manual grade item

**Component Weight**:
The percentage contribution an assessment component makes to a final grade.
_Avoid_: Weighting

**Assessment Structure**:
The complete set of assessment components and component weights for a module offering.
_Avoid_: Grading setup

**Default Assessment Structure**:
The assessment structure defined in a curriculum template before a module offering is created.
_Avoid_: Template grading setup

**Locked Assessment Component**:
An assessment component whose structure can no longer be changed because marks exist.
_Avoid_: Frozen component

**Final Grade**:
The official outcome for a student in a module offering after assessment components are combined.
_Avoid_: Module grade

**Provisional Final Grade**:
A calculated final grade that is not yet visible to the student.
_Avoid_: Draft grade

**Released Final Grade**:
A final grade visible to the student it belongs to.
_Avoid_: Published grade

**Pass Status**:
Whether a final grade meets the required passing threshold.
_Avoid_: Result

**Pass Threshold**:
The minimum final grade percentage required to pass a module offering.
_Avoid_: Passing mark

**Released Mark**:
A mark visible to the student it belongs to.
_Avoid_: Published mark

**Mark Correction**:
A reasoned change to a released mark.
_Avoid_: Grade edit

**Final Grade Correction**:
A reasoned administrator-approved change to a released final grade.
_Avoid_: Result edit

**Reminder Period**:
The number of days before an assignment deadline when a student should be notified.
_Avoid_: Notification period

**Academic Calendar**:
A schedule of course dates, assignment deadlines, and administrator-controlled institution dates.
_Avoid_: Calendar

**Announcement**:
An official one-way notice shown to relevant users.
_Avoid_: Notice, bulletin

**Announcement Attachment**:
A file included in an announcement.
_Avoid_: Notice file

**Expired Announcement**:
An announcement no longer shown in active dashboard feeds.
_Avoid_: Deleted announcement

**Institution Event**:
An academic calendar event visible to all users.
_Avoid_: Global event

**Course Offering Event**:
An academic calendar event visible to users in a course offering.
_Avoid_: Course event

**Module Offering Event**:
An academic calendar event visible to users in a module offering.
_Avoid_: Module event

**Guided Learning Dashboard**:
A role-specific overview of progress, due assignments, attendance, and items needing attention.
_Avoid_: Dashboard, homepage

**Pending Marking**:
A submission that is waiting for educator review.
_Avoid_: Ungraded work

**Attendance Completion**:
The extent to which attendance has been submitted for scheduled class sessions.
_Avoid_: Attendance progress

**At-Risk Student**:
A student whose attendance, submissions, or marks indicate they may need support.
_Avoid_: Weak student

**Attention Item**:
A student-facing dashboard item that identifies something needing action without labelling the student as at risk.
_Avoid_: Risk warning

**Attendance Risk Threshold**:
The attendance percentage below which a student is treated as at risk.
_Avoid_: Low attendance cutoff

**Module Group Chat**:
A module-specific conversation space where students can mention the educator to trigger an educator notification.
_Avoid_: Chat, group

**Mention**:
A direct reference to a chat participant that triggers a notification for that participant.
_Avoid_: Ping

**Unread Chat Activity**:
Chat messages that a participant has not yet viewed.
_Avoid_: Message alert

**Notification**:
A user-visible alert produced by academic activity or direct communication.
_Avoid_: Alert

**In-App Notification**:
A notification delivered inside the learning management system.
_Avoid_: Email notification

**Notification Center**:
A place where a user can review and mark notifications as read.
_Avoid_: Alerts page

**Chat Attachment**:
A file shared in a module group chat message.
_Avoid_: File upload

**Edited Chat Message**:
A chat message that has been changed by its sender.
_Avoid_: Edited message

**Removed Chat Message**:
A chat message that remains represented after deletion or moderation.
_Avoid_: Deleted message

**Module Content**:
Learning material shared by an educator in a module offering.
_Avoid_: Resource, material

**Content Section**:
A named grouping of module content within a module offering.
_Avoid_: Folder, topic, week

**Published Content**:
Module content visible to enrolled students.
_Avoid_: Released content

**Draft Content**:
Module content visible only to the assigned educator and administrators.
_Avoid_: Unpublished content

**Content Attachment**:
A file included in module content.
_Avoid_: Content file

**Shared Link**:
A web link shared as module content, chat content, or assignment information.
_Avoid_: URL, hyperlink

**Moderation**:
An administrator action that handles inappropriate or unsafe chat messages.
_Avoid_: Censorship

## Relationships

- A **Student** has one or more **Enrollments**.
- An **Enrollment** connects one **Student** to one **Course Offering**.
- A **Main Enrollment** identifies the student's default active **Course Offering**.
- A **Module Enrollment Exception** changes a **Student's** access to a **Module Offering** within an **Enrollment**.
- **Effective Module Access** includes default module offerings plus included exceptions and excludes removed exceptions.
- **Attendance**, **Assignment**, **Module Content**, **Module Group Chat**, and **Marking** follow **Effective Module Access**.
- A **Super Administrator** manages **Administrators**.
- A **Super Administrator** controls system-wide settings.
- A **Super Administrator** controls **System Settings**.
- An **Administrator** controls academic setup and enrollment.
- A **Super Administrator** creates **Administrator** user accounts.
- An **Administrator** creates **Student** and **Educator** user accounts.
- A **User Account** cannot change its own role.
- A **User Account** signs in with an **Institutional Email**.
- A **Generated Identifier** uses `S` for **Students**, `E` for **Educators**, `A` for **Administrators**, and `SA` for **Super Administrators**.
- A **Generated Identifier** is never reused.
- An **Inactive User Account** cannot sign in until activated.
- A **Temporary Password** must be changed after first sign-in.
- A **Disabled User Account** cannot sign in.
- A **Disabled User Account** remains attributable in **Academic Records** and **Audit Logs**.
- A **Faculty** owns one or more **Courses**.
- An **Inactive Faculty** cannot be used for new **Courses**.
- An **Educator** may have one **Home Faculty**.
- An **Educator's** permissions come from assigned **Module Offerings**, not **Home Faculty**.
- A **Course** contains one or more **Modules**.
- A **Course** has one **Award Level**.
- A **Course** may have one **Awarding Body**.
- An **Inactive Course** cannot be used for new **Course Offerings**.
- A **Course** has one **Curriculum Template**.
- A **Curriculum Template** contains one or more **Template Modules**.
- A **Curriculum Template** contains one or more **Academic Levels**.
- A **Template Module** identifies a **Module**, **Academic Level**, **Credits**, and **Prerequisites**.
- A **Template Module** may define a **Default Assessment Structure**.
- A **Course Offering** is created from a **Curriculum Template**.
- A **Course Offering** is one **Course** for one **Intake**.
- A **Course Offering** has one **Course Offering Date Range**.
- A **Course Offering** has one **Course Offering Capacity**.
- A **Capacity Override** requires a recorded reason.
- A **Default Intake** may be used when creating a **Course Offering**.
- An **Inactive Intake** cannot be used for new **Course Offerings**.
- A **Course Offering** has one default **Study Mode**.
- A **Module Offering** may override the **Course Offering's** default **Study Mode**.
- An **Archived Course Offering** preserves attendance, submissions, marking, content, and chat history.
- An **Archived Course Offering** is accessible to **Administrators** and **Super Administrators**.
- An **Archived Course Offering** is read-only for **Students**.
- An **Archived Course Offering** is read-only for **Educators** except during a **Post-Course Marking Window**.
- A **Module Offering** is one **Module** within one **Course Offering**.
- An **Inactive Module** cannot be used for new **Module Offerings**.
- A **Module Offering** has exactly one primary assigned **Educator**.
- A **Module Offering** has one **Module Offering Date Range**.
- A **Module Offering Date Range** falls within the **Course Offering Date Range**.
- Replacing a primary **Educator** does not move **Academic Records** away from their **Module Offering**.
- **Academic Records** preserve the user responsible for creating or changing them.
- An **Audit Log** records sensitive account, academic setup, enrollment, attendance, marking, final grade, moderation, and file events.
- **Operational Audit Events** are visible to **Administrators** and **Super Administrators**.
- **System Audit Events** are visible to **Super Administrators**.
- A **Module Offering** belongs to exactly one **Academic Level**.
- A **Template Module** may have one or more **Prerequisites** within its **Curriculum Template**.
- A **Progression Rule** depends on **Credits** earned within an **Academic Level**.
- A **Progression Review** considers **Progression Rules** but is not automatically enforced by the system.
- **Module Feedback** belongs to exactly one **Module Offering**.
- A **Student** may submit one **Module Feedback** response per **Module Offering** during the **Feedback Period**.
- A **Feedback Report** hides **Student** identity from **Educators**.
- **Administrators** and **Super Administrators** may access **Module Feedback** identity when needed for moderation or safety.
- A **Class Session** belongs to exactly one **Module Offering**.
- A **Class Session** is created by an **Administrator**.
- A **Class Session** has one **Session Type**.
- A **Class Session** may have one **Session Location**.
- An **Educator** records **Attendance** for **Students** in a **Class Session**.
- **Educator Attendance** is inferred when the assigned **Educator** submits **Attendance** for a **Class Session**.
- An **Attendance Status** is one of present, absent, late, or excused.
- **Attendance** may be corrected by an **Educator** during the **Attendance Correction Window**.
- **Locked Attendance** requires **Administrator** approval to change.
- An **Educator** may submit an **Attendance Correction Request** for **Locked Attendance**.
- An **Administrator** may change **Locked Attendance** with a **Correction Reason**.
- **Attendance Percentage** excludes excused attendance from its counted sessions.
- A late **Attendance Status** counts toward attended sessions for **Attendance Percentage**.
- A **Student** can customize their own **Reminder Period**.
- An **Assignment** belongs to exactly one **Module Offering**.
- An **Assignment** is created by the assigned **Educator** for its **Module Offering**.
- A **Published Assignment** appears to enrolled **Students**.
- An assigned **Educator** may apply an **Assignment Deadline Extension**.
- An **Assignment Deadline Extension** applies to all **Students** with **Effective Module Access** to that **Assignment**.
- An **Assignment Deadline Extension** requires a **Deadline Extension Reason**.
- An **Assignment Deadline Extension** determines reminder timing and late submission status.
- A **Student** may have one **Active Submission** for an **Assignment**.
- A **Student** may replace an **Active Submission** before the **Assignment** deadline.
- An **Active Submission** is reviewed through **Marking** by the assigned **Educator**.
- A marked **Active Submission** cannot be replaced.
- A **Submission Status** is one of not submitted, submitted, late, or marked.
- An **Assessment Component** belongs to exactly one **Module Offering**.
- An **Online Assignment** is both an **Assignment** and an **Assessment Component**.
- An **Offline Assessment** is an **Assessment Component** without an **Active Submission**.
- An **Offline Assessment** is marked by the assigned **Educator**.
- A **Released Mark** is visible to its **Student**.
- A **Mark Correction** changes a **Released Mark** with a recorded reason.
- A **Component Weight** contributes to one **Final Grade** calculation.
- An **Assessment Structure** must total one hundred percent before final grades can be released.
- An **Assessment Structure** may be copied from a **Default Assessment Structure**.
- An **Assessment Structure** is initially defined by an **Administrator**.
- An assigned **Educator** may manage **Assessment Structure** details before marks exist.
- A **Locked Assessment Component** cannot be structurally changed by an **Educator**.
- A **Final Grade** belongs to one **Student** for one **Module Offering**.
- A **Provisional Final Grade** is reviewed before becoming a **Released Final Grade**.
- A **Released Final Grade** is visible to its **Student**.
- A **Final Grade Correction** changes a **Released Final Grade** with **Administrator** approval.
- A **Final Grade** is expressed as a percentage.
- A **Pass Status** is derived from a **Final Grade**.
- The **Pass Threshold** is fifty percent.
- The default **Reminder Period** is fifteen days before an **Assignment** deadline.
- A **Module Group Chat** belongs to a **Module Offering**.
- A **Module Group Chat** is created automatically for a **Module Offering**.
- A **Student** enrolled in a **Course Offering** may participate in its **Module Group Chats**.
- The assigned **Educator** may participate in a **Module Group Chat** for their **Module Offering**.
- A **Module Group Chat** becomes read-only when its **Course Offering** is archived.
- A **Mention** triggers a notification for the mentioned participant.
- **Unread Chat Activity** may be shown without notifying every participant for every message.
- A **Notification Center** contains **Notifications** for a **User Account**.
- An **In-App Notification** may be created by a **Mention**, assignment reminder, assignment deadline extension, released mark, released final grade, or newly published content.
- An **In-App Notification** may be created by an **Announcement**.
- A **Chat Attachment** belongs to exactly one **Module Group Chat** message.
- An **Edited Chat Message** shows that it was changed.
- A **Removed Chat Message** remains represented in chat history.
- **Module Content** belongs to exactly one **Module Offering**.
- A **Content Section** belongs to exactly one **Module Offering**.
- **Module Content** belongs to one **Content Section**.
- An **Assignment** may be linked from a **Content Section**.
- **Module Content** is created by the assigned **Educator**.
- **Draft Content** is not visible to enrolled **Students**.
- **Published Content** is visible to enrolled **Students**.
- A **Content Attachment** belongs to exactly one **Module Content** item.
- A **Shared Link** may appear in **Module Content**, **Module Group Chat**, or **Assignment** information.
- An **Administrator** may perform **Moderation** in a **Module Group Chat**.
- A moderated chat message remains visible as removed content.
- An **Institution Event** is created by an **Administrator**.
- A **Course Offering Event** belongs to exactly one **Course Offering**.
- A **Module Offering Event** belongs to exactly one **Module Offering**.
- A **Module Offering Event** may be created by the assigned **Educator** when it is not an official **Class Session**.
- **Assignment** deadlines and **Class Sessions** appear in the **Academic Calendar**.
- An **Announcement** may be scoped to the institution, a **Course Offering**, or a **Module Offering**.
- A **Super Administrator** may create institution-wide **Announcements**.
- An **Administrator** may create institution-wide and **Course Offering** **Announcements**.
- An assigned **Educator** may create **Module Offering** **Announcements**.
- An **Announcement Attachment** belongs to exactly one **Announcement**.
- A **Shared Link** may appear in an **Announcement**.
- An **Expired Announcement** remains accessible to **Administrators** and **Super Administrators**.
- A **Guided Learning Dashboard** presents role-specific academic status and attention items.
- **Pending Marking** belongs to an **Educator** through their assigned **Module Offerings**.
- **Attendance Completion** is tracked across **Class Sessions**.
- An **At-Risk Student** is identified from attendance, submission, or marking information.
- A **Student** is an **At-Risk Student** when their **Attendance Percentage** is below eighty percent.
- A **Student** is an **At-Risk Student** when a **Released Final Grade** is below the **Pass Threshold**.
- An **Attention Item** is shown to a **Student** instead of labelling them as an **At-Risk Student**.
- An **Academic Calendar** includes course start dates, course finish dates, assignment deadlines, and institution dates.

## Example Dialogue

> **Dev:** "Can a **Student** join a **Course** by themselves?"
> **Domain expert:** "No. Only an **Administrator** can enroll a **Student** into a **Course Offering** for a selected **Intake**."

## Flagged Ambiguities

- "lecturer", "teacher", and "instructor" should all be treated as **Educator**.
- "notification period" is resolved as **Reminder Period** because it specifically controls assignment deadline reminders.
- "batch" is resolved as **Course Offering** when referring to a course running for a specific intake.
