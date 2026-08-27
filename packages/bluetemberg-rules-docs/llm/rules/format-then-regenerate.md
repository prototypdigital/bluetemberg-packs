---
description: Formatting a generator's source files invalidates its output; run the formatter first, regenerate second, and check the pair in CI.
scope: "**"
---

# Format, then regenerate

When a formatter rewrites files that a generator reads, the generated output is stale the moment the formatter touches them. Run the formatter first, regenerate second, and verify the pair agrees before committing.

**Why:** the two tools are individually correct and jointly wrong in one specific order. Format-then-commit leaves generated output that no longer matches its source, and the drift check fails in CI on files the author never opened — so the failure looks unrelated to the change that caused it, and the natural first response is to re-run the generator locally, see it pass, and assume CI is flaky. It is not; the local run just fixed it.

- Establish the order once and write it down: **format → generate → verify**. Never generate before formatting.
- Run the generator's own drift check as the last step, not the generator itself, so a mismatch is reported rather than silently repaired: `<tool> --check`, `--dry-run`, or a `git diff --exit-code` on the output paths.
- Wire the same order into the pre-commit hook and CI. A rule that only lives in prose gets skipped by whoever is in a hurry.
- Watch for formatters with a wide default glob. A formatter run on `.` reaches generator sources — Markdown rule files, schema files, `.proto`, OpenAPI specs, GraphQL documents — not just application code.
- Either exclude generated output from the formatter, or format it and commit the formatted form consistently. Alternating between the two produces a diff on every run.
- If the generator is not idempotent — timestamps, ordering drift, absolute paths in its output — fix that first. Order cannot be enforced on a generator whose output changes when nothing did.

## Examples

```text
// BAD — format after generating, then commit
$ bluetemberg sync            # .claude/ generated from llm/
$ prettier --write .          # rewrites llm/rules/*.md — .claude/ now stale
$ git commit -am "add rule"
→ CI: `bluetemberg sync --check` → 3 file(s) out of sync
→ the named files are ones this change never touched

// GOOD — format first, regenerate, then verify
$ prettier --write .
$ bluetemberg sync
$ bluetemberg sync --check     # exits non-zero on any remaining drift
$ git commit -am "add rule"
```

## Applies to any source-to-output pair

The shape is not specific to one tool. Anywhere a formatter and a generator share input files, the same ordering bug exists:

| Formatter touches | Generator produces |
| --- | --- |
| `llm/**/*.md` rule sources | `.claude/`, `.cursor/`, `.github/instructions/` |
| `*.graphql` documents | typed client hooks and result types |
| OpenAPI / JSON Schema | API clients, server stubs, validators |
| `*.proto` | language bindings |
| `*.sql` migrations, schema files | ORM types and query builders |

The tell is always the same: CI reports drift in files the author never edited.
