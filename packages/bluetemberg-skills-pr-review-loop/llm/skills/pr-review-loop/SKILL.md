---
name: pr-review-loop
description: Wires an automated comment-only PR review via a local PostToolUse hook that reviews a PR the moment an agent opens it. Use when setting up automated PR review.
profiles:
  - frontend
  - backend
  - fullstack
  - devops
---

# pr-review-loop

Use this skill when wiring automated PR review into a project: the moment an agent session opens a pull request, it gets a prompt, comment-only review from a headless agent, without a human having to ask for one.

A `PostToolUse` hook fires the instant `gh pr create` succeeds inside an agent session — no repository secret, nothing running on GitHub's own infrastructure. See "When NOT to use" for what that trades away.

Install this pack alongside its companion, `bluetemberg-agents-pr-reviewer`, and point the hook's prompt at that agent's review protocol so authors get one consistent review voice.

## Triggers

- Setting up automated PR review for a repository
- An agent workflow that opens PRs and needs same-session review feedback
- Migrating ad-hoc "please review my PR" prompts into a standing loop

## Protocol

1. Install the `bluetemberg-agents-pr-reviewer` companion pack — the hook below drives its review protocol.
2. Wire the local PostToolUse hook for instant same-session feedback when an agent opens a PR.
3. Apply the review policy in the hook's prompt.
4. Work through the completion checklist before considering the loop live.

## Local PostToolUse hook

The reviewer starts the moment `gh pr create` succeeds inside an agent session. The canonical reference implementation lives in [prototypdigital/bluetemberg](https://github.com/prototypdigital/bluetemberg) on `main` — `.claude/hooks/spawn-pr-review.sh` (the hook entry), `.claude/hooks/run-pr-review.sh` (the detached worker), `.claude/hooks/read-pr-context.sh` (the read wrapper), and `.claude/hooks/post-review-comment.sh` (the posting wrapper) — copy these rather than reinventing them. (Introduced in [#226](https://github.com/prototypdigital/bluetemberg/pull/226); hardened with the `EXPECTED_PR_URL` pin and split into hook+worker in [#231](https://github.com/prototypdigital/bluetemberg/pull/231); read access scoped the same way `EXPECTED_PR_URL` already scoped writes in [#255](https://github.com/prototypdigital/bluetemberg/pull/255) — the file paths are the stable reference, not a specific PR diff.) The pattern:

1. **Match precisely.** A `PostToolUse` hook with matcher `Bash` reads the hook input from stdin and word-boundary-matches `gh pr create` in `tool_input.command`, so compound commands (`git push && gh pr create ...`) match but `echo "gh pr create"` lookalikes are the author's problem, not a trigger.
2. **Extract the PR URL** from the hook's `tool_response` — a successful `gh pr create` always prints it; no URL means the command failed or only mentioned `gh pr create`, so nothing spawns. Extraction takes the _first_ GitHub PR URL anywhere in the response, so a compound command whose earlier half also prints one (e.g. `gh pr comment 42 --body "see .../pull/7" && gh pr create`) can hand the worker the wrong PR — `EXPECTED_PR_URL` pins every write to whatever URL was extracted, it doesn't verify that URL belongs to _this_ `gh pr create` call. Keep `gh pr create` as its own command in agent-authored workflows rather than chaining it after other `gh`/`git` output.
3. **Detach and exit 0 immediately.** `PostToolUse` hooks block the authoring session's turn. The hook only gates and hands off to a worker script — `nohup run-pr-review.sh "$pr_url" ... & disown`, then `exit 0` — so the authoring session never waits on the review, and the worker (which runs the reviewer, then posts the cost comment below) has no time pressure of its own.
4. **Enforce comment-only at the tool boundary, not just in the prompt.** The worker exports `EXPECTED_PR_URL` before invoking the reviewer, and grants only `Bash(<path-to-read-pr-context.sh>:*),Bash(<path-to-post-review-comment.sh>:*),Read,Grep,Glob`. Do not grant raw `Bash(gh pr review:*)` or `Bash(gh api:*)` — those permit `--approve` and arbitrary API calls, which the reviewer's own credentials (the developer's authenticated `gh` session, typically broader than a CI job's scoped token) can act on if a malicious diff prompt-injects the model. Do not grant raw `Bash(gh pr view:*)` / `Bash(gh pr diff:*)` either, even though both are read-only — unrestricted, they let a prompt-injected diff use those same credentials to read an unrelated private PR, and whatever gets read can end up quoted into the one write path the reviewer has. `read-pr-context.sh` and `post-review-comment.sh` both refuse to act on any `<pr-url>` that doesn't match `EXPECTED_PR_URL`, so a prompt-injected diff can't redirect a read or a comment to a different PR in the repo. This also removes recursion risk: the reviewer can't run `gh pr create`.
5. **Post a cost comment.** After the reviewer's session ends, the worker reads its `total_cost_usd` from the JSON result and posts `Automated review cost: $X.XX (N turns)` directly via `gh pr comment` — fixed template, no model-generated text, so posting it outside the wrapper carries none of the wrapper's risk — so the review layer's own cost is visible where the review lands. Gate this parse-and-post step on `.is_error == false` in the JSON output: on an auth failure `claude -p` still reports `subtype: "success"` with the error text in `.result` and cost `0` — exit status alone doesn't distinguish a real run from a failed one. This gate applies only to the cost comment: the review itself is posted mid-session by the reviewer calling `post-review-comment.sh`, before the worker's `claude -p` call returns and the final JSON result (with its `.is_error` field) even exists.
6. **Degrade silently.** If `claude` or `jq` is not installed, or no PR URL can be found, exit 0 without complaint. A skipped run means that PR gets no review at all, so keep the local `claude`/`jq` toolchain working on every machine this hook is expected to fire on.

Merge this `PostToolUse` entry into the project's `llm/hooks.claude.json` as a sibling of whatever's already there (only create the file fresh if it doesn't exist yet — see [prototypdigital/bluetemberg#225](https://github.com/prototypdigital/bluetemberg/issues/225), shipped in engine 0.9.0). Copying the block below over an existing file instead of merging it will silently drop other event keys — e.g. a `SessionEnd` entry from the `session-retrospective` skill:

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

Run `bluetemberg sync` (or `npm run sync:llm-config`) afterward — it writes this into `.claude/settings.json` for you and preserves any other hooks already wired there (e.g. a `SessionEnd` entry from the `session-retrospective` skill lives under the same file, as a sibling top-level event key). The pack itself still cannot ship this manifest — packs are content, not executable config, and command hooks are only ever honored from the project's own `llm/` — so authoring `llm/hooks.claude.json` once is still a manual, one-time step; everything after that (regenerating `settings.json` on every sync) is automatic.

## Review policy

The hook's prompt must enforce this policy:

1. **Comment-only, enforced structurally.** Route all model-driven GitHub writes through the posting wrapper (`post-review-comment.sh`, pinned to one PR via `EXPECTED_PR_URL`) instead of granting `gh pr review:*` / `gh api:*` directly — see the tool-boundary rule above. `--approve`, `--request-changes`, merge, and close stay impossible at the tool-permission level, not just by prompt instruction. The one write that skips the wrapper is the worker's cost comment (step 5 above): the host script posts it directly via `gh pr comment` after the model's session ends, with a fixed template and no model input, so it carries none of the wrapper's risk. The hook's `claude -p` invocation puts it in "agent" mode — tools are whatever `--allowedTools` lists, no more, unlike its interactive "tag" mode (`@claude` mentions), which hardcodes a comment-update tool into every run regardless of `--allowedTools`. An automated reviewer that gates merges will eventually lock a release behind a false positive; a human decides what blocks.
2. **Dedupe before posting, with a durable baseline.** The reviewer fetches every existing comment with pagination (`gh api --paginate ...`, not a single unpaginated call — the API defaults to 30 per page) and drops findings already raised, by a human, itself on a previous run, or another bot. It also reads its own past summaries for the `<!-- pr-reviewer: reviewed <sha> -->` marker (see the pr-reviewer agent) and only reviews what changed since that commit, rather than re-scanning the full diff every time.
3. **One summary per review.** Exactly one review-level comment per invocation, with inline comments carrying the line-specific findings. No comment sprays.
4. **Signed off as automated.** Every summary ends with a fixed sign-off line (e.g. `Automated review (pr-review-loop)`) plus the reviewed-commit marker, so humans can filter it and the dedupe step can recognize its own prior reviews.
5. **Cost is visible, not hidden.** The hook posts its own review cost as a follow-up comment (step 5 above), so the review layer's own cost is visible where the review lands.

## Completion checklist

- [ ] `bluetemberg-agents-pr-reviewer` installed alongside this skill — the hook drives its review protocol.
- [ ] Local hook (entry + detached worker), `read-pr-context.sh`, and `post-review-comment.sh` committed and registered under `PostToolUse` → `Bash` in `llm/hooks.claude.json`, synced into `.claude/settings.json`, detaching and exiting 0 immediately.
- [ ] Reviewer tools scoped with `--allowedTools` — no edit tools, no `gh pr create`, no raw `gh pr view:*` / `gh pr diff:*` / `gh pr review:*` / `gh api:*` (reads and writes both go through their wrapper only, pinned via `EXPECTED_PR_URL`).
- [ ] Policy verified in the hook's prompt: comment-only, paginated dedupe with a commit-baseline marker, one summary, automated sign-off line.

## When NOT to use

- Repositories where a human review gate is the point — this loop supplements human review, it never replaces the approval
- Teams where PRs are frequently opened outside an agent session (the GitHub web UI, another tool, a teammate without this hook configured locally) — those PRs get no automated review at all, since there is no CI-level backstop covering them
- One-off review requests — use the code-review skill directly instead of wiring standing automation
