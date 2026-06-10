# bluetemberg-rules

Official rule packs for [Bluetemberg](https://github.com/prototypdigital/bluetemberg) — install with `bluetemberg add`, sync to every AI assistant you use.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Packs](https://img.shields.io/badge/packs-6-brightgreen.svg)](#packs)
[![Bluetemberg](https://img.shields.io/badge/built%20for-bluetemberg-5b6ee1.svg)](https://github.com/prototypdigital/bluetemberg)

Each pack is a standalone npm package containing vendor-neutral rules in the standard `llm/` layout. [Bluetemberg](https://github.com/prototypdigital/bluetemberg) installs them and syncs the rules into **Cursor, Claude Code, GitHub Copilot, Gemini, and Windsurf** — each in that tool's native format.

> **New to Bluetemberg?** It's a CLI that maintains AI assistant config from a single source of truth. You write rules once; it generates the per-tool files. These packs are curated, ready-made rule sets you can drop in instead of writing your own. Start with the [Bluetemberg README](https://github.com/prototypdigital/bluetemberg#readme).

## Packs

| Package | Domain | Rules |
| ------- | ------ | ----- |
| [`bluetemberg-rules-typescript`](https://www.npmjs.com/package/bluetemberg-rules-typescript) | TypeScript code quality | `type-safety`, `coding-standards`, `early-returns`, `no-console-log`, `design-system-reuse` |
| [`bluetemberg-rules-git`](https://www.npmjs.com/package/bluetemberg-rules-git) | Git workflow standards | `git-workflow`, `git-move`, `pre-commit-checks` |
| [`bluetemberg-rules-security`](https://www.npmjs.com/package/bluetemberg-rules-security) | Security guardrails | `never-read-env`, `security-secrets`, `api-error-handling` |
| [`bluetemberg-rules-docs`](https://www.npmjs.com/package/bluetemberg-rules-docs) | Documentation & diagnostics | `docs-parity`, `post-edit-diagnostics`, `mermaid-diagrams` |
| [`bluetemberg-rules-devops`](https://www.npmjs.com/package/bluetemberg-rules-devops) | Infrastructure | `docker-best-practices`, `terraform-conventions`, `ansible-conventions`, `kubernetes-manifests`, `helm-conventions`, `container-image-pinning`, `ci-workflow-conventions`, `shell-script-standards`, `idempotency`, `runbook-discipline` |
| [`bluetemberg-rules-nextjs`](https://www.npmjs.com/package/bluetemberg-rules-nextjs) | Next.js | `nextjs-public-env-vars` |

See the [Catalog](https://github.com/prototypdigital/bluetemberg-rules/wiki/Catalog) for a description of every rule.

## Installation

You need [Bluetemberg](https://github.com/prototypdigital/bluetemberg) in your project first. Then pick one of three ways to pull in a pack.

### During `bluetemberg init`

Choose **Rule collections (registry packages)** as the rule source. The wizard suggests packs based on your team profile and writes a `llm/rule-packages.json` manifest. Then:

```bash
bluetemberg install
bluetemberg sync
```

### With `bluetemberg add`

```bash
bluetemberg add bluetemberg-rules-typescript
bluetemberg add bluetemberg-rules-security
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

When the same rule filename exists in more than one source, the higher-priority source wins:

1. **Local** `llm/rules/` (your project) — always wins
2. **`extends`** entries, in array order
3. **Registry packs**, in manifest order

So you can adopt a whole pack and still override a single rule by creating a file with the same name in your local `llm/rules/`.

## Documentation

Full docs live in the [**wiki**](https://github.com/prototypdigital/bluetemberg-rules/wiki):

- [Catalog](https://github.com/prototypdigital/bluetemberg-rules/wiki/Catalog) — every pack and every rule, described
- [Usage](https://github.com/prototypdigital/bluetemberg-rules/wiki/Usage) — installing, overriding, and troubleshooting
- [Contributing](https://github.com/prototypdigital/bluetemberg-rules/wiki/Contributing) — add a rule or a new pack
- [Releasing](https://github.com/prototypdigital/bluetemberg-rules/wiki/Releasing) — versioning and the npm publish flow

For how the sync engine, manifest, and lockfile work, see the [Bluetemberg Registry docs](https://github.com/prototypdigital/bluetemberg/wiki/Registry).

## Repository layout

```
packages/
  bluetemberg-rules-typescript/
    package.json
    llm/rules/*.md
  bluetemberg-rules-git/
  bluetemberg-rules-security/
  bluetemberg-rules-docs/
  bluetemberg-rules-devops/
  bluetemberg-rules-nextjs/
```

Each package is published independently to npm but versioned and released from this one repo.

## Contributing

Rules are plain Markdown with frontmatter — no build step. To add or change one, edit the `.md` file in the relevant pack and open a PR. See the [Contributing guide](https://github.com/prototypdigital/bluetemberg-rules/wiki/Contributing) for the full workflow.

## License

[MIT](LICENSE) © Prototyp Digital
