---
description: Manage RN form state and validation with skeleform's useForm/useFormUtils (from @prototyp/skeletor) instead of re-implementing controlled state with per-field useState and ad-hoc validation.
scope: "**/*.tsx"
stacks:
  react-native: ">=0.81"
---

# Use skeleform for form state

`skeleform` (`useForm` / `useFormUtils`, exposed via `@prototyp/skeletor`) gives forms a single state object, an update function, and validation wiring. Re-building that with a `useState` per field plus hand-written validation duplicates the library's contract, scatters validity logic across handlers, and pairs poorly with skeletor inputs that expect `value` / `valid` / update callbacks.

## Rules

- Use `useForm` for form state, validation, and field updates instead of one `useState` per field. Drive each input from the form's state and `update(field, value)` rather than separate setters.
- Wire validation through the form's validation config (and `useFormUtils` helpers) rather than recomputing `isValid` inline in JSX or in each `onChangeText`.
- Feed skeletor input props from the form: `value={state.email}`, `valid={validation.email}`, `onChangeText={(t) => update("email", t)}`. Don't bypass the form to read/write a field's `useState` directly.
- Reach for `skeleform` whenever it covers the use case; only drop to manual state for a genuinely trivial single field or a case `skeleform` cannot express — and say why.

## Examples

```tsx
// BAD — a useState per field, validation recomputed by hand in JSX, update logic
// duplicated across every onChangeText; validity drifts out of sync with the inputs
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const emailValid = /\S+@\S+\.\S+/.test(email);

return (
  <Input value={email} valid={emailValid} onChangeText={setEmail} />
);

// GOOD — one form object, declared validation, inputs driven from state + update
import { useForm } from "@prototyp/skeletor";

const { state, validation, update } = useForm(
  { email: "", password: "" },
  { /* validation config */ },
);

return (
  <Input
    value={state.email}
    valid={validation.email}
    onChangeText={(text) => update("email", text)}
  />
);
```

## Gotchas

- `skeleform` is documented separately ([prototypdigital/skeleform](https://github.com/prototypdigital/skeleform)) and re-exported through skeletor's hooks — import from `@prototyp/skeletor` unless the project pins `@prototyp/skeleform` directly.
- Pair this with `InputFocusScrollView` (iOS) so focused inputs scroll above the keyboard — `skeleform` owns the state, the scroll view owns the focus positioning; they're complementary, not alternatives.
- The exact validation-config and `useFormUtils` shape can change across versions — confirm the current signature from the package types rather than assuming, since this hook is the form's contract.
