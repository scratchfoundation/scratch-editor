const path = require('path');
const {test, expect} = require('@playwright/test');

/**
 * The sandbox under a strict page Content-Security-Policy, which a srcdoc
 * frame inherits and cannot loosen from inside.
 *
 * Every other spec here runs from `file://`, which carries no policy at all —
 * the one environment where the frame's code delivery cannot fail. The page is
 * served by request interception, so no server is needed for a real header.
 */

const ORIGIN = 'https://editor.test';

// Served at the origin root, the way a consumer deploys the built bundle:
// its assets sit alongside it and resolve against '/'.
const DIST_ROOT = path.resolve(__dirname, '../../dist/web');

/**
 * Reconstruction of a conservative `script-src` directive for the sandbox environment.
 *   'self'        — a host allowlist, permitting same-origin `<script src>`.
 */
const SCRIPT_SRC = "script-src 'self'";

// No inline script: the policy above forbids it, which is the whole point.
const HARNESS_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>CSP Sandbox Test Harness</title></head>
<body>
<script src="/scratch-svg-renderer.js"></script>
</body>
</html>`;

// Plants attacker-shaped SVG in the frame and reports what executed.
const PROBE_HANDLER = `window.onSandboxMessage = function () {
    window.__scriptRan = false;
    window.__errorRan = false;
    var container = document.createElement('span');
    container.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg">' +
        '<' + 'script>window.__scriptRan = true;<' + '/script>' +
        '<image href="data:image/png;base64,Tk9UQVBORw==" onerror="window.__errorRan = true"/>' +
        '</svg>';
    document.body.appendChild(container);
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve({scriptRan: window.__scriptRan, errorRan: window.__errorRan});
        }, 300);
    });
};`;

test.beforeEach(async ({page}) => {
    await page.route(`${ORIGIN}/**`, route => {
        const {pathname} = new URL(route.request().url());

        if (pathname === '/harness.html') {
            return route.fulfill({
                status: 200,
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Content-Security-Policy': SCRIPT_SRC
                },
                body: HARNESS_HTML
            });
        }

        if (pathname === '/probe-handler.js') {
            return route.fulfill({
                status: 200,
                headers: {'Content-Type': 'text/javascript'},
                body: PROBE_HANDLER
            });
        }

        // Off disk; `path` infers the content type and throws if missing.
        return route.fulfill({path: path.join(DIST_ROOT, pathname)});
    });
});

test('the harness page really is served with the policy', async ({page}) => {
    // A routing mistake that dropped the header would let every test below
    // pass, recreating the blind spot this file closes.
    const response = await page.goto(`${ORIGIN}/harness.html`);

    expect(response.headers()['content-security-policy']).toBe(SCRIPT_SRC);
    // With neither of these, no inline script in an inheriting frame can run.
    expect(SCRIPT_SRC).not.toContain("'unsafe-inline'");
    expect(SCRIPT_SRC).not.toContain("'nonce-");
});

// No viewBox, so loadSvgString must measure it in the sandbox.
const SVG_NO_VIEWBOX = '<svg xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="5" y="10" width="60" height="40" fill="red"/>' +
    '</svg>';

test('measurement works under the policy', async ({page}) => {
    // The regression test for the reported outage: on `develop` the frame's
    // inline runner never runs and this times out. It goes through
    // loadSvgString because only the real path has fetchable script assets.
    await page.goto(`${ORIGIN}/harness.html`);
    await page.waitForFunction(() => typeof window.ScratchSVGRenderer === 'object');

    const result = await page.evaluate(async svg => {
        const svgTag = await window.ScratchSVGRenderer.loadSvgString(svg);
        return {
            width: Number(svgTag.getAttribute('width')),
            height: Number(svgTag.getAttribute('height'))
        };
    }, SVG_NO_VIEWBOX);

    // bbox (60x40) enlarged by the default stroke-width of 1.
    expect(result.width).toBeCloseTo(61, 0);
    expect(result.height).toBeCloseTo(41, 0);
});

test('the frame is built with URL delivery, not inline script', async ({page}) => {
    // Without this, the test above could pass on a host that silently fell
    // back to embedding the scripts.
    await page.goto(`${ORIGIN}/harness.html`);
    await page.waitForFunction(() => typeof window.ScratchSVGRenderer === 'object');

    const srcdoc = await page.evaluate(async svg => {
        const appendChild = document.body.appendChild.bind(document.body);
        let captured = null;
        document.body.appendChild = node => {
            if (node.tagName === 'IFRAME') captured = node.srcdoc;
            return appendChild(node);
        };
        await window.ScratchSVGRenderer.loadSvgString(svg);
        return captured;
    }, SVG_NO_VIEWBOX);

    expect(srcdoc).toContain(`script-src ${ORIGIN}`);
    expect(srcdoc).toContain(`<script src="${ORIGIN}/assets/runner.`);
    // style-src keeps 'unsafe-inline' for the font <style>; script-src must not.
    expect(srcdoc).not.toContain("script-src 'unsafe-inline'");
    expect(srcdoc).not.toContain('unsafe-eval');
});

test('attacker SVG cannot execute inside the frame', async ({page}) => {
    // The reason the sandbox exists: script-src names only the asset origin,
    // so neither a <script> element nor an inline onerror in a costume runs.
    await page.goto(`${ORIGIN}/harness.html`);
    await page.waitForFunction(() => typeof window.ScratchSVGRenderer === 'object');

    const result = await page.evaluate(async origin => {
        const sandbox = new window.ScratchSVGRenderer.Sandbox(
            [{url: `${origin}/probe-handler.js`}],
            {timeoutMs: 5000}
        );
        try {
            return await sandbox.send(null);
        } finally {
            sandbox.destroy();
        }
    }, ORIGIN);

    expect(result).toEqual({scriptRan: false, errorRan: false});
});
