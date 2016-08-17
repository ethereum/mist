"use strict";

const _ = global._;
const Q = require('bluebird');

const log = require('../../utils/logger').create('method');
const Windows = require('../../windows');
const db = require('../../db');


/**
 * Process a request.
 *
 * This is the base class for all specialized request processors.
 */
module.exports = class BaseProcessor {
    constructor (name, ipcProviderBackend) {
        this._log = log.create(name);
        this._ipcProviderBackend = ipcProviderBackend;
        this.ERRORS = this._ipcProviderBackend.ERRORS;
    }

    /**
     * Execute given request.
     * @param  {Object} conn    IPCProviderBackend connection data.
     * @param  {Object|Array} payload JSON payload object
     * @return {Promise}
     */
    exec (conn, payload) {
        this._log.trace('Execute request', payload);

        const isBatch = _.isArray(payload);

        const payloadList = isBatch ? payload : [payload];

        // filter out payloads which already have an error
        const finalPayload = _.filter(payloadList, (p) => {
            return !p.error;
        });

        return Q.try(() => {
            if (finalPayload.length) {
                return conn.socket.send(finalPayload, {
                    fullResult: true,
                });
            } else {
                return [];
            }
        })
        .then((ret) => {
            let result = [];

            _.each(payloadList, (p) => {
                if (p.error) {
                    result.push(p);
                } else {
                    p = _.extend({}, p, ret.result.shift());

                    this.sanitizePayload(conn, p);

                    result.push(p);
                }
            });

            // if single payload
            if (!isBatch) {
                result = result[0];

                // throw error if found
                if (result.error) {
                    throw result.error;
                }
            }

            return result;
        });
    }


    _isAdminConnection (conn) {
        // main window or popupwindows - always allow requests
        let wnd = Windows.getById(conn.id);
        let tab = db.getCollection('tabs').findOne({ webviewId: conn.id });

        return ((wnd && ('main' === wnd.type || wnd.isPopup)) ||
                (tab && _.get(tab, 'permissions.admin') === true));
    }


    /**
    Sanitize a request or response payload.

    This will modify the input payload object.

    @param {Object} conn The connection.
    @param {Object} payload The request payload.
    */
    sanitizePayload (conn, payload) {
        this._log.trace('Sanitize payload', payload);

        if (!_.isObject(payload)) {
            throw this.ERRORS.INVALID_PAYLOAD;
        }

        if (this._isAdminConnection(conn)) {
            return;
        }

        // prevent dapps from acccesing admin endpoints
        if(!/^eth_|^shh_|^net_|^web3_|^db_/.test(payload.method)){
            delete payload.result;

            payload.error = this.ERRORS.METHOD_DENIED;
        
        }
    }


};

