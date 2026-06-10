/**
 * @file Tests the build output to verify the scratchFetch portion of the public API.
 */

const ScratchStorageModule = require('../../dist/node/scratch-storage.js');

/** @type {ScratchStorageModule.ScratchStorage} */
let storage;

beforeEach(() => {
    const {ScratchStorage} = ScratchStorageModule;
    storage = new ScratchStorage();
});

test('scratchFetch accessor', () => {
    expect(storage.scratchFetch).toBeDefined();
});

test('Headers', () => {
    expect(storage.scratchFetch).toBeDefined();
    const headers = new storage.scratchFetch.Headers();
    expect(headers).toBeInstanceOf(storage.scratchFetch.Headers);
});

test('RequestMetadata enum', () => {
    expect(storage.scratchFetch.RequestMetadata).toBeDefined();
    expect(typeof storage.scratchFetch.RequestMetadata.ProjectId).toBe('string');
    expect(typeof storage.scratchFetch.RequestMetadata.RunId).toBe('string');
});

test('scratchFetch function', () => {
    expect(typeof storage.scratchFetch.scratchFetch).toBe('function');
});

test('metadata functions', () => {
    expect(typeof storage.scratchFetch.applyMetadata).toBe('function');
    expect(typeof storage.scratchFetch.setMetadata).toBe('function');
    expect(typeof storage.scratchFetch.unsetMetadata).toBe('function');
    expect(typeof storage.scratchFetch.getMetadata).toBe('function');
});
