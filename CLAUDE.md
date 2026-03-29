# CLAUDE.md — scratch-editor

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`scratch-editor` is an npm workspaces monorepo containing the packages that make up the Scratch editor (Scratch Foundation):

| Package | Path | Build | Tests |
|---------|------|-------|-------|
| `@scratch/scratch-gui` | `packages/scratch-gui` | webpack | Jest + Selenium WebDriver + Playwright |
| `@scratch/scratch-vm` | `packages/scratch-vm` | webpack | TAP |
| `@scratch/scratch-render` | `packages/scratch-render` | webpack | TAP + Playwright Chromium |
| `@scratch/scratch-svg-renderer` | `packages/scratch-svg-renderer` | webpack | TAP |
| `@scratch/task-herder` | `packages/task-herder` | Vite | Vitest |

Node **20.20.0** is required (see `.nvmrc`).

## Common Commands

### Monorepo root

```bash
npm run build          # build all packages (production)
npm test               # test all packages
npm run clean          # remove all build artifacts
```

### scratch-gui

```bash
cd packages/scratch-gui
npm start              # webpack-dev-server on port 8601
npm run build          # full production build (clean + dev + dist + dist-standalone)
npm run test:unit      # Jest unit tests
npm run test:integration  # Jest integration tests
npm run test:lint      # ESLint
npm run test           # lint + unit + integration
npm run test:playwright   # Playwright e2e tests (requires server running or auto-starts it)
```

Run a single Jest test file:
```bash
npx jest test/unit/my-test.js
```

Run a single Playwright test:
```bash
npx playwright test test/playwright/my-test.spec.js
```

### scratch-vm

```bash
cd packages/scratch-vm
npm run tap            # run all tap tests
npm run tap:unit       # unit tests only
npm run tap:integration  # integration tests only
npm run lint           # ESLint + format-message lint
npm run test           # lint + tap
```

## Commit Conventions

This repo enforces conventional commits via commitlint + husky. Always use prefixes like `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.

```
feat: add new costume picker animation
fix: resolve sprite drag offset on stage resize
chore(deps): update dependency scratch-paint to v4.1.48
```

## Architecture

### GUI ↔ VM Communication

The GUI instantiates a `scratch-vm` VM and passes it down via React props and Redux. The Redux store (`scratchGui.vm`) holds the VM instance. The GUI dispatches Redux actions; the VM fires events back to the GUI via Node `EventEmitter` (`vm.on(...)`). The `EditorState` class (`src/lib/editor-state.tsx`) creates and manages the Redux store.

### Redux State

- Action types: `packages/scratch-gui/src/lib/actions/`
- Reducers: `packages/scratch-gui/src/reducers/`
- The GUI reducer is combined in `packages/scratch-gui/src/reducers/gui.js`
- Action types follow the pattern: `scratch-gui/<reducer-name>/<ACTION_NAME>`

### Extension System

**Adding a new extension requires changes in two places:**

1. **VM** (`packages/scratch-vm/src/extension-support/extension-manager.js`): Add an entry to `builtinExtensions` map with the extension ID as key and a `require()` factory as value.

2. **GUI** (`packages/scratch-gui/src/lib/libraries/extensions/index.jsx`): Add an object to the exported array with `name`, `extensionId`, `iconURL`, `insetIconURL`, `description`, and `tags`.

Each extension lives in `packages/scratch-vm/src/extensions/scratch3_<name>/index.js` and exports a class with `getInfo()` returning block metadata, plus block implementation methods.

### Video/Camera Extensions

Extensions that use the webcam (`videoSensing`, `faceSensing`, `teachableClassifier`) use `packages/scratch-vm/src/io/video.js` (the VM's IO layer). The GUI side has `src/lib/video/` for camera access in modals. The Playwright config passes `--use-fake-device-for-media-stream` and `--use-fake-ui-for-media-stream` to Chromium so camera tests run headlessly without real hardware.

### Modal Pattern

Modals are registered in `packages/scratch-gui/src/reducers/modals.js` with `OPEN_MODAL`/`CLOSE_MODAL` actions. Each modal needs:
- A constant key (e.g., `MODAL_TEACHABLE_MACHINE = 'teachableMachineModal'`)
- Open/close action creators exported from `modals.js`
- A container component in `src/containers/`
- A presentational component in `src/components/`
- Wired into `src/components/gui/gui.jsx`

### Extension-to-Modal Communication

Extensions register themselves on the runtime so the GUI can access their state:
```js
this.runtime.ext_myExtension = this;
```
The modal container reads `props.vm.runtime.ext_myExtension` directly to get/set extension state.

### TensorFlow Extensions (teachableClassifier)

The `scratch3_teachable_classifier` extension uses MobileNet + KNN classifier (TF.js) loaded lazily on first use. The ML libraries (`@tensorflow/tfjs`, `@tensorflow-models/mobilenet`, `@tensorflow-models/knn-classifier`) are declared as dependencies in **scratch-gui**'s `package.json` (not scratch-vm), since webpack bundles everything from the GUI's `node_modules`.

### Scratch VM / Block Internals

- `vm.runtime.targets` gives all sprites/stage
- Each target has `.blocks._blocks` containing all block definitions
- `target.isStage` distinguishes the stage from sprites
- Block opcodes follow the pattern `category_blockname` (e.g., `motion_movesteps`, `event_whenflagclicked`)
- Each block: `{id, opcode, inputs, fields, next, parent, topLevel, shadow, x, y}`
- Shadow blocks hold literal values (e.g., `math_number` with `fields.NUM.value`)
- Inputs reference blocks by ID: `{name, block, shadow}`
- Insert blocks via `vm.shareBlocksToTarget(blocks, targetId)` then `vm.refreshWorkspace()`
- **Block types**: `BlockType.HAT`, `BlockType.REPORTER`, `BlockType.COMMAND`, `BlockType.BUTTON` from `extension-support/block-type`
- **Scratch coordinates**: Stage is 480×360, center is (0,0), x increases right, y increases up

## Key UI Directories

```
packages/scratch-gui/src/
  components/        # Presentational React components (30+ subdirectories)
  containers/        # Redux-connected container components
  lib/               # Utilities, libraries, layout constants
  reducers/          # Redux state management
```

## Key Conventions

- **VM extensions**: CommonJS (`require`/`module.exports`). Use `format-message` for i18n strings.
- **GUI components**: ES modules with JSX. Use `react-intl` (`FormattedMessage`) for i18n.
- **Redux reducers**: `src/reducers/` — plain JS files exporting a default reducer and named action creators.
- **CSS Modules**: All CSS in scratch-gui uses CSS Modules with PostCSS. Kebab-case in CSS (`.preview-code`) becomes camelCase import in JS (`styles.previewCode`). Class names are locally scoped and hashed at build time. Use `classnames` for conditional CSS class composition.

## CSS Modules Selector Guide

Since CSS class names are hashed at build time (e.g., `stage_stage_1fD7k`):

**Prefer (stable):**
```ts
page.getByRole('tab', {name: /Costumes/i})     // Role + accessible name
page.getByText('Scratch Cat')                    // Visible text
page.getByTestId('stage-canvas')                 // data-testid attribute
```

**Use attribute-contains for CSS classes:**
```ts
page.locator('[class*="stage_stage_"]')          // Partial match — stable across builds
```

**Avoid (fragile):**
```ts
page.locator('.stage_stage_1fD7k')               // Full hashed class — breaks on rebuild
```

**Special case**: Kebab-case in CSS (`.preview-code`) maps to camelCase in JS (`styles.previewCode`), but the actual DOM class contains the original kebab-case string. For selectors: use `[class*="preview-code"]` (kebab-case), NOT `[class*="previewCode"]`.

**Exception**: Blockly elements use non-hashed class names directly: `.scratchCategoryMenuItem`, `[class*="blocklyFlyout"]`.

## Playwright Testing

Config: `packages/scratch-gui/playwright.config.js` — tests run against `http://localhost:8601`, auto-starting `npm start` if not already running.

### Running tests

```bash
cd packages/scratch-gui

# Run all Playwright tests
npx playwright test

# Run a single test file
npx playwright test test/playwright/my-test.spec.js

# Run tests matching a pattern
npx playwright test --grep "modal"

# Headed mode (see browser)
npx playwright test --headed

# Interactive UI mode
npx playwright test --ui

# Debug with breakpoints
PWDEBUG=1 npx playwright test
```

If `npm start` is already running, tests reuse it (faster iteration) — start the server manually before running tests to avoid the 120s startup wait each time.

### Inspecting app state from tests

The dev server exposes `window.__scratchStore` (Redux store) and `window.vm` for test inspection:

```js
// Access VM state
await page.waitForFunction(() => {
    const vm = (window as any).vm;
    return vm && vm.runtime && vm.runtime.targets.length > 0;
}, {timeout: 30_000});

const spriteCount = await page.evaluate(() => {
    const vm = (window as any).vm;
    return vm.runtime.targets.filter(t => !t.isStage).length;
});

// Access extension state
// vm.runtime.ext_<extensionId> (e.g., ext_teachableClassifier)
```

### Timeouts

- Global test timeout: 60s. Default `expect` timeout: 10s (set in `playwright.config.js`).
- Override per-assertion: `await expect(locator).toBeVisible({timeout: 30000})`.
- Prefer `expect(...).toBeVisible()` over `waitForSelector` / `waitForTimeout`.

### Redux Store Access via React Fiber

When `window.__scratchStore` is unavailable, access the Redux store via the React fiber tree:

```js
const guiEl = document.querySelector('[class*="gui"]');
const fiberKey = Object.keys(guiEl).find(k => k.startsWith('__reactFiber'));
let fiber = guiEl[fiberKey];
while (fiber) {
    if (fiber.memoizedProps?.store) return fiber.memoizedProps.store;
    fiber = fiber.return;
}
```

## Common Build Problems and Solutions

### Native dependency failures (canvas module)
The `canvas` npm package requires system libraries:

**Linux / CI:**
```bash
sudo apt-get install -y libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev libpixman-1-dev libssl-dev
```

**macOS:**
```bash
brew install pkg-config cairo pango libpng jpeg giflib pixman
```

### npm workspace resolution failures
- Always run `npm ci` (or `npm install`) from the **repo root**, never inside individual packages.
- To run a script in a specific package: `npm run start --workspace=packages/scratch-gui`
- If you see "could not resolve dependency" errors, delete `node_modules` at root and all packages, then `npm ci` again.

### Node version mismatch
```bash
nvm use   # reads .nvmrc → 20.20.0
```

### Webpack build failures
Packages must build in dependency order. The workspace list in `package.json` is already ordered correctly:
1. task-herder → 2. scratch-svg-renderer → 3. scratch-render → 4. scratch-vm → 5. scratch-gui

If a single package fails, build it individually: `npm run build --workspace=packages/scratch-render`

### Stale build artifacts
```bash
npm run clean && npm ci && npm run build
```

### Browser not installed (Playwright)
```bash
npx playwright install chromium
# On Linux, also install system deps:
npx playwright install-deps chromium
```

## AI Model Infrastructure

- `packages/scratch-gui/src/lib/ai-model-manager.js` is the singleton for Gemma 3n via `@mediapipe/tasks-genai`
- OPFS (Origin Private File System) is used for model caching but is unavailable in headless Chromium — the model manager has a fallback to load directly from URL
- MediaPipe LlmInference requires WebGPU; SwiftShader (CPU-emulated) hits a 5-minute internal DEADLINE_EXCEEDED timeout with a 3B param model

## Playwright Gotchas

- **`workers: 1`** is required in `playwright.config.js` when tests patch shared build artifacts (e.g., `gui.js`)
- **WebGPU flags** for Chromium: `--enable-unsafe-webgpu`, `--enable-features=Vulkan`, `--use-vulkan=swiftshader`, `--enable-gpu-rasterization`, `--disable-gpu-sandbox`
- **`test.skip()`**: Must be called inside each test callback, not at describe level
- **`route.fulfill` has a 2GB limit** — cannot serve files >2GB via Playwright route interception. Use a local HTTP server instead.
- **`route.continue` protocol mismatch**: Cannot redirect HTTPS to HTTP. Use `route.fulfill` or patch URLs in the built source.
- **Dynamic port allocation**: Use `server.listen(0)` to avoid EADDRINUSE conflicts between test runs
- **Menu bar buttons must use `<img>` tags, not inline `<svg>`** — inline SVG elements render as invisible/zero-size. Existing buttons use `<img className={styles.helpIcon} src={importedSvg} />`.
- **The `@mediapipe/tasks-genai` package may disappear after npm operations** — reinstall with `npm install --no-save @mediapipe/tasks-genai@0.10.26`

## Front-End Design

When working on scratch-gui UI components:

- After making any visual/UI change, take a screenshot and verify it looks correct
- Match existing Scratch design language: rounded corners, consistent color palette, accessible contrast ratios
- Check neighboring components for spacing, font sizes, and interaction patterns before inventing new ones
- Components live in `packages/scratch-gui/src/components/` (each in its own directory with `.jsx` and `.css`)
- Containers (Redux-connected) live in `packages/scratch-gui/src/containers/`
