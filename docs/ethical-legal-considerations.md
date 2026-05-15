# Ethical And Legal Considerations

This document explains how the LMS design addresses data protection, academic integrity, student safety, and responsible system design.

## Data Protection

The LMS stores personal and academic data, including names, institutional emails, generated identifiers, enrolments, attendance, submissions, marks, final grades, chat messages, and feedback. Access to this data must be limited by role and academic relationship.

Design controls:
- Students can only see their own attendance, submissions, marks, final grades, notifications, and relevant module/course data.
- Educators can only see student academic data for their assigned Module Offerings.
- Administrators can manage academic setup and operational records.
- Super Administrators can access broader system records and system-level audit events.
- Disabled users remain attached to historical records instead of being deleted.
- Archived Course Offerings preserve academic records while hiding them from day-to-day views.

## Academic Record Integrity

Attendance, marks, final grades, submissions, enrolments, and feedback are academic records. The system must preserve attribution and prevent silent changes.

Design controls:
- Generated identifiers are never reused.
- Attendance becomes locked after the correction window.
- Locked attendance changes require Administrator action and a Correction Reason.
- Released mark changes require a recorded reason.
- Released final grade corrections require Administrator approval and a reason.
- Audit Logs record sensitive academic and account actions.
- Academic structure records are made inactive or archived instead of destructively deleted.

## Student Privacy

Students should not be exposed to unnecessary personal data about other students.

Design controls:
- Student-to-student visibility is limited to display name and Student Identifier in relevant Module Group Chats.
- Students cannot see other students' attendance, submissions, marks, final grades, enrolments, phone numbers, or institutional emails.
- Educators see only academic information connected to their assigned Module Offerings.

## Feedback Ethics

Module Feedback should allow students to be honest without fear of retaliation, while still allowing the institution to respond to abuse or safety issues.

Design controls:
- Educators see aggregated Feedback Reports without Student identities.
- Administrators and Super Administrators may access feedback identity only when needed for moderation or safety.
- Each Student may submit one feedback response per Module Offering during the Feedback Period.

## Chat Safety And Misuse

Module Group Chat improves communication but introduces misuse risks such as harassment, inappropriate content, or unsafe file sharing.

Design controls:
- Communication is limited to Module Group Chats; direct/private messaging is not included.
- Administrators can moderate chat messages.
- Removed or moderated messages remain represented as removed content rather than disappearing silently.
- Moderation actions are audit logged.
- Educators are notified only when mentioned, reducing unnecessary notification pressure.
- Archived Course Offering chats become read-only.

## File Upload Responsibility

The LMS allows all file types for chat attachments, assignment submissions, module content, assignment attachments, and announcements. This is useful for academic flexibility but introduces security risk.

Design controls:
- Upload size limits are enforced by category.
- File metadata is stored in the database while file bytes are stored through a storage driver.
- Production storage uses S3-compatible object storage rather than Vercel local disk.
- Uploaded files must be served safely to prevent inline execution of unsafe user-provided content.
- Malware scanning and quarantine are documented as production recommendations beyond the first version.

## Fairness And Student Support

The Guided Learning Dashboard should support students without stigmatizing them.

Design controls:
- Student dashboards use supportive Attention Items instead of labelling the student as at risk.
- At-Risk Student terminology is reserved for Educator and Administrator views.
- Risk signals are based on transparent criteria: attendance below 80%, overdue missing submissions, released final grade below 50%, and work due within the Reminder Period.
- Students can customize their own assignment Reminder Period.

## Authentication And Account Control

The LMS uses institution-created accounts rather than public registration.

Design controls:
- No public signup.
- No student self-enrolment.
- No educator self-assignment.
- Institutional emails and generated identifiers are controlled by authorized staff.
- Temporary passwords must be changed after first sign-in.
- Disabled accounts cannot sign in but remain attributable in academic records.

## Auditability

Auditability is necessary for professional conduct, academic integrity, and administrative accountability.

Design controls:
- Operational Audit Events are visible to Administrators and Super Administrators.
- System Audit Events are visible only to Super Administrators.
- Audit Logs include actor, action, target entity, before/after values where applicable, timestamp, and reason where required.
- Super Administrators see more audit detail than Administrators.

## Accessibility And Inclusion

The LMS should be usable by students and staff with different access needs.

Design controls:
- Use semantic structure, labelled forms, visible focus states, keyboard-accessible controls, sufficient color contrast, and clear error messages.
- Avoid conveying information by color alone.
- Ensure dashboards and chat are usable on mobile.
- Keep admin-heavy screens desktop-first but still usable on tablet.

## Professional Conduct

The system design supports professional software engineering standards by:
- using version control,
- separating glossary, specification, ER model, UML plan, test plan, risk assessment, and ADRs,
- documenting key architectural decisions,
- preserving records rather than deleting them,
- planning tests around role permissions and academic workflows,
- aligning diagrams and implementation with documented requirements.

## Known Limitations

The first version does not include:
- email notifications,
- third-party OAuth,
- malware scanning and quarantine,
- direct/private messaging,
- plagiarism checking,
- automatic progression enforcement,
- room booking conflict enforcement,
- uploaded profile images,
- user impersonation.

These exclusions reduce implementation risk while keeping the core LMS academically useful and demonstrable.
