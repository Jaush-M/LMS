# Better Auth and Prisma

The LMS will use Better Auth for credential-based authentication and Prisma as the ORM for PostgreSQL. Better Auth fits the institution-created account model because it supports email/password authentication and database-backed sessions, while Prisma gives the project a typed relational model that aligns with the required ER diagram, migrations, and role-protected LMS workflows.

**Considered Options**

- Auth.js with credentials: rejected because Better Auth has stronger built-in credential support for this project shape.
- Custom authentication: rejected because session and password handling should not be hand-rolled for a college LMS.
- Direct SQL without an ORM: rejected because the project needs a large relational model that benefits from schema typing and migrations.

**Consequences**

- Better Auth owns the core authentication tables and session lifecycle.
- Prisma owns application schema migrations and relational access for LMS domain tables.
- LMS role and permission rules remain in the application domain rather than being treated as generic auth-provider roles.
