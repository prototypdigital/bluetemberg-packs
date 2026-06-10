# bluetemberg-rules

Official rule packs for [Bluetemberg](https://github.com/prototypdigital/bluetemberg). Each pack is a standalone npm package of vendor-neutral rules that Bluetemberg syncs into Cursor, Claude Code, GitHub Copilot, Gemini, and Windsurf.

This wiki is the contributor- and maintainer-facing documentation. For a quickstart and the pack list, see the [README](https://github.com/prototypdigital/bluetemberg-rules#readme).

## Pages

- [Catalog](Catalog) — every pack and every rule, described
- [Usage](Usage) — installing packs, overriding rules, troubleshooting
- [Contributing](Contributing) — add or edit a rule, add a new pack
- [Releasing](Releasing) — versioning and the npm publish flow

## How this relates to Bluetemberg

| Repo | Owns |
| ---- | ---- |
| [bluetemberg](https://github.com/prototypdigital/bluetemberg) | The **engine** — the CLI, the sync transforms, the registry commands (`add`, `install`, `update`, `search`), the manifest/lockfile format. |
| **bluetemberg-rules** (here) | The **content** — the official rule packs, their rules, and how they're developed and released. |

If you're looking for how the registry mechanics work (manifest, lockfile, priority resolution, the programmatic API), that's documented in the [Bluetemberg Registry wiki](https://github.com/prototypdigital/bluetemberg/wiki/Registry).
