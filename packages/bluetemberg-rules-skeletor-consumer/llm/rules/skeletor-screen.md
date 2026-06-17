---
description: Wrap every full-screen view in skeletor's Screen (not SafeAreaView + manual StatusBar); use hideTopSafeArea/hideBottomSafeArea for modals and statusBarType/statusBarBackground per screen.
scope: "**/*.tsx"
stacks:
  react-native: ">=0.81"
---

# Use Screen for full-screen views

`Screen` from `@prototyp/skeletor` owns safe-area insets and StatusBar configuration together. Hand-rolling `SafeAreaView` + a separate `StatusBar` per screen duplicates that logic, drifts from the `SkeletorProvider` status-bar defaults, and leaves inconsistent insets across navigation targets.

## Rules

- Use `Screen` as the top-level wrapper for every view you navigate to. It is a screen wrapper, not a generic layout box — use `Block` for everything nested inside it.
- Do not pair raw `SafeAreaView` with a manual `<StatusBar />` to build a screen. `Screen` handles both.
- For modals or sheets that should bleed to an edge, opt out of insets with `hideTopSafeArea` / `hideBottomSafeArea` rather than removing `Screen`.
- Set per-screen status bar appearance with `statusBarType` (`"light-content"` | `"dark-content"`) and `statusBarBackground`; use `statusBarTranslucent` to draw under the bar. Let screens that match the app default inherit from `SkeletorProvider` instead of restating it.
- Set the backdrop via `background` (a color value or a full-bleed node), not by nesting an absolutely-positioned `View`.

## Examples

```tsx
// BAD — manual SafeAreaView + StatusBar; insets and bar config restated per screen,
// inconsistent across the app and ignoring SkeletorProvider defaults
import { SafeAreaView, StatusBar } from "react-native";

function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* ... */}
    </SafeAreaView>
  );
}

// GOOD — Screen owns safe area + status bar; only override what differs from the default
import { Screen } from "@prototyp/skeletor";

function ProfileScreen() {
  return (
    <Screen statusBarType="dark-content" background="#fff">
      {/* ... */}
    </Screen>
  );
}

// GOOD — modal that bleeds under the bottom inset
<Screen hideBottomSafeArea statusBarType="light-content">
  {/* ... */}
</Screen>
```

## Gotchas

- `Screen` is not a layout primitive — nesting one `Screen` inside another, or using it to wrap a sub-section, breaks inset handling. One `Screen` per navigated view.
- `background` accepts either a `ColorValue` or a React node; a custom background node should be 100% width and height or it will not fill the screen.
- Safe-area handling relies on the `react-native-safe-area-context` peer dependency and its provider being mounted above the navigator — if insets read as zero, that provider is missing.
