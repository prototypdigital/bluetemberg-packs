---
description: Enforce conventional branch names before creating a worktree
trigger: EnterWorktree
hook_type: PreToolUse
check:
  field: name
  not_empty: true
  not_matches: '^claude/'
message: 'EnterWorktree requires a conventional branch name. Call EnterWorktree again with name="type/description" (e.g. feat/my-feature). Ask the user what the branch should be called if unclear. Types: feat fix chore refactor docs test'
profiles:
  - frontend
  - backend
  - fullstack
  - devops
  - pure-infra
---

# Conventional Branch Names

Blocks AI tools from creating worktrees with auto-generated names (e.g. `claude/some-name`).
Requires a branch name in `type/description` format before the worktree is created.

## Why a guardrail, not a rule

This is **deterministic enforcement**, not a prose convention an agent is asked to
remember. A rule lives in context and degrades — it can be summarized away, deprioritized,
or simply not recalled at the moment a branch is named. This guardrail runs as a
`PreToolUse` hook, so the `type/description` shape is enforced on every attempt, the same
way each time, regardless of what the model believes it should do.

## Deny-by-default

The check allows only the known-good conventional shape and rejects everything else:

- The `name` field must be present and non-empty (`not_empty: true`).
- The auto-generated `claude/` prefix is explicitly rejected (`not_matches: '^claude/'`),
  which is the failure mode this guardrail exists to catch.

Anything that is not a confirmed conventional name does not get a pass — the worktree is
not created until the caller supplies a valid `type/description` name.

## Fail-closed intent

When a conventional branch name cannot be confirmed, the hook **denies**. It does not fall
through to "allow on doubt": an empty, missing, or auto-generated name is treated as a
block, not as a benign default. Failing closed keeps unreviewed, auto-named branches out of
the worktree set even if the caller omits or mis-shapes the `name`.

## Scope

The matcher is narrowly scoped to the worktree-create event only:

- `trigger: EnterWorktree` — the check fires solely on the `EnterWorktree` tool call.
- `hook_type: PreToolUse` — it runs before the worktree is created, so a rejected name
  never produces a worktree.

No other tool, event, or branch operation is intercepted.

## Block message

On denial the hook returns its `message` to the model. The message is model-directed and
actionable: it states what was rejected (a non-conventional / auto-generated branch name),
why (`EnterWorktree` requires a conventional branch name), and the exact next action — call
`EnterWorktree` again with `name="type/description"` (e.g. `feat/my-feature`), asking the
user if the intended name is unclear, choosing from the types `feat fix chore refactor docs
test`.
