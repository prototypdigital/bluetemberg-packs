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

Frontmatter must be valid YAML: hosts parse it strictly and drop a file whose frontmatter fails. Quote any value that contains `: ` or ` #`, or that starts with `@`, `` ` ``, `&`, `*`, `!`, `%`, `,`, `[`, `]`, `{`, `}`, `|`, `>` or `- ` (for example `description: "Next.js caching: ISR, tags, and render mode."`). Inside double quotes, write a literal backslash as `\\`. `npm run validate` flags these, along with duplicate keys, tab indentation, and lines that aren't `key: value`.

Keep rules short and imperative. They are passive context the assistant reads on every interaction — not documentation. See the [Bluetemberg Writing Rules guide](https://github.com/prototypdigital/bluetemberg/wiki/Writing-Rules) for style guidance.

## Add or edit a rule in an existing pack

1. Edit (or create) `packages/bluetemberg-rules-<domain>/llm/rules/<rule-name>.md`.
2. Update the [Catalog](Catalog) page in this wiki and the pack's row in the [README](https://github.com/prototypdigital/bluetemberg-rules#packs) if you added or removed a rule.
3. Open a PR titled `feat: add <rule-name> to <domain> pack` (or `fix:` / `docs:` as appropriate).

Adding or removing a rule is a `feat`; it changes what consumers get. Tweaking wording in an existing rule is usually a `fix` or `docs`.

You don't bump the pack's `version` yourself — [release-please](Releasing) derives the bump from your commit type and maintains a Release PR. Merging that PR publishes the changed packs.

## Authoring skills and agents

Skills and agents are authored with the meta-skills — `create-skill`, `create-agent`, and `create-pack` — which scaffold the correct frontmatter, body, and sync.

Skills follow the **deep-skill standard**: a step-by-step `## Protocol` (numbered `### Step N`), at least one **decision tree** where a branch matters, at least one **BAD/GOOD** example with concrete code or output, a `## Completion checklist`, and a `## When NOT to use`. Aim for ~60–120 lines of actionable content, and benchmark against `figma-to-code` and `config-echo`. A skill that only restates what a base model already knows (a generic MUST/SHOULD list) is too thin — deepen it or it adds nothing.

Every kind has a research-backed quality bar in [Authoring Standards](Authoring-Standards) (rules, agents, skills, guardrails, and the description/triggering rules). Claims that go beyond convention should be traceable to a primary source — see [Research & Sources](Research).

After adding or editing any pack content, run `npm run generate:catalog` then `npm run validate`: the validator now fails if `catalog.json` or the wiki catalog has drifted from the pack frontmatter.

Then run `npm run scan`. It runs the engine's [content scan](https://github.com/prototypdigital/bluetemberg/wiki/Registry#content-scan), the same one `bluetemberg add`/`install` apply to every download, over all packs. CI runs it on every pull request. A blocking finding fails the check: a real-looking credential, a command that sends secrets off the machine, hidden Unicode text, or an instruction to disable guardrails. If a rule quotes an attack on purpose, put it in a code fence labelled as a bad example (`**Bad:**`, `❌`) so it is reported as a warning instead.

`generate:catalog` checks each pack on the npm registry and leaves out only packs npm says aren't published: a 404, or a package whose versions were all unpublished. It logs each one as `excluded <pack>: not published on npm (<reason>)`. Network errors, timeouts, 429s, 5xx responses and malformed responses are retried with backoff. If a pack still can't be checked, the script exits 1 and writes neither `catalog.json` nor `Catalog.md`. Re-run it once the registry is reachable.

## Add a new pack

1. Create `packages/bluetemberg-rules-<domain>/` with a `package.json`:

   ```json
   {
     "name": "bluetemberg-rules-<domain>",
     "version": "0.1.0",
     "description": "<Domain> rules for Bluetemberg — <short summary>.",
     "keywords": ["bluetemberg-pack", "rules", "<domain>"],
     "author": "Josip Ravas (https://github.com/jravas)",
     "contributors": ["Prototyp Digital (https://prototyp.digital)"],
     "license": "MIT",
     "repository": {
       "type": "git",
       "url": "git+https://github.com/prototypdigital/bluetemberg-packs.git",
       "directory": "packages/bluetemberg-rules-<domain>"
     },
     "bugs": { "url": "https://github.com/prototypdigital/bluetemberg-packs/issues" },
     "homepage": "https://prototypdigital.github.io/bluetemberg-packs/",
     "files": ["llm/"]
   }
   ```

   The `bluetemberg-pack` keyword is what makes the package discoverable via `bluetemberg search`.

2. Add your rules under `llm/rules/`.
3. Register the pack with release-please so it gets versioned and published: add `"packages/<name>": {}` to `release-please-config.json` and `"packages/<name>": "0.1.0"` to `.release-please-manifest.json`. See [Releasing](Releasing) for the one-time npm bootstrap.
4. Add the pack to `extends` in `bluetemberg.config.json` so it reaches the Claude marketplace. Use a marketplace-only entry, `{ "path": "./packages/<name>", "platforms": ["claude-marketplace"] }`. A plain path string also syncs the pack into this repo's own `.claude/`, which is kept to the pack-authoring tools (the `create-*` and `config-echo` skills and the git, docs, commit-attribution and PR-link rules). `npm run validate` fails if a pack is missing from `extends` or scoped away from `claude-marketplace`.
5. Document the pack in the [Catalog](Catalog) and the [README](https://github.com/prototypdigital/bluetemberg-packs#packs).
6. If the pack should be offered by the `bluetemberg init` wizard, add a matching entry to `RULE_COLLECTION_PRESETS` in the **bluetemberg** repo (`src/init/presets.ts`) — that's a separate PR in that repo.

## Limit a pack to some platforms

A pack that only works in one host declares it in its `package.json`. For example, `pr-review-loop` needs a Claude Code hook and `claude -p`:

```json
"bluetemberg": {
  "universal": false,
  "profiles": ["frontend", "backend"],
  "platforms": ["claude"]
}
```

`npm run generate:catalog` copies the list into the pack's `catalog.json` entry, where the engine reads it (bluetemberg 0.19+). Sync then skips the pack's output for the project's other platforms, and `init` doesn't preselect the pack unless one of its platforms is selected. `claude` covers the `claude-marketplace` plugins too. Content limited to `claude` is left out of `agent-plugins` bundles. Leave the field out (or `[]`) for packs that work everywhere. Ids are the engine's `platforms` config ids: `cursor`, `claude`, `copilot`, `gemini`, `antigravity`, `devin`, `codex`, `claude-marketplace`, `agent-plugins`. `npm run validate` rejects anything else. See the engine's [Profiles → Platforms](https://github.com/prototypdigital/bluetemberg/wiki/Profiles#platforms).

Packs limited to Claude Code today: `bluetemberg-skills-pr-review-loop` (a Claude Code hook plus `claude -p`), and `bluetemberg-agents-session-auditor` and `bluetemberg-skills-session-retrospective` (both read Claude Code transcripts). `bluetemberg-agents-pr-reviewer` isn't tagged: it only needs `gh`, so it works as an on-demand or CI reviewer in any host.

## Map a stack to its npm package

The engine detects a stack (`nextjs`, `payload`, …) from the npm package that carries its version. That stack-to-package map lives in [`stack-packages.json`](https://github.com/prototypdigital/bluetemberg-packs/blob/main/stack-packages.json). `npm run generate:catalog` copies it verbatim into `catalog.json` as `stackPackages`, and the engine (bluetemberg 0.19+) merges it over its built-in table. Edit `stack-packages.json`, never `catalog.json`.

```json
"react-native": { "packages": { "npm": "react-native" } }
```

- The key is the stack name, spelled exactly as packs tag it in `bluetemberg.stacks` and as rules write it in `stacks:` frontmatter.
- `packages.npm` is the package whose installed version *is* the stack's version: the framework's core package, not a CLI or a plugin. Check it on npm before adding it.
- `implies` (optional) lists stacks that always come along, such as `"nextjs": { "implies": ["react"] }`. Adding one changes detection for every project on that stack, so only add stacks that are guaranteed to be installed with it.

`npm run validate` checks the schema, the package names, `implies` targets, that no package is mapped twice, and that `catalog.json` is up to date. The engine auto-detects only stacks in this map (or implied by one). A stack a pack tags but the map leaves out applies only when a project pins its version in config `stacks` (`"skeletor": "1.3.1"`). `"auto"` won't work for it, because the engine then looks for an npm package with the stack's own name. That's deliberate for `skeletor`, which means working on `@prototyp/skeletor` itself, not consuming it. See the engine's [Stacks → Adding a mapping (packs repo)](https://github.com/prototypdigital/bluetemberg/wiki/Stacks#adding-a-mapping-packs-repo).

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
