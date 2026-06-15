---
description: Branch protection, branch naming, and PR workflow rules.
scope: "**"
---

# Git workflow

## Branch protection

Never push commits directly to `main` or `master`. All changes must go through a pull request.

## Branch naming

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

- Always open PRs against the main branch (`main` or `master`).
- Before raising a PR, rebase the branch on top of the latest origin:

  ```bash
  git fetch origin
  git rebase origin/main
  ```

- Resolve any conflicts during the rebase before pushing.
- Force-push the rebased branch to update the remote: `git push --force-with-lease`.
- PR titles must follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description`.

## Examples

```sh
# BAD — pushing directly to main; bad branch name; non-conventional PR title
git checkout main
git commit -m "fixed login"
git push origin main

# GOOD — feature branch with conventional name; rebased before PR
git checkout -b fix/login-redirect
git commit -m "fix(auth): redirect to /dashboard after login"
git fetch origin && git rebase origin/main
git push --force-with-lease origin fix/login-redirect
# PR title: fix(auth): redirect to /dashboard after login
```
