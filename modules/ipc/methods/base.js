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
      'eth_mining',
      'eth_accounts',
      'eth_coinbase',
      'personal_newAccount',
      'personal_signTransaction',
      'eth_subscribe',
      'eth_unsubscribe'
    ];
  }

  /**
   * Execute given request.
   * @param  {Object} conn    IPCProviderBackend connection data.
   * @param  {Object|Array} payload  payload
   * @return {Promise}
   */
  async exec(conn, payload) {
    this._log.trace('Execute request', payload);

    if (Array.isArray(payload)) {
      return await this._handleArrayExec(payload, conn);
    } else {
      return await this._handleObjectExec(payload, conn);
    }
  }

  _handleObjectExec(payload, conn) {
    return this._sendPayload(payload, conn);
  }

  async _handleArrayExec(payload, conn) {
    // If on local node, send batch transaction.
    // Otherwise, iterate through the batch to send over remote node since infura does not have batch support yet.
    const isRemote = store.getState().nodes.active === 'remote';
    if (!isRemote) {
      this._log.trace(
        `Sending batch request to local node: ${payload
          .map(req => {
            return req.payload;
          })
          .join(', ')}`
      );
      const ret = await conn.socket.send(payload, { fullResult: true });
      this._log.trace(
        `Result from batch request: ${payload
          .map(req => {
            return req.payload;
          })
          .join(', ')}`
      );
      return ret.result;
    }

    const result = [];

    payload.forEach(value => {
      result.push(this._handleObjectExec(value, conn));
    });

    return new Promise(async resolve => {
      resolve(await Promise.all(result));
    });
  }

  async _sendPayload(payload, conn) {
    if (this._shouldSendToRemote(payload, conn)) {
      this._log.trace(`Sending request to remote node: ${payload.method}`);
      const result = await this._sendToRemote(payload);
      this._log.trace(
        `Result from remote node: ${payload.method} (id: ${payload.id})`
      );
      return result;
    } else {
      this._log.trace(`Sending request to local node: ${payload.method}`);
      const result = await conn.socket.send(payload, { fullResult: true });
      this._log.trace(
        `Result from local node: ${payload.method} (id: ${payload.id})`
      );
      return result.result;
    }
  }

  _shouldSendToRemote(payload, conn) {
    // Do NOT send to the remote node if: (all conditions must be satisfied)
    // 1. the local node is synced
    const isRemote = store.getState().nodes.active === 'remote';
    if (!isRemote) {
      return false;
    }

    // 2. method is on the ignore list
    const method = payload.method;
    if (this.remoteIgnoreMethods.includes(method)) {
      return false;
    }

    // 3. the method is
    // net_peerCount|eth_syncing|eth_subscribe[syncing]
    // originating from the mist interface
    if (
      conn &&
      conn.owner &&
      conn.owner.history &&
      conn.owner.history[0].startsWith('http://localhost:3000')
    ) {
      if (
        method === 'eth_syncing' ||
        (method === 'eth_subscribe' && payload.params[0] === 'syncing') ||
        method === 'net_peerCount'
      ) {
        return false;
      }
    }

    return true;
  }

  _sendToRemote(payload, retry = false) {
    return new Promise(async (resolve, reject) => {
      const requestId = await ethereumNodeRemote.send(
        payload.method,
        payload.params
      );

      if (!requestId) {
        const errorMessage = `No request id for method ${payload.method} (${
          payload.params
        })`;
        reject(errorMessage);
        this._log.error(errorMessage);
        return;
      }

      const callback = data => {
        if (!data) {
          return;
        }

        try {
          data = JSON.parse(data);
        } catch (error) {
          const errorMessage = `Error parsing data: ${data}`;
          this._log.trace(errorMessage);
          reject(errorMessage);
        }

        if (data.id === requestId) {
          resolve(data);
          // TODO: remove listener
          // ethereumNodeRemote.ws.removeListener('message', callback);
        }
      };

      ethereumNodeRemote.ws.on('message', callback);
    });
  }

  _isAdminConnection(conn) {
    // main window or popupwindows - always allow requests
    const wnd = Windows.getById(conn.id);
    const tab = db.getCollection('UI_tabs').findOne({ webviewId: conn.id });

    return (
      (wnd && (wnd.type === 'main' || wnd.isPopup)) ||
      (tab && _.get(tab, 'permissions.admin') === true)
    );
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
