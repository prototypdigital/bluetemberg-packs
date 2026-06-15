# bluetemberg-packs

Official content packs for [Bluetemberg](https://github.com/prototypdigital/bluetemberg) — rules, agents, skills, and guardrails. Install with `bluetemberg add`, sync to every AI assistant you use.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Packs](https://img.shields.io/badge/packs-41-brightgreen.svg)](#packs)
[![Bluetemberg](https://img.shields.io/badge/built%20for-bluetemberg-5b6ee1.svg)](https://github.com/prototypdigital/bluetemberg)

Each pack is a standalone npm package containing vendor-neutral content in the standard `llm/` layout. [Bluetemberg](https://github.com/prototypdigital/bluetemberg) installs them and syncs the content into **Cursor, Claude Code, GitHub Copilot, Gemini, and Windsurf** — each in that tool's native format.

> **New to Bluetemberg?** It's a CLI that maintains AI assistant config from a single source of truth. You write rules once; it generates the per-tool files. These packs are curated, ready-made content you can drop in instead of writing your own. Start with the [Bluetemberg README](https://github.com/prototypdigital/bluetemberg#readme).

**[Browse the pack catalog →](https://prototypdigital.github.io/bluetemberg-packs/)** — a searchable, filterable index of every pack. Filter by kind or team profile, copy the `bluetemberg add` command for any pack (or a whole profile at once), and share any filtered view by URL. No install required.

## Packs

### Rules

| Package | Domain | Rules |
| ------- | ------ | ----- |
| [`bluetemberg-rules-typescript`](https://www.npmjs.com/package/bluetemberg-rules-typescript) | TypeScript code quality | `type-safety`, `coding-standards`, `early-returns`, `no-console-log`, `design-system-reuse` |
| `bluetemberg-rules-git` _(not yet published)_ | Git workflow standards | `git-workflow`, `git-move`, `pre-commit-checks` |
| [`bluetemberg-rules-security`](https://www.npmjs.com/package/bluetemberg-rules-security) | Security guardrails | `never-read-env`, `security-secrets`, `api-error-handling` |
| [`bluetemberg-rules-docs`](https://www.npmjs.com/package/bluetemberg-rules-docs) | Documentation & diagnostics | `docs-parity`, `post-edit-diagnostics`, `mermaid-diagrams` |
| [`bluetemberg-rules-devops`](https://www.npmjs.com/package/bluetemberg-rules-devops) | Infrastructure | `docker-best-practices`, `terraform-conventions`, `ansible-conventions`, `kubernetes-manifests`, `helm-conventions`, `container-image-pinning`, `ci-workflow-conventions`, `shell-script-standards`, `idempotency`, `runbook-discipline` |
| `bluetemberg-rules-context-engineering` _(not yet published)_ | LLM context engineering | `context-pollution-prevention`, `context-window-budget`, `multi-turn-state-management` |
| [`bluetemberg-rules-nextjs`](https://www.npmjs.com/package/bluetemberg-rules-nextjs) | Next.js | `nextjs-public-env-vars` |
| `bluetemberg-rules-agent-memory` _(not yet published)_ | Agent memory patterns | `memory-architecture-checklist`, `memory-promotion`, `memory-provenance`, `memory-recall-authority` |
| `bluetemberg-rules-llm-api-product` _(not yet published)_ | LLM API product | `cost-accounting`, `model-selection-and-routing`, `streaming` |
| `bluetemberg-rules-design-craft` _(not yet published)_ | Anti-stock design craft | `anti-stock-defaults`, `banned-moves-first`, `references-not-moods`, `tokens-before-components`, `design-every-state` |

### Agents

14 specialist agent packs (`bluetemberg-agents-*`): `frontend-specialist`, `backend-specialist`, `test-specialist`, `docs-maintainer`, `code-reviewer`, `a11y-specialist`, `security-specialist`, `infrastructure-specialist`, `devops-specialist`, `ansible-specialist`, `kubernetes-specialist`, `sre-specialist`, `agentic-specialist`, `design-engineer`.

### Skills

21 on-demand skill packs (`bluetemberg-skills-*`): `patterns`, `docs-upkeep`, `workspace-hygiene`, `react-patterns`, `code-review`, `api-design`, `security-audit`, `ci-cd-best-practices`, `migration-safety`, `stack-change-review`, `infrastructure-drift-check`, `rollback-plan`, `config-echo`, `create-agent`, `create-pack`, `create-rule`, `create-skill`, `sub-agent-design`, `figma-to-code`, `design-critique`, `visual-direction`.

### Guardrails

| Package | Guardrails |
| ------- | ---------- |
| [`bluetemberg-guardrails-git`](https://www.npmjs.com/package/bluetemberg-guardrails-git) | `conventional-branch-names` — block AI-generated worktree branch names, require `type/description` |

Guardrails are declarative hook definitions: Bluetemberg translates them into platform-native enforcement (e.g. Claude Code `PreToolUse` hooks in `.claude/settings.json`).

See the [Catalog](https://github.com/prototypdigital/bluetemberg-packs/wiki/Catalog) for a description of every pack.

> The **Design Engineer** packs (`rules-design-craft`, `agents-design-engineer`, `skills-figma-to-code`, `skills-design-critique`, `skills-visual-direction`) adapt [Marko Kolić](https://github.com/marko-prototyp)'s [AI for Designers workshop](https://marko-prototyp.github.io/AI-Workshop/), used with permission.

## Installation

You need [Bluetemberg](https://github.com/prototypdigital/bluetemberg) in your project first. Then pick one of three ways to pull in a pack.

### During `bluetemberg init`

The wizard suggests packs based on your team profile and writes a `llm/packages.json` manifest. Then:

```bash
bluetemberg install
bluetemberg sync
```

### With `bluetemberg add`

```bash
bluetemberg add bluetemberg-rules-typescript
bluetemberg add bluetemberg-agents-code-reviewer
bluetemberg sync
```

### With `extends` (no registry)

Install a pack as a plain dependency and point `bluetemberg.config.json` at it:

```bash
npm install -D bluetemberg-rules-typescript
```

```json
{
  "source": "llm",
  "extends": ["bluetemberg-rules-typescript"]
}
```

```bash
bluetemberg sync
```

## Overrides & priority

When the same filename exists in more than one source, the higher-priority source wins:

1. **Local** `llm/` (your project) — always wins
2. **`extends`** entries, in array order
3. **Registry packs**, in manifest order

So you can adopt a whole pack and still override a single file by creating one with the same name in your local `llm/`.

## Documentation

Full docs live in the [**wiki**](https://github.com/prototypdigital/bluetemberg-packs/wiki):

- [Pack browser](https://prototypdigital.github.io/bluetemberg-packs/) — searchable, filterable catalog of every pack (no install required)
- [Catalog](https://github.com/prototypdigital/bluetemberg-packs/wiki/Catalog) — every pack and every file, described
- [Usage](https://github.com/prototypdigital/bluetemberg-packs/wiki/Usage) — installing, overriding, and troubleshooting
- [Contributing](https://github.com/prototypdigital/bluetemberg-packs/wiki/Contributing) — add content or a new pack
- [Releasing](https://github.com/prototypdigital/bluetemberg-packs/wiki/Releasing) — versioning and the npm publish flow

For how the sync engine, manifest, and lockfile work, see the [Bluetemberg Registry docs](https://github.com/prototypdigital/bluetemberg/wiki/Registry).

## Repository layout

```
packages/
  bluetemberg-rules-*/         # 9 rule packs
    package.json
    llm/rules/*.md
  bluetemberg-agents-*/        # 13 agent packs
    package.json
    llm/agents/*.md
  bluetemberg-skills-*/        # 18 skill packs
    package.json
    llm/skills/<name>/SKILL.md
  bluetemberg-guardrails-*/    # 1 guardrail pack
    package.json
    llm/guardrails/*.md
```

Each package is published independently to npm but versioned and released from this one repo.

## Contributing

Pack content is plain Markdown with frontmatter — no build step. To add or change something, edit the `.md` file in the relevant pack and open a PR. See the [Contributing guide](https://github.com/prototypdigital/bluetemberg-packs/wiki/Contributing) for the full workflow.

## License

[MIT](LICENSE) © Prototyp Digital
