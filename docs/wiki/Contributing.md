# Contributing

Rules are plain Markdown with frontmatter — there's no build step and no TypeScript. Editing a rule is just editing a file.

## Repository layout

```
packages/
  bluetemberg-rules-<domain>/
    package.json          # name, version, "files": ["llm/"]
    llm/
      rules/
        <rule-name>.md
```

Each `packages/*` directory is published independently to npm but lives and releases from this monorepo (npm workspaces).

## Rule file format

```markdown
---
description: One-line summary of what this rule enforces.
scope: '**'
---

# Rule title

Concise, actionable guidance the AI sees as always-on context.
```

| Frontmatter | Meaning |
| ----------- | ------- |
| `description` | One-line summary. Shown in tooling and transformed into each platform's description field. |
| `scope` | Glob(s) the rule applies to. `'**'` = always on. A single glob or an array. |

Keep rules short and imperative. They are passive context the assistant reads on every interaction — not documentation. See the [Bluetemberg Writing Rules guide](https://github.com/prototypdigital/bluetemberg/wiki/Writing-Rules) for style guidance.

## Add or edit a rule in an existing pack

1. Edit (or create) `packages/bluetemberg-rules-<domain>/llm/rules/<rule-name>.md`.
2. Update the [Catalog](Catalog) page in this wiki and the pack's row in the [README](https://github.com/prototypdigital/bluetemberg-rules#packs) if you added or removed a rule.
3. Open a PR titled `feat: add <rule-name> to <domain> pack` (or `fix:` / `docs:` as appropriate).

Adding or removing a rule is a `feat`; it changes what consumers get. Tweaking wording in an existing rule is usually a `fix` or `docs`.

You don't bump the pack's `version` yourself — [release-please](Releasing) derives the bump from your commit type and maintains a Release PR. Merging that PR publishes the changed packs.

## Add a new pack

1. Create `packages/bluetemberg-rules-<domain>/` with a `package.json`:

   ```json
   {
     "name": "bluetemberg-rules-<domain>",
     "version": "0.1.0",
     "description": "<Domain> rules for Bluetemberg — <short summary>.",
     "keywords": ["bluetemberg-pack", "rules", "<domain>"],
     "author": "Prototyp Digital",
     "license": "MIT",
     "repository": {
       "type": "git",
       "url": "https://github.com/prototypdigital/bluetemberg-rules.git"
     },
     "files": ["llm/"]
   }
   ```

   The `bluetemberg-pack` keyword is what makes the package discoverable via `bluetemberg search`.

2. Add your rules under `llm/rules/`.
3. Register the pack with release-please so it gets versioned and published: add `"packages/<name>": {}` to `release-please-config.json` and `"packages/<name>": "0.1.0"` to `.release-please-manifest.json`. See [Releasing](Releasing) for the one-time npm bootstrap.
4. Document the pack in the [Catalog](Catalog) and the [README](https://github.com/prototypdigital/bluetemberg-packs#packs).
5. If the pack should be offered by the `bluetemberg init` wizard, add a matching entry to `RULE_COLLECTION_PRESETS` in the **bluetemberg** repo (`src/init/presets.ts`) — that's a separate PR in that repo.

## Test a pack locally

You don't need to publish to try a pack. From a scratch project that has Bluetemberg installed:

```json
{
  "source": "llm",
  "extends": ["../path/to/bluetemberg-rules/packages/bluetemberg-rules-typescript"]
}
```

```bash
bluetemberg sync
```

Inspect the generated `.cursor/`, `.claude/`, `.github/` output to confirm the rules transform correctly for each platform.

## Conventions

- [Conventional Commits](https://www.conventionalcommits.org/) for PR titles.
- One rule per file; filename = rule name (kebab-case).
- Keep `description` to a single line.
