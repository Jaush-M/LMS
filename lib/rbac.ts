import type { UserRole } from "./generated/prisma/enums";

// Ordered from lowest to highest privilege
const ROLE_HIERARCHY: UserRole[] = [
  "STUDENT",
  "EDUCATOR",
  "ADMINISTRATOR",
  "SUPER_ADMINISTRATOR",
];

export function isAtLeast(role: UserRole, minimum: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minimum);
}

// Named permissions for static (role-level) checks.
// Contextual checks (e.g. "educator assigned to this module") stay in domain functions.
export type Permission =
  | "accounts:create-administrator"   // create new admin accounts
  | "accounts:manage-staff"           // create/activate/disable educators & students
  | "courses:manage"                  // catalogue CRUD (faculties, courses, modules, etc.)
  | "course-offerings:manage"         // course offering lifecycle, sessions, enrollment
  | "system-settings:manage"          // institution-wide settings
  | "calendar:manage-institution"     // institution-wide calendar events
  | "calendar:manage-course"          // course-level calendar events
  | "calendar:manage-module"          // module-level events (EDUCATOR: requires assignment context)
  | "module-content:manage"           // content CRUD (EDUCATOR: requires assignment context)
  | "assignments:manage"              // create/publish/grade (EDUCATOR: requires assignment context)
  | "assignments:submit"              // submit assignment responses
  | "attendance:manage"               // record attendance (EDUCATOR: requires assignment context)
  | "assessment:manage"               // grade assessments (EDUCATOR: requires assignment context)
  | "feedback:review";                // close/review module feedback

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  SUPER_ADMINISTRATOR: new Set<Permission>([
    "accounts:create-administrator",
    "accounts:manage-staff",
    "courses:manage",
    "course-offerings:manage",
    "system-settings:manage",
    "calendar:manage-institution",
    "calendar:manage-course",
    "calendar:manage-module",
    "module-content:manage",
    "assignments:manage",
    "attendance:manage",
    "assessment:manage",
    "feedback:review",
  ]),
  ADMINISTRATOR: new Set<Permission>([
    "accounts:manage-staff",
    "courses:manage",
    "course-offerings:manage",
    "calendar:manage-institution",
    "calendar:manage-course",
    "calendar:manage-module",
    "module-content:manage",
    "assignments:manage",
    "attendance:manage",
    "assessment:manage",
    "feedback:review",
  ]),
  EDUCATOR: new Set<Permission>([
    "calendar:manage-module",
    "module-content:manage",
    "assignments:manage",
    "attendance:manage",
    "assessment:manage",
  ]),
  STUDENT: new Set<Permission>([
    "assignments:submit",
  ]),
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
