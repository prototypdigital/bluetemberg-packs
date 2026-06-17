---
name: nextjs-caching
description: Next.js caching/ISR: unstable_cache keyParts vs tags, direct revalidateTag, the ISR cache handler, force-static vs force-dynamic. Use when editing unstable_cache, revalidateTag, or render mode.
---

# nextjs-caching

Use this skill when you touch the Next.js framework caching layer: an `unstable_cache` call, a `revalidateTag` site, the ISR cache handler, a page's `dynamic`/`revalidate` export, or a cached media URL. This is the **framework** layer — distinct from `payload-cache-revalidation`, which owns the Payload hook side. The goal: cache keys and revalidation tags never drift, and a page's render mode matches how its data actually changes.

## Triggers

- Adding or editing an `unstable_cache(fn, keyParts, { tags })` call.
- Adding or editing a `revalidateTag()` / `revalidatePath()` call site.
- Wiring or changing the ISR cache handler (`cacheHandler` in `next.config.js`, `cache-handler.mjs`).
- Choosing or changing a page's `export const dynamic` / `revalidate`.
- Rendering a CMS/media URL that must invalidate when the asset changes.

## Protocol

### Step 1 — Split keyParts from tags correctly

`keyParts` define cache *identity* (a distinct entry per combination). `tags` define cache *invalidation* (what a `revalidateTag` busts). They answer different questions — keep them separate.

```text
What varies the rendered bytes?      → goes in keyParts (e.g. slug + locale + depth)
What should one edit invalidate?     → goes in tags     (e.g. slug + locale, depth-agnostic)
```

```ts
// BAD — depth in the tag means an edit only busts one depth; other depths stay stale
unstable_cache(fn, ['model', slug, locale, depth], { tags: [`model_${slug}_${locale}_${depth}`] })

// GOOD — depth distinguishes entries (keyParts) but the tag is depth-agnostic, so one edit busts all
unstable_cache(fn, ['model', slug, locale, depth], { tags: [cacheTags.model(slug, locale)] })
```

### Step 2 — Revalidate directly in the hook, not via HTTP

Call `revalidateTag(cacheTags.x(...))` directly from the Payload hook / server action. Reaching for an HTTP round-trip to a `/revalidate` endpoint only makes sense when invalidation must cross a process boundary that does not share the cache store.

```text
Same process & shared cache store?
  YES → call revalidateTag() directly
  NO  → call the revalidate endpoint (document why the boundary exists)
```

### Step 3 — Cache handler: Redis in prod, LRU fallback, singleton

The ISR cache handler is shared across requests — instantiate it once.

- Production uses Redis via `CACHE_URL`; fall back to an in-memory LRU when it is absent (local/dev).
- Build the client through a singleton so each lambda/worker reuses one connection.
- Wire it in `next.config.js`: set `cacheHandler` to the module and `cacheMaxMemorySize: 0` to disable Next's default in-memory cache (the handler owns caching).

### Step 4 — Pick the render mode by how the data changes

```text
Page data is per-request / user-specific (auth, search params)?  → force-dynamic
Page data changes only on CMS edits?                             → force-static + tag-based revalidation
Page data changes on a fixed cadence?                            → export const revalidate = N
```

Default content pages to `force-static` + `revalidateTag`, not `force-dynamic` — dynamic opts the page out of the CDN on every request.

### Step 5 — Bust media URLs with `updatedAt`

A CMS asset served from a stable URL stays cached by the CDN even after re-upload. Append the document's `updatedAt` as a query param so the URL changes when the asset does.

```ts
// GOOD — CDN sees a new URL when the asset is replaced
const src = `${media.url}?v=${encodeURIComponent(media.updatedAt)}`
```

## Completion checklist

- [ ] Everything that varies the output is in `keyParts`; tags are scoped to what one edit should invalidate (no over-specific tags)
- [ ] Tag strings built through the shared `cacheTags` source of truth, never hardcoded
- [ ] `revalidateTag` called directly unless a process boundary genuinely requires an endpoint
- [ ] Cache handler is a singleton: Redis via `CACHE_URL` with LRU fallback; `cacheMaxMemorySize: 0` set
- [ ] Render mode matches data volatility (`force-static` + tags for CMS content, not `force-dynamic`)
- [ ] Cached media URLs carry an `updatedAt` cache-buster

## When NOT to use

- The change is the Payload **hook** side (which collection busts which tag) — that is `payload-cache-revalidation`.
- A route that is intentionally always-dynamic with no `unstable_cache` and no tags.
