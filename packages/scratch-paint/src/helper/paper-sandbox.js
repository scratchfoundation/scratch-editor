import {Sandbox, usesUrlDelivery} from '@scratch/scratch-svg-renderer';

import HANDLER_URL from './paper-import.js?resource';
import HANDLER_TEXT from './paper-import.js?source';

let paperSandboxPromise = null;

/**
 * Load Paper.js in the form this host can deliver to the frame.
 *
 * Only one form is imported. Paper.js is ~244 KB, so bundling both the emitted
 * asset and its source text would double what the paint editor downloads.
 * @returns {Promise<{url: string}|{text: string}>} A script descriptor.
 */
const loadPaperSource = () => (usesUrlDelivery() ?
    import(
        /* webpackChunkName: "paper-url" */
        '@scratch/paper/dist/paper-core.min.js?resource'
    ).then(module => ({url: module.default})) :
    import(
        /* webpackChunkName: "paper-source" */
        '@scratch/paper/dist/paper-core.min.js?source'
    ).then(module => ({text: module.default})));

/**
 * Get or create the singleton Paper.js sandbox instance. The sandbox is
 * lazily created on first call and reused for all subsequent imports.
 * Paper.js source is loaded via a dynamic import (code-split chunk) to
 * avoid doubling the main bundle size.
 * @returns {Promise<Sandbox>} The Paper.js sandbox instance.
 */
const getPaperSandbox = () => {
    if (!paperSandboxPromise) {
        paperSandboxPromise = loadPaperSource()
            .then(paperScript => new Sandbox([
                paperScript,
                {url: HANDLER_URL, text: HANDLER_TEXT}
            ]))
            .catch(err => {
                // Clear the cached promise so the next call retries rather
                // than returning the same permanent rejection.
                paperSandboxPromise = null;
                throw err;
            });
    }
    return paperSandboxPromise;
};

/**
 * Eagerly load the Paper.js chunk and warm the sandbox iframe (create it and
 * load Paper.js inside it) so the first costume import pays none of the
 * cold-start cost. Best-effort: a failure here is swallowed and retried
 * lazily by the first real `importSvg`.
 * @returns {Promise<void>} Resolves once warm-up completes or is abandoned.
 */
const prewarmPaperSandbox = () =>
    getPaperSandbox()
        .then(sandbox => sandbox.warmUp())
        .catch(() => {});

export {getPaperSandbox, prewarmPaperSandbox};
