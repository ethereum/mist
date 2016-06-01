const log = require('../../utils/logger').create('method');


/**
 * Process a request.
 *
 * This is the base class for all specialized request processors.
 */
module.exports = class GenericProcessor {
    constructor (name, ipcProviderBackend) {
        super();

        this._log = log.create(name);
        this._ipcProviderBackend = ipcProviderBackend;
    }

    /**
     * Execute given request.
     * @param  {Object} conn    IPCProviderBackend connection data.
     * @param  {Object} payload JSON payload object.
     * @return {Promise}
     */
    exec (conn, payload) {
        this._log.trace('Execute request', payload);

        return conn.socket.send(payload.method, payload.params);
    }
};

