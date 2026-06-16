# Authoring Standards

The quality bar for every pack kind — **rules, agents, skills, guardrails** — and the cross-cutting **description / triggering** standard. Each principle is backed by a primary source (official vendor docs, RFCs, or peer-reviewed work), verified with the adversarial default-*refute* method described in [Research & Sources](Research). This page is the bar the meta-skills (`create-rule`, `create-agent`, `create-skill`, `create-pack`) enforce and that all shipped content is held to.

Legend: ✅ confirmed by a primary source · 🔸 sound but vendor-best-practice / context-dependent.

## Shared foundations

- **Always-on prose is advisory, not a guarantee.** Even GPT-4 reaches only ~77% prompt-level strict accuracy on [IFEval](https://arxiv.org/abs/2311.07911) — roughly one instruction in four is violated. Non-negotiable invariants belong in a **deterministic gate** (a guardrail/hook, linter, or CI), not a prose rule. Claude Code states CLAUDE.md instructions are "advisory" whereas ["hooks are deterministic"](https://code.claude.com/docs/en/best-practices). ✅
- **The frontmatter `description` is the routing signal, not documentation.** Only `name` + `description` are pre-loaded for model selection; the body is read only *after* the unit is chosen. So trigger keywords must live in the description itself. ([Anthropic — Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)) ✅
- **Claims beyond convention must be traceable** to a primary source — see [Research & Sources](Research).
- **Tokens are a shared budget.** Every always-on token competes with the task; long context degrades adherence ([Lost in the Middle](https://aclanthology.org/2024.tacl-1.9/)). Be dense and scoped.

## Rules — always-on, passive context

Bluetemberg rules are short Markdown (frontmatter `description` + `scope` glob; body of Why / directives / BAD-GOOD / gotchas) loaded every interaction. ([`create-rule`](Catalog#bluetemberg-skills-create-rule))

1. **Imperative and checkable.** "Return early on invalid input", never "write clean code". A reviewer must be able to verify compliance from the code. Claude Code explicitly lists "self-evident practices like 'write clean code'" as content to *exclude*. ([Anthropic — Be clear and direct](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct), [Claude Code best practices](https://code.claude.com/docs/en/best-practices)) ✅
2. **Say what TO do, not only what NOT to do.** Pair every prohibition with the positive replacement ("read from `process.env`", not just "never read `.env`"). ([Anthropic](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct), [OpenAI](https://developers.openai.com/api/docs/guides/prompt-engineering)) ✅
3. **State the consequence (Why).** One line on what breaks if ignored, so the model generalizes intent to cases the directives don't enumerate. 🔸
4. **Anchor with a BAD/GOOD example.** Worked examples are "one of the most reliable ways to steer" output; keep them short and relevant. ([Anthropic — Use examples](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/be-clear-and-direct), [Cursor — Rules](https://cursor.com/docs/context/rules)) ✅
5. **Ruthless brevity — apply the deletion test.** For every line: "would removing this cause a mistake?" If not, cut it. "Bloated CLAUDE.md files cause Claude to ignore your actual instructions." Prefer many small rules over one long one. ([Claude Code](https://code.claude.com/docs/en/best-practices), [Cursor — <500 lines](https://cursor.com/docs/context/rules)) ✅
6. **Scope with a glob.** Reserve `'**'` for genuinely universal rules; bind stack/area rules to their paths. ([Cursor](https://cursor.com/docs/context/rules), [GitHub Copilot `applyTo`](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)) ✅
7. **Hard invariants → a guardrail/lint, not prose** (see Shared foundations). ✅
8. **Ration normative emphasis.** Use MUST/SHOULD/MAY ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)) for requirement strength, but don't make every line "CRITICAL: YOU MUST" — newer models over-trigger on aggressive emphasis. 🔸

## Agents — delegated specialist sub-agents

Bluetemberg agents are Markdown (frontmatter `name` + delegation `description` + minimal `tools`; body of Responsibilities / Constraints). ([`create-agent`](Catalog#bluetemberg-skills-create-agent))

1. **Description is a delegation trigger, not a label** — what it does **and when to route to it**, plus a proactive cue ("Use proactively after code changes", "MUST BE USED for X") when you want auto-delegation. ([Claude Code — subagents](https://code.claude.com/docs/en/sub-agents)) ✅
2. **One coherent task.** If responsibilities span unrelated domains or the prompt accretes if-then branches, split it. ([Claude Code](https://code.claude.com/docs/en/sub-agents), [OpenAI — Practical guide to building agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)) ✅
3. **Least-privilege tools.** A read-only audit/review agent is Read + Grep + Glob only — never `edit`/`execute`. Keep the prose constraint and the tool allowlist in lockstep (defense in depth). ([Claude Code](https://code.claude.com/docs/en/sub-agents)) ✅
4. **Optimize tools for clarity and non-overlap, not count.** Overlapping, vaguely-named tools confuse the agent more than a larger set of distinct ones. ([Anthropic — Writing effective tools](https://www.anthropic.com/engineering/writing-tools-for-agents)) ✅
5. **Declare an objective and output/return format.** A sub-agent returns a summary to the caller; vague specs cause duplicated or garbled work. ([Anthropic — multi-agent](https://www.anthropic.com/engineering/multi-agent-research-system)) ✅
6. **Layered, explicit constraints** — what it must NOT do, where it defers, what blocks release. ([Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents), [OpenAI](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)) ✅
7. **Use a sub-agent only for its real value** — context isolation + returned summary, tool restriction, or self-contained verbose work. Keep tightly-coupled, iterative, latency-sensitive work in the main thread. Prefer extending one agent over proliferating near-duplicates. ([Claude Code](https://code.claude.com/docs/en/sub-agents), [Anthropic — start simple](https://www.anthropic.com/engineering/building-effective-agents)) ✅/🔸
8. **Match the model tier to the role** — route narrow/read-only/high-volume specialists to a cheaper, faster model; reserve the largest model for reasoning-heavy roles. ([Claude Code — Choose a model](https://code.claude.com/docs/en/sub-agents)) ✅

## Skills — on-demand, model-invoked workflows

Bluetemberg skills are `llm/skills/<name>/SKILL.md`, invoked when their description matches the task. The **deep-skill standard**: a step-by-step `## Protocol`, decision trees where a branch matters, BAD/GOOD examples, and a `## Completion checklist`. ([`create-skill`](Catalog#bluetemberg-skills-create-skill)) The research refines it as follows:

1. **Description carries what + when + trigger keywords**, third person, ≤1024 chars; `name` ≤64 chars, lowercase-hyphen, no reserved words (`anthropic`/`claude`). The body `## Triggers` section does **not** drive auto-invocation — only the description does. ([Anthropic — Skill best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)) ✅
2. **Be concise; use progressive disclosure, not a hard line count.** Keep `SKILL.md` focused (official ceiling ~500 lines) and push depth into bundled `reference.md` / `examples.md` / `scripts/` linked one level deep, rather than inflating or artificially compressing one file. (The bluetemberg "~60–120 lines" figure is a guideline for *prose density*, not a cap that should force splitting a genuinely procedural skill.) ([Anthropic — progressive disclosure](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)) ✅
3. **Calibrate structure to the task's degrees of freedom.** Fragile, deterministic workflows (migrations, deploys) get exact steps/scripts; open-ended judgment tasks (a critique, a design review) get higher-freedom prose. Don't force an ASCII decision tree or BAD/GOOD pair into a skill where it's contrived — use them where they add value. ([Anthropic — Skill best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)) 🔸
4. **Keep a completion checklist** of verifiable criteria. ✅ (deep-skill standard)
5. **Gate side-effecting skills.** For deploy/migrate/destructive workflows, set `disable-model-invocation` (require explicit invocation) and document a plan→validate→execute flow. ([Anthropic / Claude Code skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)) ✅
6. **A "When NOT to use" section** to prevent over-firing. ✅
7. **Don't restate base-model knowledge.** A skill that only repeats generic best practice adds nothing — deepen it or delete it. The opposite failure (over-explaining what the model already knows) wastes resident context, since an invoked skill stays loaded across turns. ([Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)) 🔸

## Guardrails — deterministic, auto-fired constraints

A guardrail is **enforcement** (code decides; the model gets no vote), versus a rule which is probabilistic guidance. Use one when the failure is safety/correctness-critical and the check is a pure function of available inputs. ([Claude Code — hooks](https://code.claude.com/docs/en/hooks-guide), [Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents))

1. **Deterministic + safety-critical only.** Judgment calls stay in rules; deterministic, code-checkable invariants become guardrails. ✅
2. **Fail closed — and verify the exit semantics.** In Claude Code hooks **only exit code 2 blocks**; exit 1 is treated as a non-blocking error and the action *proceeds*. A guardrail that errors must not silently let the action through. ([Claude Code — hooks reference](https://code.claude.com/docs/en/hooks)) ✅
3. **Deny-by-default / least privilege.** Enumerate the allowed shape and deny the rest; deny rules evaluate before allow. ([Claude Agent SDK — permissions](https://code.claude.com/docs/en/agent-sdk/permissions)) ✅
4. **Narrow matcher scope.** Bind to the specific tool/event, not every event. ([Claude Code — hooks](https://code.claude.com/docs/en/hooks-guide)) ✅
5. **Actionable, model-directed block message.** State what was rejected, why, and the exact next action — the message is fed back to the model to adjust its plan. ([Claude Code](https://code.claude.com/docs/en/hooks-guide)) ✅
6. **Escalate irreversible actions to human approval**, not a binary deny (force-push, history rewrite, deletes, financial writes). ([OpenAI — Guardrails & human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals)) ✅
7. **Test both paths before shipping** — prove it blocks the bad case *and* allows the good case, including the error/edge path. ([Anthropic — Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)) ✅

## Description & triggering (cross-cutting)

Applies to every skill and agent — this is what makes the right unit fire.

1. **Put both capability and trigger in the `description`:** `"<What it does>. Use when <trigger contexts>."` Don't rely on a body `## Triggers` section for auto-invocation — it isn't pre-loaded. ([Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)) ✅
2. **Third person.** "Processes Excel files… Use when…", never "I can…" / "You can use this to…" — mixed POV hurts discovery. ([Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)) ✅
3. **Pack in user-vocabulary keywords** — verbs, domain nouns, file extensions, synonyms a user would actually type. "Helps with code" never auto-fires. ([Anthropic](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices), [Claude Code](https://code.claude.com/docs/en/sub-agents)) ✅
4. **Disambiguate from neighbors.** More similar-looking options raise wrong-selection rates; keep descriptions mutually exclusive and the active set small. ([OpenAI — function calling](https://developers.openai.com/api/docs/guides/function-calling), [Anthropic — writing tools](https://www.anthropic.com/engineering/writing-tools-for-agents)) ✅
5. **Pass the "intern test."** A new engineer should know from the description alone when to reach for it. ✅
6. **Validate triggering with evals, not inspection** — confirm the description discriminates against real queries before shipping. ([Anthropic — build evaluations first](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)) ✅

## How this is enforced

- The meta-skills (`create-rule`/`create-agent`/`create-skill`/`create-pack`) encode these principles for authoring new content.
- `npm run validate` checks structure, frontmatter limits, and catalog freshness deterministically.
- Content is held to this bar in review; see [Contributing](Contributing).
