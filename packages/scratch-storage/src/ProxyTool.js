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
    get isGetSupported () {
        return this.tools.some(tool => tool.isGetSupported);
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
            if (!tool) {
                throw err;
            }
            if (!tool.isGetSupported) {
                return nextTool(err);
            }
            return tool.get(reqConfig, options).catch(nextTool);
        };
        return nextTool();
    }

    /**
     * Is sending supported? false if all proxied tool return false.
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported () {
        return this.tools.some(tool => tool.isSendSupported);
    }

    /**
     * Send data to a server with one of the proxied tools.
     * @param {{url:string}} reqConfig - Request configuration for data to send.
     * @param {*} data - Data to send.
     * @param {string} method - HTTP method to sending the data as.
     * @returns {Promise.<Buffer|string|object>} Server returned metadata.
     */
    send (reqConfig, data, method) {
        let toolIndex = 0;
        const nextTool = err => {
            const tool = this.tools[toolIndex++];
            if (!tool) {
                throw err;
            }
            if (!tool.isSendSupported) {
                return nextTool(err);
            }
            return tool.send(reqConfig, data, method).catch(nextTool);
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
