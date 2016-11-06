

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
    constructor(name, ipcProviderBackend) {
        this._log = log.create(name);
        this._ipcProviderBackend = ipcProviderBackend;
        this.ERRORS = this._ipcProviderBackend.ERRORS;
    }

    /**
     * Execute given request.
     * @param  {Object} conn    IPCProviderBackend connection data.
     * @param  {Object|Array} payload  payload
     * @return {Promise}
     */
    exec(conn, payload) {
        this._log.trace('Execute request', payload);

        return conn.socket.send(payload, {
            fullResult: true,
        })
        .then(ret => ret.result);
    }


    _isAdminConnection(conn) {
        // main window or popupwindows - always allow requests
        const wnd = Windows.getById(conn.id);
        const tab = db.getCollection('tabs').findOne({ webviewId: conn.id });

        return ((wnd && (wnd.type === 'main' || wnd.isPopup)) ||
                (tab && _.get(tab, 'permissions.admin') === true));
    }


    /**
    Sanitize a request payload.

    This may modify the input payload object.

    @param {Object} conn The connection.
    @param {Object} payload The request payload.
    @param {Boolean} isPartOfABatch Whether it's part of a batch payload.
    */
    sanitizeRequestPayload(conn, payload, isPartOfABatch) {
        this._log.trace('Sanitize request payload', payload);

        this._sanitizeRequestResponsePayload(conn, payload, isPartOfABatch);
    }


    /**
    Sanitize a response payload.

    This may modify the input payload object.

    @param {Object} conn The connection.
    @param {Object} payload The request payload.
    @param {Boolean} isPartOfABatch Whether it's part of a batch payload.
    */
    sanitizeResponsePayload(conn, payload, isPartOfABatch) {
        this._log.trace('Sanitize response payload', payload);

        this._sanitizeRequestResponsePayload(conn, payload, isPartOfABatch);
    }


    /**
    Sanitize a request or response payload.

    This may modify the input payload object.

    @param {Object} conn The connection.
    @param {Object} payload The request payload.
    @param {Boolean} isPartOfABatch Whether it's part of a batch payload.
    */
    _sanitizeRequestResponsePayload(conn, payload, isPartOfABatch) {
        if (!_.isObject(payload)) {
            throw this.ERRORS.INVALID_PAYLOAD;
        }

        if (this._isAdminConnection(conn)) {
            return;
        }

        // prevent dapps from acccesing admin endpoints
        if (!/^eth_|^shh_|^net_|^web3_|^db_/.test(payload.method)) {
            delete payload.result;

            payload.error = this.ERRORS.METHOD_DENIED;
        }
    }
};

