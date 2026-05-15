# S3-Compatible Production File Storage

Uploaded file metadata will be stored in PostgreSQL, while file contents will be stored behind a storage driver. Local development can use disk storage, but Vercel production will use an S3-compatible object store because Vercel deployments do not provide durable application disk storage for uploaded user files, and the system needs one upload model that can support chat attachments, assignment submissions, and module content files without tying the domain to one provider.

**Considered Options**

- Store files directly in PostgreSQL: rejected because it would bloat the database and backups.
- Store files on local disk in all environments: rejected because it is not durable for Vercel production.
- Use only Vercel Blob: rejected as the default because the project wants the option to switch to an S3-compatible object store.

**Consequences**

- File metadata and academic ownership stay in the database.
- File bytes are accessed through a storage abstraction selected by environment configuration.
- Production uploads should avoid routing large file bodies through the application server when direct-to-storage upload is available.
