---
description: Branch protection, branch naming, and PR workflow rules.
scope: "**"
---

# Git workflow

## Branch protection

**Why:** Direct pushes to `main`/`master` skip review and CI, so untested or breaking changes reach the shared branch and can't be reverted cleanly.

Never push commits directly to `main` or `master`; open a pull request for every change. This is a non-negotiable invariant — enforce it with a branch-protection rule on the host (GitHub/GitLab) or a pre-push hook, not prose alone.

## Branch naming

**Why:** A consistent `type/` prefix lets tooling and reviewers infer the change's intent and group branches; ad-hoc names break that.

Branch names must follow the conventional commit type as a prefix:

```text
type/short-description
```

Common types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`.

Examples:

- `feat/new-feature`
- `fix/login-redirect`
- `chore/update-dependencies`
- `docs/contributing-guide`

Never push fixes or additions directly onto another open PR's branch. Always open a new branch and a new PR.

## Pull requests

**Why:** Rebasing before the PR keeps history linear and surfaces conflicts locally instead of in the merge, and conventional titles drive changelog and release automation.

- Always open PRs against the main branch (`main` or `master`).
- Before raising a PR, rebase the branch on top of the latest origin:

  ```bash
  git fetch origin
  git rebase origin/main
  ```

- Resolve any conflicts during the rebase before pushing.
- Force-push the rebased branch to update the remote: `git push --force-with-lease`.
- PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`. A tracker task-ID prefix (`[PROJ-123] type(scope): description`) is fine on a merge-commit repo, where the title never becomes a commit subject. On a squash-merge repo the title *is* the commit subject, so put the ID at the end there.

## Commit messages

**Why:** release-please (and any Conventional Commits parser) builds releases from the non-merge commit subjects on the default branch, and silently drops a subject that does not start with `type(scope):`. The workflow stays green. Copying a `[PROJ-123]`-prefixed PR title into commit messages has kept whole releases' worth of changes out of the changelog this way.

- Every commit subject is a Conventional Commit: `type(scope): description`.
- A commit message carries **no task ID** — not as a prefix, not in the body. The PR title carries it, and the merge commit (or squash subject) keeps it in history.
- Enforce it in CI, not prose alone: check each non-merge commit in the PR range (`git log --no-merges origin/main..HEAD`) against `^(feat|fix|perf|refactor|docs|chore|ci|build|test|style|revert)(\([^()]+\))?!?: \S`. A PR-title check does **not** cover this on a merge-commit repo — the branch commits are what reach `main`. The `bluetemberg-guardrails-git` pack blocks the agent-side case.

## Examples

```sh
# BAD — pushing directly to main; task ID in the commit subject
git checkout main
git commit -m "[PROJ-42] fix(auth): fixed login"   # task ID in the commit — release-please drops it
git push origin main

# GOOD — feature branch with conventional name; rebased before PR
git checkout -b fix/login-redirect
git commit -m "fix(auth): redirect to /dashboard after login"
git fetch origin && git rebase origin/main
git push --force-with-lease origin fix/login-redirect
# PR title: [PROJ-42] fix(auth): redirect to /dashboard after login
```
