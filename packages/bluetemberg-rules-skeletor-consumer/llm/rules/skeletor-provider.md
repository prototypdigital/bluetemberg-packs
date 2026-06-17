---
description: Wrap the app root in SkeletorProvider once, declare the Font union in @types/Font.d.ts, and set defaultFont/defaultFontSize/defaultTextColor and status-bar defaults there, not per component.
scope: "**/*.{ts,tsx}"
stacks:
  react-native: ">=0.81"
---

# Configure SkeletorProvider once at the root

`SkeletorProvider` is the single source of truth for the app's default font, font size, text color, and status-bar behavior. Skipping it (or restating those defaults on every `Text`/`Screen`) means `Block`/`Text`/`Screen` fall back to library defaults and the app's typography drifts component-by-component.

## Rules

- Mount `SkeletorProvider` once, as one of the top-most wrappers of the app (above navigation and stores). Skeletor primitives outside its tree get library defaults, not your design.
- Declare the available fonts as a global `Font` union in `@types/Font.d.ts` so `font` props are typed to your real font files:
  `type Font = "Helvetica" | "Roboto" | "San Francisco";`
- Set `defaultFont`, `defaultFontSize` (`[fontSize, lineHeight]` or a single number), and `defaultTextColor` on the provider — these become the baseline for every `Text`. Don't repeat them on individual components that match the default.
- Set app-wide status bar defaults on the provider (`defaultStatusBarType`, `defaultStatusBarBackground`, `defaultStatusBarTranslucent`); override per-screen on `Screen` only where a screen genuinely differs (see `skeletor-screen`).
- Read config elsewhere with the `useSkeletor()` hook instead of importing constants or re-declaring values — e.g. `useSkeletor().defaultFont`.
- Use `allowFontScaling` / `defaultMaxFontSizeMultiplier` on the provider to control accessibility text scaling globally rather than per-component.

## Examples

```tsx
// BAD — no provider config; every Text restates font/size/color, so changing the
// brand font means editing every component, and untouched ones keep library defaults
function App() {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
// elsewhere, repeated everywhere:
<Text font="Helvetica" size={[16, 22]} color="#1a1a1a">Title</Text>

// GOOD — defaults declared once; components only specify what differs
// @types/Font.d.ts
type Font = "Helvetica" | "Roboto";

// App.tsx
import { SkeletorProvider } from "@prototyp/skeletor";

function App() {
  return (
    <SkeletorProvider
      defaultFont="Helvetica"
      defaultFontSize={[16, 22]}
      defaultTextColor="#1a1a1a"
      defaultStatusBarType="dark-content"
    >
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SkeletorProvider>
  );
}
// elsewhere — inherits the defaults:
<Text>Title</Text>
```

## Gotchas

- `Font.d.ts` must live where the TS config picks up ambient declarations (commonly `@types/`); if `font` props still type as `string`, the file isn't being included by `tsconfig`.
- `defaultStatusBarBackground` defaults to transparent and `defaultStatusBarTranslucent` to `false` when unset — set them explicitly if the app needs a colored or translucent bar everywhere.
- The provider sets defaults, not hard limits — a component can still override `font`/`size`/`color` when it legitimately differs; the rule is against restating the *default* value, not against intentional variation.
