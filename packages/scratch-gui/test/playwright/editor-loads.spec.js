// @ts-check
const {test, expect} = require('@playwright/test');

test('the editor loads and the Backpack header is visible', async ({page}) => {
    // Capture uncaught page exceptions so a broken bundle fails with
    // the actual error rather than a generic visibility timeout.
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.stack || err.message || String(err)));

    await page.goto('index.html');

    await expect(page.getByText('Backpack', {exact: true})).toBeVisible();
    expect(pageErrors, 'uncaught exceptions during editor load').toEqual([]);
});
