/* global vm, render */
const {chromium} = require('playwright-chromium');
const test = require('tap').test;
const path = require('path');

const indexHTML = path.resolve(__dirname, 'index.html');
const testDir = (...args) => path.resolve(__dirname, 'pick-tests', ...args);

const runFile = async (file, action, page, script) => {
    // start each test by going to the index.html, and loading the scratch file
    await page.goto(`file://${indexHTML}`);
    const fileInput = await page.$('#file');
    await fileInput.setInputFiles(testDir(file));

    await page.evaluate(() =>
        // `loadFile` is defined on the page itself.
        // eslint-disable-next-line no-undef
        loadFile()
    );
    return page.evaluate(`(function () {return (${script})(${action});})()`);
};

// immediately invoked async function to let us wait for each test to finish before starting the next.
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const testOperation = async function (name, action, expect) {
        await test(name, async t => {

            const results = await runFile('test-mouse-touch.sb2', action, page, boundAction => {
                vm.greenFlag();
                const sendResults = [];

                const idToTargetName = id => {
                    const target = vm.runtime.targets.find(tar => tar.drawableID === id);
                    if (!target) {
                        return `[Unknown drawableID: ${id}]`;
                    }
                    return target.sprite.name;
                };
                const sprite = vm.runtime.targets.find(target => target.sprite.name === 'Sprite1');

                boundAction({
                    sendResults,
                    idToTargetName,
                    render,
                    sprite
                });
                return sendResults;
            });

            t.plan(expect.length);
            for (let x = 0; x < expect.length; x++) {
                t.deepEqual(results[x], expect[x], expect[x][0]);
            }
            t.end();
        });
    };

    const tests = [
        {
            name: 'pick Sprite1',
            action: ({sendResults, render, idToTargetName}) => {
                sendResults.push(['center', idToTargetName(render.pick(360, 180))]);
            },
            expect: [['center', 'Sprite1']]
        },
        {
            name: 'pick Stage',
            action: ({sendResults, render, idToTargetName}) => {
                sendResults.push(['left', idToTargetName(render.pick(320, 180))]);
            },
            expect: [['left', 'Stage']]
        },
        {
            name: 'touching Sprite1',
            action: ({sprite, sendResults, render}) => {
                sendResults.push(['over', render.drawableTouching(sprite.drawableID, 360, 180)]);
            },
            expect: [['over', true]]
        },
        {
            name: 'pick Stage through hidden Sprite1',
            action: ({sprite, sendResults, render, idToTargetName}) => {
                sprite.setVisible(false);
                sendResults.push(['hidden sprite pick center', idToTargetName(render.pick(360, 180))]);
            },
            expect: [['hidden sprite pick center', 'Stage']]
        },
        {
            name: 'touching hidden Sprite1',
            action: ({sprite, sendResults, render}) => {
                sprite.setVisible(false);
                sendResults.push(['hidden over', render.drawableTouching(sprite.drawableID, 360, 180)]);
            },
            expect: [['hidden over', true]]
        }
    ];
    for (const {name, action, expect} of tests) {
        await testOperation(name, action, expect);
    }

    // close the browser window we used
    await browser.close();
})().catch(err => {
    // Handle promise rejections by exiting with a nonzero code to ensure that tests don't erroneously pass
    // eslint-disable-next-line no-console
    console.error(err.message);
    process.exit(1);
});
