# Catalog

Every official pack and the rules it contains. Rule names match the `.md` filename in each pack's `llm/rules/` directory — that's also the name you'd use to override a rule locally.

## bluetemberg-rules-typescript

TypeScript code quality.

| Rule | Enforces |
| ---- | -------- |
| `type-safety` | Strict type safety — no implicit `any`, no unguarded assertions. |
| `coding-standards` | Keep functions and components small, readable, and easy to reason about. |
| `early-returns` | Prefer early returns and guard clauses over nested conditionals. |
| `no-console-log` | Forbid `console.log` in production code; use a logger instead. |
| `design-system-reuse` | Reuse existing shared UI components and design tokens before creating new ones. |

## bluetemberg-rules-git

Git workflow standards.

| Rule | Enforces |
| ---- | -------- |
| `git-workflow` | Branch protection, branch naming, and PR workflow rules. |
| `git-move` | Use `git mv` for tracked files to preserve history. |
| `pre-commit-checks` | Run formatter, linter, and build checks before every commit. |

## bluetemberg-rules-security

Security guardrails.

| Rule | Enforces |
| ---- | -------- |
| `never-read-env` | Never read `.env` files directly in code. |
| `security-secrets` | Never hardcode secrets, tokens, or credentials in source code. |
| `api-error-handling` | Use structured error responses and never leak internal details. |

## bluetemberg-rules-docs

Documentation & diagnostics.

| Rule | Enforces |
| ---- | -------- |
| `docs-parity` | Keep documentation in sync with every user-facing change. |
| `post-edit-diagnostics` | Run diagnostics and formatter after editing code files. |

## bluetemberg-rules-devops

Infrastructure.

| Rule | Enforces |
| ---- | -------- |
| `docker-best-practices` | Follow container best practices for secure, efficient Docker images. |
| `terraform-conventions` | Follow Terraform module structure and naming conventions. |

## Overriding a rule

Every rule is a self-contained Markdown file. To change one for your project without forking the pack, create a file with the **same name** in your local `llm/rules/` — it takes priority over the pack version during sync. See [Usage](Usage#overrides) for the full priority order.
