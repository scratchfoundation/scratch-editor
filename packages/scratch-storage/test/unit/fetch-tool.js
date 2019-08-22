const test = require('tap').test;

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
