import {QueueManager, type QueueOptions} from '@scratch/task-herder';

/**
 * @summary A set of generous limits, for things like downloading assets from CDN.
 * @description
 * In practice, these limits seem to lead to slightly better performance than no limits at all, mostly due to the
 * concurrency limit. For example, on my development computer & my relatively fast residential connection, a
 * concurrency limit of 4 loads a particular test project in 21 seconds, as opposed to 25 seconds when I bypass the
 * queue and call `fetch` directly. In that test, my setup downloads about 50 assets per second, so this set of options
 * only affects concurrency and doesn't actually throttle the downloads. Limiting concurrency also fixes the issue
 * where very large projects (thousands of assets) can lead to browser failures like `net::ERR_INSUFFICIENT_RESOURCES`.
 * The exact concurrency limit doesn't seem to matter much since the browser limits parallel connections itself. It
 * just needs to be high enough to avoid bubbles in the download pipeline and low enough to avoid resource exhaustion.
 * @see {@link https://github.com/scratchfoundation/scratch-gui/issues/7111}
 */
export const AssetQueueOptions: QueueOptions = {
    burstLimit: 64,
    sustainRate: 64,
    // WARNING: asset download concurrency >=5 can lead to corrupted buffers on Chrome (December 2025, Chrome 142.0)
    // when using Scratch's bitmap load pipeline. Marking the canvas context as `{willReadFrequently: true}` seems to
    // eliminate that issue, so maybe the problem is related to hardware acceleration.
    concurrency: 64
};

/**
 * Central registry of per-host queues.
 * Uses strict limits by default. Override these strict limits as needed for specific hosts.
 */
export const hostQueueManager = new QueueManager({
    burstLimit: 5,
    sustainRate: 1,
    concurrency: 1
});
