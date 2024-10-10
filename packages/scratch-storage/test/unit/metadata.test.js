jest.mock('cross-fetch');

beforeEach(() => {
    // reset the metadata container to ensure the tests don't interfere with each other
    // but this also means we need to `require` inside the tests
    /* eslint-disable global-require */
    jest.resetModules();

    // temporary: pretend we're running in a browser and the URL has scratchMetadata=1
    // this is a hack to enable the metadata feature in tests
    // see also `hasMetadata` in scratchFetch.js
    global.self = global.self || {};
    global.self.location = new URL('https://example.com/?scratchMetadata=1');
});

test('get without metadata', async () => {
    const {FetchTool} = require('../../src/FetchTool');
    const tool = new FetchTool();

    const mockFetchTestData = {};
    const result = await tool.get({url: '200', mockFetchTestData});

    expect(result).toBeInstanceOf(Uint8Array);
    expect(mockFetchTestData.headers).toBeTruthy();
    expect(mockFetchTestData.headersCount).toBe(0);
});

test('get with metadata', async () => {
    const {FetchTool} = require('../../src/FetchTool');
    const ScratchFetch = require('../../src/scratchFetch');
    const {RequestMetadata, setMetadata} = ScratchFetch;

    const tool = new FetchTool();

    setMetadata(RequestMetadata.ProjectId, 1234);
    setMetadata(RequestMetadata.RunId, 5678);

    const mockFetchTestData = {};
    const result = await tool.get({url: '200', mockFetchTestData});

    expect(result).toBeInstanceOf(Uint8Array);
    expect(mockFetchTestData.headers).toBeTruthy();
    expect(mockFetchTestData.headersCount).toBe(2);
    expect(mockFetchTestData.headers?.get(RequestMetadata.ProjectId)).toBe('1234');
    expect(mockFetchTestData.headers?.get(RequestMetadata.RunId)).toBe('5678');
});

test('send without metadata', async () => {
    const {FetchTool} = require('../../src/FetchTool');
    const tool = new FetchTool();

    const mockFetchTestData = {};
    const result = await tool.send({url: '200', mockFetchTestData});

    expect(typeof result).toBe('string');
    expect(mockFetchTestData.headers).toBeTruthy();
    expect(mockFetchTestData.headersCount).toBe(0);
});

test('send with metadata', async () => {
    const {FetchTool} = require('../../src/FetchTool');
    const ScratchFetch = require('../../src/scratchFetch');
    const {RequestMetadata, setMetadata} = ScratchFetch;

    const tool = new FetchTool();

    setMetadata(RequestMetadata.ProjectId, 4321);
    setMetadata(RequestMetadata.RunId, 8765);

    const mockFetchTestData = {};
    const result = await tool.send({url: '200', mockFetchTestData});

    expect(typeof result).toBe('string');
    expect(mockFetchTestData.headers).toBeTruthy();
    expect(mockFetchTestData.headersCount).toBe(2);
    expect(mockFetchTestData.headers?.get(RequestMetadata.ProjectId)).toBe('4321');
    expect(mockFetchTestData.headers?.get(RequestMetadata.RunId)).toBe('8765');
});

test('selectively delete metadata', async () => {
    const {FetchTool} = require('../../src/FetchTool');
    const ScratchFetch = require('../../src/scratchFetch');
    const {RequestMetadata, setMetadata, unsetMetadata} = ScratchFetch;

    // verify that these special values are preserved and not interpreted as "delete"
    setMetadata(RequestMetadata.ProjectId, null);
    setMetadata(RequestMetadata.RunId, void 0); // void 0 = undefined

    const tool = new FetchTool();

    const mockFetchTestData = {};

    const result1 = await tool.send({url: '200', mockFetchTestData});
    expect(typeof result1).toBe('string');
    expect(mockFetchTestData.headers).toBeTruthy();

    expect(mockFetchTestData.headersCount).toBe(2);
    expect(mockFetchTestData.headers?.get(RequestMetadata.ProjectId)).toBe('null'); // string "null" means it's present
    expect(mockFetchTestData.headers?.get(RequestMetadata.RunId)).toBe('undefined');

    // remove the Project ID from metadata
    unsetMetadata(RequestMetadata.ProjectId);

    const result2 = await tool.send({url: '200', mockFetchTestData});
    expect(typeof result2).toBe('string');
    expect(mockFetchTestData.headers).toBeTruthy();

    expect(mockFetchTestData.headersCount).toBe(1);
    expect(mockFetchTestData.headers?.get(RequestMetadata.ProjectId)).toBeNull(); // value `null` means it's present
    expect(mockFetchTestData.headers?.get(RequestMetadata.RunId)).toBe('undefined');
});

test('metadata has case-insensitive keys', async () => {
    const {FetchTool} = require('../../src/FetchTool');
    const ScratchFetch = require('../../src/scratchFetch');
    const {setMetadata} = ScratchFetch;

    setMetadata('foo', 1);
    setMetadata('FOO', 2);

    const tool = new FetchTool();

    const mockFetchTestData = {};
    await tool.get({url: '200', mockFetchTestData});

    expect(mockFetchTestData.headers).toBeTruthy();
    expect(mockFetchTestData.headersCount).toBe(1);
    expect(mockFetchTestData.headers?.get('foo')).toBe('2');
});
