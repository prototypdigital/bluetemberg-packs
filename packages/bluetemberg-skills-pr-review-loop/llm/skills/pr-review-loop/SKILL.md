---
name: pr-review-loop
description: Wires automated comment-only PR reviews — a GitHub Actions backstop on every PR push plus a local hook that reviews PRs the moment an agent opens them. Use when setting up automated PR review.
---

# pr-review-loop

Use this skill when wiring automated PR reviews into a project: every opened or updated pull request gets a prompt, comment-only review from a headless agent, without a human having to ask for one.

The loop has two triggers that complement each other:

- **GitHub Actions backstop** — machine-independent; reviews every PR on open and on every new push, regardless of who (or what) created it.
- **Local PostToolUse hook** — instant; when an agent session runs `gh pr create`, a detached headless reviewer starts before the Actions runner has even booted.

Both triggers should drive the same reviewer behavior (the `pr-reviewer` agent, or an equivalent prompt) so authors get one consistent review voice.

## Triggers

- Setting up automated PR review for a repository
- An agent workflow that opens PRs and needs same-session review feedback
- Migrating ad-hoc "please review my PR" prompts into a standing loop

## Part 1 — GitHub Actions backstop

Create `.github/workflows/pr-review.yml`. This is the machine-independent half: it re-reviews on every push to the PR branch, catches PRs opened outside agent sessions, and needs no local setup.

```yaml
name: PR review

on:
  pull_request:
    types: [opened, synchronize]

concurrency:
  group: pr-review-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write
  issues: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          # Or API-key auth instead:
          # anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Review PR #${{ github.event.pull_request.number }} in
            ${{ github.repository }} and post the review on GitHub.

            1. Fetch context: gh pr view --json title,body,files and gh pr diff.
            2. Review intent-first and diff-focused, with severity-tiered
               findings using Conventional Comments labels
               (issue/warning/suggestion/nitpick/praise). Substance over style.
            3. Check existing PR comments first and do not duplicate anything
               already posted — on synchronize, only review what changed since
               the last review.
            4. Post exactly one summary via gh pr review --comment, plus inline
               comments via gh api repos/{owner}/{repo}/pulls/{n}/comments for
               line-specific findings.
            5. Comment only. Never approve, never request changes. End the
               summary with: "Automated review (pr-review-loop)".
          claude_args: |
            --allowedTools "Bash(gh pr view:*),Bash(gh pr diff:*),Bash(gh pr review:*),Bash(gh api:*),Read,Grep,Glob"
```

Auth setup, one of:

- `CLAUDE_CODE_OAUTH_TOKEN` — run `claude setup-token` locally and add the result as a repository secret (uses a Claude subscription).
- `ANTHROPIC_API_KEY` — add an API key as a repository secret and pass `anthropic_api_key` instead (pay-per-token).

The `concurrency` group cancels a stale in-flight review when a new push arrives, so a rapid push train produces one review of the final state instead of five overlapping ones.

## Part 2 — Local PostToolUse hook

The local half closes the latency gap: the reviewer starts the moment `gh pr create` succeeds inside an agent session. The canonical reference implementation is [prototypdigital/bluetemberg#226](https://github.com/prototypdigital/bluetemberg/pull/226) (`.claude/hooks/spawn-pr-review.sh` plus its `.claude/settings.json` entry) — copy it rather than reinventing it. The pattern:

1. **Match precisely.** A `PostToolUse` hook with matcher `Bash` reads the hook input from stdin and word-boundary-matches `gh pr create` in `tool_input.command`, so compound commands (`git push && gh pr create ...`) match but `echo "gh pr create"` lookalikes are the author's problem, not a trigger.
2. **Extract the PR URL** from the hook's `tool_response`, falling back to `gh pr view --json url` in the hook's `cwd`.
3. **Detach and exit 0 immediately.** `PostToolUse` hooks block the authoring session's turn — `nohup claude -p "<review prompt>" ... & disown`, then `exit 0`. The authoring session never waits on the review.
4. **Scope the reviewer's tools.** Pass `--allowedTools` limited to exactly what a reviewer needs: `Bash(gh pr view:*) Bash(gh pr diff:*) Bash(gh pr review:*) Bash(gh api:*) Read Grep Glob`. The reviewer must not be able to edit files or run `gh pr create` (which also removes any recursion risk).
5. **Degrade silently.** If `claude` is not installed or no PR URL can be found, exit 0 without complaint — the Actions backstop still covers the PR.

Register the hook in the project's committed `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "\"$CLAUDE_PROJECT_DIR\"/.claude/hooks/spawn-pr-review.sh",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

This wiring is manual for now: Bluetemberg packs cannot ship hooks by design (guardrail posture — packs are content, not executable config). Engine-synced Claude hooks are tracked in [prototypdigital/bluetemberg#225](https://github.com/prototypdigital/bluetemberg/issues/225); once that lands, this section becomes a pack-shipped artifact instead of copy-paste.

## Part 3 — Review policy

Both triggers must enforce the same policy, in the workflow prompt and the hook prompt alike:

1. **Comment-only.** The reviewer uses `gh pr review --comment` exclusively — never `--approve`, never `--request-changes`, never merge or close. An automated reviewer that gates merges will eventually lock a release behind a false positive; a human decides what blocks.
2. **Dedupe before posting.** The reviewer fetches existing review comments (`gh api repos/{owner}/{repo}/pulls/{n}/comments`) and the discussion thread before writing, and drops findings already raised — by a human, itself on a previous push, or another bot. Re-reviews cover only what changed.
3. **One summary per review.** Exactly one review-level comment per invocation, with inline comments carrying the line-specific findings. No comment sprays.
4. **Signed off as automated.** Every summary ends with a fixed sign-off line (e.g. `Automated review (pr-review-loop)`) so humans can filter it, and the dedupe step can recognize its own prior reviews.

## Completion checklist

- [ ] `.github/workflows/pr-review.yml` committed with `pull_request: [opened, synchronize]`, per-PR concurrency, and comment-only prompt.
- [ ] Auth secret (`CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY`) added to the repository.
- [ ] Local hook script committed and registered under `PostToolUse` → `Bash` in `.claude/settings.json` (per bluetemberg#226), detaching and exiting 0 immediately.
- [ ] Reviewer tools scoped with `--allowedTools` in both triggers — no edit tools, no `gh pr create`.
- [ ] Policy verified in both prompts: comment-only, dedupe against existing comments, one summary, automated sign-off line.

## When NOT to use

- Repositories where a human review gate is the point — this loop supplements human review, it never replaces the approval
- Forked-PR-heavy public repos without secret-access controls — `pull_request` workflows from forks cannot read secrets; the backstop silently skips them
- One-off review requests — use the code-review skill directly instead of wiring standing automation
