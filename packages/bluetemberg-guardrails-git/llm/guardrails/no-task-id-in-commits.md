---
description: Block a git commit whose message starts with a tracker task ID like [PROJ-123]
trigger: Bash
hook_type: PreToolUse
check:
  field: tool_input.command
  not_matches: 'git[[:space:]]+commit[^|;&]*(-[A-Za-z]*m|--message)[=[:space:]]*["'']?\[[A-Za-z]+-[0-9]+\]|git[[:space:]]+commit[^|;&]*<<-?[[:space:]]*["'']?[A-Za-z_]+["'']?[[:space:]]+\[[A-Za-z]+-[0-9]+\]'
message: 'Commit message starts with a task ID (e.g. [PROJ-123]). release-please drops any commit subject that does not start with type(scope):, so this change would silently miss the release. Re-run git commit with a plain Conventional Commit subject, e.g. "fix(forms): forward address lines". The task ID belongs in the PR title only.'
profiles:
  - frontend
  - backend
  - fullstack
  - devops
  - pure-infra
---

# No task ID in commit subjects

Blocks AI tools from running `git commit` with a message whose subject starts with a
tracker task ID — `[MGNEXT-2462] fix(forms): …`. The ID belongs in the PR title.

## Why a guardrail, not a rule

release-please builds each release from the non-merge commit subjects on the default
branch, and drops any subject that does not start with `type(scope):`. The drop is
silent: the workflow stays green and logs `commit could not be parsed`. On 2026-10-07
this had kept every change since a 1.4.0 release out of the next one, and left most of
another repo's changelog empty — because agents copied the `[PROJ-N]`-prefixed PR title
into each commit message. A rule asking the model not to do that is exactly what failed;
this check runs on every `git commit` the agent issues, the same way each time.

The `bluetemberg-rules-git` `git-workflow` rule carries the full convention (and the CI
check a repo should add for commits made outside an agent).

## What it matches

The `not_matches` pattern fires on a `git commit` command (not a later `|`, `;` or `&`
segment) where the first line of the message is a `[LETTERS-DIGITS]` ID:

- `-m` / `-am` / `--message=` followed by the ID, quoted or not;
- a heredoc message — `-m "$(cat <<'EOF'` or `-F - <<EOF` — whose first line is the ID.

It does **not** fire on an ID later in the subject or in the body, on `gh pr create
--title "[PROJ-1] …"` (PR titles are where the ID belongs), or on any non-commit command.

## Fail-closed intent

The match is the violation: a commit that matches is denied with exit 2, and a regex that
fails to compile also denies (bluetemberg's hook script treats bash status 2 as a block).
The pattern was tested through that script against every shape above, both directions.

## Scope

`trigger: Bash`, `hook_type: PreToolUse` — it reads only `tool_input.command` of a Bash
call, before it runs. No other tool or event is intercepted.

## Block message

States what was rejected (a commit message led by a task ID), why (release-please silently
drops the commit), and the exact next action: re-run `git commit` with a plain
Conventional Commit subject and keep the ID in the PR title.
