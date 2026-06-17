---
description: In @prototyp/skeletor apps, use Block and Text instead of raw View/ScrollView/Text, and express spacing/flex/size/border through skeletor style props rather than inline StyleSheet.create.
scope: "**/*.tsx"
stacks:
  react-native: ">=0.81"
---

# Use skeletor Block/Text primitives

`@prototyp/skeletor` wraps the raw React Native primitives with the project's spacing/flex/size/border prop conventions and `SkeletorProvider`-driven font and color defaults. Reaching for raw `View`/`ScrollView`/`Text` and `StyleSheet.create` bypasses those defaults, hard-codes values the provider already owns, and drifts the screen away from the rest of the codebase.

## Rules

- Use `Block` (from `@prototyp/skeletor`) instead of raw `View`. Pass `scrollable` (and `scrollProps` for `ScrollView` config) instead of importing `ScrollView`.
- Use skeletor `Text` instead of React Native `Text`. Let `font`, `size`, and `color` fall back to the `SkeletorProvider` defaults — only set them when this element genuinely differs.
- Express layout through props, not inline styles: `paddings`/`margins`/`gap` (Spacing), `flex`/`align`/`justify`/`flexDirection` (Flex/Alignment), `width`/`height`/`min*`/`max*` (Size), `border` (Border), `absolute`/`offsets`/`zIndex` (Position). Shorthands like `paddings={[20, 0]}` and `margins={16}` mirror CSS ordering.
- Do not write `StyleSheet.create` for layout that skeletor props already cover. Reserve raw styles for properties skeletor does not expose.
- Wrap `Text` in a `Block` when it must wrap correctly inside a flex layout.
- Import these primitives from `@prototyp/skeletor`, never from `react-native`.

## Examples

```tsx
// BAD — raw RN primitives + inline StyleSheet; ignores SkeletorProvider defaults,
// hard-codes font/color, and re-implements spacing/flex by hand
import { View, Text, StyleSheet } from "react-native";

function Card() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Hello</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { padding: 20, flexDirection: "row", justifyContent: "space-between" },
  title: { fontFamily: "Helvetica", fontSize: 16, color: "#333" },
});

// GOOD — skeletor primitives; layout via props, font/color from the provider
import { Block, Text } from "@prototyp/skeletor";

function Card() {
  return (
    <Block paddings={20} flexDirection="row" justify="space-between">
      <Text>Hello</Text>
    </Block>
  );
}
```

## Gotchas

- `gap` accepts `{ row, col }`, a `[row, col]` tuple, or a single number — don't reach back to manual margins to space children.
- A scrollable `Block` is still a `Block`; pass `scrollProps` for things like `keyboardShouldPersistTaps`, don't swap in a raw `ScrollView`.
- Skeletor props cover layout, not everything — genuinely component-specific visual styles (e.g. `shadow*`, gradients) may still need a `style` prop or a dedicated component; that's fine, it's not a reason to abandon `Block`.
