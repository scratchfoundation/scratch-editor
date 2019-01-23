const FetchWorkerTool = require('./FetchWorkerTool');
const FetchTool = require('./FetchTool');
const NetsTool = require('./NetsTool');

/**
 * Get and send assets with other tools in sequence.
 */
class ProxyTool {
    constructor (filter = ProxyTool.TOOL_FILTER.ALL) {
        let tools;
        if (filter === ProxyTool.TOOL_FILTER.READY) {
            tools = [new FetchTool(), new NetsTool()];
        } else {
            tools = [new FetchWorkerTool(), new FetchTool(), new NetsTool()];
        }

        /**
         * Sequence of tools to proxy.
         * @type {Array.<Tool>}
         */
        this.tools = tools;
    }

    /**
     * Is get supported? false if all proxied tool return false.
     * @returns {boolean} Is get supported?
     */
    get getSupported () {
        return this.tools.some(tool => tool.getSupported);
    }

    /**
     * Request data from with one of the proxied tools.
     * @param {{url:string}} reqConfig - Request configuration for data to get.
     * @param {{method:string}} options - Additional options to configure fetch.
     * @returns {Promise.<Buffer>} Resolve to Buffer of data from server.
     */
    get (reqConfig, options) {
        let toolIndex = 0;
        const nextTool = err => {
            const tool = this.tools[toolIndex++];
            if (!tool.getSupported) {
                return nextTool(err);
            }
            if (!tool) {
                throw err;
            }
            return tool.get(reqConfig, options).catch(nextTool);
        };
        return nextTool();
    }
}

/**
 * Constant values that filter the set of tools in a ProxyTool instance.
 * @enum {string}
 */
ProxyTool.TOOL_FILTER = {
    /**
     * Use all tools.
     */
    ALL: 'all',

    /**
     * Use tools that are ready right now.
     */
    READY: 'ready'
};

module.exports = ProxyTool;
