# Second Adversarial Research Pass — LLM Best-Practice Claims (Issue #16)

> Run: 82 agents, 822 web-research tool calls, 12 dimensions. Method mirrors the
> first pass (#9): every candidate claim verified by **three independent lenses**
> (source-credibility, derivation, recency), each defaulting to *refute* unless
> the evidence holds. A claim survives only on a 2-of-3 or 3-of-3 majority.

## 1. Verdict summary

**21 of 23 candidate claims verified.** 2 refuted. 0 dimensions left without a
citable source. Far higher survival than the first pass (4 of 22) because
candidates were pre-filtered to primary, falsifiable sources before submission —
no vendor-blog statistics were admitted.

## 2. Verified claims (package-ready)

| Dimension | Claim (short) | Source | Vote |
|---|---|---|---|
| token-budget-management | U-shaped position curve; mid-context can fall below closed-book baseline | Lost in the Middle (TACL 2024) — https://aclanthology.org/2024.tacl-1.9/ | 3-0 |
| token-budget-management | Context = finite depleting resource; just-in-time retrieval + compaction | Anthropic, Effective context engineering (2025-09) — https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents | 3-0 |
| system-prompt-structuring | Place long-form data at the TOP, above query/instructions | Lost in the Middle (arXiv v3 / TACL) — https://arxiv.org/abs/2307.03172 | 3-0 |
| system-prompt-structuring | Labeled, delimited sections; rules in system, args in user | OpenAI prompt-engineering + Anthropic XML-tags docs — https://developers.openai.com/api/docs/guides/prompt-engineering | 2-1 |
| multi-turn-context-hygiene | ~39% avg multi-turn degradation; consolidate into a fresh conversation | LLMs Get Lost in Multi-Turn Conversation (2025-05) — https://arxiv.org/abs/2505.06120 | 3-0 |
| multi-turn-context-hygiene | Distractors degrade below needle-only baseline; prune stale turns | Chroma, Context Rot (2025-07) — https://research.trychroma.com/context-rot | 3-0 |
| tool-schema-design | Prose constraints in param descriptions violated ~20-30%; enforce with schema + post-call validation | IFEval-FC (2025-09) — https://arxiv.org/abs/2509.18420 | 2-1 |
| tool-schema-design | Namespace tools, name params unambiguously (user_id not user), return semantic IDs | Anthropic, Writing tools for agents (2025-09) — https://www.anthropic.com/engineering/writing-tools-for-agents | 3-0 |
| retry-recovery-patterns | Structured Reflect→Call→Final loop beats naive retry on tool-error repair | Failure Makes the Agent Stronger (arXiv v3 2026-04) — https://arxiv.org/abs/2509.18847 | 2-1 |
| retry-recovery-patterns | Capped exponential backoff + FULL jitter; idempotent-only retries; honor retry-after | AWS Backoff & Jitter / Builders' Library (2015) — https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/ | 3-0 |
| human-in-the-loop-checkpoints | Gate side-effecting tools behind per-tool human approval; pause + resumable state | OpenAI Agents — Guardrails & human review (2026) — https://developers.openai.com/api/docs/guides/agents/guardrails-approvals | 3-0 |
| test-first-prompting | Test-driven INTERACTIVE generation w/ human yes/no: +45.97% avg pass@1 within ≤5 interactions | TiCoder (IEEE TSE 2024) — https://arxiv.org/abs/2404.10100 | 2-1 |
| test-first-prompting | Benefit is contingent on test signal; self-trusted self-generated tests don't help (only ~44-59% valid) | Revisit Self-Debugging (2025-01) — https://arxiv.org/abs/2501.12793 | 3-0 |
| incremental-diff-generation | Code-diff emission yields more incorrect/insecure code than whole-program regen in multi-turn | MT-Sec (NeurIPS 2025) — https://arxiv.org/abs/2510.13859 | 3-0 |
| hallucination-patterns-code | Hallucinated packages ~5.2% (commercial) / ~21.7% (open); reproducible → slopsquatting; gate every dependency | We Have a Package for You! (USENIX Sec 2025) — https://arxiv.org/abs/2406.10279 | 2-1 |
| hallucination-patterns-code | Models self-detect hallucinated packages >75%; RAG/self-refine/SFT cut rates substantially | We Have a Package for You! (USENIX Sec 2025) — https://arxiv.org/html/2406.10279v3 | 2-1 |
| streaming-best-practices | Tool-call deltas are NOT valid JSON mid-stream; accumulate partial_json, parse at content_block_stop | Anthropic, Fine-grained tool streaming (2026) — https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming | 3-0 |
| streaming-best-practices | Streaming improves perceived latency but complicates moderation; scores arrive only after full output | OpenAI, Streaming responses (2026) — https://developers.openai.com/api/docs/guides/streaming-responses | 3-0 |
| cost-per-task-measurement | Evaluate on accuracy-vs-cost Pareto; priciest models rarely Pareto-optimal | Holistic Agent Leaderboard (2025-10) — https://arxiv.org/abs/2510.11977 | 3-0 |
| cost-per-task-measurement | Compute cost from authoritative usage object + org Usage/Cost Admin API, not estimates | Anthropic, Usage and Cost API (2026-02) — https://platform.claude.com/docs/en/build-with-claude/usage-cost-api | 3-0 |
| model-routing | Learned router cuts cost >2x at ~95% GPT-4 quality | RouteLLM (ICLR 2025) — https://openreview.net/forum?id=8sSqNntaMr | 3-0 |

## 3. Refuted claims

| Dimension | Claim (short) | Vote | Why refuted |
|---|---|---|---|
| human-in-the-loop-checkpoints | Oversight is more effective at EXECUTION than PLANNING phase | 1-2 | Headline overreaches the source. He et al. (Plan-Then-Execute, CHI 2025, arXiv 2502.01390) explicitly declines an execution>planning ranking — execution hypothesis H4 "not enough to strictly support," execution oversight *hurt* in task-3, planning oversight *helped* in task-1. Paper's thesis is "tailor, don't fix"; claim cherry-picks one task into a universal rule the source contradicts. GPT-3.5-turbo backbone weakens generalization. |
| incremental-diff-generation | SEARCH/REPLACE is the most reliable diff format across apply, anti-apply AND diff-generation | 1-2 | Inverts the source's nuance. Diff-XYZ (arXiv 2510.12487): "udiff-based formats work best for Apply and Anti-Apply, search-replace excels for Diff Generation" — SR's win is scoped to diff-generation + larger models. Newer, higher-venue "To Diff or Not to Diff?" (ACL Findings 2026) finds SR and hunk-rewrite comparable and prefers hunk-rewrite — supersession risk. Per-model numbers verified correct; refutation rests on the cross-task over-generalization. |

Neither refutation kills its dimension — both dimensions keep a 3-0 survivor.

## 4. Dimensions with no citable source

None. All 12 dimensions landed at least one verified claim. The weaker (2-1)
survivors rest on peer-reviewed or reproducible-benchmark primary sources; their
vendor-reported magnitudes are flagged inline as non-reproducible.

## 5. Recommended next actions

**Extend existing packs:**

- **`bluetemberg-rules-context-engineering`** — 6 rules (all survivors): U-shaped
  position curve, finite-resource/JIT+compaction, long-form-data-at-top,
  delimited-sections (cross-vendor part only), multi-turn-consolidate,
  distractor-pruning. Largest, most coherent, safest cluster.
- **`bluetemberg-agents-agentic-specialist`** — tool-schema
  naming/namespacing, schema-level constraint enforcement, structured
  error-recovery loop, per-tool human-approval gating, backoff/jitter/idempotency.
- **`bluetemberg-rules-security`** — paired package-hallucination/slopsquatting
  rule (gate dependencies + RAG/self-verify mitigations). Strong fit.
- **`bluetemberg-skills-code-review`** (or new code-gen rule) — TiCoder +
  self-generated-tests-aren't-ground-truth as one paired rule; MT-Sec
  whole-program-over-diff as another.

**Create a new pack:**

- **`bluetemberg-rules-llm-api-product`** (new) — a genuinely new, well-supported
  5-claim cluster with no current home: streaming partial-JSON handling,
  streaming/moderation tradeoff, accuracy-vs-cost Pareto, authoritative token
  accounting, model routing. All 5 are 3-0 survivors on primary/official sources.

**Roadmap adjustments — none to drop entirely.** Both refutations are claim-level:

- **human-in-the-loop-checkpoints** keeps its 3-0 OpenAI per-tool-approval claim;
  drop any "execution oversight beats planning oversight" guidance.
- **incremental-diff-generation** keeps the 3-0 MT-Sec claim; do not prescribe a
  specific diff format as universally best — the 2026 ACL evidence is contested.

**Process note:** the 2-1 survivors (delimited-sections, IFEval-FC,
structured-reflection, TiCoder, both package-hallucination claims) must ship with
their non-reproducible vendor magnitudes flagged inline rather than stated as
fact — that caveating is what kept them above the bar.
