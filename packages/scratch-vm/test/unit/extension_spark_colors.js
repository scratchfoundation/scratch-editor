const test = require('tap').test;
const fs = require('fs');
const path = require('path');

const base = path.resolve(__dirname, '../../src/extensions/scratch3_spark');
const src = fs.readFileSync(path.join(base, 'index.js'), 'utf8');
const th = fs.readFileSync(path.join(base, 'translations.js'), 'utf8');

test('LED_COLOR_MAP is the single source: every color has a Thai translation', t => {
    const m = src.match(/const LED_COLOR_MAP\s*=\s*\{([\s\S]*?)\};/);
    t.ok(m, 'LED_COLOR_MAP literal found');
    const names = [...m[1].matchAll(/(\w+)\s*:\s*\{\s*r:/g)].map(x => x[1]);
    t.ok(names.length >= 2, `parsed color names: ${names.join(',')}`);
    const missing = names.filter(n => !th.includes(`spark.color.${n}`));
    t.same(missing, [], `every LED_COLOR_MAP key has spark.color.<name> (missing: ${missing.join(',') || 'none'})`);
    t.end();
});

test('color menu derives from the map (no hardcoded items array)', t => {
    t.match(src, /items:\s*ledColorMenuItems\(\)/, 'ledColors menu uses ledColorMenuItems()');
    t.notMatch(src, /\bconst LedColor\b/, 'the LedColor enum is gone (single source)');
    t.end();
});
