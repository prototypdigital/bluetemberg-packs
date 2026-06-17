---
description: Use import 'server-only' in modules that must never reach the browser; add 'use client' only when a component genuinely needs browser APIs, events, or state
scope: "**/*.{ts,tsx}"
---

# Next.js server-only boundary

Server-only code (auth secrets, email transport, DB clients) that gets imported into a client component is silently bundled into the browser, leaking secrets and bloating the bundle. Conversely, a stray `'use client'` opts an otherwise-static subtree into client rendering for no reason. Both boundaries should be explicit and minimal.

## Rules

- Add `import 'server-only'` at the top of any module that must never run in the browser (secrets, server SDK clients, privileged data access). It turns an accidental client import into a build error.
- Add `'use client'` only when the component genuinely needs browser APIs, event handlers, or `useState`/`useEffect` — keep it on the smallest leaf, not a whole page.
- Default to Server Components; push `'use client'` down the tree so server data fetching and static rendering stay above the boundary.

## Examples

```ts
// BAD — server module with no guard; importing it from a client component leaks the secret into the bundle
export const oauth = createOAuthClient(process.env.OAUTH_SECRET!)

// GOOD — 'server-only' makes a browser import fail at build time
import 'server-only'
export const oauth = createOAuthClient(getRequiredEnv('OAUTH_SECRET'))
```

```tsx
// BAD — whole page is a client component just for one interactive button
'use client'
export default function ProductPage({ product }) { /* fetch + render + a button */ }

// GOOD — page stays a Server Component; only the interactive leaf is a client component
export default function ProductPage({ product }) {
  return <><ProductInfo product={product} /><AddToCartButton id={product.id} /></>
}
// AddToCartButton.tsx → 'use client'
```

## Gotchas

- `server-only` and `client-only` are real npm packages — install them; they work by throwing in the wrong environment.
- A file with `'use client'` makes every module it imports part of the client bundle too; the boundary is transitive downward.
