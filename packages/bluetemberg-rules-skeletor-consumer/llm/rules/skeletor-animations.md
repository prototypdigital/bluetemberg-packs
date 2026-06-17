---
description: Build animations with skeletor's animate hooks (useAnimateSequence/Parallel/Stagger, useAnimationTimeline, useLoopAnimation) and apply them via the animations prop on Block/Text, not raw Animated.
scope: "**/*.tsx"
stacks:
  react-native: ">=0.81"
---

# Use skeletor animation utilities

Skeletor's animation helpers compile element animations, run them on the native driver, and hand `Block`/`Text` an `animations` prop ready to interpolate. Hand-rolling `Animated.Value` + `Animated.timing`/`Animated.sequence` re-implements that boilerplate, is easy to get wrong on the native driver, and skips the `reverse`/timeline ergonomics the library provides.

## Rules

- Define element animations with `animateParallel`, `animateSequence`, or `animateStagger`. Use the `useAnimate*` hook variants (`useAnimateParallel` / `useAnimateSequence` / `useAnimateStagger`) when the animation is created inside a component so it is scoped to that component's lifecycle.
- Schedule multiple element animations with `useAnimationTimeline` (or `createAnimationTimeline`) keyed by start time in ms — don't chain `Animated.sequence`/`Animated.parallel` by hand.
- Apply the result with the `animations` prop on `Block`/`Text` (`<Block animations={element.animations}>`), not by spreading values into a raw `Animated.View` style.
- For continuous loops use `useLoopAnimation` (or wrap with `loopAnimation`) — do not pass `loop` into a global `animate*` call and do not reach for `Animated.loop` directly (it has the backgrounded-app performance issue this wraps).
- To animate back to initial values, call `element.reverse()`; use `element.reset()` only to snap back without playback.
- Create global (non-hook) animations in module scope, reset them properly, and don't share one animation instance across multiple elements — that links their state together.

## Examples

```tsx
// BAD — raw Animated boilerplate: manual value, manual sequencing, manual interpolation,
// easy to leave off the native driver and re-implemented on every screen
import { Animated, Easing } from "react-native";

const opacity = useRef(new Animated.Value(0)).current;
useEffect(() => {
  Animated.timing(opacity, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: true }).start();
}, []);
return <Animated.View style={{ opacity }}>{/* ... */}</Animated.View>;

// GOOD — skeletor helper + animations prop
import { Block } from "@prototyp/skeletor";
import { useAnimateParallel } from "@prototyp/skeletor";

const intro = useAnimateParallel(
  { opacity: [0, 1], translateY: [20, 0] },
  { duration: 400 },
);
useEffect(() => { intro.start(); }, []);
return <Block animations={intro.animations}>{/* ... */}</Block>;

// GOOD — continuous loop via useLoopAnimation, not Animated.loop
const rotate = useLoopAnimation(
  useAnimateSequence({ rotation: ["0deg", "360deg"] }, { duration: 1000, easing: Easing.linear }),
);
useEffect(() => { rotate.start(); }, []);
return <Block animations={rotate.animations}>{/* ... */}</Block>;
```

## Gotchas

- `useAnimation` / the old `useAnimationTimeline` stagger/parallel/sequence config is the deprecated pre-1.0.10 API and was removed in ≥1.1.7 — use the `animate*` helpers and `createAnimationTimeline` instead.
- Looped animations run on the JS driver (not native) by design, to avoid the backgrounded-app issue — keep looped work cheap.
- A `loopAnimation` start call takes no `onFinished` handler (it never finishes); don't pass one.
- When you must animate a non-skeletor `Animated.View`, transform values (`scale`, `rotate`, `translate*`) have to go inside the `transform` style array, not as top-level style keys.
