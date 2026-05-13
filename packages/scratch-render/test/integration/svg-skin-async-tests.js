/* global render, requestAnimationFrame */
/**
 * Integration tests for SVGSkin.setSVG async pipeline and generation counter.
 *
 * Verifies that:
 * - Rapid successive setSVG calls discard stale results (generation counter).
 * - The async loadSvgString pipeline correctly updates skin size.
 * - Superseded setSVG calls do not corrupt skin state.
 *
 * Requires built dist bundles: run `npm run build` in scratch-render and
 * scratch-svg-renderer before running these tests.
 */
const {chromium} = require('playwright-chromium');
const test = require('tap').test;
const path = require('path');

const indexHTML = path.resolve(__dirname, 'index.html');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto(`file://${indexHTML}`);

    // Wait for the renderer to be ready.
    await page.waitForFunction(() => typeof render !== 'undefined' && render.createSVGSkin);

    await test('createSVGSkin with viewBox SVG resolves with correct size', async t => {
        const skinSize = await page.evaluate(async () => {
            const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75 120" width="75" height="120">' +
                '<rect width="75" height="120" fill="red"/></svg>';
            const skinId = await render.createSVGSkin(svg);
            return render.getSkinSize(skinId);
        });
        t.same(skinSize, [75, 120]);
    });

    await test('createSVGSkin with viewBox but no width/height resolves with correct size', async t => {
        const skinSize = await page.evaluate(async () => {
            const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 47">' +
                '<rect width="63" height="47" fill="blue"/></svg>';
            const skinId = await render.createSVGSkin(svg);
            return render.getSkinSize(skinId);
        });
        t.same(skinSize, [63, 47]);
    });

    await test('rapid updateSVGSkin calls: only last SVG dimensions persist', async t => {
        const result = await page.evaluate(async () => {
            const small = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10">' +
                '<rect width="10" height="10" fill="red"/></svg>';
            const medium = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" width="50" height="50">' +
                '<rect width="50" height="50" fill="green"/></svg>';
            const large = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" width="200" height="150">' +
                '<rect width="200" height="150" fill="blue"/></svg>';

            // Create initial skin
            const skinId = await render.createSVGSkin(small);

            // Fire three rapid updates without awaiting the first two.
            render.updateSVGSkin(skinId, small);
            render.updateSVGSkin(skinId, medium);
            const lastPromise = render.updateSVGSkin(skinId, large);

            // Wait for the last one to settle.
            await lastPromise;

            // Give a frame for img.onload to fire.
            await new Promise(resolve => requestAnimationFrame(resolve));

            return render.getSkinSize(skinId);
        });

        // Only the last SVG (200x150) should be reflected.
        t.same(result, [200, 150]);
    });

    await test('superseded setSVG load is discarded when a newer call wins', async t => {
        const result = await page.evaluate(async () => {
            // SVG without viewBox forces the async measurement path (slower).
            const slowSvg = '<svg xmlns="http://www.w3.org/2000/svg">' +
                '<rect x="0" y="0" width="30" height="25" fill="red"/></svg>';
            // SVG with viewBox takes the fast path.
            const fastSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99 77" width="99" height="77">' +
                '<rect width="99" height="77" fill="blue"/></svg>';

            const skinId = await render.createSVGSkin(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" width="1" height="1"></svg>'
            );

            // First: fire the slow measurement path (no viewBox).
            render.updateSVGSkin(skinId, slowSvg);
            // Immediately supersede with the fast path.
            const fastPromise = render.updateSVGSkin(skinId, fastSvg);

            await fastPromise;
            // Wait for any stale callbacks to potentially fire.
            await new Promise(resolve => setTimeout(resolve, 200));

            return render.getSkinSize(skinId);
        });

        // The fast SVG (99x77) should win; the slow SVG's stale result should be discarded.
        t.same(result, [99, 77]);
    });

    await browser.close();
})().catch(err => {
    console.error(err.message);
    process.exit(1);
});
