# Releasing

All five packs publish to public npm from this repo via GitHub Actions using [npm Trusted Publishing (OIDC)](https://docs.npmjs.com/trusted-publishers) — no long-lived npm token.

## Versioning

Each package carries its own `version` in its `package.json` and is published independently. Bump the version of any pack you changed before releasing. Packs that didn't change keep their version, and `npm publish` skips already-published versions.

- Adding/removing a rule → minor bump (new behavior for consumers).
- Editing rule wording → patch bump.
- A breaking restructure → major bump.

## The publish workflow

`.github/workflows/publish.yml` runs on a published GitHub Release (or manual `workflow_dispatch`):

```yaml
- run: npm install -g npm@latest          # Trusted Publishing needs a recent npm
- run: npm ci
- run: npm publish --workspaces --provenance --access public
```

`--workspaces` publishes every package under `packages/`. `--provenance` attaches a signed provenance statement. npm rejects re-publishing an existing version, so only packs with a bumped version actually publish.

## One-time setup (per the repo owner)

Before the first automated publish:

1. **Enable the wiki** in repo Settings → Features (so the [wiki sync](#wiki) can push).
2. **Create an `NPM` GitHub Environment** in Settings → Environments. The workflow's `environment: NPM` gates the publish job to it.
3. **Register each package as a Trusted Publisher** on npmjs.com:
   - For each of the 5 packages, go to the package page → Settings → Trusted Publishers (or create the package first with a one-time local `npm publish`).
   - Point it at this repo (`prototypdigital/bluetemberg-rules`), the workflow file `publish.yml`, and the `NPM` environment.

Bootstrapping a brand-new package name on npm requires one initial `npm publish` from a maintainer's machine (Trusted Publishing can't create a package that doesn't exist yet). After that, all releases go through CI.

## Cutting a release

1. Bump versions on the packs you changed.
2. Merge to `main`.
3. Create a GitHub Release (tag it however you like — the workflow triggers on `release: published`).
4. The workflow publishes all changed packs to npm with provenance.

## Wiki

This wiki is generated from `docs/wiki/*.md` in the repo. `.github/workflows/sync-wiki.yml` pushes any change under `docs/wiki/` to the GitHub Wiki on merge to `main` — edit the Markdown here, not the wiki directly.
