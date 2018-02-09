import throttle from 'lodash/throttle';
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

        this.cachedResponses = {};
    }


    /**
     * Execute given request.
     * @param  {Object} conn    IPCProviderBackend connection data.
     * @param  {Object|Array} payload  payload
     * @return {Promise}
     */
    async exec(conn, payload) {
        this._log.trace('Execute request', payload);

        const isRemote = store.getState().nodes.active === 'remote';
        if (!isRemote) {
            const ret = await conn.socket.send(payload, { fullResult: true });
            return ret.result;
        }

        if (Array.isArray(payload)) {
            return await this._handleArrayExec(conn, payload);
        } else {
            return await this._handleObjectExec(conn, payload);
        }
    }

    _handleObjectExec(conn, payload) {
        return this._sendPayload(payload, conn);
    }

    _handleArrayExec(conn, payload) {
        const result = [];
        const ids = payload.map(v => v.id);
        console.log('∆∆∆ payload ids', ids);

        payload.forEach((value) => {
            result.push(this._handleObjectExec(conn, value));
        });

        return new Promise(async (resolve) => { resolve(await Promise.all(result)) });
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
        const requestSignature = this._requestSignature(payload, conn);
        const cached = await this._getCache(payload, conn, requestSignature);
        if (cached) {
            return cached;
        }

        if (this._shouldSendToRemote(payload, conn)) {
            const remotePromise = this._sendToRemote(payload);
            this.cachedResponses[requestSignature] = {promise: remotePromise, timestamp: Date.now()};

            const remoteResult = await remotePromise;
            console.log('result', payload.method, remoteResult);
            this.cachedResponses[requestSignature] = {result: remoteResult, timestamp: Date.now()};

            return remoteResult;
        } else {
            const localPromise = conn.socket.send(payload, { fullResult: true });
            this.cachedResponses[requestSignature] = {promise: localPromise, timestamp: Date.now()};

            const localResult = await localPromise;
            this.cachedResponses[requestSignature] = {result: localResult.result, timestamp: Date.now()};

            return localResult.result;
        }
    }

    async _getCache(payload, conn, requestSignature) {
        if (!this.throttleMethods.includes(payload.method)) {
            return false;
        }

        if (!this.cachedResponses[requestSignature]) {
            return false;
        }

        if (this.cachedResponses[requestSignature].timestamp < (Date.now() - 10000)) {
            return false;
        }

        if (this.cachedResponses[requestSignature].result) {
            const result = this.cachedResponses[requestSignature].result
            console.log(`returning cached result for payload.id ${payload.id}:`, payload.method, result)
            return Object.assign({}, result, {id: payload.id});
        }
        
        if (this.cachedResponses[requestSignature].promise) {
            console.log(`returning cached promise for payload.id ${payload.id}:`, payload.method, this.cachedResponses[requestSignature].promise)
            const result = await this.cachedResponses[requestSignature].promise;
            console.log(`swapping id ${result.id} for ${payload.id}`);
            return Object.assign({}, result, {id: payload.id});
        }
    }

    _shouldSendToRemote(payload, conn) {
        // Do NOT send to the remote node if: (all conditions must be satisfied)
        // 1. the local node is synced
        const isRemote = store.getState().nodes.active === 'remote';
        if (!isRemote) { return false; }

        // 2. method is on the ignore list
        const method = payload.method;
        if (this.remoteIgnoreMethods.includes(method)) { return false; }

        // 3. the method is 'eth_syncing' originating from the mist interface
        if (conn && conn.owner && conn.owner.history) {
            if (method === 'eth_syncing' && conn.owner.history[0] === 'http://localhost:3000/') {
                console.log('∆∆∆ local node sync call');
                return false;
            }
        }

        return true;
    }

    _sendToRemote(payload) {
        return new Promise((resolve, reject) => {
            ethereumNodeRemote.web3.currentProvider.send(payload, (error, result) => {
                if (error) {
                    log.error(`Error: ${error}`);
                    reject(error);
                    return;
                }
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

// Function for generating payload signature for throttling/caching
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
