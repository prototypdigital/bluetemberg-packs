---
description: Prevent context pollution — scope tool calls to what you need, don't inject noise into the conversation.
scope: "**"
---

# Context pollution prevention

Context pollution is when irrelevant, contradictory, or duplicate information crowds out the signal needed for accurate reasoning.

## Rules

- Scope every search to the narrowest path that will satisfy the question. Never `find .` or `grep` from the repo root when a subdirectory is known.
- Do not repeat large tool results verbatim in your response — summarize what was found and what it means for the current task.
- When a tool result is an error or "not found", don't include the full error trace in context — note the failure and the consequence.
- Avoid "context dumps" — loading all files in a directory hoping the answer is somewhere. Form a hypothesis first, then read to confirm or refute it.
- When a task pivots, explicitly acknowledge which prior retrieved context is no longer relevant before proceeding.

## Structured retrieval pattern

1. State the specific question the retrieval is meant to answer.
2. Pick the narrowest tool and scope that could answer it.
3. After retrieval, extract only the fact needed — discard the scaffolding.
4. Record where the fact came from (file path + line) in case it needs verification.
