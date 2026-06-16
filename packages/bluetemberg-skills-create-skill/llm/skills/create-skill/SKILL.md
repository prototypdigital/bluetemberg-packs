---
name: create-skill
description: Scaffold a new bluetemberg skill to the deep-skill standard — a step-by-step Protocol with decision trees, BAD/GOOD examples, and a completion checklist.
---

# create-skill

Use this skill when asked to add, create, or write a new skill for the project.

## Triggers

- "add a skill that..."
- "create a skill for..."
- "write a skill to..."
- Any request to scaffold a new on-demand workflow for the AI tooling

## Required behavior

1. The agent MUST check `llm/skills/` for an existing skill with the same name or purpose before creating anything. If one exists, report it and stop.

2. The agent MUST gather the following before writing any file — if any is unclear from the request, ask:
   - **name**: kebab-case identifier matching the workflow (e.g. `api-design`, `migration-safety`)
   - **description**: one tight sentence — dash-separated clauses, imperative voice (mirror existing examples: *"Structured code review — intent-first, diff-focused…"*)
   - **profiles**: which team profiles apply (`frontend`, `backend`, `fullstack`, `devops`, `pure-infra`, `custom`); omit the field entirely if the skill is universal

3. The agent MUST create the file at exactly `llm/skills/{name}/SKILL.md` — never any other path or filename.

4. The agent MUST author the skill to the **deep-skill standard** — a procedure the model can execute, not a restatement of what a base model already knows. Benchmark against `figma-to-code`, `config-echo`, and `create-pack`. Include these sections in order:

   **Opening line** — `Use this skill when [trigger context].`

   **`## Triggers`** — concrete invocation conditions (phrases, verbs, or measurable thresholds), not vague category names; at least two.

   **`## Protocol`** — the ordered steps the model actually follows, written as numbered `### Step N — …`. This replaces a flat MUST/SHOULD list. It MUST contain:
   - at least one **decision tree** wherever a branch matters (input → which path), with no dead ends;
   - at least one **BAD/GOOD example** with concrete code, commands, or output — the wrong form next to the corrected one. (A pure ordered diagnostic like `config-echo` MAY substitute exact commands/templates for a BAD/GOOD pair, but it must still be concrete, not abstract.)
   - RFC 2119 keywords (MUST/SHOULD/MAY) used inside a step only where authority genuinely varies.

   **`## Completion checklist`** — tick-off criteria the model can verify (`- [ ] …`), not vague quality statements.

   **`## When NOT to use`** — at least one concrete exclusion that exits the skill, to prevent over-firing.

   Aim for ~60–120 lines of actionable content. If the draft restates generic best practice with no protocol, decision tree, or worked example, it is too thin — deepen it, because it adds nothing over the base model's defaults.

5. The agent MUST run `npm run sync:llm-config` after writing the file. This propagates the skill to all platform directories (`.claude/skills/`, `.cursor/skills/`, `.github/skills/`). Do not report the skill as created until sync succeeds.

6. The agent MUST NOT create a skill for behavior that belongs in a rule. Use a **rule** when the behavior is always-on and passive. Use a **skill** when it requires explicit invocation, judgment, or multiple coordinated steps.

## Skill template

````markdown
---
name: {kebab-case-name}
description: {One tight sentence — what it does and when.}
profiles:           # omit this block entirely if universal
  - frontend
---

# {name}

Use this skill when [trigger context].

## Triggers

- "trigger phrase one"
- {measurable condition, e.g. "a function exceeds 30 lines"}

## Protocol

### Step 1 — {imperative action}

{What the model does. Use a decision tree wherever a branch matters:}

```text
Does {condition} hold?
  YES → {path A}
  NO  → {path B}
```

### Step 2 — {imperative action}

```text
BAD:  {the wrong form — concrete code/command/output}
GOOD: {the corrected form}
```

## Completion checklist

- [ ] {verifiable criterion}
- [ ] {verifiable criterion}

## When NOT to use

- {Situation where this skill is the wrong tool or adds noise}
````

## Examples

- "Add a skill that audits API endpoints for REST conventions" → creates `llm/skills/api-design/SKILL.md` with `backend` + `fullstack` profiles, a Protocol whose steps walk naming → pagination → error contract → versioning (each with a decision tree or BAD/GOOD), and a completion checklist
- "Create a skill that checks database migrations before merge" → creates `llm/skills/migration-safety/SKILL.md` with `backend` + `fullstack` profiles, a Protocol with a lock-safety decision tree and a BAD/GOOD destructive-change example

## When NOT to use

- The behavior should fire on every interaction — write a rule in `llm/rules/` instead
- A skill covering the same workflow already exists in `llm/skills/`
- The request is to install an official pack, not author a custom local skill
