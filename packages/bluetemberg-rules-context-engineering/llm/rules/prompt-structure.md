---
description: Structure prompts into labeled, delimited sections — separate instructions from data, and keep persistent rules in the system message.
scope: "**"
---

# Prompt structure

When a prompt mixes instructions, context, examples, and variable input, the model parses it more reliably if each content type is **labeled and delimited**. Wrapping each part in its own marker — XML-style tags (`<instructions>`, `<context>`, `<examples>`, `<input>`) or clear Markdown headers — reduces the chance the model confuses data for instructions, or misses a rule buried in a wall of text.

## Rules

- Delimit each content type explicitly. Don't run instructions, pasted documents, and examples together as one undifferentiated block.
- Put **persistent rules** — role, durable constraints, output format — in the **system / developer message**, which carries higher authority. Put **per-request task arguments** (the specific input, the user's question) in the **user message**.
- Keep instructions textually separate from the data they operate on, so the model treats pasted content as data, not as commands to follow. This also reduces prompt-injection surface.
- Label examples as examples (`<example>…</example>`) so the model doesn't mistake a sample input/output for the actual task.

## On section ordering

A fixed section order (Identity → Instructions → Examples → Context) is reasonable as a *default*, but it is **vendor-specific, not universal** — OpenAI's own guidance notes the optimal order "may vary by which model you are using," and for large inputs the long-context guidance is the opposite: put the long-form data first (see [context-positioning](context-positioning.md)). Treat ordering as a tunable, not a law; the durable, cross-vendor part is *delimit content types* and *rules in system, args in user*.

## Source

OpenAI prompt-engineering guide — <https://developers.openai.com/api/docs/guides/prompt-engineering> (developer-message sections; "developer messages … prioritized ahead of user messages"). Anthropic, "Use XML tags to structure your prompts" — wrapping each content type in its own tag "reduces misinterpretation." Both are official vendor docs; they agree on delimiting + the system/user authority split, but only OpenAI prescribes the specific ordering, hence the caveat above.
