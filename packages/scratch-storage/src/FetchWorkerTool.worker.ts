/* eslint-env worker */
/* eslint-disable-next-line spaced-comment */
/// <reference lib="webworker" />

// This worker won't share the same queue as the main thread, but throttling should be okay
// as long as we don't use FetchTool and FetchWorkerTool at the same time.
// TODO: Communicate metadata from the main thread to workers or move the worker boundary "into" `scratchFetch`.
// Make sure to benchmark any changes to avoid performance regressions, especially for large project loads.
import {AssetQueueOptions} from './HostQueues';
import {scratchFetch} from './scratchFetch';

interface JobMessage {
    id: string;
    url: string;
    options: RequestInit | undefined;
}

interface CompletionMessage {
    id: string;
    buffer?: ArrayBuffer | null;
    error?: string;
}

let jobsActive = 0;
const complete: CompletionMessage[] = [];

let intervalId: ReturnType<typeof setInterval> | undefined = void 0;

/**
 * Register a step function.
 *
 * Step checks if there are completed jobs and if there are sends them to the
 * parent. Then it checks the jobs count. If there are no further jobs, clear
 * the step.
 */
const registerStep = function () {
    intervalId = setInterval(() => {
        if (complete.length) {
            // Send our chunk of completed requests and instruct postMessage to
            // transfer the buffers instead of copying them.
            postMessage(
                complete.slice(),
                // Instruct postMessage that these buffers in the sent message
                // should use their Transferable trait. After the postMessage
                // call the "buffers" will still be in complete if you looked,
                // but they will all be length 0 as the data they reference has
                // been sent to the window. This lets us send a lot of data
                // without the normal postMessage behaviour of making a copy of
                // all of the data for the window.
                complete.map(response => response.buffer).filter(Boolean) as Transferable[]
            );
            complete.length = 0;
        }
        if (jobsActive === 0) {
            clearInterval(intervalId);
            intervalId = void 0;
        }
    }, 1);
};

/**
 * Receive a job from the parent and fetch the requested data.
 * @param message The message from the parent.
 * @param message.data A job id, url, and options descriptor to perform.
 */
const onMessage = async ({data: job}: MessageEvent<JobMessage>) => {
    if (jobsActive === 0 && !intervalId) {
        registerStep();
    }

    jobsActive++;

    try {
        const response = await scratchFetch(job.url, job.options, {queueOptions: AssetQueueOptions});

        const result: CompletionMessage = {id: job.id};
        if (response.ok) {
            result.buffer = await response.arrayBuffer();
        } else if (response.status === 404) {
            result.buffer = null;
        } else {
            throw response.status;
        }
        complete.push(result);
    } catch (error) {
        complete.push({id: job.id, error: ((error as Error)?.message) || `Failed request: ${job.url}`});
    } finally {
        jobsActive--;
    }
};

// "fetch" is supported in Node.js as of 16.15 and our target browsers as of ~2017
postMessage({support: {fetch: true}});
self.addEventListener('message', onMessage);
