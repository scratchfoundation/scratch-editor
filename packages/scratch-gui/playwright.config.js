// @ts-check
const path = require('path');
const {defineConfig, devices} = require('@playwright/test');

/**
 * Playwright configuration for scratch-gui browser tests.
 *
 * These tests run in both Chromium and Firefox so cross-browser issues
 * (e.g., differences in how each browser interprets pointer event spec
 * compatibility-mouse-event suppression) are caught in CI rather than
 * being noticed by users on staging.
 *
 * Tests load the built playground from `build/` via a `file://` URL,
 * mirroring the existing Selenium-based integration tests in
 * `test/integration/`. CI builds scratch-gui before running the test
 * job, so the build artifact is always present when this config runs.
 * Locally, run `npm run build` in scratch-gui first.
 *
 * Test files reference pages relative to the build directory via
 * Playwright's `baseURL`, e.g. `await page.goto('index.html')`.
 */
module.exports = defineConfig({
    testDir: './test/playwright',

    // Tests in this suite are isolated and stateless, so they can
    // safely run in parallel.
    fullyParallel: true,

    // Fail the build if a developer accidentally commits `test.only`.
    forbidOnly: !!process.env.CI,

    // CI gets a single retry for flake tolerance; locally, fail fast.
    retries: process.env.CI ? 1 : 0,

    // Keep all Playwright output under the same `test-results/`
    // directory the rest of scratch-gui's test pipeline writes to,
    // so the CI publish-unit-test-result-action and upload-artifact
    // steps pick everything up with their existing globs.
    //
    // The HTML report has to live in its own subdirectory because
    // the HTML reporter clears its output folder on each run, and
    // Playwright refuses to point it at the same folder as
    // `outputDir` (which holds per-test artifacts like traces and
    // screenshots).
    outputDir: 'test-results/playwright-artifacts',
    reporter: [
        ['list'],
        ['junit', {outputFile: 'test-results/playwright-junit.xml'}],
        ['html', {outputFolder: 'test-results/playwright-html', open: 'never'}]
    ],

    use: {
        // Resolve relative `page.goto()` URLs against the built
        // playground so individual tests don't need to compute paths
        // relative to their own location on disk.
        baseURL: `file://${path.resolve(__dirname, 'build')}/`,

        // Capture a trace on the first retry so CI failures are
        // debuggable without re-running tests locally.
        trace: 'on-first-retry'
    },

    projects: [
        {
            name: 'chromium',
            use: {...devices['Desktop Chrome']}
        },
        {
            name: 'firefox',
            use: {...devices['Desktop Firefox']}
        }
    ]
});
