/* eslint-env worker */

let jobsActive = 0;
const complete = [];

let intervalId = null;

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
            postMessage(complete.slice(), complete.map(response => response.buffer).filter(Boolean));
            complete.length = 0;
        }
        if (jobsActive === 0) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }, 1);
};

/**
 * Receive a job from the parent and fetch the requested data.
 * @param {object} options.job A job id, url, and options descriptor to perform.
 */
const onMessage = ({data: job}) => {
    if (jobsActive === 0 && !intervalId) {
        registerStep();
    }

    jobsActive++;

    fetch(job.url, job.options)
        .then(response => response.arrayBuffer())
        .then(buffer => complete.push({id: job.id, buffer}))
        .catch(error => complete.push({id: job.id, error}))
        .then(() => jobsActive--);
};

if (self.fetch) {
    postMessage({support: {fetch: true}});
    self.addEventListener('message', onMessage);
} else {
    postMessage({support: {fetch: false}});
    self.addEventListener('message', ({data: job}) => {
        postMessage([{id: job.id, error: new Error('fetch is unavailable')}]);
    });
}
