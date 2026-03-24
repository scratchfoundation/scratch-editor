# Agent Guide: scratch-blocks

## Agent defaults

Use these defaults unless the user asks otherwise:

1. Keep changes minimal and scoped to the user request.
2. Prefer fixing root causes over adding surface-level assertions.
3. Never edit `node_modules/blockly/`; extend/override from `src/` instead.
4. When adding runtime guards for states that should never happen, log actionable context unless the path is expected
   control flow.
5. When fixing a bug, start by adding one or more tests to reproduce the issue, then implement the fix. Iterate until
   all tests pass, including but not limited to the new tests.

## What this repository is

`scratch-blocks` is a TypeScript library that provides the visual block editor for Scratch. It is **not** a fork of
Blockly — it is a library that **depends on** Blockly as an npm dependency and extends it with Scratch-specific block
definitions, fields, rendering, events, UI components, and variable/procedure management.

The compiled output (`dist/main.mjs`) is consumed by components in the `scratch-editor` mono-repo to render the block
palette and workspace.

## Build and lint

```sh
npm run build        # Compile TypeScript and bundle with webpack → dist/main.mjs
npm run format       # Auto-format code
npm run test:lint    # Check for lint and formatting issues (does not run other tests)
npm run test         # Run unit and browser tests (but not lint)
npm run test:unit    # Run unit tests only
npm run test:browser # Run browser tests only
```

## Repository layout

```text
src/
├── blocks/        Block definitions for each Scratch category
├── events/        Custom Blockly event subclasses
├── fields/        Custom Blockly field subclasses
├── renderer/      Custom renderer (ScratchRenderer) + cat blocks variant
└── index.ts       Entry point; registers everything with Blockly
```

Key top-level files: `procedures.ts`, `variables.ts`, `data_category.ts`,
`scratch_continuous_toolbox.ts`, `checkable_continuous_flyout.ts`, `scratch_comment_bubble.ts`.

## Blockly is a read-only dependency

The scratch-blocks codebase extends Blockly, but we do not control the Blockly source. Treat files under
`node_modules/blockly/` as read-only.

- If your change can be implemented by extending or overriding Blockly without modifying it, do that.
- If a Blockly change seems necessary, flag it to the human reviewer so they can decide whether to open a Blockly
  issue or PR.

## Terminology

Blockly and Scratch have some overlapping but not identical terminology. These terms sometimes collide in Scratch
Blocks, so here are some definitions to clarify:

- Blockly's "Theme" matches up with Scratch's "Color Mode" — it defines block/category colors and can also affect
  styling of other Blockly UI components. Examples of Scratch's color modes include "default" and "high contrast".
- Scratch's "Theme" is an orthogonal concept. Examples of Scratch's themes include "classic" and "cat blocks". To
  disambiguate this from Blockly themes, we refer to this with `scratchTheme` in the `scratch-blocks` codebase.
- Scratch's block workspace or scripting area is the main Blockly workspace, but it isn't the only Blockly workspace.
  Try to avoid using Blockly's `getMainWorkspace()` method, and instead try to retrieve or pass around a workspace
  reference associated with the object or event in question.
- Scratch's "block palette" is called the "toolbox" in Blockly, and is implemented with the flyout, which hosts a
  secondary Blockly workspace (a concept that Scratch glosses over).

## When managing npm dependencies

To install existing dependencies, use `npm ci` rather than `npm install` to ensure you get the exact versions
specified in `package-lock.json`.

When installing a new dependency or updating an existing one, run `npm install some-package@new-version` to update
both `package.json` and `package-lock.json` in one step.

Keep `package.json` in canonical order. In particular, make sure to alphabetize each dependency block (e.g.,
`dependencies`, `devDependencies`) and the `scripts` block.

## When adding runtime safety checks

When adding runtime checks for states that should never happen (including guard-driven early returns), avoid silent failure:

- Log a warning or error with enough context to debug (function path, block/event id, key flags).
- Use `console.warn` for recoverable states and `console.error` for invalid required data.
- Keep logs specific and consistent (e.g., include function or class context in the message).
- Do not add noisy logs for expected control flow (e.g., optional constructor args used by `fromJson`).

## TypeScript guidelines

### Avoid `any`

Do not use `any` as a type annotation. Prefer proper types, `unknown`, or a union. When calling into Blockly APIs
that have weak types, add a local cast (`as ConcreteType`) with a comment explaining the narrowing rather than
propagating `any` throughout the caller.

### Non-null assertions (`!`)

Do not use `!` unless you genuinely know — in a way the compiler cannot prove — that a value is non-null. Prefer:

- A type guard with early return: `if (!x) return;`
- Optional chaining for best-effort reads: `node?.getAttribute(...)`
- Nullish coalescing for fallbacks: `value ?? default`

If data is required (e.g., deserialized event fields), validate and fail with a logged error rather than asserting.

Prefer narrowing once into a local variable over repeating `!` at each use site.

#### Removing non-null assertions

When replacing `!` due to linting, preserve the fail-fast behavior. If code would have crashed on
`maybeNull.property`, replace with explicit validation that throws, not silent degradation:

```js
// ❌ BAD: Silently masks an error that would have been loud before
const badResult = maybeElement?.property ?? fallback

// ✅ GOOD: Turns a generic crash into a specific, actionable error with context
if (!maybeElement) throw new Error('Missing required element')
const goodResult = maybeElement.property
```

Only use graceful degradation (`if (!x) return`) when the situation genuinely warrants it (e.g., optional UI
updates). For required data (configuration, mutations, required relationships), preserve the crash behavior with an
explicit error.

### Type assertions (`as`)

Rely on TypeScript's inference and explicit annotations first. Use `as SomeType` only when necessary (e.g., narrowing
a union inference can't resolve). Treat `as unknown as Type` as a last resort; add a comment explaining why it is
both necessary and safe.

### Nullish coalescing and optional chaining

Prefer `??` over `|| default` for null/undefined fallbacks, and `?.` over `x && x.y` for optional member access.
Both are safer (they don't coerce falsy values) and trigger lint errors if the left-hand side is provably non-null.

### Promises

Do not leave promises floating. Either `await` the result, return it, or prefix with `void` to explicitly discard it.
Unhandled promise rejections are silent failures.

### Loop style

Prefer `for...of` over index-based `for` loops when the index is not needed.

### Unused values

Keep `no-unused-vars` enabled. Preferred handling:

- Remove dead locals/imports when possible.
- For intentionally unused function parameters, prefix with `_` (e.g. `_event`).
- For required locals in no-op/interface-conformance paths, use `void value` to mark the discard explicitly.

## Common patterns

- **Block definitions** use `Blockly.Blocks["type_name"] = { init() { this.jsonInit({...}) } }` and are grouped by
  category in `src/blocks/`.

- **Custom fields** subclass Blockly field types (e.g., `ScratchFieldVariable extends Blockly.FieldVariable`) and
  override lifecycle methods like `initModel()`, `doValueUpdate_()`, and `showEditor_()`.

- **Custom renderer** (`ScratchRenderer`) extends `Blockly.zelos.Renderer` and overrides `makeConstants_()`,
  `makeDrawer_()`, and `makeRenderInfo_()`. When overriding inherited properties to narrow their type (e.g.,
  `constants_: ConstantProvider`), use `declare` rather than re-declaring with an initializer.

- **Custom events** extend `BlockCommentBase` or `Blockly.Events.Abstract`. They implement `toJson()` /
  `static fromJson()` for serialization. When constructors take optional parameters (because `fromJson` calls the
  class with no arguments and sets properties directly afterward), use conditional assignment
  (`if (x !== undefined) this.prop = x`) rather than `!` assertions.

- **Procedures and variables** are managed in `src/procedures.ts` and `src/variables.ts`. The `ScratchProcedures`
  namespace exposes callback hooks that the host application must set before calling procedure-related
  functionality.

## Before submitting changes

Review all changes and confirm:

- **Scope**: Changes are confined to the user request; nothing extra was added or modified.
- **Correctness**: Changes make sense and edge cases were considered.
- **Comments**: Comments are necessary, short, and clear; self-explanatory code has no comment.
- **Simplicity**: Implementation is as simple as possible; no unnecessary code remains.
- **`node_modules/`**: No changes within this directory. In particular, no direct edits to Blockly source files.
- **Runtime checks**: Any new guards for states that should never happen include diagnostic logging.
- **Build passes**: `npm run build` completes successfully.
- **Tests pass**: `npm run test` completes with no failures.
- **No lint errors**: `npm run test:lint` passes. Iterate with `npm run format` and/or manual changes as needed.
