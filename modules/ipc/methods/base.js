const _ = require('../../utils/underscore.js');
const Q = require('bluebird');

const log = require('../../utils/logger').create('method');
const Windows = require('../../windows');
const db = require('../../db');
import ethereumNodeRemote from '../../ethereumNodeRemote';


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

        this.remoteIgnoreMethods = [    
            'net_peerCount',
            'eth_mining',
            'eth_accounts'
        ];

        this.throttleMethods = [
            'eth_getStorageAt',
            'eth_getFilterChanges',
            'eth_getBalance',
            'eth_getTransactionReceipt',
            'eth_getTransactionByHash',
            'eth_getBlockByHash',
            'eth_call',
            'eth_syncing'
        ];

        this.throttles = {};
    }


    /**
     * Execute given request.
     * @param  {Object} conn    IPCProviderBackend connection data.
     * @param  {Object|Array} payload  payload
     * @return {Promise}
     */
    async exec(conn, payload) {
        // console.log('$$$');
        // console.log(payload);
        // this._log.trace('Execute request', payload);

        if (Array.isArray(payload)) {
            const result = []; 
            payload.forEach((value) => {
                if (this.throttleMethods.includes(value.method)) {
                    const requestSignature = this._requestSignature(value, conn);
                    if (!this.throttles[requestSignature]) {
                        this.throttles[requestSignature] = _.throttle(_.bind(this._sendPayload, this), 7500);
                    }
                    result.push(this.throttles[this._requestSignature(value, conn)](value, payload));
                } else {
                    result.push(this._sendPayload(value, conn));
                }
            });
            const ret = await Promise.all(result);
            console.log('&&&');
            console.log(ret);
            return ret;
        } else {
            if (this.throttleMethods.includes(payload.method)) {
                const requestSignature = this._requestSignature(payload, conn);
                if (!this.throttles[requestSignature]) {
                    this.throttles[requestSignature] = _.throttle(_.bind(this._sendPayload, this), 7500);
                }
                const throttle = await this.throttles[requestSignature](payload, conn);
                const ret = Object.assign(throttle, {id: payload.id});
                console.log('throttle');
                console.log(ret);
                return ret;
            } else {
                return await this._sendPayload(payload, conn);
            }
        }
    }

    _requestSignature(payload, conn) {
        const requestDetails = [payload.method, payload.params];

        if (conn && conn.owner && conn.owner.history) {
            requestDetails.push(conn.owner.history[0]);
        }

        const stringify = JSON.stringify(requestDetails);
        const signature = bitwise(stringify);
        return signature;
    };

    async _sendPayload(payload, conn) {
        return new Promise(async (resolve) => {
            if (this._shouldSendToRemote(payload, conn)) {
                const remoteResult = await this._sendToRemote(payload);
                resolve(remoteResult);
            } else {
                const ret = await conn.socket.send(payload, { fullResult: true });
                console.log('***');
                console.log(ret);
                resolve(ret.result);
            }
        });
    }

    _shouldSendToRemote(payload, conn) {
        const method = payload.method;

        const isRemote = store.getState().nodes.active === 'remote';

        if (!isRemote) {
            return false;
        }

        if (this.remoteIgnoreMethods.includes(method)) {
            return false;
        }

        if (conn && conn.owner && conn.owner.history) {
            console.log('###');
            console.log(method);
            console.log(conn.owner.history[0]);
            console.log(payload.id);
            if (method === 'eth_syncing' && conn.owner.history[0] === 'http://localhost:3000/') {
                console.log('@@@');
                return false;
            }
        }

        return true;
    }

    async _sendToRemote(payload) {
        return new Promise((resolve, reject) => {
            ethereumNodeRemote.web3.currentProvider.send(payload, (error, result) => {
                if (error) {
                    log.error(`Error: ${error}`);
                    reject(error);
                    return;
                }

                console.log('%%%');
                console.log(result);

                resolve(result);
            });
        });
    }


    _isAdminConnection(conn) {
        // main window or popupwindows - always allow requests
        const wnd = Windows.getById(conn.id);
        const tab = db.getCollection('UI_tabs').findOne({ webviewId: conn.id });

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
        if (!/^eth_|^bzz_|^shh_|^net_|^web3_|^db_/.test(payload.method)) {
            delete payload.result;
            const err = _.clone(this.ERRORS.METHOD_DENIED);
            err.message = err.message.replace('__method__', `"${payload.method}"`);
            payload.error = err;
        }
    }
};

// Function for generating payload signature for throttling
function bitwise(str) {
    var hash = 0;
    if (str.length == 0) return hash;
    var i;
    for (i = 0; i < str.length; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
    }
    return hash;
}
