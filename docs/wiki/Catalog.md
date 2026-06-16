# Catalog

Every official pack — rules, agents, skills, and guardrails — and the items it contains.
Item names match filenames in each pack's `llm/<kind>/` directory and are used for local overrides.

## Rules

Always-on instructions loaded into every AI session automatically.

### bluetemberg-rules-accessibility

Accessibility rules for Bluetemberg — WCAG 2.2 A/AA guidance for semantic HTML, ARIA, keyboard navigation, and more.

| Rule | Enforces |
| ---- | -------- |
| `accessible-forms` | Every form control must have a programmatic label, clear error identification, and grouped fields where appropriate |
| `aria-only-when-needed` | ARIA is a fallback for when native HTML falls short — never add redundant or conflicting roles |
| `color-contrast` | Meet WCAG 2.2 AA contrast ratios; never use color as the only visual signal |
| `focus-management` | Provide visible focus indicators; move focus intentionally on route change and dialog open/close |
| `keyboard-navigation` | All interactive elements must be reachable and operable by keyboard alone; no keyboard traps |
| `reduced-motion` | Honor prefers-reduced-motion; never use motion as the sole affordance for a state change |
| `semantic-html` | Prefer native HTML elements over div+role soup; semantic elements are accessible by default |
| `text-alternatives` | Provide descriptive alt text for meaningful images; empty alt for decorative; alternatives for icons and media |

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
| `context-positioning` | Place load-bearing content at the edges of the context, not the middle — models access the start and end far better than the middle. |
| `context-window-budget` | Manage context window budget explicitly — prune stale content, compress retrieved data, never let context grow unbounded. |
| `multi-turn-context-hygiene` | Don't keep talking to a derailed conversation — consolidate the requirements and restart fresh. Multi-turn degradation is large and doesn't self-correct. |
| `multi-turn-state-management` | Manage state across multi-turn interactions — track what was decided, what changed, and what is still open. |
| `prompt-structure` | Structure prompts into labeled, delimited sections — separate instructions from data, and keep persistent rules in the system message. |

### bluetemberg-rules-design-craft

Anti-stock design-craft principles for building UI with AI — banned moves, real references, tokens-first, every state.

| Rule | Enforces |
| ---- | -------- |
| `anti-stock-defaults` | Decide the visual direction before prompting; AI averages toward stock UI, so name what you want and refuse the safe default. |
| `banned-moves-first` | Keep a concrete banned-moves list and apply it to every UI build; closing off easy defaults forces something more intentional out. |
| `design-every-state` | Design and build every screen state — empty, loading, error, success — with real content, never just the default with lorem ipsum. |
| `references-not-moods` | Anchor visual direction to specific named references, not adjectives; concrete coordinates beat moods the model will average away. |
| `tokens-before-components` | Lock the visual system (palette, type, spacing) as tokens before building UI, and re-state them every refinement to prevent token drift. |

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

### bluetemberg-rules-llm-api-product

LLM API and product-engineering rules for Bluetemberg — streaming, cost accounting, and cost-aware model selection.

| Rule | Enforces |
| ---- | -------- |
| `cost-accounting` | Measure LLM cost from the authoritative usage object and the provider's cost API — never from your own token estimates. |
| `model-selection-and-routing` | Pick models on the accuracy-vs-cost frontier and route easy queries to cheaper models — the most expensive model is rarely the right default. |
| `streaming` | Stream for perceived latency, but buffer tool-call JSON until the block closes and don't gate safety on partial output. |

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
| `llm-package-hallucination` | Verify every LLM-suggested dependency exists in the registry before installing — hallucinated package names are a real supply-chain attack surface (slopsquatting). |
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
| `a11y-specialist` | Audits WCAG 2.2 A/AA accessibility — semantic HTML, keyboard, focus, contrast, alt text — and reports prioritized fixes. Use proactively for UI components, forms, dialogs, screen-reader review. |

### bluetemberg-agents-agentic-specialist

Agentic systems specialist agent for Bluetemberg — agent memory design, state management, orchestration patterns.

| Agent | Description |
| ----- | ----------- |
| `agentic-specialist` | Designs and implements agentic memory, state machines, sub-agent orchestration, and tool-use contracts. Use proactively when building agent loops, persistent memory, handoffs, or tool-call recovery. |

### bluetemberg-agents-ansible-specialist

Ansible specialist agent for Bluetemberg — roles, playbooks, and Jinja2 templates.

| Agent | Description |
| ----- | ----------- |
| `ansible-specialist` | Writes, reviews, and lints Ansible roles, playbooks, and Jinja2 templates for idempotent infra automation. Use proactively when editing anything under roles/, playbooks, ansible.cfg, or inventory. |

### bluetemberg-agents-backend-specialist

Backend specialist agent for Bluetemberg — API design, database patterns, error handling, auth.

| Agent | Description |
| ----- | ----------- |
| `backend-specialist` | Builds server-side services — REST/GraphQL APIs, database access, auth flows (JWT, RBAC, OAuth/PKCE). Use proactively for API contracts, DB layers, or server auth. Not CMS schemas or security audits. |

### bluetemberg-agents-code-reviewer

Code reviewer agent for Bluetemberg — PR review covering patterns, naming, complexity, tests.

| Agent | Description |
| ----- | ----------- |
| `code-reviewer` | Reviews diffs and pull requests for correctness bugs, edge cases, naming, test coverage, and maintainability. Use proactively after code changes. For deep security audits route to security-specialist. |

### bluetemberg-agents-design-engineer

Design engineer agent for Bluetemberg — builds UI to a reference section-by-section, holds tokens and banned moves, catches stock drift.

| Agent | Description |
| ----- | ----------- |
| `design-engineer` | Builds UI from a Figma comp, screenshot, or visual direction section-by-section, holding design tokens and banned moves. Use when turning a design reference into distinct UI or catching stock drift. |

### bluetemberg-agents-devops-specialist

DevOps specialist agent for Bluetemberg — CI/CD pipelines, container optimization, IaC review.

| Agent | Description |
| ----- | ----------- |
| `devops-specialist` | Designs and optimizes CI/CD pipelines, Docker images, Terraform IaC, deploy safety, and shell scripts. Use proactively when editing .github/workflows, Dockerfile, terraform/, or Makefile. |

### bluetemberg-agents-docs-maintainer

Docs maintainer agent for Bluetemberg — documentation synchronization with code changes.

| Agent | Description |
| ----- | ----------- |
| `docs-maintainer` | Updates and audits documentation (README, runbooks, API docs, Mermaid diagrams) to match code, config, and workflow changes. Use proactively after behavior, CLI, API, or schema changes. |

### bluetemberg-agents-frontend-specialist

Frontend specialist agent for Bluetemberg — UI implementation, design-system, i18n, accessibility.

| Agent | Description |
| ----- | ----------- |
| `frontend-specialist` | Implements and refactors React/Next.js UI — components, state, hooks, SSR/hydration, performance, accessibility. Use proactively when building or changing TSX/JSX UI, not for review or backend work. |

### bluetemberg-agents-infrastructure-specialist

Infrastructure specialist agent for Bluetemberg — build, CI, container, deployment config.

| Agent | Description |
| ----- | ----------- |
| `infrastructure-specialist` | Maintains build tooling, Dockerfiles, Compose, and dependency manifests/lockfiles for reproducible, secure builds. Use proactively when editing Dockerfile, docker-compose, package.json, or lockfiles. |

### bluetemberg-agents-kubernetes-specialist

Kubernetes specialist agent for Bluetemberg — manifests, Helm charts, Kustomize overlays.

| Agent | Description |
| ----- | ----------- |
| `kubernetes-specialist` | Writes and reviews Kubernetes manifests, Helm charts, Kustomize overlays — RBAC, probes, resources, security contexts, autoscaling, zero-downtime rollouts. Use proactively when editing k8s YAML. |

### bluetemberg-agents-security-specialist

Security specialist agent for Bluetemberg — vulnerability audit, dependency scanning, secrets.

| Agent | Description |
| ----- | ----------- |
| `security-specialist` | Audits code for OWASP Top 10 vulns, injection, broken auth/access control, secrets exposure, and dependency/supply-chain CVEs. MUST BE USED for deep security review. Reports findings, does not edit. |

### bluetemberg-agents-sre-specialist

SRE specialist agent for Bluetemberg — SLOs, alerting, runbooks, and post-mortems.

| Agent | Description |
| ----- | ----------- |
| `sre-specialist` | Reviews production reliability — SLOs, SLIs, error budgets, alerts, runbooks, post-mortems. Use proactively for on-call, observability, or incident-readiness review, not code or security audits. |

### bluetemberg-agents-test-specialist

Test specialist agent for Bluetemberg — test creation, refactoring, and stabilization.

| Agent | Description |
| ----- | ----------- |
| `test-specialist` | Writes, refactors, and stabilizes unit/integration/e2e tests, fixes flaky/non-deterministic tests, applies fakes and data builders. Use proactively when adding tests or diagnosing flakiness. |

## Skills

On-demand workflows triggered by slash commands.

### bluetemberg-skills-api-design

API design skill for Bluetemberg — RESTful conventions, pagination, versioning.

| Skill | Description |
| ----- | ----------- |
| `api-design` | Designs and reviews RESTful HTTP API endpoints — resource naming, pagination, error contracts, versioning. Use when creating an endpoint, reviewing an API contract, or vetting a breaking change. |

### bluetemberg-skills-ci-cd-best-practices

CI/CD best practices skill for Bluetemberg — pipeline optimization and caching strategies.

| Skill | Description |
| ----- | ----------- |
| `ci-cd-best-practices` | Audits CI/CD pipeline config (GitHub Actions, GitLab CI) for SHA pinning, dep caching, deploy gates, parallelism, OIDC. Use when adding or editing workflow files or fixing slow/flaky pipelines. |

### bluetemberg-skills-code-review

Code review skill for Bluetemberg — structured review checklist for PRs.

| Skill | Description |
| ----- | ----------- |
| `code-review` | Reviews a pull request or code diff before merge — establishes intent, reviews changed lines, reports severity-tiered findings with fixes. Use for PR review or pre-PR self-review. |

### bluetemberg-skills-config-echo

Config echo skill for Bluetemberg — verifies that synced configuration was actually loaded by the LLM.

| Skill | Description |
| ----- | ----------- |
| `config-echo` | Verifies bluetemberg config (rules, agents, skills) is loaded in the session by recalling from context and cross-referencing disk. Use after `bluetemberg sync` or when a rule seems ignored. |

### bluetemberg-skills-create-agent

Meta-skill for scaffolding new bluetemberg agents — frontmatter, scoped tools, responsibilities and constraints, and sync.

| Skill | Description |
| ----- | ----------- |
| `create-agent` | Scaffold a new bluetemberg agent in the correct format — frontmatter with scoped tools, responsibilities, constraints, and sync. |

### bluetemberg-skills-create-pack

Meta-skill for scaffolding a whole new bluetemberg pack — package.json metadata, llm/ layout, catalog registration, and validation.

| Skill | Description |
| ----- | ----------- |
| `create-pack` | Scaffold a whole new bluetemberg pack — package.json metadata, llm/ layout, catalog registration, and validation. |

### bluetemberg-skills-create-rule

Meta-skill for scaffolding new bluetemberg rules — frontmatter, the Why/Rules/BAD-GOOD/config/gotchas structure, and sync.

| Skill | Description |
| ----- | ----------- |
| `create-rule` | Scaffold a new bluetemberg rule in the correct format — frontmatter, a Why/Rules/BAD-GOOD/config/gotchas body, and sync. |

### bluetemberg-skills-create-skill

Meta-skill for scaffolding new bluetemberg skills — frontmatter, five required sections, and sync.

| Skill | Description |
| ----- | ----------- |
| `create-skill` | Scaffold a new bluetemberg skill to the deep-skill standard — Protocol, decision trees, BAD/GOOD examples, and a completion checklist. |

### bluetemberg-skills-design-critique

Design critique skill for Bluetemberg — multi-lens review, hostile QA, and an impact-ranked fix list for built UI.

| Skill | Description |
| ----- | ----------- |
| `design-critique` | Critiques built UI across accessibility, hierarchy, copy, consistency, and device lenses, runs hostile QA, and returns an impact-ranked fix list. Use before shipping a view or when it feels off. |

### bluetemberg-skills-docs-upkeep

Docs upkeep skill for Bluetemberg — keep docs aligned with implementation changes.

| Skill | Description |
| ----- | ----------- |
| `docs-upkeep` | Updates affected docs in the same task as code or workflow changes — README, API docs, CLI --help, config, wiki. Use when renaming endpoints, adding flags/config, or fixing stale references. |

### bluetemberg-skills-figma-to-code

Figma-to-code skill for Bluetemberg — the section-by-section design-to-code loop with prompt stacking, drift checks, and surgical refinement.

| Skill | Description |
| ----- | ----------- |
| `figma-to-code` | Translates a Figma comp, screenshot, or mockup into working UI/HTML/CSS code section-by-section. Use when building UI from a design reference or when generated UI drifts from the comp. |

### bluetemberg-skills-infrastructure-drift-check

Infrastructure drift check skill for Bluetemberg — verify IaC state matches deployed state.

| Skill | Description |
| ----- | ----------- |
| `infrastructure-drift-check` | Detects infrastructure drift before merging IaC changes by diffing declared vs deployed state. Use when reviewing or merging Terraform .tf, Ansible, Kubernetes manifests, Helm, or Compose PRs. |

### bluetemberg-skills-migration-safety

Migration safety skill for Bluetemberg — database migration review and rollback plans.

| Skill | Description |
| ----- | ----------- |
| `migration-safety` | Reviews or writes database schema migrations against a zero-downtime checklist — destructive ops, lock analysis, batching, rollback path. Use when creating or reviewing a migration pre-deploy. |

### bluetemberg-skills-patterns

Patterns skill for Bluetemberg — apply reusable architecture and coding patterns.

| Skill | Description |
| ----- | ----------- |
| `patterns` | Finds and reuses an existing codebase pattern instead of inventing new structure. Use when adding files or abstractions, reviewing folder structure, naming, or module boundaries, or refactoring. |

### bluetemberg-skills-react-patterns

React patterns skill for Bluetemberg — component composition, hook extraction, state co-location.

| Skill | Description |
| ----- | ----------- |
| `react-patterns` | Apply React composition, co-location, hook extraction, and state-placement patterns when writing or reviewing components, hooks, or state. Fixes prop drilling and logic tangled in JSX. |

### bluetemberg-skills-rollback-plan

Rollback plan skill for Bluetemberg — require tested rollback steps for every production change.

| Skill | Description |
| ----- | ----------- |
| `rollback-plan` | Require and validate a tested rollback plan before merging production deploy, Kubernetes/Terraform, schema-migration, or version-bump PRs. Adds a complexity tier tree, data-loss check, PR template. |

### bluetemberg-skills-security-audit

Security audit skill for Bluetemberg — dependency audit, secrets scan, OWASP patterns.

| Skill | Description |
| ----- | ----------- |
| `security-audit` | Triages code security findings by severity with detection steps for secrets, injection, auth, input, and dependency risks. Use when reviewing changes pre-deploy or touching auth, input, or uploads. |

### bluetemberg-skills-stack-change-review

Stack change review skill for Bluetemberg — high-blast-radius infrastructure change review.

| Skill | Description |
| ----- | ----------- |
| `stack-change-review` | Reviews high-blast-radius infra diffs (docker-compose, Ansible group_vars, Terraform, k8s, .env) — port, volume, image, and env risks. Use when reviewing changes to deployed infrastructure. |

### bluetemberg-skills-sub-agent-design

Sub-agent design skill for Bluetemberg — plan, scope, and implement sub-agent architectures.

| Skill | Description |
| ----- | ----------- |
| `sub-agent-design` | Design a multi-agent system — scope responsibilities, define typed input/output contracts, wire orchestration, add tests. Use when one agent is overloaded or work has parallelizable phases. |

### bluetemberg-skills-visual-direction

Visual direction skill for Bluetemberg — explore distinct directions, lock one, and produce a banned-moves list and Design System Document.

| Skill | Description |
| ----- | ----------- |
| `visual-direction` | Locks a visual direction before a UI build by exploring 3 options, picking one, writing a banned-moves list + Design System Document. Use when UI keeps coming out generic or before a handoff. |

### bluetemberg-skills-workspace-hygiene

Workspace hygiene skill for Bluetemberg — clean workspace state during edits.

| Skill | Description |
| ----- | ----------- |
| `workspace-hygiene` | Audits the workspace before a commit or PR — confirms diff scope, flags stray console.log/debugger/scratch files and secrets, checks atomic commits. Use after a refactor or before opening a PR. |

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
