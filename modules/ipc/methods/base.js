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
      'eth_accounts',
      'eth_subscribe'
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

    const isRemote = store.getState().nodes.active === 'remote';
    if (!isRemote) {
      const ret = await conn.socket.send(payload, { fullResult: true });
      return ret.result;
    }

    if (Array.isArray(payload)) {
      return await this._handleArrayExec(payload, conn);
    } else {
      return await this._handleObjectExec(payload, conn);
    }
  }

  _handleObjectExec(payload, conn) {
    return this._sendPayload(payload, conn);
  }

  _handleArrayExec(payload, conn) {
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
      return await this._sendToRemote(payload);
    } else {
      const result = await conn.socket.send(payload, { fullResult: true });
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

    // 3. the method is 'eth_syncing' or 'eth_subscribe'('syncing')
    // originating from the mist interface
    if (
      conn &&
      conn.owner &&
      conn.owner.history &&
      conn.owner.history[0].startsWith('http://localhost:3000')
    ) {
      if (
        method === 'eth_syncing' ||
        (method === 'eth_subscribe' && payload.params[0] === 'syncing')
      ) {
        return false;
      }
    }

    return true;
  }

  _sendToRemote(payload) {
    return new Promise((resolve, reject) => {
      console.log('ethereumNodeRemote - send ', payload.method, payload.id);
      ethereumNodeRemote.web3.currentProvider.send(payload, (error, result) => {
        if (error) {
          if (String(error).includes('connection not open')) {
            // Try restarting connection and sending again
            ethereumNodeRemote.start();
            this._sendToRemote(payload);
          }
          log.error(`Error: ${error}`);
          reject(error);
          return;
        }
        console.log('ethereumNodeRemote - result ', payload.method, payload.id);
        resolve(result);
      });
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
