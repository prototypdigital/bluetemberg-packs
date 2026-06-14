---
name: create-agent
description: Scaffold a new bluetemberg agent in the correct format — frontmatter with scoped tools, responsibilities, constraints, and sync.
---

# create-agent

Use this skill when asked to add, create, or write a new specialist agent (subagent) for the project.

## Triggers

- "add an agent that..."
- "create a specialist for..."
- "we need a subagent to review / audit / generate ..."
- Any request to define a focused, delegatable role with its own tool access

## Required behavior

1. The agent MUST confirm an agent is the right primitive. Use an **agent** for a focused role that is *delegated to* with a narrowed toolset (review, audit, test authoring, a domain specialist). Use a **skill** for an invokable workflow the main agent runs itself, and a **rule** for always-on passive guidance. If the request is really a workflow or a standard, stop and use `create-skill` / `create-rule`.

2. The agent MUST check `llm/agents/` for an existing agent with overlapping responsibility before creating anything. If one exists, report it and prefer extending it.

3. The agent MUST gather the following — if any is unclear, ask:
   - **name**: kebab-case identifier matching the role (e.g. `code-reviewer`, `security-specialist`)
   - **description**: one sentence describing what the agent does and when to delegate to it (this drives automatic delegation, so make the trigger context explicit)
   - **tools**: the minimal tool set the role needs, as a string array (e.g. `["read", "search"]` for a reviewer; add `"edit"` only if it must modify files, `"execute"` only if it must run commands). Default to least privilege — never grant `edit`/`execute` to a read-only role.
   - **profiles**: which team profiles this agent serves (`frontend`, `backend`, `fullstack`, `devops`, `pure-infra`, `agentic`); omit the field entirely if universal

4. The agent MUST create the file at exactly `llm/agents/{name}.md` — never any other path or filename.

5. The agent MUST write frontmatter with `name`, `description`, and `tools`, then a body with these sections:

   **`# Title` + one-line role statement** — "You are a {role}. Your job is to {focused mandate}."

   **`## Responsibilities`** — the concrete things this agent does, as a list. Keep it to a single coherent role; a list spanning unrelated domains means it should be two agents.

   **`## Constraints`** — the guardrails: what it must NOT do, where it defers (e.g. "defer formatting to automated tools"), and any hard prohibitions (e.g. "never approve changes with known security vulnerabilities"). Least-privilege intent stated here should match the `tools` array.

6. The agent MUST keep tool grants minimal and consistent with the constraints — an agent described as read-only MUST NOT list `edit` or `execute` in `tools`.

7. The agent MUST run `npm run sync:llm-config` (or the project's documented sync command) after writing the file, so the agent propagates to all platform directories (`.claude/agents/`, `.cursor/agents/`, `.github/agents/`). Do not report the agent as created until sync succeeds.

8. The agent MUST NOT bundle multiple unrelated roles into one agent — split them.

## Agent template

```markdown
---
name: {kebab-case-name}
description: {What it does and when to delegate to it.}
tools: ["read", "search"]
profiles:           # omit this block entirely if universal
  - backend
---

# {Title}

You are a {role}. Your job is to {focused mandate}.

## Responsibilities

- {Concrete responsibility}
- {Concrete responsibility}

## Constraints

- {What it must not do / where it defers}
- {Hard prohibition}
```

## Examples

- "Add an agent that reviews PRs for quality and bugs" → creates `llm/agents/code-reviewer.md` with `tools: ["read", "search"]`, responsibilities covering logic/edge-cases/naming/tests, constraints deferring style to tooling
- "Create a security specialist subagent" → creates `llm/agents/security-specialist.md` with `["read", "search"]` (read-only audit), `backend`+`fullstack`+`devops` profiles, a hard prohibition on approving known vulnerabilities

## When NOT to use

- The need is an always-on standard (use `create-rule`) or an invokable workflow the main agent runs itself (use `create-skill`)
- An agent with overlapping responsibility already exists in `llm/agents/` — extend it
- The request is to install an official pack, not author a custom local agent
