const test = require('tap').test;
const TextEncoder = require('util').TextEncoder;
const TextDecoder = require('util').TextDecoder;

const FetchTool = require('../../src/FetchTool');

test('send success returns response.text()', t => {
    global.fetch = () => Promise.resolve({
        ok: true,
        text: () => Promise.resolve('successful response')
    });

    const tool = new FetchTool();
    
    return tool.send('url').then(result => {
        t.equal(result, 'successful response');
    });
});

test('send failure returns response.status', t => {
    global.fetch = () => Promise.resolve({
        ok: false,
        status: 500
    });

    const tool = new FetchTool();

    return tool.send('url').catch(reason => {
        t.equal(reason, 500);
    });
});

test('get success returns Uint8Array.body(response.arrayBuffer())', t => {
    const text = 'successful response';
    const encoding = 'utf-8';
    const encoded = new TextEncoder().encode(text);
    const decoder = new TextDecoder(encoding);

    global.fetch = () => Promise.resolve({
        ok: true,
        arrayBuffer: () => encoded.buffer
    });

    const tool = new FetchTool();
    
    return tool.get({url: 'url'}).then(result => {
        t.equal(decoder.decode(result), text);
    });
});

test('get failure returns response.status', t => {
    global.fetch = () => Promise.resolve({
        ok: false,
        status: 500
    });

    const tool = new FetchTool();

    return tool.get({url: 'url'}).catch(reason => {
        t.equal(reason, 500);
    });
});
