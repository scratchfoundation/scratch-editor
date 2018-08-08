/* global vm, render, Promise */
const {Chromeless} = require('chromeless');
const test = require('tap').test;
const path = require('path');
const chromeless = new Chromeless();

const indexHTML = path.resolve(__dirname, 'index.html');
const testDir = (...args) => path.resolve(__dirname, 'pick-tests', ...args);

const runFile = (file, script) =>
    // start each test by going to the index.html, and loading the scratch file
    chromeless.goto(`file://${indexHTML}`)
        .setFileInput('#file', testDir(file))
        // the index.html handler for file input will add a #loaded element when it
        // finishes.
        .wait('#loaded')
        .evaluate(script)
;

// immediately invoked async function to let us wait for each test to finish before starting the next.
(async () => {

    await test('pick tests', async t => {

        const results = await runFile('test-mouse-touch.sb2', () => {
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

            sendResults.push(['center', idToTargetName(render.pick(240, 180))]);
            sendResults.push(['left', idToTargetName(render.pick(200, 180))]);
            sendResults.push(['over', render.drawableTouching(sprite.drawableID, 240, 180)]);
            sprite.setVisible(false);
            sendResults.push(['hidden sprite pick center', idToTargetName(render.pick(240, 180))]);
            sendResults.push(['hidden over', render.drawableTouching(sprite.drawableID, 240, 180)]);
            return sendResults;
        });
        const expect = [
            ['center', 'Sprite1'],
            ['left', 'Stage'],
            ['over', true],
            ['hidden sprite pick center', 'Stage'],
            ['hidden over', true]
        ];
        t.plan(expect.length);
        for (let x = 0; x < expect.length; x++) {
            t.deepEqual(results[x], expect[x], expect[x][0]);
        }
        t.end();
    });

    // close the browser window we used
    await chromeless.end();
})();
