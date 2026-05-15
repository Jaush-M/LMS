# Contributing Guide

## Table of Contents

- [Commit Structure](#commit-structure)
- [Commit Types](#commit-types)
- [Branch Naming](#branch-naming)
- [Pull Request Process](#pull-request-process)

---

## Commit Structure

```
type(scope): subject
```

**Example:**

```
feat(api): add order endpoint
```

| Part      | Description                               |
| --------- | ----------------------------------------- |
| `type`    | Impact category (see below)               |
| `scope`   | Affected area: `api`, `web`, `repo`, etc. |
| `subject` | Concise, imperative description           |

**Subject rules:**

- Use the imperative mood: _"add endpoint"_ not _"added endpoint"_
- No capital letter at the start
- No period at the end
- Keep it under 72 characters

---

## Commit Types

### Core Types

#### `feat` — New capability

Introduces a new user-visible feature or capability.

Use when:

- Adding a new endpoint
- Implementing a new UI feature
- Adding a new workflow or configuration option

```
feat(api): add order creation endpoint
feat(web): implement dashboard filters
```

> **Rule:** If a user, client, or external system can do something new → `feat`.

---

#### `fix` — Bug correction

Restores intended behavior.

Use when:

- Fixing a runtime error
- Correcting invalid logic
- Resolving validation errors
- Fixing UI bugs

```
fix(api): handle null customer id
fix(web): prevent double form submission
```

> **Rule:** If something was broken or incorrect → `fix`.

---

### Supporting Types

#### `refactor` — Internal restructuring

Code changes that **do not change observable behavior**.

Use when:

- Restructuring or extracting methods
- Renaming internals or moving files
- Performance-neutral cleanup

```
refactor(api): extract validation service
refactor(web): simplify layout structure
```

> **Do not use if behavior changes.**

---

#### `perf` — Performance improvement

Same behavior, measurably faster.

Use when:

- Optimizing queries
- Adding caching
- Reducing rendering cost

```
perf(api): optimize order query with index
perf(web): memoize expensive component
```

---

#### `docs` — Documentation only

Use when:

- Updating README or setup instructions
- Writing or improving API docs
- Adding code comments or architecture docs

```
docs(repo): update setup instructions
docs(api): document authentication flow
```

---

#### `test` — Tests only

Use when:

- Adding unit or integration tests
- Refactoring tests
- Improving test coverage

```
test(api): add order service tests
test(web): add login form validation tests
```

---

#### `build` — Build system or dependencies

Use when:

- Updating NuGet, npm, or other packages that affect runtime
- Modifying Dockerfiles
- Changing webpack/Next.js config in ways that affect the build

```
build(api): upgrade .NET to 8.0
build(web): update next to v15
```

---

#### `ci` — CI/CD pipeline

Use when:

- Modifying GitHub Actions or Azure Pipelines
- Configuring Turbo cache
- Updating deployment workflows

```
ci(repo): add build pipeline for api
ci(repo): enable turbo caching
```

---

#### `chore` — Maintenance

Use when:

- Formatting, lint config, tooling setup
- Repo structure changes
- Dependency updates that don't affect runtime behavior

```
chore(repo): configure commitlint
chore(web): remove unused assets
```

> **Rule:** If it's operational or maintenance with no product impact → `chore`.

---

#### `revert` — Undo a previous commit

```
revert: feat(api): add caching layer
```

Primarily used by automated tooling or to undo a bad change.

---

#### `wip` — Work in progress

For temporary commits on feature branches only. Do not merge `wip` commits into `main` or `develop`.

```
wip(web): rough draft of new checkout flow
```

---

### Breaking Changes

If a change breaks backward compatibility, append `!` after the scope or add a `BREAKING CHANGE` footer.

```
feat(api)!: change order response format
```

Or in the commit body:

```
BREAKING CHANGE: removed legacy auth endpoint
```

---

## Branch Naming

Branches follow the pattern:

```
type/short-description
```

**Examples:**

| Branch                        | Purpose       |
| ----------------------------- | ------------- |
| `feat/order-endpoint`         | New feature   |
| `fix/null-customer-id`        | Bug fix       |
| `refactor/validation-service` | Refactor      |
| `chore/upgrade-dotnet`        | Maintenance   |
| `docs/auth-flow`              | Documentation |

**Rules:**

- Use the same type vocabulary as commits (`feat`, `fix`, `refactor`, etc.)
- Use `kebab-case` — no spaces, underscores, or capital letters
- Keep the description short and meaningful (3–5 words max)
- Branch off from `develop` for features and fixes; branch off from `main` only for hotfixes

**Hotfix branches** use the format:

```
hotfix/short-description
```

```
hotfix/payment-gateway-timeout
```

---

## Pull Request Process

### Before Opening a PR

- Ensure all tests pass locally
- Rebase onto the latest `develop` (or `main` for hotfixes) to resolve conflicts before requesting review
- Remove any `wip` commits by squashing or rewording them
- Self-review your diff — check for debug logs, commented-out code, and unintended file changes

### PR Title

PR titles follow the same format as commit messages:

```
type(scope): subject
```

```
feat(api): add order creation endpoint
fix(web): prevent double form submission
```

### PR Description

Every PR should include:

1. **What** — A brief summary of what changed and why
2. **How to test** — Steps a reviewer can follow to verify the change
3. **Screenshots** (if UI changes) — Before/after if applicable
4. **Related issues** — Link any relevant tickets or issues (e.g., `Closes #123`)

### Review Guidelines

**For authors:**

- Keep PRs focused. If a PR is doing two unrelated things, split it.
- Respond to all review comments before re-requesting review.
- Don't resolve reviewer comments yourself — let the reviewer dismiss them once satisfied.

**For reviewers:**

- Aim to review within 1 business day of being assigned.
- Distinguish between blocking concerns and non-blocking suggestions. Use prefixes like `nit:` for minor style points that don't require action.
- Approve only when you're confident the change is correct and safe to merge.

### Merging

- Require at least **1 approval** before merging.
- Use **Squash and Merge** for feature branches to keep history clean.
- Use **Merge Commit** for release or hotfix branches to preserve the full audit trail.
- Delete the source branch after merging.
