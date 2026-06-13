# Catalog

Every official pack — rules, agents, skills, and guardrails — and the items it contains.
Item names match filenames in each pack's `llm/<kind>/` directory and are used for local overrides.

## Rules

Always-on instructions loaded into every AI session automatically.

### bluetemberg-rules-agent-memory

Agent memory rules for Bluetemberg — statelessness as a hard constraint, memory provenance, promotion through consolidation, and authority-ranked recall.

| Rule | Enforces |
| ---- | -------- |
| `memory-architecture-checklist` | Treat LLM statelessness as a hard constraint — decide explicitly what state survives a turn, which storage tier holds it, and how it is evicted. |
| `memory-promotion` | Session observations never write directly to durable memory — promotion runs through a reviewable consolidation step that dedupes, supersedes, and ratifies. |
| `memory-provenance` | Every durable memory carries provenance — source, time, confidence, and whether it was user-stated or agent-inferred. No silent writes. |
| `memory-recall-authority` | Rank recalled memory by authority, not only relevance — and never let stale, contradicted, or superseded memory present as a current constraint. |

### bluetemberg-rules-context-engineering

Context engineering rules for Bluetemberg — structuring LLM context, managing token budgets, avoiding context pollution.

| Rule | Enforces |
| ---- | -------- |
| `context-pollution-prevention` | Prevent context pollution — scope tool calls to what you need, don't inject noise into the conversation. |
| `context-window-budget` | Manage context window budget explicitly — prune stale content, compress retrieved data, never let context grow unbounded. |
| `multi-turn-state-management` | Manage state across multi-turn interactions — track what was decided, what changed, and what is still open. |

### bluetemberg-rules-devops

Infrastructure rules for Bluetemberg — Docker, Terraform, Ansible, Kubernetes, Helm, CI/CD, shell scripts, and idempotency.

| Rule | Enforces |
| ---- | -------- |
| `ansible-conventions` | Follow Ansible best practices for idempotent, maintainable infrastructure automation. |
| `ci-workflow-conventions` | Secure CI/CD workflows with minimal permissions, pinned actions, and OIDC authentication. |
| `container-image-pinning` | Pin container image versions to prevent unexpected breaking changes. |
| `docker-best-practices` | Follow container best practices for secure, efficient Docker images. |
| `helm-conventions` | Write safe, reusable Helm charts with secure defaults and consistent values structure. |
| `idempotency` | Every operation — task, script, or deployment — must be safe to re-run without side effects. |
| `jinja2-templates` | Write safe, readable Jinja2 templates for Ansible and configuration generation. |
| `kubernetes-manifests` | Write safe, production-grade Kubernetes manifests with resource limits, health checks, and security context. |
| `runbook-discipline` | Keep operational runbooks and ADRs accurate and commit them alongside the changes they document. |
| `shell-script-standards` | Write safe, portable shell scripts with error handling and clear control flow. |
| `terraform-conventions` | Follow Terraform module structure and naming conventions. |

### bluetemberg-rules-docs

Documentation and diagnostics rules for Bluetemberg — docs parity, post-edit diagnostics, Mermaid diagrams.

| Rule | Enforces |
| ---- | -------- |
| `docs-parity` | Keep documentation in sync with every user-facing change. |
| `mermaid-diagrams` | Use Mermaid diagrams instead of ASCII art. |
| `post-edit-diagnostics` | Run diagnostics and formatter after editing code files. |

### bluetemberg-rules-git

Git workflow rules for Bluetemberg — branch protection, naming, PR workflow, git move, pre-commit checks.

| Rule | Enforces |
| ---- | -------- |
| `git-move` | Use git mv for tracked files to preserve history. |
| `git-workflow` | Branch protection, branch naming, and PR workflow rules. |
| `pre-commit-checks` | Run formatter, linter, and build checks before every commit. |

### bluetemberg-rules-nextjs

Next.js rules for Bluetemberg — NEXT_PUBLIC_* env var safety.

| Rule | Enforces |
| ---- | -------- |
| `nextjs-data-fetching` | Prefer fetch with cache options in Server Components over useEffect + API calls |
| `nextjs-image-optimization` | Always use next/image; never raw img tags |
| `nextjs-metadata` | Define metadata/generateMetadata per page; never use <Head> in App Router |
| `nextjs-public-env-vars` | NEXT_PUBLIC_* are inlined into the bundle at build time — never use for secrets or per-environment values. |
| `nextjs-server-components` | Default to React Server Components; use 'use client' only at leaf interactive nodes |

### bluetemberg-rules-security

Security guardrail rules for Bluetemberg — secrets management, environment file protection, API error handling.

| Rule | Enforces |
| ---- | -------- |
| `api-error-handling` | Use structured error responses and never leak internal details. |
| `never-read-env` | Never read .env files directly in code. |
| `security-secrets` | Never hardcode secrets, tokens, or credentials in source code. |

### bluetemberg-rules-typescript

TypeScript code quality rules for Bluetemberg — type safety, coding standards, early returns, no console.log, design system reuse.

| Rule | Enforces |
| ---- | -------- |
| `coding-standards` | Keep functions and components small, readable, and easy to reason about. |
| `design-system-reuse` | Reuse existing shared UI components and design tokens before creating new ones. |
| `early-returns` | Prefer early returns and guard clauses over nested conditionals. |
| `no-console-log` | Forbid console.log in production code; use a logger instead. |
| `type-safety` | Enforce strict type safety — no implicit any, no unguarded assertions. |

## Agents

Specialist agents invoked for focused, domain-specific tasks.

### bluetemberg-agents-a11y-specialist

Accessibility specialist agent for Bluetemberg — WCAG 2.2 A/AA audit and remediation.

| Agent | Description |
| ----- | ----------- |
| `a11y-specialist` | Audits and remediates accessibility issues against WCAG 2.2 A/AA standards. |

### bluetemberg-agents-agentic-specialist

Agentic systems specialist agent for Bluetemberg — agent memory design, state management, orchestration patterns.

| Agent | Description |
| ----- | ----------- |
| `agentic-specialist` | Designs and implements agentic system memory, state management, and agent-to-agent communication patterns. |

### bluetemberg-agents-ansible-specialist

Ansible specialist agent for Bluetemberg — roles, playbooks, and Jinja2 templates.

| Agent | Description |
| ----- | ----------- |
| `ansible-specialist` | Writes and reviews Ansible roles, playbooks, and Jinja2 templates for idempotent infrastructure automation. |

### bluetemberg-agents-backend-specialist

Backend specialist agent for Bluetemberg — API design, database patterns, error handling, auth.

| Agent | Description |
| ----- | ----------- |
| `backend-specialist` | Implements and reviews backend services, APIs, database patterns, and auth flows. |

### bluetemberg-agents-code-reviewer

Code reviewer agent for Bluetemberg — PR review covering patterns, naming, complexity, tests.

| Agent | Description |
| ----- | ----------- |
| `code-reviewer` | Reviews pull requests for code quality, patterns, naming, and potential bugs. |

### bluetemberg-agents-devops-specialist

DevOps specialist agent for Bluetemberg — CI/CD pipelines, container optimization, IaC review.

| Agent | Description |
| ----- | ----------- |
| `devops-specialist` | Manages CI/CD pipelines, container builds, infrastructure-as-code, and deployment config. |

### bluetemberg-agents-docs-maintainer

Docs maintainer agent for Bluetemberg — documentation synchronization with code changes.

| Agent | Description |
| ----- | ----------- |
| `docs-maintainer` | Keeps documentation aligned with code and workflow changes. |

### bluetemberg-agents-frontend-specialist

Frontend specialist agent for Bluetemberg — UI implementation, design-system, i18n, accessibility.

| Agent | Description |
| ----- | ----------- |
| `frontend-specialist` | Implements and refactors frontend UI with reusable, accessible, and testable patterns. |

### bluetemberg-agents-infrastructure-specialist

Infrastructure specialist agent for Bluetemberg — build, CI, container, deployment config.

| Agent | Description |
| ----- | ----------- |
| `infrastructure-specialist` | Maintains build, CI, container, and deployment configuration. |

### bluetemberg-agents-kubernetes-specialist

Kubernetes specialist agent for Bluetemberg — manifests, Helm charts, Kustomize overlays.

| Agent | Description |
| ----- | ----------- |
| `kubernetes-specialist` | Writes and reviews Kubernetes manifests, Helm charts, and Kustomize overlays for secure, production-grade deployments. |

### bluetemberg-agents-security-specialist

Security specialist agent for Bluetemberg — vulnerability audit, dependency scanning, secrets.

| Agent | Description |
| ----- | ----------- |
| `security-specialist` | Audits code for security vulnerabilities, secrets exposure, and dependency risks. |

### bluetemberg-agents-sre-specialist

SRE specialist agent for Bluetemberg — SLOs, alerting, runbooks, and post-mortems.

| Agent | Description |
| ----- | ----------- |
| `sre-specialist` | Designs SLOs, alerts, on-call runbooks, and reliability improvements for production services. |

### bluetemberg-agents-test-specialist

Test specialist agent for Bluetemberg — test creation, refactoring, and stabilization.

| Agent | Description |
| ----- | ----------- |
| `test-specialist` | Creates, refactors, and stabilizes automated tests with deterministic patterns. |

## Skills

On-demand workflows triggered by slash commands.

### bluetemberg-skills-api-design

API design skill for Bluetemberg — RESTful conventions, pagination, versioning.

| Skill | Description |
| ----- | ----------- |
| `api-design` | Apply RESTful API design conventions for endpoints, pagination, versioning, and error contracts. |

### bluetemberg-skills-ci-cd-best-practices

CI/CD best practices skill for Bluetemberg — pipeline optimization and caching strategies.

| Skill | Description |
| ----- | ----------- |
| `ci-cd-best-practices` | Optimize CI/CD pipeline configuration for speed, reliability, and caching. |

### bluetemberg-skills-code-review

Code review skill for Bluetemberg — structured review checklist for PRs.

| Skill | Description |
| ----- | ----------- |
| `code-review` | Structured code review — intent-first, diff-focused, severity-tiered findings with actionable fix suggestions. |

### bluetemberg-skills-config-echo

Config echo skill for Bluetemberg — verifies that synced configuration was actually loaded by the LLM.

| Skill | Description |
| ----- | ----------- |
| `config-echo` | Verify that bluetemberg configuration was actually loaded by the LLM — recall rules, agents, and skills from session context and cross-reference against disk. |

### bluetemberg-skills-create-skill

Meta-skill for scaffolding new bluetemberg skills — frontmatter, five required sections, and sync.

| Skill | Description |
| ----- | ----------- |
| `create-skill` | Scaffold a new bluetemberg skill in the correct format — frontmatter, five required sections, and sync. |

### bluetemberg-skills-docs-upkeep

Docs upkeep skill for Bluetemberg — keep docs aligned with implementation changes.

| Skill | Description |
| ----- | ----------- |
| `docs-upkeep` | Keep canonical documentation aligned with implementation and workflow changes in the same task. |

### bluetemberg-skills-infrastructure-drift-check

Infrastructure drift check skill for Bluetemberg — verify IaC state matches deployed state.

| Skill | Description |
| ----- | ----------- |
| `infrastructure-drift-check` | Verify that declared infrastructure state matches deployed state before merging IaC changes. |

### bluetemberg-skills-migration-safety

Migration safety skill for Bluetemberg — database migration review and rollback plans.

| Skill | Description |
| ----- | ----------- |
| `migration-safety` | Review database migrations for safety, rollback capability, and zero-downtime compatibility. |

### bluetemberg-skills-patterns

Patterns skill for Bluetemberg — apply reusable architecture and coding patterns.

| Skill | Description |
| ----- | ----------- |
| `patterns` | Apply reusable architecture and coding patterns from project standards when implementing features or reviewing structure. |

### bluetemberg-skills-react-patterns

React patterns skill for Bluetemberg — component composition, hook extraction, state co-location.

| Skill | Description |
| ----- | ----------- |
| `react-patterns` | Apply React component patterns — composition, co-location, and hook extraction — before reaching for custom solutions. |

### bluetemberg-skills-rollback-plan

Rollback plan skill for Bluetemberg — require tested rollback steps for every production change.

| Skill | Description |
| ----- | ----------- |
| `rollback-plan` | Require an explicit rollback plan for every infrastructure or deployment change before merge. |

### bluetemberg-skills-security-audit

Security audit skill for Bluetemberg — dependency audit, secrets scan, OWASP patterns.

| Skill | Description |
| ----- | ----------- |
| `security-audit` | Run a security audit checklist against code changes for secrets, injection, and dependency risks. |

### bluetemberg-skills-stack-change-review

Stack change review skill for Bluetemberg — high-blast-radius infrastructure change review.

| Skill | Description |
| ----- | ----------- |
| `stack-change-review` | Review high-blast-radius infrastructure changes for safety before merge. |

### bluetemberg-skills-sub-agent-design

Sub-agent design skill for Bluetemberg — plan, scope, and implement sub-agent architectures.

| Skill | Description |
| ----- | ----------- |
| `sub-agent-design` | Design a sub-agent system — scope responsibilities, define communication contracts, wire orchestration, and add integration tests. |

### bluetemberg-skills-workspace-hygiene

Workspace hygiene skill for Bluetemberg — clean workspace state during edits.

| Skill | Description |
| ----- | ----------- |
| `workspace-hygiene` | On-demand workspace audit — review change scope, clean temp artifacts, verify commit focus. |

## Guardrails

Hook-based constraints that fire automatically during AI operations.

### bluetemberg-guardrails-git

Git guardrails for Bluetemberg — enforce conventional branch names on AI-created worktrees.

| Guardrail | Description |
| --------- | ----------- |
| `conventional-branch-names` | Enforce conventional branch names before creating a worktree |

## Overriding a rule

Every rule is a self-contained Markdown file. To change one for your project without forking the pack,
create a file with the **same name** in your local `llm/rules/` — it takes priority over the pack version
during sync. See [Usage](Usage#overrides) for the full priority order.
