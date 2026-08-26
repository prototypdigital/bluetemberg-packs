---
description: Generate every figure in a deliverable from source data; never type a number into a slide by hand.
scope: "**"
---

# No hand-typed figures

Numbers reach a slide, a report or a README through a generator, never through a keyboard.

**Why:** a hand-typed number is correct exactly once, at the moment it is typed. The analysis then
changes, and the figure silently becomes a lie that nobody notices because it looks the same as
before. A generated figure either updates or fails loudly, and both outcomes are better than stale.

## Rules

- Analysis writes structured output (CSV, JSON). The deliverable **imports** it. There is no third
  place where numbers live.
- Recomputing must be one command, and it runs as part of build: `npm run data && build`.
- **Arithmetic belongs in the pipeline, not the template.** A template computes nothing; it formats.
- If a figure cannot be derived from committed data, it does not belong on a slide.
- The pipeline **prints its headline figures** when it runs, so a wrong number is visible immediately
  rather than at the podium.
- Regenerating with unchanged inputs must produce an identical artifact. No timestamps, no ordering
  drift.

## BAD

```md
<!-- slides.md -->
23.4 hours of reading per active day
77.5% of merged code above the ceiling
```

Both correct on the day they were typed. Then the window extends by a week and both are wrong, with
nothing to signal it.

```vue
{{ (deck.words / 1e6).toFixed(1) }} million words
```

Arithmetic in a template. Also breaks the Vue compiler, which parses `/` as the start of a regex
literal, so the failure is a confusing build error rather than a wrong number.

## GOOD

```js
// scripts/build-data.mjs — the only place arithmetic happens
const words = Math.round(outputTokens * WORDS_PER_TOKEN)
const readingHours = words / WPM / 60
out.theNumber = {
  hoursPerActiveDay: +(readingHours / activeDays).toFixed(1),
  millionWords: +(words / 1e6).toFixed(1),   // precomputed for the template
}
console.log(`THE NUMBER: ${out.theNumber.hoursPerActiveDay} h per active day`)
```

```md
{{ deck.theNumber.hoursPerActiveDay }} hours of reading per active day
{{ deck.theNumber.millionWords }} million words
```

```json
{
  "scripts": {
    "data": "node scripts/build-data.mjs",
    "build": "npm run data && slidev build"
  }
}
```

## Gotchas

- **Prose is exempt until it contains a number.** The moment a sentence says "roughly a thousand a
  day", it is a figure and needs generating or deleting.
- **Generated output belongs in `.gitignore`**, with the generator and its inputs committed. Two
  sources of truth is worse than one hand-typed number.
- **A round number in prose still needs to match the data.** "about a thousand" against a generated
  989 is fine; against 640 it is not.
- Constants that come from cited research (a reading rate, a review ceiling) live in the pipeline as
  named constants with the citation in a comment, so the derivation is auditable.
