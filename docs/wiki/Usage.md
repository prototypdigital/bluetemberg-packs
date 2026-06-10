# Usage

How to pull official packs into a project. All three methods require [Bluetemberg](https://github.com/prototypdigital/bluetemberg) to be set up first.

## Method 1 — during `bluetemberg init`

When scaffolding a new project, choose **Rule collections (registry packages)** as the rule source. The wizard pre-selects packs based on your team profile and writes a `llm/rule-packages.json` manifest. Then download and sync:

```bash
bluetemberg install
bluetemberg sync
```

## Method 2 — `bluetemberg add`

Add packs to an existing project at any time:

```bash
bluetemberg add bluetemberg-rules-typescript
bluetemberg add bluetemberg-rules-git@^0.1.0
bluetemberg sync
```

This updates `llm/rule-packages.json` and `llm/rule-packages-lock.json` and caches the pack under `.bluetemberg/packs/`. Commit both JSON files so your team pins the same versions.

## Method 3 — `extends` (no registry)

If you'd rather manage packs as plain npm dependencies, install one and reference it from `bluetemberg.config.json`:

```bash
npm install -D bluetemberg-rules-security
```

```json
{
  "source": "llm",
  "extends": ["bluetemberg-rules-security"]
}
```

```bash
bluetemberg sync
```

Bluetemberg resolves the package from `node_modules/<name>/llm/`. This skips the registry manifest/lockfile entirely — your `package.json` and lockfile are the source of truth.

## Overrides

When the same rule filename appears in more than one source, the higher-priority source wins:

1. **Local** `llm/rules/` — your project's own rules always win
2. **`extends`** entries, in array order
3. **Registry packs**, in manifest order

To override one rule from a pack, create a file with the same name in `llm/rules/`. To drop a rule you don't want, override it with an empty or trimmed version — packs are all-or-nothing at the package level, but per-rule at the filename level.

## Mixing packs with your own rules

The most common setup: bring your own project-specific rules in `llm/rules/`, and layer an official pack underneath via `extends` or the registry. Your rules win on any name collision, the pack fills in the rest.

```json
{
  "source": "llm",
  "extends": ["bluetemberg-rules-typescript", "bluetemberg-rules-git"]
}
```

## Troubleshooting

| Symptom | Cause / fix |
| ------- | ----------- |
| Pack rules don't appear after `sync` | Run `bluetemberg install` first (registry method) or confirm the package is in `node_modules` (`extends` method). |
| A pack rule won't go away | Something still references it — check the manifest (`bluetemberg list`) or the `extends` array. |
| Want a different format per tool | That's automatic — sync transforms frontmatter per platform. Check your `platforms` in `bluetemberg.config.json`. |

For the registry mechanics behind `add`/`install`/`update` (manifest format, lockfile, cache, integrity hashes), see the [Bluetemberg Registry wiki](https://github.com/prototypdigital/bluetemberg/wiki/Registry).
