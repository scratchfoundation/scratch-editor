const TextDecoder = require('util').TextDecoder;

jest.mock('cross-fetch');
const mockFetch = require('cross-fetch');
const FetchTool = require('../../src/FetchTool.js');

test('send success returns response.text()', async () => {
    const tool = new FetchTool();

    const result = await tool.send({url: '200'});
    expect(result).toBe(mockFetch.successText);
});

test('send failure returns response.status', async () => {
    const tool = new FetchTool();

    const catcher = jest.fn();

    try {
        await tool.send({url: '500'});
    } catch (e) {
        catcher(e);
    }

    expect(catcher).toHaveBeenCalledWith(500);
});

test('get success returns Uint8Array.body(response.arrayBuffer())', async () => {
    const encoding = 'utf-8';
    const decoder = new TextDecoder(encoding);

    const tool = new FetchTool();

    const result = await tool.get({url: '200'});
    expect(decoder.decode(result)).toBe(mockFetch.successText);
});

test('get with 404 response returns null data', async () => {
    const tool = new FetchTool();

    const result = await tool.get({url: '404'});
    expect(result).toBeNull();
});

test('get failure returns response.status', async () => {
    const tool = new FetchTool();
    const catcher = jest.fn();

    try {
        await tool.get({url: '500'});
    } catch (e) {
        catcher(e);
    }

    expect(catcher).toHaveBeenCalledWith(500);
});
