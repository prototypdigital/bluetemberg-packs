---
description: Define every Tailwind design token as a CSS variable in the @theme block (colors in OKLch); never hardcode values in class names or inline styles
scope: "**/*.{tsx,css,ts}"
---

# Tailwind theme tokens

Hardcoded color/spacing/size values scattered across class names and inline styles drift apart and can't be re-themed in one place. A single `@theme` block of CSS variables is the source of truth Tailwind 4 generates utilities from — bypass it and the design system stops being a system.

## Rules

- Define all design tokens — colors, fonts, spacing, text sizes, radii — as CSS variables inside the `@theme` block. Never write a raw value (`#1a1a1a`, `17px`, `1.375rem`) in a class name or `style={{}}`.
- Express colors in **OKLch** (`oklch(L C H)`), not hex or `rgb()` — OKLch is perceptually uniform, so lightness/chroma adjustments stay visually consistent.
- Reference tokens through the generated utilities (`bg-brand`, `text-muted`) or `var(--color-brand)`; do not re-declare a token's value inline.
- A genuinely one-off value still goes through the theme (add a token) rather than an arbitrary inline literal.

## Examples

```css
/* BAD — raw hex, arbitrary value baked into a class; not themeable */
.hero { background: #0a2540; }
/* <div className="bg-[#0a2540] text-[17px]"> */

/* GOOD — tokens in @theme, expressed in OKLch */
@theme {
  --color-brand: oklch(0.28 0.07 250);
  --text-body: 1.0625rem;
}
/* <div className="bg-brand text-body"> */
```

## Gotchas

- Tailwind 4's arbitrary-value syntax (`bg-[#...]`, `p-[13px]`) is the escape hatch this rule closes — treat any `[...]` literal in a class as a missing token.
- Converting an existing hex palette: use a hex→OKLch tool once at token-definition time; don't leave both representations in the file.
