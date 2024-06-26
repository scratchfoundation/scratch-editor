/* global render, ImageData */
const {chromium} = require('playwright-chromium');
const test = require('tap').test;
const path = require('path');

const indexHTML = path.resolve(__dirname, 'index.html');

// immediately invoked async function to let us wait for each test to finish before starting the next.
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(`file://${indexHTML}`);

    await test('SVG skin size set properly', async t => {
        t.plan(1);
        const skinSize = await page.evaluate(() => {
            const skinID = render.createSVGSkin(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 100"></svg>`);
            return render.getSkinSize(skinID);
        });
        t.same(skinSize, [50, 100]);
    });

    await test('Bitmap skin size set correctly', async t => {
        t.plan(1);
        const skinSize = await page.evaluate(() => {
            // Bitmap costumes are double resolution, so double the ImageData size
            const skinID = render.createBitmapSkin(new ImageData(100, 200), 2);
            return render.getSkinSize(skinID);
        });
        t.same(skinSize, [50, 100]);
    });

    await test('Pen skin size set correctly', async t => {
        t.plan(1);
        const skinSize = await page.evaluate(() => {
            const skinID = render.createPenSkin();
            return render.getSkinSize(skinID);
        });
        const nativeSize = await page.evaluate(() => render.getNativeSize());
        t.same(skinSize, nativeSize);
    });

    await test('Text bubble skin size set correctly', async t => {
        t.plan(1);
        const skinSize = await page.evaluate(() => {
            const skinID = render.createTextSkin('say', 'Hello', false);
            return render.getSkinSize(skinID);
        });
        // The subtleties in font rendering may cause the size of the text bubble to vary, so just make sure it's not 0
        t.notSame(skinSize, [0, 0]);
    });

    // close the browser window we used
    await browser.close();
})().catch(err => {
    // Handle promise rejections by exiting with a nonzero code to ensure that tests don't erroneously pass
    // eslint-disable-next-line no-console
    console.error(err.message);
    process.exit(1);
});
