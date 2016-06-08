"use strict";

const _ = global._;

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
 
        return conn.socket.send(payload, {
            fullResult: true,
        })
        .then((ret) => {
            /*
            Result may be a single response or an array of responses to a batch request.
             */
            const resultArray = [].concat(ret.result);
            const final = [];

            for (let r of resultArray) {
                if (r.error) {
                    throw r.error;
                } else {
                    final.push(r.result);
                }
            }

            return ret.isBatch ? final : final[0];
        });
    }
};

