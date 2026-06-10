import FetchWorkerTool from './FetchWorkerTool';
import {FetchTool} from './FetchTool';
import {ScratchGetRequest, ScratchSendRequest, Tool} from './Tool';

/**
 * @typedef {object} Request
 * @property {string} url
 * @property {*} body
 * @property {string} method
 * @property {boolean} withCredentials
 */

type ToolFilter = typeof ProxyTool.TOOL_FILTER[keyof typeof ProxyTool.TOOL_FILTER];

/**
 * Get and send assets with other tools in sequence.
 */
export default class ProxyTool implements Tool {
    public tools: Tool[];

    /**
     * Constant values that filter the set of tools in a ProxyTool instance.
     * @enum {string}
     */
    public static TOOL_FILTER = {
        /**
         * Use all tools.
         */
        ALL: 'all',

        /**
         * Use tools that are ready right now.
         */
        READY: 'ready'
    } as const;

    constructor (filter: ToolFilter = ProxyTool.TOOL_FILTER.ALL) {
        let tools: Tool[];
        if (filter === ProxyTool.TOOL_FILTER.READY) {
            tools = [new FetchTool()];
        } else {
            tools = [new FetchWorkerTool(), new FetchTool()];
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
    get isGetSupported (): boolean {
        return this.tools.some(tool => tool.isGetSupported);
    }

    /**
     * Request data from with one of the proxied tools.
     * @param {Request} reqConfig - Request configuration for data to get.
     * @returns {Promise.<Buffer>} Resolve to Buffer of data from server.
     */
    get (reqConfig: ScratchGetRequest): Promise<Uint8Array | null> {
        let toolIndex = 0;
        const nextTool = (err?: unknown): Promise<Uint8Array | null> => {
            const tool = this.tools[toolIndex++];
            if (!tool) {
                throw err;
            }
            if (!tool.isGetSupported) {
                return nextTool(err);
            }
            return tool.get(reqConfig).catch(nextTool);
        };
        return nextTool();
    }

    /**
     * Is sending supported? false if all proxied tool return false.
     * @returns {boolean} Is sending supported?
     */
    get isSendSupported (): boolean {
        return this.tools.some(tool => tool.isSendSupported);
    }

    /**
     * Send data to a server with one of the proxied tools.
     * @param {Request} reqConfig - Request configuration for data to send.
     * @returns {Promise.<Buffer|string|object>} Server returned metadata.
     */
    send (reqConfig: ScratchSendRequest): Promise<string> {
        let toolIndex = 0;
        const nextTool = (err?: unknown): Promise<string> => {
            const tool = this.tools[toolIndex++];
            if (!tool) {
                throw err;
            }
            if (!tool.isSendSupported) {
                return nextTool(err);
            }
            return tool.send(reqConfig).catch(nextTool);
        };
        return nextTool();
    }
}
