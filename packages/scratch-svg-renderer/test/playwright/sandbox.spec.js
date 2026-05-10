// @ts-check
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
        const sandbox = new window.Sandbox(
            'window.onSandboxMessage = function (p) { return p.a + p.b; }'
        );
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
        const sandbox = new window.Sandbox(
            'window.onSandboxMessage = function () { return "done"; }'
        );
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
        const sandbox = new window.Sandbox(
            'window.onSandboxMessage = function () { return window.origin; }'
        );
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
        const sandbox = new window.Sandbox(`
            window.onSandboxMessage = function () {
                try {
                    return parent.location.href;
                } catch (e) {
                    return {threw: true, message: e.message};
                }
            }
        `);
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
        const sandbox = new window.Sandbox(`
            window.onSandboxMessage = async function () {
                try {
                    await fetch('https://example.com');
                    return {blocked: false};
                } catch (e) {
                    return {blocked: true, message: e.message};
                }
            }
        `);
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
            'window.onSandboxMessage = function () { throw new Error("test error"); }'
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
        const sandbox = new window.Sandbox(
            '/* no onSandboxMessage defined */'
        );
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
            'window.onSandboxMessage = function () { return new Promise(() => {}); }',
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
        const sandbox = new window.Sandbox(`
            window.onSandboxMessage = function (p) {
                return new Promise(function (resolve) {
                    setTimeout(function () { resolve(p.x * 2); }, 50);
                });
            }
        `);
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

        const sandbox = new window.Sandbox(
            'window.onSandboxMessage = function () { return true; }'
        );
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

        const sandbox = new window.Sandbox(
            'window.onSandboxMessage = function () { return true; }'
        );
        try {
            await sandbox.send(null);
            return capturedSrcdoc;
        } finally {
            sandbox.destroy();
        }
    });
    expect(srcdoc).toContain('Content-Security-Policy');
    expect(srcdoc).toContain("default-src 'none'");
    expect(srcdoc).toContain("script-src 'unsafe-inline' 'unsafe-eval'");
});

// --- Persistent iframe reuse tests ---

test('iframe is reused across send calls', async ({page}) => {
    const results = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(`
            var counter = 0;
            window.onSandboxMessage = function () {
                counter++;
                return counter;
            };
        `);
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

test('script is evaluated only once', async ({page}) => {
    const results = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(`
            if (!window.__evalCount) window.__evalCount = 0;
            window.__evalCount++;
            window.onSandboxMessage = function () {
                return window.__evalCount;
            };
        `);
        try {
            const r1 = await sandbox.send(null);
            const r2 = await sandbox.send(null);
            return [r1, r2];
        } finally {
            sandbox.destroy();
        }
    });
    // Script only evaluated once, so __evalCount stays at 1.
    expect(results).toEqual([1, 1]);
});

test('destroy removes iframe from DOM', async ({page}) => {
    const iframeCount = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(
            'window.onSandboxMessage = function () { return true; }'
        );
        await sandbox.send(null);
        sandbox.destroy();
        return document.querySelectorAll('iframe').length;
    });
    expect(iframeCount).toBe(0);
});

test('destroy rejects in-flight calls', async ({page}) => {
    const error = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(
            'window.onSandboxMessage = function () { return new Promise(() => {}); }'
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
        const sandbox = new window.Sandbox(`
            var count = 0;
            window.onSandboxMessage = function () { return ++count; };
        `);
        await sandbox.send(null); // returns 1 on first iframe
        sandbox.destroy();
        // After destroy, the next send creates a fresh iframe with count at 0.
        return sandbox.send(null); // fresh iframe: returns 1
    });
    expect(result).toBe(1);
});

test('multiple concurrent sends resolve independently', async ({page}) => {
    const results = await page.evaluate(async () => {
        const sandbox = new window.Sandbox(`
            window.onSandboxMessage = function (p) {
                return new Promise(function (resolve) {
                    setTimeout(function () { resolve(p.id); }, p.delay);
                });
            }
        `);
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
        const sandbox = new window.Sandbox(`
            window.onSandboxMessage = function (items) {
                return items.map(function (x) { return x * 2; });
            }
        `);
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
        const sandbox = new window.Sandbox(`
            window.onSandboxMessage = function (items) {
                return Promise.all(items.map(function (p) {
                    return new Promise(function (resolve) {
                        setTimeout(function () { resolve(p.id); }, p.delay);
                    });
                }));
            }
        `);
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
        const sandbox = new window.Sandbox(`
            window.onSandboxMessage = function (items) {
                return Promise.all(items.map(function (p) {
                    if (p === 'bad') throw new Error('payload failed');
                    return p;
                }));
            }
        `);
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
        const sandbox = new window.Sandbox(`
            window.onSandboxMessage = function (items) {
                return items.map(function (x) { return x; });
            }
        `);
        try {
            return await sandbox.send([]);
        } finally {
            sandbox.destroy();
        }
    });
    expect(results).toEqual([]);
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
            const sb = new window.Sandbox(script);
            await sb.send(i);
            sb.destroy();
        }
        const freshEnd = performance.now();

        // Reused: one sandbox, N sequential single-item sends.
        const reusedStart = performance.now();
        const sandbox = new window.Sandbox(script);
        for (let i = 0; i < ITERATIONS; i++) {
            await sandbox.send(i);
        }
        sandbox.destroy();
        const reusedEnd = performance.now();

        // Batch: one sandbox, sends BATCH_SIZE items per round-trip.
        const batchStart = performance.now();
        const sandbox2 = new window.Sandbox(batchScript);
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
