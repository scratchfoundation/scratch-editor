// @ts-check
const path = require('path');
const {pathToFileURL} = require('url');
const {defineConfig, devices} = require('@playwright/test');

module.exports = defineConfig({
    testDir: './test/playwright',

    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,

    outputDir: 'test-results/playwright-artifacts',
    reporter: [
        ['list'],
        ['html', {outputFolder: 'test-results/playwright-html', open: 'never'}]
    ],

    use: {
        baseURL: `${pathToFileURL(path.resolve(__dirname, 'test/playwright'))}/`,
        trace: 'on-first-retry'
    },

    projects: [
        {
            name: 'chromium',
            use: {...devices['Desktop Chrome']}
        }
    ]
});
