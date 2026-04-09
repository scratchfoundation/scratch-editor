// @ts-check
const {test, expect} = require('@playwright/test');

// `baseURL` in playwright.config.js points at the built playground
// (`packages/scratch-gui/build/`), so relative URLs here resolve
// against that directory. CI downloads the build artifact before
// running this suite; locally, run `npm run build` in scratch-gui
// first.

test.describe('editor smoke test', () => {
    test('the editor loads and the Backpack header is visible', async ({page}) => {
        // Capture uncaught exceptions so a broken bundle fails loudly with
        // the underlying error instead of silently timing out on the
        // visibility assertion below. Note: we deliberately do NOT capture
        // `console.error` events. The current scratch-gui playground emits
        // a flood of React `defaultProps` deprecation warnings on mount,
        // which would drown out any real signal. Uncaught exceptions
        // (`pageerror`) are the right granularity for catching things
        // like a bundle that fails to evaluate at all.
        const pageErrors = [];
        page.on('pageerror', err => pageErrors.push(err.message));

        await page.goto('index.html');

        // The Backpack header is always rendered in the playground build,
        // even when no backpack host is configured (it just gets wrapped in
        // a "Coming Soon" tooltip). It is a stable, user-visible marker
        // that the editor mounted and rendered the menu bar / footer area.
        await expect(page.getByText('Backpack', {exact: true})).toBeVisible();

        expect(pageErrors, 'uncaught exceptions during editor load').toEqual([]);
    });
});
