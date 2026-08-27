---
description: A contrast ratio written beside a token is a claim about one specific hex; recompute it whenever the hex changes, never carry it over.
scope: "**/*.{tsx,jsx,ts,js,vue,svelte,astro,css,scss,html,md}"
---

# Contrast claims go stale

A locked design document records tokens *and* the contrast ratios that justify them — `--accent #CE7B5B, 4.7:1 — AA, safe for large text`. That ratio is a measurement of one hex against one background. Replace the hex and the sentence around it stays true-looking and becomes false. This is token drift's quieter sibling: the colour change gets reviewed, and the number nobody re-derived rides along behind it.

It survives review because it stays plausible. A ratio does not become absurd when a colour changes — it moves by a point or two, still reads like a number someone computed, and every usage that was already passing usually keeps passing. Nothing looks broken, so nothing gets checked.

## Patterns

- Treat every recorded ratio as **coupled to a specific hex pair**. Changing either side invalidates it. There is no such thing as inheriting a ratio.
- Recompute from the **computed colours**, not from the token names, and put the recompute in the same commit as the colour change — never a follow-up.
- Record the **background** each ratio was measured against. `4.7:1` alone is not a claim, it is half of one.
- When a ratio moves, re-check every **usage** of that token, not just the token: the threshold depends on the text size at each site, so one colour can pass in three places and fail in a fourth.
- Prefer a script over a colour-picker round trip, so recomputing is cheap enough to actually happen.
- If a ratio cannot be recomputed right now, delete it rather than leave it. A missing number invites a check; a wrong one prevents it.

## Examples

```text
// BAD — the colour changed, the justification did not
- --accent: #CE7B5B  /* 4.7:1 on --bg — AA, safe for large text */
+ --accent: #926aa6  /* 4.7:1 on --bg — AA, safe for large text */
→ actual ratio is 3.43:1. The comment is now false, and it reads exactly as
  authoritative as it did when it was true.

// GOOD — recomputed against the real ground, in the same commit
+ --accent: #926aa6  /* 3.43:1 on #272729 — clears 3:1 for large text and
                        non-text UI only. Never on body-size text. */
→ and every --accent usage re-checked against its own size threshold
```

Recompute with the WCAG relative-luminance formula rather than trusting a memory of it:

```js
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const L = (hex) =>
  [0, 2, 4]
    .map((i) => lin(parseInt(hex.slice(1 + i, 3 + i), 16) / 255))
    .reduce((a, c, i) => a + [0.2126, 0.7152, 0.0722][i] * c, 0);
const ratio = (a, b) =>
  (Math.max(L(a), L(b)) + 0.05) / (Math.min(L(a), L(b)) + 0.05);
```

## The thresholds are per-usage, not per-token

A token does not "pass". A token *at a size* passes. WCAG 2.2 AA wants 4.5:1 for normal text, 3:1 for large text (≥ 18pt / 14pt bold) and for non-text UI. So a 3.43:1 accent is correct on a 60px display heading and on a 9px marker square, and wrong the moment it lands behind body copy — including places that are easy to forget, like `::selection`, placeholder text, and disabled states.

When the ratio moves, walk the usages. That is where the real regression hides, not in the token block.

## Why it matters

The point of writing ratios down is so nobody re-litigates the palette. A stale ratio inverts that: the document now actively vouches for a value it never measured, and the next person builds on it in good faith.
