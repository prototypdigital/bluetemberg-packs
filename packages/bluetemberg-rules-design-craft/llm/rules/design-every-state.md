---
description: Design and build every screen state — empty, loading, error, success — with real content, never just the default with lorem ipsum.
scope: "**/*.{tsx,jsx,ts,js,vue,svelte,astro,html}"
---

# Design every state

The default state is the easy one. The interesting states are the empty screen a brand-new user sees with nothing loaded, the call that fails, the request still in flight. Skipping them is the most common way a built UI feels unfinished. Lorem ipsum hides this — if you can't write the real empty-state copy, the screen isn't fully thought through.

## Patterns

- For every screen, enumerate its states: default, loading, empty, error, success, and any partial states specific to it.
- Build at minimum the empty, loading, and error states — not just the happy path.
- Write real content for every state, including the empty and error states. No placeholder text, no lorem ipsum.
- Failure UI is real UI: say what failed and what the user can do, in the project's voice. Not "Error 500", not an apology.

## Why it matters

States that get skipped are the ones users hit first and remember worst. Real content forces the design to be honest about what each state actually says.
