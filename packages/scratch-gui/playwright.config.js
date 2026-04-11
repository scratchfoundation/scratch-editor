// @ts-check
const path = require('path');
const {pathToFileURL} = require('url');
const {defineConfig, devices} = require('@playwright/test');

/**
 * Playwright configuration for scratch-gui browser tests.
 *
 * Tests run in both Chromium and Firefox so cross-browser issues
 * (e.g., pointer event compatibility differences) are caught in CI
 * rather than first noticed on staging.
 *
 * Tests reference pages relative to the build directory via baseURL,
 * e.g. `await page.goto('index.html')`. Locally, run `npm run build`
 * first.
 */
module.exports = defineConfig({
    testDir: './test/playwright',

    // Tests in this suite are (must be) isolated and stateless, so they can safely run in parallel.
    fullyParallel: true,

    // Fail the build if a developer accidentally commits `test.only`.
    forbidOnly: !!process.env.CI,

    // CI gets a single retry for flake tolerance; locally, fail fast.
    retries: process.env.CI ? 1 : 0,

    // Playwright requires outputDir and the HTML reporter folder to be
    // separate directories, so both live as siblings under test-results/.
    outputDir: 'test-results/playwright-artifacts',
    reporter: [
        ['list'],
        ['junit', {outputFile: 'test-results/playwright-junit.xml'}],
        ['html', {outputFolder: 'test-results/playwright-html', open: 'never'}]
    ],

    use: {
        // Resolve relative `page.goto()` URLs against the playground
        // build output in `build/`.
        baseURL: `${pathToFileURL(path.resolve(__dirname, 'build'))}/`,

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
            use: {
                ...devices['Desktop Firefox'],
                // Firefox's built-in headless mode doesn't support WebGL,
                // which Scratch requires. Run headed under xvfb in CI.
                headless: false
            }
        }
    ]
});
