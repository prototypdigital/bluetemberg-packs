---
description: Manage context window budget explicitly — prune stale content, compress retrieved data, never let context grow unbounded.
scope: "**"
---

# Context window budget

Treat the context window as a fixed resource. Every token spent on stale or redundant information is a token taken from the current task.

## Rules

- Before appending retrieved content (tool results, file reads, search results), estimate its token cost relative to what's already in context.
- Prune messages or retrieved blocks that are no longer relevant to the current subtask before starting a new retrieval-heavy operation.
- Summarize long retrieved documents rather than appending verbatim. One dense paragraph beats five paragraphs of boilerplate.
- When the same fact appears in multiple sources (e.g. a README and a config file), cite one — the most authoritative — and discard the rest.
- Never re-read a file you already have in context unless you need to verify it changed.

## Anti-patterns

```text
// BAD — reads entire 800-line file to find one function
read_file("src/utils/helpers.ts")

// GOOD — grep for the specific symbol, then read only the relevant section
grep("function formatDate", "src/utils/")
read_file("src/utils/date.ts", offset=42, limit=30)
```
