import log from './log.js';
import throttle from 'lodash.throttle';

class CloudProvider {
    private vm: any;
    private username: string | null = null;
    private projectId: string | null = null;
    private cloudHost: string;
    private readAuth?: () => Promise<string | null | undefined>;

    private isTryingToConnect = false;
    private connection: WebSocket | null = null;
    private connectionAttempts: number;
    private queuedData: string[];
    private _connectionTimeout: number | null = null;

    private sendCloudData: (data: string) => void;

    /**
     * A cloud data provider which creates and manages a web socket connection
     * to the Scratch cloud data server. This provider is responsible for
     * interfacing with the VM's cloud io device.
     * @param {string} cloudHost The url for the cloud data server
     * @param {VirtualMachine} vm The Scratch virtual machine to interface with
     * @param {string} username The username to associate cloud data updates with
     * @param {string} projectId The id associated with the project containing
     * @param {null | undefined | () => Promise<string | null | undefined>} readAuth A function to get an auth token
     */
    constructor (
        cloudHost: string,
        vm: unknown,
        username: string,
        projectId: string,
        readAuth?: () => Promise<string | null | undefined>
    ) {
        this.vm = vm;
        this.username = username;
        this.projectId = projectId;
        this.cloudHost = cloudHost;
        this.readAuth = readAuth;

        this.connectionAttempts = 0;

        // A queue of messages to send which were received before the
        // connection was ready
        this.queuedData = [];

        this.isTryingToConnect = true;
        this.openConnection();

        // Send a message to the cloud server at a rate of no more
        // than 10 messages/sec.
        this.sendCloudData = throttle(this._sendCloudData, 100);
    }

    isConnectedOrConnecting () {
        // There is a brief moment in time between when we start connecting and when the connection object is set
        return this.isTryingToConnect || !!this.connection;
    }

    /**
     * Open a new websocket connection to the clouddata server.
     * @param {string} cloudHost The cloud data server to connect to.
     */
    openConnection () {
        this.connectionAttempts += 1;

        const authPromise = this.readAuth ? this.readAuth() : null;

        if (authPromise) {
            authPromise.then(token => {
                this.connectWithToken(token);
            }).catch(error => log.error('Could not read auth for clouddata', error));
        } else {
            this.connectWithToken(null);
        }
    }

    private connectWithToken (token: string | null | undefined) {
        // See https://stackoverflow.com/questions/4361173/http-headers-in-websockets-client-api
        const protocols = token ? [`bearer!${token}`] : [];

        try {
            this.connection = new WebSocket((location.protocol === 'http:' ? 'ws://' : 'wss://') + this.cloudHost, protocols);
        } catch (e) {
            log.warn('Websocket support is not available in this browser', e);
            this.isTryingToConnect = false;
            this.connection = null;
            return;
        }

        this.connection.onerror = this.onError.bind(this);
        this.connection.onmessage = this.onMessage.bind(this);
        this.connection.onopen = this.onOpen.bind(this);
        this.connection.onclose = this.onClose.bind(this);
    }

    onError (event) {
        log.error(`Websocket connection error: ${JSON.stringify(event)}`);
        // Error is always followed by close, which handles reconnect logic.
    }

    onMessage (event) {
        const messageString = event.data;
        // Multiple commands can be received, newline separated
        messageString.split('\n').forEach(message => {
            if (message) { // .split can also contain '' in the array it returns
                const parsedData = this.parseMessage(JSON.parse(message));
                this.vm.postIOData('cloud', parsedData);
            }
        });
    }

    onOpen () {
        // Reset connection attempts to 1 to make sure any subsequent reconnects
        // use connectionAttempts=1 to calculate timeout
        this.connectionAttempts = 1;
        this.writeToServer('handshake');
        log.info(`Successfully connected to clouddata server.`);

        // Go through the queued data and send off messages that we weren't
        // ready to send before
        this.queuedData.forEach(data => {
            this.sendCloudData(data);
        });
        // Reset the queue
        this.queuedData = [];
    }

    onClose () {
        log.info(`Closed connection to websocket`);
        const randomizedTimeout = this.randomizeDuration(this.exponentialTimeout());
        this.setTimeout(this.openConnection.bind(this), randomizedTimeout);
    }

    exponentialTimeout () {
        return (Math.pow(2, Math.min(this.connectionAttempts, 5)) - 1) * 1000;
    }

    randomizeDuration (t) {
        return Math.random() * t;
    }

    /**
     * Schedule a reconnection attempt to the cloud data server after a websocket disconnect.
     * This method manages the delay (with exponential backoff and jitter) before trying to reconnect,
     * helping to avoid overwhelming the server with rapid reconnection attempts.
     * @param {Function} fn - The function to call after the delay (typically to reopen the connection).
     * @param {number} time - The delay time in milliseconds before attempting to reconnect.
     */
    setTimeout (fn: () => void, time: number) {
        log.info(`Reconnecting in ${(time / 1000).toFixed(1)}s, attempt ${this.connectionAttempts}`);
        this._connectionTimeout = window.setTimeout(fn, time);
    }

    parseMessage (message) {
        const varData: any = {};
        switch (message.method) {
        case 'set': {
            varData.varUpdate = {
                name: message.name,
                value: message.value
            };
            break;
        }
        }
        return varData;
    }

    /**
     * Format and send a message to the cloud data server.
     * @param {string} methodName The message method, indicating the action to perform.
     * @param {string} dataName The name of the cloud variable this message pertains to
     * @param {string | number | null} dataValue The value to set the cloud variable to
     * @param {string} dataNewName The new name for the cloud variable (if renaming)
     */
    writeToServer (
        methodName: string,
        dataName?: string,
        dataValue?: string | number | null,
        dataNewName?: string
    ) {
        const msg: any = {};
        msg.method = methodName;
        msg.user = this.username;
        msg.project_id = this.projectId;

        // Optional string params can use simple falsey undefined check
        if (dataName) msg.name = dataName;
        if (dataNewName) msg.new_name = dataNewName;

        // Optional number params need different undefined check
        if (typeof dataValue !== 'undefined' && dataValue !== null) msg.value = dataValue;

        const dataToWrite = JSON.stringify(msg);
        if (this.connection && this.connection.readyState === WebSocket.OPEN) {
            this.sendCloudData(dataToWrite);
        } else if (msg.method === 'create' || msg.method === 'delete' || msg.method === 'rename') {
            // Save data for sending when connection is open, iff the data
            // is a create, rename, or  delete
            this.queuedData.push(dataToWrite);
        }

    }

    /**
     * Send a formatted message to the cloud data server.
     * @param {string} data The formatted message to send.
     */
    _sendCloudData (data) {
        this.connection!.send(`${data}\n`);
    }

    /**
     * Provides an API for the VM's cloud IO device to create
     * a new cloud variable on the server.
     * @param {string} name The name of the variable to create
     * @param {string | number} value The value of the new cloud variable.
     */
    createVariable (name: string, value: string | number) {
        this.writeToServer('create', name, value);
    }

    /**
     * Provides an API for the VM's cloud IO device to update
     * a cloud variable on the server.
     * @param {string} name The name of the variable to update
     * @param {string | number} value The new value for the variable
     */
    updateVariable (name: string, value: string | number) {
        this.writeToServer('set', name, value);
    }

    /**
     * Provides an API for the VM's cloud IO device to rename
     * a cloud variable on the server.
     * @param {string} oldName The old name of the variable to rename
     * @param {string} newName The new name for the cloud variable.
     */
    renameVariable (oldName: string, newName: string) {
        this.writeToServer('rename', oldName, null, newName);
    }

    /**
     * Provides an API for the VM's cloud IO device to delete
     * a cloud variable on the server.
     * @param {string} name The name of the variable to delete
     */
    deleteVariable (name: string) {
        this.writeToServer('delete', name);
    }

    /**
     * Closes the connection to the web socket and clears the cloud
     * provider of references related to the cloud data project.
     */
    requestCloseConnection () {
        if (this.connection &&
            this.connection.readyState !== WebSocket.CLOSING &&
            this.connection.readyState !== WebSocket.CLOSED) {
            log.info('Request close cloud connection without reconnecting');
            // Remove listeners, after this point we do not want to react to connection updates
            this.connection.onclose = () => {};
            this.connection.onerror = () => {};
            this.connection.close();
        }
        this.clear();
    }

    /**
     * Clear this provider of references related to the project
     * and current state.
     */
    clear () {
        this.isTryingToConnect = false;
        this.connection = null;
        this.vm = null;
        this.username = null;
        this.projectId = null;
        if (this._connectionTimeout) {
            clearTimeout(this._connectionTimeout);
            this._connectionTimeout = null;
        }
        this.connectionAttempts = 0;
    }

}

export default CloudProvider;
