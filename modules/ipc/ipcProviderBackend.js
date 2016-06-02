"use strict";

/**
The IPC provider backend filter and tunnel all incoming request to the ethereum node.

@module ipcProviderBackend
*/

const _ = global._;
const Q = require('bluebird');
const electron = require('electron');
const ipc = electron.ipcMain;
const fs = require('fs');
const path = require('path');

const log = require('../utils/logger').create('ipcProviderBackend');
const ipcPath = require('./getIpcPath')();
const Sockets = require('../sockets');
const ethereumNode = require('../ethereumNode');
const Windows = require('../windows');


const ERRORS = {
    INVALID_PAYLOAD: {"code": -32600, "message": "Payload invalid."},
    METHOD_DENIED: {"code": -32601, "message": "Method \'__method__\' not allowed."},
    METHOD_TIMEOUT: {"code": -32603, "message": "Request timed out for method  \'__method__\'."},
    TX_DENIED: {"code": -32603, "message": "Transaction denied"},
    BATCH_TX_DENIED: {"code": -32603, "message": "Transactions denied, sendTransaction is not allowed in batch requests."},
};



/**
 * IPC provider backend.
 */
class IpcProviderBackend {
    constructor () {
        this._connections = {};

        this.ERRORS = ERRORS;

        ethereumNode.on('state', _.bind(this._onNodeStateChanged, this));

        ipc.on('ipcProvider-create', _.bind(this._getOrCreateConnection, this));
        ipc.on('ipcProvider-destroy', _.bind(this._destroyConnection, this));
        ipc.on('ipcProvider-write', _.bind(this._sendRequest, this, false));
        ipc.on('ipcProvider-writeSync', _.bind(this._sendRequest, this, true));

        // dynamically load in method processors
        let processors = fs.readdirSync(path.join(__dirname, 'methods'));

        this._processors = {};

        processors.forEach((p) => {
            let name = path.basename(p, '.js');

            let PClass = require(path.join(__dirname, 'methods', p));

            this._processors[name] = new PClass(name, this);
        });

        log.trace('Loaded processors', _.keys(this._processors));
    }


    /**
     * Get/create new connection to node.
     * @return {Promise}
     */
    _getOrCreateConnection (event) {
        const owner = event.sender,   
            ownerId = owner.getId();

        let socket;

        return Q.try(() => {
            // already got?
            if (this._connections[ownerId]) {
                socket = this._connections[ownerId].socket;
            } else {
                log.debug(`Get/create socket connection, id=${ownerId}`);

                socket = Sockets.get(ownerId, Sockets.TYPES.WEB3_IPC);
            }
        })
        .then(() => {
            if (!socket.isConnected) {
                log.trace('Reconnecting socket...');

                return socket.connect({
                    path: ipcPath,
                }, {
                    timeout: 5000,
                });
            }
        })
        .then(() => {
            // set writeable
            owner.send('ipcProvider-setWritable', true);

            if (!this._connections[ownerId]) {
                // save to collection
                this._connections[ownerId] = {
                    id: ownerId,
                    owner: owner,
                    socket: socket,
                };

                // if something goes wrong destroy the socket
                ['error', 'timeout', 'end'].forEach((ev) => {
                    socket.on(ev, (data) => {
                        log.debug(`Destroy socket connection due to event: ${ev}, id=${ownerId}`);

                        socket.destroy().finally(() => {
                            delete this._connections[ownerId];
                            
                            owner.send(`ipcProvider-${ev}`, JSON.stringify(data));
                        });
                    });                
                });

                // pass notifications back up the chain
                socket.on('data-notification', (data) => {
                    log.trace('Notification received', ownerId, data);

                    if (data.error) {
                        data = this._makeError({}, data);
                    } else {
                        data = this._makeReturnValue({}, data);
                    }

                    owner.send('ipcProvider-data', JSON.stringify(data));
                });                
            }

            return this._connections[ownerId];
        });
    }



    /**
     * Handle IPC call to destroy a connection.
     */
    _destroyConnection (event) {
        const ownerId = event.sender.getId();

        return Q.try(() => {
            if (this._connections[ownerId]) {
                log.debug('Destroy socket connection', ownerId);

                this._connections[ownerId].owner.send('ipcProvider-setWritable', false);

                return this._connections[ownerId].socket.destroy().finally(() => {
                    delete this._connections[ownerId];
                });
            }            
        });
    }


    /**
     * Handler for when Ethereum node state changes.
     *
     * Auto-reconnect sockets when ethereum node state changes
     *
     * @param {String} state The new state.
     */
    _onNodeStateChanged (state) {
        switch (state) {
            // stop syncing when node about to be stopped
            case ethereumNode.STATES.STOPPING:
                log.info('Ethereum node stopping, disconnecting sockets');

                Q.all(_.map(this._connections, (item) => {
                    if (item.socket.isConnected) {
                        return item.socket.disconnect()
                        .then(() => {
                            log.debug(`Tell owner ${item.id} that socket is not currently writeable`);

                            item.owner.send('ipcProvider-setWritable', false);                            
                        });
                    } else {
                        return Q.resolve();
                    }
                }))
                .catch((err) => {
                    log.error('Error disconnecting sockets', err);
                });

                break;
            // auto-sync whenever node gets connected
            case ethereumNode.STATES.CONNECTED:
                log.info('Ethereum node connected, re-connect sockets');

                Q.all(_.map(this._connections, (item) => {
                    if (item.socket.isConnected) {
                        return Q.resolve();
                    } else {
                        return item.socket.connect({ 
                            path: ipcPath
                        }, {
                            timeout: 5000
                        })
                        .then(() => {
                            log.debug(`Tell owner ${item.id} that socket is again writeable`);

                            item.owner.send('ipcProvider-setWritable', true);
                        });
                    }
                }))
                .catch((err) => {
                    log.error('Error re-connecting sockets', err);
                });

                break;
        }
    }

    /**
     * Handle IPC call to send a request.
     * @param  {Boolean} isSync  whether request is sync.
     * @param  {Object}  event   IPC event.
     * @param  {String}  payload request payload.
     */
    _sendRequest (isSync, event, payload) {
        const ownerId = event.sender.getId();

        log.trace('sendRequest', isSync ? 'sync' : 'async', ownerId, payload);

        let jsonPayload = null;

        Q.try(() => {
            jsonPayload = JSON.parse(payload);

            return this._getOrCreateConnection(event);
        })
        .then((conn) => {
            if (!conn.socket.isConnected) {
                log.trace('Socket not connected.');

                throw this.ERRORS.METHOD_TIMEOUT;
            }

            this._validateRequestPayload(conn, jsonPayload);

            return conn;
        })
        .then((conn) => {
            if (!_.isArray(jsonPayload) && this._processors[jsonPayload.method]) {
                return this._processors[jsonPayload.method].exec(conn, jsonPayload);
            } else {
                return this._processors.base.exec(conn, jsonPayload);                
            }
        })
        .then((result) => {
            log.trace('Got result', result);

            return this._makeReturnValue(jsonPayload, result);
        })
        .catch((err) => {
            err = this._makeError(jsonPayload || {}, {
                message: (typeof err === 'string' ? err : err.message),
                code: err.code,
            });

            log.error('Send request failed', err);

            return err;
        })
        .then((returnValue) => {
            returnValue = JSON.stringify(returnValue);

            log.trace('Return', ownerId, returnValue);

            if (isSync) {
                event.returnValue = returnValue;
            } else {
                event.sender.send('ipcProvider-data', returnValue);
            }
        })
    }


    /**
    Validate a request payload.

    @method _validateRequestPayload
    @param {Object} conn The connection.
    @param {Object} payload The request payload.
    @throw {Error} if request invalid.
    */
    _validateRequestPayload(conn, payload) {
        log.trace('Filter request payload', payload);

        // main window or popupwindows - always allow requests
        let wnd = Windows.getById(conn.id);

        if (wnd && ('main' === wnd.type || wnd.isPopup)) {
            return payload;
        }

        let __check = (p) => {
            if (!_.isObject(p)) {
                throw ERRORS.INVALID_PAYLOAD;
            }

            // prevent dapps from acccesing admin endpoints
            if(!/^eth_|^shh_|^net_|^web3_|^db_/.test(p.method)){
                throw ERRORS.METHOD_DENIED;
            }
        }


        if (_.isArray(payload)) {
            for (let p of payload) {
                if ('eth_sendTransaction' === p.method) {
                    throw ERRORS.BATCH_TX_DENIED;                    
                }

                __check(p);
            }
        } else {
            __check(payload);
        }

        return payload;
    }


    /**
    Make the error response object.

    @param {Object|Array} payload Original payload
    @param {Object} error Error result

    @method makeError
    */
    _makeError (payload, error) {
        let e = ([].concat(payload)).map((item) => {
            let e = _.extend({
                jsonrpc: '2.0'
            }, error);

            if (e.message) {
                e.error = {
                    message: e.message.replace(/'[a-z_]*'/i, "'"+ item.method +"'")
                };

                delete e.message;
            }

            e.id = item.id;

            return e;
        });

        return _.isArray(payload) ? e : e[0];
    }


    /**
    Make the retrun response object.

    @param {Object|Array} payload Original payload
    @param {Object|Array} value Response result.

    @method makeReturnValue
    */
    _makeReturnValue (payload, value) {
        value = [].concat(value);

        let allResults = ([].concat(payload)).map((item, idx) => {
            let ret = {
                jsonrpc: "2.0"
            };

            if (value) {
                ret.result = value[idx];
            }

            ret.id = item.id;
            
            return ret;
        });

        return _.isArray(payload) ? allResults : allResults[0];
    }

}



exports.init = function() {
    return new IpcProviderBackend();
};




