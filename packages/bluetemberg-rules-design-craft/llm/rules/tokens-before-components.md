---
description: Lock the visual system (palette, type, spacing) as tokens before building UI, and re-state them every refinement to prevent token drift.
scope: "**/*.{tsx,jsx,ts,js,vue,svelte,astro,css,scss,html}"
---

# Tokens before components

When the visual system is specific — a real palette, a distinctive type pairing, an opinionated spacing scale — everything built from it inherits that personality automatically. Define the tokens first; then build to them. Components without a locked system drift toward defaults.

## Patterns

- Establish design tokens (colors as hex, type as font/size/weight/line-height/letter-spacing, a numbered spacing scale, radii) before generating components.
- Pass the tokens as explicit values in build prompts. The model reads exact values from text, never from a screenshot.
- Re-paste the tokens in every refinement, even when it feels redundant — they fade from active context and the model reaches for "standard" values (a default blue, a uniform padding) when it can no longer see them.
- Reuse existing shared tokens and components before introducing new ones; keep naming consistent across the workspace.

## Token drift

The classic failure: the first build looks right, then three prompts later a color has quietly become a standard blue. The cause is tokens falling out of context. The fix is restating them — or starting a fresh session with the working version and tokens pasted in.
