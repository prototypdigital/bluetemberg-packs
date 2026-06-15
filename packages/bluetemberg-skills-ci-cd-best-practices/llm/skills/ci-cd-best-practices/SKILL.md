---
name: ci-cd-best-practices
description: Audit CI/CD pipeline configuration with a step-by-step checklist for caching, version pinning, job ordering, parallelism, and deploy gates.
---

# ci-cd-best-practices

Use this skill when creating or modifying CI/CD pipeline configuration.

## Triggers

- New or modified GitHub Actions, GitLab CI, or similar workflow files
- Build performance complaints or flaky pipeline investigation
- Adding new jobs, steps, or deployment stages

## Protocol

### Step 1 — Pin every version (security + reproducibility)

Never use `latest` or a floating tag for actions or container images.

```yaml
BAD:
  - uses: actions/checkout@latest
  - uses: docker://node:latest

GOOD:
  - uses: actions/checkout@v4.1.1
  - uses: docker://node:20.12.2-alpine
  # For third-party actions, pin to a commit SHA:
  - uses: some-org/some-action@a1b2c3d4e5f6...  # v2.3.1
```

### Step 2 — Cache dependency installs

Every job that installs dependencies must cache them. Without caching, each run re-downloads the entire dependency tree.

```yaml
BAD:
  steps:
    - run: npm ci

GOOD (GitHub Actions):
  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'         # caches ~/.npm automatically
    - run: npm ci
```

For multi-workspace monorepos, cache keys must include the lock file hash:

```yaml
  - uses: actions/cache@v4
    with:
      path: ~/.npm
      key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
      restore-keys: ${{ runner.os }}-npm-
```

### Step 3 — Enforce the deploy gate

Lint, type-check, and tests MUST all pass before any deploy step can run. Use `needs:` to enforce order.

```yaml
BAD:
  jobs:
    test:   { ... }
    deploy: { ... }    # runs in parallel with test — can deploy broken code

GOOD:
  jobs:
    lint:    { ... }
    typecheck: { ... }
    test:
      needs: [lint, typecheck]
    deploy:
      needs: [test]
      if: github.ref == 'refs/heads/main'
```

### Step 4 — Parallelize independent jobs

Jobs with no dependency between them should run concurrently to reduce wall-clock time.

```yaml
BAD (sequential):
  jobs:
    ci:
      steps:
        - run: npm run lint
        - run: npm run typecheck
        - run: npm test

GOOD (parallel):
  jobs:
    lint:      { steps: [{ run: npm run lint }] }
    typecheck: { steps: [{ run: npm run typecheck }] }
    test:      { steps: [{ run: npm test }] }
    deploy:    { needs: [lint, typecheck, test] }
```

### Step 5 — Use path filters to skip irrelevant runs

On monorepos or repos with multiple concerns, avoid running the full pipeline for unrelated changes.

```yaml
on:
  push:
    paths:
      - 'src/**'
      - 'package*.json'
      - '.github/workflows/ci.yml'
    paths-ignore:
      - 'docs/**'
      - '**.md'
```

### Step 6 — Surface failures clearly

- Set `continue-on-error: false` (the default) — never mask failures with `true` in core jobs.
- Upload test reports or coverage as artifacts so failures are readable without reading raw logs.
- Use concurrency groups to cancel stale runs when a newer push supersedes them:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Pipeline audit checklist

- [ ] All action versions and container images are pinned (no `latest`)
- [ ] Dependency install steps have a cache configured with a lock-file-hash key
- [ ] Deploy jobs have `needs:` pointing to lint + typecheck + test
- [ ] Independent jobs run in parallel (no artificial sequencing)
- [ ] Path filters skip irrelevant workflows on documentation or unrelated changes
- [ ] `continue-on-error: true` is not set on any core quality gate job
- [ ] Concurrency group set to cancel stale runs

## When NOT to use

- Application code changes that don't touch pipeline configuration files
- Local development tooling setup (pre-commit hooks, editor configs)
