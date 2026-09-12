const {test, expect} = require('@playwright/test');

/**
 * Playwright tests for the Sandbox iframe-host primitive.
 *
 * These tests exercise real browser behaviour that jsdom cannot replicate:
 * opaque-origin enforcement, CSP violations, and iframe lifecycle.
 */

test.beforeEach(async ({page}) => {
    await page.goto('harness.html');
    // Wait for the harness to expose Sandbox on window.
    await page.waitForFunction(() => typeof window.Sandbox === 'function');
});

test('basic script execution returns a result', async ({page}) => {
    const result = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: 'window.onSandboxMessage = function (p) { return p.a + p.b; }'}]);
        try {
            return await sandbox.send({a: 2, b: 3});
        } finally {
            sandbox.destroy();
        }
    });
    expect(result).toBe(5);
});

test('iframe is removed from DOM after destroy', async ({page}) => {
    await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: 'window.onSandboxMessage = function () { return "done"; }'}]);
        await sandbox.send(null);
        sandbox.destroy();
    });

    const iframeCount = await page.evaluate(() =>
        document.querySelectorAll('iframe').length
    );
    expect(iframeCount).toBe(0);
});

test('iframe has opaque origin (window.origin is "null")', async ({page}) => {
    const origin = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: 'window.onSandboxMessage = function () { return window.origin; }'}]);
        try {
            return await sandbox.send(null);
        } finally {
            sandbox.destroy();
        }
    });
    expect(origin).toBe('null');
});

test('iframe cannot access parent.location', async ({page}) => {
    const result = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = function () {
                try {
                    return parent.location.href;
                } catch (e) {
                    return {threw: true, message: e.message};
                }
            }
        `}]);
        try {
            return await sandbox.send(null);
        } finally {
            sandbox.destroy();
        }
    });
    expect(result).toHaveProperty('threw', true);
});

test('fetch is blocked by CSP (no connect-src)', async ({page}) => {
    const result = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = async function () {
                try {
                    await fetch('https://example.com');
                    return {blocked: false};
                } catch (e) {
                    return {blocked: true, message: e.message};
                }
            }
        `}]);
        try {
            return await sandbox.send(null);
        } finally {
            sandbox.destroy();
        }
    });
    expect(result).toHaveProperty('blocked', true);
});

test('script errors are propagated as rejections', async ({page}) => {
    const error = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(
            [{text: 'window.onSandboxMessage = function () { throw new Error("test error"); }'}]
        );
        try {
            return await sandbox.send(null).catch(e => ({message: e.message}));
        } finally {
            sandbox.destroy();
        }
    });
    expect(error).toHaveProperty('message', 'test error');
});

test('missing onSandboxMessage definition rejects', async ({page}) => {
    const error = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: '/* no onSandboxMessage defined */'}]);
        try {
            return await sandbox.send(null).catch(e => ({message: e.message}));
        } finally {
            sandbox.destroy();
        }
    });
    expect(error.message).toContain('did not define window.onSandboxMessage');
});

test('timeout rejects when script never responds', async ({page}) => {
    const error = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(
            [{text: 'window.onSandboxMessage = function () { return new Promise(() => {}); }'}],
            {timeoutMs: 500}
        );
        try {
            return await sandbox.send(null).catch(e => ({message: e.message}));
        } finally {
            sandbox.destroy();
        }
    });
    expect(error.message).toContain('timed out');
});

test('async onSandboxMessage is supported', async ({page}) => {
    const result = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = function (p) {
                return new Promise(function (resolve) {
                    setTimeout(function () { resolve(p.x * 2); }, 50);
                });
            }
        `}]);
        try {
            return await sandbox.send({x: 21});
        } finally {
            sandbox.destroy();
        }
    });
    expect(result).toBe(42);
});

test('iframe is created with sandbox="allow-scripts" attribute', async ({page}) => {
    const sandboxAttr = await page.evaluate(async () => {
        const originalAppendChild = document.body.appendChild.bind(document.body);
        let capturedSandbox = null;
        document.body.appendChild = function (node) {
            if (node.tagName === 'IFRAME') {
                capturedSandbox = node.getAttribute('sandbox');
            }
            return originalAppendChild(node);
        };

        const sandbox = new window.Sandbox([{text: 'window.onSandboxMessage = function () { return true; }'}]);
        try {
            await sandbox.send(null);
            return capturedSandbox;
        } finally {
            sandbox.destroy();
        }
    });
    expect(sandboxAttr).toBe('allow-scripts');
});

test('iframe srcdoc contains CSP meta tag', async ({page}) => {
    const srcdoc = await page.evaluate(async () => {
        const originalAppendChild = document.body.appendChild.bind(document.body);
        let capturedSrcdoc = null;
        document.body.appendChild = function (node) {
            if (node.tagName === 'IFRAME') {
                capturedSrcdoc = node.srcdoc;
            }
            return originalAppendChild(node);
        };

        const sandbox = new window.Sandbox([{text: 'window.onSandboxMessage = function () { return true; }'}]);
        try {
            await sandbox.send(null);
            return capturedSrcdoc;
        } finally {
            sandbox.destroy();
        }
    });
    expect(srcdoc).toContain('Content-Security-Policy');
    expect(srcdoc).toContain("default-src 'none'");
    expect(srcdoc).toContain('img-src data:');
    // file://, so the scripts are embedded: an opaque frame cannot fetch them.
    expect(srcdoc).toContain("script-src 'unsafe-inline'");
    // Granting this again would undo the reason handlers became real files.
    expect(srcdoc).not.toContain('unsafe-eval');
});

test('eval is unavailable inside the frame', async ({page}) => {
    // The assertion above checks what we wrote; this checks what is enforced.
    const result = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = function () {
                try {
                    return {blocked: false, value: (0, eval)('1 + 1')};
                } catch (e) {
                    return {blocked: true, name: e.name};
                }
            }
        `}]);
        try {
            return await sandbox.send(null);
        } finally {
            sandbox.destroy();
        }
    });
    expect(result.blocked).toBe(true);
    expect(result.name).toBe('EvalError');
});

test('data: images are permitted by the CSP', async ({page}) => {
    // SVG costumes embed raster/nested-SVG artwork as `data:` URIs in <image>
    // elements. The sandbox must be able to load them (measurement getBBox,
    // Paper.js raster import) — without img-src, default-src 'none' blocks them.
    const result = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = function (dataUri) {
                return new Promise(function (resolve) {
                    var img = new Image();
                    img.onload = function () { resolve('loaded'); };
                    img.onerror = function () { resolve('blocked'); };
                    img.src = dataUri;
                });
            }
        `}]);
        try {
            // 1x1 transparent PNG.
            const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB' +
                'CAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
            return await sandbox.send(png);
        } finally {
            sandbox.destroy();
        }
    });
    expect(result).toBe('loaded');
});

// --- Persistent iframe reuse tests ---

test('iframe is reused across send calls', async ({page}) => {
    const results = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            var counter = 0;
            window.onSandboxMessage = function () {
                counter++;
                return counter;
            };
        `}]);
        try {
            const r1 = await sandbox.send(null);
            const r2 = await sandbox.send(null);
            const r3 = await sandbox.send(null);
            return [r1, r2, r3];
        } finally {
            sandbox.destroy();
        }
    });
    // Counter increments across calls within the same iframe context.
    expect(results).toEqual([1, 2, 3]);
});

test('frame scripts run at load, not once per send', async ({page}) => {
    const results = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            if (!window.__runCount) window.__runCount = 0;
            window.__runCount++;
            window.onSandboxMessage = function () {
                return window.__runCount;
            };
        `}]);
        try {
            const r1 = await sandbox.send(null);
            const r2 = await sandbox.send(null);
            return [r1, r2];
        } finally {
            sandbox.destroy();
        }
    });
    // Top-level setup is not repeated between calls, so __runCount stays at 1.
    expect(results).toEqual([1, 1]);
});

test('warmUp creates the iframe and runs the frame scripts', async ({page}) => {
    const result = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.__sideEffect = 'set at load time';
            window.onSandboxMessage = function () {
                return window.__sideEffect;
            };
        `}]);
        try {
            await sandbox.warmUp();
            return {
                iframes: document.querySelectorAll('iframe').length,
                // The frame loaded during warm-up, so its top-level setup is
                // already observable on the first send.
                sideEffect: await sandbox.send(null)
            };
        } finally {
            sandbox.destroy();
        }
    });
    expect(result.iframes).toBe(1);
    expect(result.sideEffect).toBe('set at load time');
});

// Frame scripts are <script> tags, so they cannot run twice. Init data can:
// it rides on whichever message reaches a frame first, and both warmUp() and
// send() can be that message.
const COUNT_INIT = `
    window.__initCount = 0;
    window.onSandboxInit = function () { window.__initCount++; };
    window.onSandboxMessage = function () { return window.__initCount; };
`;

test('warmUp is idempotent: init reaches the frame exactly once', async ({page}) => {
    const initCount = await page.evaluate(async countInit => {
        const sandbox = new window.Sandbox([{text: countInit}], {init: 'payload'});
        try {
            await sandbox.warmUp();
            await sandbox.warmUp();
            return await sandbox.send(null);
        } finally {
            sandbox.destroy();
        }
    }, COUNT_INIT);
    expect(initCount).toBe(1);
});

test('warmUp concurrent with send still delivers init exactly once', async ({page}) => {
    // warmUp() reads its guard before awaiting the iframe, so several callers
    // can pass it at once. Only send()'s own check, made synchronously once
    // the iframe resolves, keeps a second copy of init off the wire.
    const initCount = await page.evaluate(async countInit => {
        const sandbox = new window.Sandbox([{text: countInit}], {init: 'payload'});
        try {
            await Promise.all([sandbox.warmUp(), sandbox.warmUp(), sandbox.send(null)]);
            return await sandbox.send(null);
        } finally {
            sandbox.destroy();
        }
    }, COUNT_INIT);
    expect(initCount).toBe(1);
});

test('destroy removes iframe from DOM', async ({page}) => {
    const iframeCount = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: 'window.onSandboxMessage = function () { return true; }'}]);
        await sandbox.send(null);
        sandbox.destroy();
        return document.querySelectorAll('iframe').length;
    });
    expect(iframeCount).toBe(0);
});

test('destroy rejects in-flight calls', async ({page}) => {
    const error = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(
            [{text: 'window.onSandboxMessage = function () { return new Promise(() => {}); }'}]
        );
        const pending = sandbox.send(null).catch(e => ({message: e.message}));
        // Give the iframe time to start loading.
        await new Promise(resolve => setTimeout(resolve, 100));
        sandbox.destroy();
        return pending;
    });
    expect(error.message).toContain('Sandbox destroyed');
});

test('is recreated after destroy', async ({page}) => {
    const result = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            var count = 0;
            window.onSandboxMessage = function () { return ++count; };
        `}]);
        await sandbox.send(null); // returns 1 on first iframe
        sandbox.destroy();
        // After destroy, the next send creates a fresh iframe with count at 0.
        return sandbox.send(null); // fresh iframe: returns 1
    });
    expect(result).toBe(1);
});

test('multiple concurrent sends resolve independently', async ({page}) => {
    const results = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = function (p) {
                return new Promise(function (resolve) {
                    setTimeout(function () { resolve(p.id); }, p.delay);
                });
            }
        `}]);
        try {
            return await Promise.all([
                sandbox.send({id: 'a', delay: 80}),
                sandbox.send({id: 'b', delay: 10}),
                sandbox.send({id: 'c', delay: 40})
            ]);
        } finally {
            sandbox.destroy();
        }
    });
    expect(results).toEqual(['a', 'b', 'c']);
});

// --- Array payloads (batch-style processing) ---

test('array payload: processes all items in one round-trip', async ({page}) => {
    const results = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = function (items) {
                return items.map(function (x) { return x * 2; });
            }
        `}]);
        try {
            return await sandbox.send([1, 2, 3, 4, 5]);
        } finally {
            sandbox.destroy();
        }
    });
    expect(results).toEqual([2, 4, 6, 8, 10]);
});

test('array payload: preserves order with async handlers', async ({page}) => {
    const results = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = function (items) {
                return Promise.all(items.map(function (p) {
                    return new Promise(function (resolve) {
                        setTimeout(function () { resolve(p.id); }, p.delay);
                    });
                }));
            }
        `}]);
        try {
            return await sandbox.send([
                {id: 'slow', delay: 80},
                {id: 'fast', delay: 10},
                {id: 'medium', delay: 40}
            ]);
        } finally {
            sandbox.destroy();
        }
    });
    expect(results).toEqual(['slow', 'fast', 'medium']);
});

test('array payload: rejects if handler throws', async ({page}) => {
    const error = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = function (items) {
                return Promise.all(items.map(function (p) {
                    if (p === 'bad') throw new Error('payload failed');
                    return p;
                }));
            }
        `}]);
        try {
            return await sandbox.send(['ok', 'bad', 'ok']).catch(e => ({message: e.message}));
        } finally {
            sandbox.destroy();
        }
    });
    expect(error.message).toContain('payload failed');
});

test('array payload: empty array returns empty results', async ({page}) => {
    const results = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = function (items) {
                return items.map(function (x) { return x; });
            }
        `}]);
        try {
            return await sandbox.send([]);
        } finally {
            sandbox.destroy();
        }
    });
    expect(results).toEqual([]);
});

// --- Idle teardown ---

test('does not tear down the iframe when idleTimeoutMs is unset (default)', async ({page}) => {
    const iframeCount = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: 'window.onSandboxMessage = function () { return true; }'}]);
        try {
            await sandbox.send(null);
            // Wait well past a typical idle window; with no idleTimeoutMs the
            // iframe must persist.
            await new Promise(resolve => setTimeout(resolve, 400));
            return document.querySelectorAll('iframe').length;
        } finally {
            sandbox.destroy();
        }
    });
    expect(iframeCount).toBe(1);
});

test('tears down the idle iframe after idleTimeoutMs elapses', async ({page}) => {
    const iframeCount = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(
            [{text: 'window.onSandboxMessage = function () { return true; }'}],
            {idleTimeoutMs: 150}
        );
        await sandbox.send(null);
        // No further activity — the idle timer should destroy the iframe.
        await new Promise(resolve => setTimeout(resolve, 400));
        return document.querySelectorAll('iframe').length;
    });
    expect(iframeCount).toBe(0);
});

test('idle timer does not fire while a send is in flight', async ({page}) => {
    const result = await page.evaluate(async () => {
        // Handler resolves after 300ms — longer than the 100ms idle window.
        const sandbox = new window.Sandbox([{text: `
            window.onSandboxMessage = function () {
                return new Promise(function (resolve) {
                    setTimeout(function () { resolve('ok'); }, 300);
                });
            }
        `}], {idleTimeoutMs: 100});
        try {
            // If the idle timer tore the iframe down mid-flight, this would
            // reject with "Sandbox destroyed" instead of resolving.
            return await sandbox.send(null);
        } finally {
            sandbox.destroy();
        }
    });
    expect(result).toBe('ok');
});

test('recreates a fresh iframe after idle teardown', async ({page}) => {
    const result = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            var count = 0;
            window.onSandboxMessage = function () { return ++count; };
        `}], {idleTimeoutMs: 150});
        try {
            const first = await sandbox.send(null); // 1 on the first iframe
            // Let the idle timer tear the iframe down.
            await new Promise(resolve => setTimeout(resolve, 400));
            const afterIdle = await sandbox.send(null); // fresh iframe: 1 again
            return {first, afterIdle};
        } finally {
            sandbox.destroy();
        }
    });
    expect(result.first).toBe(1);
    expect(result.afterIdle).toBe(1);
});

test('activity resets the idle timer', async ({page}) => {
    const result = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: `
            var count = 0;
            window.onSandboxMessage = function () { return ++count; };
        `}], {idleTimeoutMs: 300});
        try {
            // Sends spaced under the idle window — the iframe should stay
            // alive throughout as each send resets the timer.
            await sandbox.send(null);
            await new Promise(resolve => setTimeout(resolve, 100));
            await sandbox.send(null);
            await new Promise(resolve => setTimeout(resolve, 100));
            const count = await sandbox.send(null);
            // Same iframe reused → counter reached 3, iframe still present.
            return {count, iframes: document.querySelectorAll('iframe').length};
        } finally {
            sandbox.destroy();
        }
    });
    expect(result.count).toBe(3);
    expect(result.iframes).toBe(1);
});

// --- Performance comparison test ---
test('reused sandbox is faster than creating a new one per call', async ({page}) => {
    const {freshMs, reusedMs, batchMs} = await page.evaluate(async () => {
        const ITERATIONS = 500;
        const BATCH_SIZE = 20;
        const script = 'window.onSandboxMessage = function (p) { return p * 2; }';
        const batchScript = `window.onSandboxMessage = function (items) {
            return items.map(function (x) { return x * 2; });
        }`;

        // Fresh sandbox per call: create + send + destroy each time.
        const freshStart = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
            const sb = new window.Sandbox([{text: script}]);
            await sb.send(i);
            sb.destroy();
        }
        const freshEnd = performance.now();

        // Reused: one sandbox, N sequential single-item sends.
        const reusedStart = performance.now();
        const sandbox = new window.Sandbox([{text: script}]);
        for (let i = 0; i < ITERATIONS; i++) {
            await sandbox.send(i);
        }
        sandbox.destroy();
        const reusedEnd = performance.now();

        // Batch: one sandbox, sends BATCH_SIZE items per round-trip.
        const batchStart = performance.now();
        const sandbox2 = new window.Sandbox([{text: batchScript}]);
        for (let i = 0; i < ITERATIONS; i += BATCH_SIZE) {
            const chunk = Array.from({length: BATCH_SIZE}, (_, j) => i + j);
            await sandbox2.send(chunk);
        }
        sandbox2.destroy();
        const batchEnd = performance.now();

        return {
            freshMs: freshEnd - freshStart,
            reusedMs: reusedEnd - reusedStart,
            batchMs: batchEnd - batchStart
        };
    });

    // Reused sandbox should be substantially faster than creating a fresh iframe per call.
    expect(reusedMs * 1.5).toBeLessThan(freshMs);
    // Batch sends ITERATIONS/BATCH_SIZE round-trips instead of ITERATIONS,
    // so it must be faster than sequential sends.
    expect(batchMs * 1.5).toBeLessThan(reusedMs);
});

test('the frame ignores messages from windows other than its parent', async ({page}) => {
    // Window references are reachable cross-origin, so without the source
    // guard any page that embeds the editor could drive the sandbox.
    const replied = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{text: 'window.onSandboxMessage = function () { return "handled"; }'}]);
        await sandbox.send(null);

        // A sibling frame reaches the sandbox through the shared parent.
        const FORGED_TICKET = 987654;
        const attacker = document.createElement('iframe');
        attacker.setAttribute('sandbox', 'allow-scripts');
        attacker.srcdoc = `<script>
            parent.frames[0].postMessage(
                {__sandbox_payload: null, __sandbox_ticket: ${FORGED_TICKET}}, '*'
            );
        </script>`;

        const sawReply = new Promise(resolve => {
            window.addEventListener('message', event => {
                if (event.data && event.data.__sandbox_ticket === FORGED_TICKET) resolve(true);
            });
            setTimeout(() => resolve(false), 1000);
        });

        document.body.appendChild(attacker);
        try {
            return await sawReply;
        } finally {
            attacker.remove();
            sandbox.destroy();
        }
    });
    expect(replied).toBe(false);
});

test('init data without an onSandboxInit handler fails loudly', async ({page}) => {
    // Init is sent once per frame, so swallowing this would leave every later
    // call answering with the data silently missing — for the measurement
    // sandbox, text measured with no fonts loaded.
    const error = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(
            [{text: 'window.onSandboxMessage = function (p) { return p * 2; }'}],
            {init: 'some-data', timeoutMs: 3000}
        );
        try {
            await sandbox.send(21);
            return null;
        } catch (e) {
            return e.message;
        } finally {
            sandbox.destroy();
        }
    });
    expect(error).toContain('window.onSandboxInit');
});

test('a script missing this host\'s delivery form names itself', async ({page}) => {
    // file:// embeds script text, so a url-only descriptor cannot be used here.
    // Without this guard it fails deep in document generation with no clue
    // which script was wrong.
    const error = await page.evaluate(async () => {
        const sandbox = new window.Sandbox([{url: '/nope.js'}], {timeoutMs: 3000});
        try {
            await sandbox.send(null);
            return null;
        } catch (e) {
            return e.message;
        } finally {
            sandbox.destroy();
        }
    });
    expect(error).toContain('scripts[0]');
    expect(error).toContain("has no 'text'");
});
