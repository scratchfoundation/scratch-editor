/* global vm, Promise */
const {Chromeless} = require('chromeless');
const test = require('tap').test;
const path = require('path');
const fs = require('fs');
const chromeless = new Chromeless();

const indexHTML = path.resolve(__dirname, 'index.html');
const testDir = (...args) => path.resolve(__dirname, 'scratch-tests', ...args);

const testFile = file => test(file, async t => {
    // start each test by going to the index.html, and loading the scratch file
    const says = await chromeless.goto(`file://${indexHTML}`)
        .setFileInput('#file', testDir(file))
        // the index.html handler for file input will add a #loaded element when it
        // finishes.
        .wait('#loaded')
        .evaluate(() => {
            // This function is run INSIDE the integration chrome browser via some
            // injection and .toString() magic.  We can return some "simple data"
            // back across as a promise, so we will just log all the says that happen
            // for parsing after.

            // this becomes the `says` in the outer scope
            const messages = [];
            const TIMEOUT = 5000;

            vm.runtime.on('SAY', (_, __, message) => {
                messages.push(message);
            });

            vm.greenFlag();
            const startTime = Date.now();

            return Promise.resolve()
                .then(async () => {
                    // waiting for all threads to complete, then we return
                    while (vm.runtime.threads.some(thread => vm.runtime.isActiveThread(thread))) {
                        if ((Date.now() - startTime) >= TIMEOUT) {
                            // if we push the message after end, the failure from tap is not very useful:
                            // "not ok test after end() was called"
                            messages.unshift(`fail Threads still running after ${TIMEOUT}ms`);
                            break;
                        }

                        await new Promise(resolve => setTimeout(resolve, 50));
                    }

                    return messages;
                });
        });

    // Map string messages to tap reporting methods. This will be used
    // with events from scratch's runtime emitted on block instructions.
    let didPlan = false;
    let didEnd = false;
    const reporters = {
        comment (message) {
            t.comment(message);
        },
        pass (reason) {
            t.pass(reason);
        },
        fail (reason) {
            t.fail(reason);
        },
        plan (count) {
            didPlan = true;
            t.plan(Number(count));
        },
        end () {
            didEnd = true;
            t.end();
        }
    };

    // loop over each "SAY" we caught from the VM and use the reporters
    says.forEach(text => {
        // first word of the say is going to be a "command"
        const command = text.split(/\s+/, 1)[0].toLowerCase();
        if (reporters[command]) {
            return reporters[command](text.substring(command.length).trim());
        }

        // Default to a comment with the full text if we didn't match
        // any command prefix
        return reporters.comment(text);
    });

    if (!didPlan) {
        t.comment('did not say "plan NUMBER_OF_TESTS"');
    }

    // End must be called so that tap knows the test is done. If
    // the test has a SAY "end" block but that block did not
    // execute, this explicit failure will raise that issue so
    // it can be resolved.
    if (!didEnd) {
        t.fail('did not say "end"');
        t.end();
    }
});

// immediately invoked async function to let us wait for each test to finish before starting the next.
(async () => {
    const files = fs.readdirSync(testDir())
        .filter(uri => uri.endsWith('.sb2') || uri.endsWith('.sb3'));

    for (const file of files) {
        await testFile(file);
    }

    // close the browser window we used
    await chromeless.end();
})();
