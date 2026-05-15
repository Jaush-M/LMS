# LMS Risk Assessment

This document identifies project, technical, security, ethical, and academic risks for the Learning Management System, with mitigation actions aligned to the specification.

Risk scale:
- Likelihood: Low, Medium, High
- Impact: Low, Medium, High
- Priority: Low, Medium, High, Critical

## Risk Register

| ID | Risk | Likelihood | Impact | Priority | Mitigation |
| --- | --- | --- | --- | --- | --- |
| R-001 | Scope is too large for the available project time. | High | High | Critical | Build in phases, keep out-of-scope list firm, prioritise core workflows before polish, and use seed data for demo coverage. |
| R-002 | Role permissions are implemented inconsistently. | Medium | High | High | Centralise authorization checks, test each role workflow, and use the specification as the permission source of truth. |
| R-003 | Students gain access to modules, marks, attendance, or chats outside Effective Module Access. | Medium | High | High | Derive access from Enrolment and Module Enrolment Exceptions, test access boundaries, and avoid ad hoc filtering. |
| R-004 | Educators can modify academic records outside assigned Module Offerings. | Medium | High | High | Scope educator actions to primary assigned Module Offerings and test cross-module access denial. |
| R-005 | Academic records are accidentally deleted. | Medium | High | High | Use disabled, inactive, archived, removed, and moderated states instead of destructive deletion for academic records. |
| R-006 | Attendance or grade changes lack accountability. | Medium | High | High | Require reasons for post-lock attendance changes, released mark corrections, final grade corrections, and capacity overrides; record Audit Logs. |
| R-007 | Final grade calculations are wrong because assessment weights are invalid. | Medium | High | High | Require Assessment Structure to total 100% before Final Grades can be released; include calculation tests. |
| R-008 | Assignment deadline extensions cause inconsistent late status or reminders. | Medium | Medium | Medium | Recalculate late status and reminders from the current Assignment deadline; notify affected Students. |
| R-009 | File uploads are abused because all file types are allowed. | Medium | High | High | Enforce category size limits, store files outside database, restrict access by role, serve files safely, and document malware scanning as production recommendation. |
| R-010 | Vercel deployment loses uploaded files if local disk is used in production. | Medium | High | High | Use storage driver abstraction; local disk for development only; S3-compatible object storage for production. |
| R-011 | Large uploads fail through Vercel server request limits. | Medium | Medium | Medium | Prefer direct-to-storage upload flow for production and keep file metadata in PostgreSQL. |
| R-012 | Chat is misused for inappropriate content or harassment. | Medium | High | High | Limit communication to Module Group Chats, allow Administrator moderation, preserve removed markers, and audit moderation. |
| R-013 | Educators are overloaded by group chat notifications. | Medium | Medium | Medium | Notify Educators only on mentions; show normal unread activity without pinging for every message. |
| R-014 | Student-facing dashboard labels are stigmatizing. | Low | Medium | Medium | Use Attention Items for Students and reserve At-Risk Student terminology for Educator/Admin views. |
| R-015 | Feedback anonymity is misunderstood. | Medium | Medium | Medium | Hide Student identity from Educators; allow Administrator/Super Administrator identity access only for moderation or safety. |
| R-016 | CSV import creates duplicate or incorrect Student accounts. | Medium | Medium | Medium | Match by Student Identifier or Institutional Email, preview validation errors, and require confirmation before commit. |
| R-017 | Generated identifiers collide or are reused. | Low | High | Medium | Use role-specific counters/transactions and never reuse identifiers after disable/archive. |
| R-018 | Timezone mistakes cause deadline disputes. | Medium | High | High | Store timestamps in UTC, display and interpret academic deadlines in Maldives time, and show exact date/time. |
| R-019 | System settings are changed without traceability. | Low | High | Medium | Restrict settings to Super Administrators and record before/after values in Audit Logs. |
| R-020 | UML diagrams drift from the implemented system. | Medium | Medium | Medium | Base diagrams on `docs/specification.md` and `docs/er-model.md`, then update diagrams after implementation changes. |
| R-021 | Test plan is written but not executed. | Medium | Medium | Medium | Tie test cases to implementation milestones and run core workflow tests before final demo. |
| R-022 | Seed data is too sparse to demonstrate the full LMS. | Medium | Medium | Medium | Seed realistic data: 2 faculties, 10 courses, 10 educators, 200 students, course offerings, attendance, assignments, marks, chats, and notifications. |
| R-023 | Rich text fields allow unsafe HTML or scripts. | Medium | High | High | Use a restricted editor/sanitizer and disallow embedded scripts or arbitrary HTML. |
| R-024 | Super Administrator access is too broad without audit visibility. | Low | High | Medium | Record System Audit Events for administrator management, security-sensitive actions, and system settings. |
| R-025 | Performance degrades on dashboards because too much data is derived at request time. | Medium | Medium | Medium | Start with clear derived queries, then cache or materialize dashboard summaries only if needed. |

## Highest Priority Risks

### Scope Creep

The full LMS includes many interdependent workflows. The project should still be implemented in phases, with identity, academic setup, enrolment, assignments, attendance, and dashboards completed before advanced reporting polish.

### Permission Boundaries

The most important security risk is users seeing or changing records outside their role. Effective Module Access and assigned Module Offerings must be treated as central access-control rules.

### Academic Record Integrity

Attendance, submissions, marks, final grades, feedback, chat moderation, and enrolment records must remain attributable. The system should prefer archive/inactive/disabled/removed states instead of destructive deletes.

### File Upload Safety

All file types are allowed by requirement, so the system must strictly enforce size limits, store files outside the database, prevent unsafe inline execution, and document malware scanning as a future production improvement.

### Deployment Storage

Local disk storage is acceptable for local development, but production on Vercel must use S3-compatible object storage. This is already captured in ADR-0001.

## Risk Monitoring

- Review the risk register at each implementation phase.
- Add new risks when requirements change.
- Convert high-priority risks into test cases where possible.
- Keep the out-of-scope list visible during development.
- Update UML, ER, and test documents if implementation changes the model.
