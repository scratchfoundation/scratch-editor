const ScratchStorage = require('../../src');

/**
 * Simulate a storage helper, adding log messages when "load" is called rather than actually loading anything.
 */
class LoggingHelper {
    /**
     * Construct a LoggingHelper instance.
     * @param {Storage} storage - An instance of the storage module.
     * @param {string} label - A label for this instance.
     * @param {boolean} shouldSucceed - set to true to make `load` always succeed, or false to make `load` always fail.
     * @param {Array.<string>} logContainer - an array in which log messages will be stored.
     * @constructor
     */
    constructor (storage, label, shouldSucceed, logContainer) {
        this.storage = storage;
        this.label = label;
        this.shouldSucceed = shouldSucceed;
        this.logContainer = logContainer;
    }

    /**
     * Pretend to fetch an asset, but instead add a message to the log container.
     * @param {AssetType} assetType - The type of asset to fetch.
     * @param {string} assetId - The ID of the asset to fetch: a project ID, MD5, etc.
     * @param {DataFormat} dataFormat - The file format / file extension of the asset to fetch: PNG, JPG, etc.
     * @return {Promise.<Asset>} A promise for the contents of the asset.
     */
    load (assetType, assetId, dataFormat) {
        this.logContainer.push(this.label);
        return this.shouldSucceed ?
            Promise.resolve(new this.storage.Asset(assetType, assetId, dataFormat, Buffer.from(this.label))) :
            Promise.reject(new Error(`This is an expected failure from ${this.label}`));
    }
}

test('ScratchStorage constructor', () => {
    const storage = new ScratchStorage();
    expect(storage).toBeInstanceOf(ScratchStorage);
});

test('LoggingHelper constructor', () => {
    const storage = new ScratchStorage();
    const loggingHelper = new LoggingHelper(storage, 'constructor test', true, []);
    expect(loggingHelper).toBeInstanceOf(LoggingHelper);
});

test('addHelper', async () => {
    const logContainer = [];
    const storage = new ScratchStorage();

    const initialHelperCount = storage._helpers.length;

    // The first two helpers should fail (shouldSucceed=false) so that the storage module continues through the list.
    // The third helper should succeed (shouldSucceed=true) so that the overall load succeeds.
    const loggingHelpers = [
        new LoggingHelper(storage, 'first', false, logContainer),
        new LoggingHelper(storage, 'second', false, logContainer),
        new LoggingHelper(storage, 'third', true, logContainer)
    ];

    // Add out of order to check that the priority values are respected
    storage.addHelper(loggingHelpers[2], -50);
    storage.addHelper(loggingHelpers[0], 50);
    storage.addHelper(loggingHelpers[1], 0);

    // Did they all get added?
    expect(storage._helpers.length).toBe(initialHelperCount + loggingHelpers.length);

    // We shouldn't have any log entries yet
    expect(logContainer).toStrictEqual([]);

    await storage.load(storage.AssetType.Project, '0');

    // Verify that all helpers were consulted, and in the correct order
    expect(logContainer).toStrictEqual([
        'first',
        'second',
        'third'
    ]);
});
