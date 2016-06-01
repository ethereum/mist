"use strict";

const log = require('../../utils/logger').create('method');


/**
 * Process a request.
 *
 * This is the base class for all specialized request processors.
 */
module.exports = class BaseProcessor {
    constructor (name, ipcProviderBackend) {
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

        return conn.socket.send(payload.method, payload.params, {
            fullResult: true,
        })
        .then((result) => {
            if (result.error) {
                throw result.error;
            } else {
                return result.result;
            }
        });
    }
};

