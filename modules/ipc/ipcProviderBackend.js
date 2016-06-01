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
const path  require('path');

const log = require('../utils/logger').create('ipcProviderBackend');
const ipcPath = require('getIpcPath')();
const Sockets = require('../sockets');
const ethereumNode = require('../ethereumNode');



const ERRORS = {
    INVALID_PAYLOAD: {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Payload invalid."}, "id": "__id__"},
    METHOD_DENIED: {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method \'__method__\' not allowed."}, "id": "__id__"},
    METHOD_TIMEOUT: {"jsonrpc": "2.0", "error": {"code": -32603, "message": "Request timed out for method  \'__method__\'."}, "id": "__id__"},
    TX_DENIED: {"jsonrpc": "2.0", "error": {"code": -32603, "message": "Transaction denied"}, "id": "__id__"},
    BATCH_TX_DENIED: {"jsonrpc": "2.0", "error": {"code": -32603, "message": "Transactions denied, sendTransaction is not allowed in batch requests."}, "id": "__id__"},
    INVALID_METHOD: {"jsonrpc": "2.0", "method": "eth_nonExistingMethod", "params": [],"id": "__id__"},
};








/**
 * IPC provider backend.
 */
class IpcProviderBackend {
    constructor () {
        this._connections = {};

        this.ERRORS = ERRORS;

        ethereumNode.on('state', _.bind(this._onNodeStateChanged, this));

        ipc.on('ipcProvider-create', _.bind(this._createConnection, this));
        ipc.on('ipcProvider-destroy', _.bind(this._destroyConnection, this));
        ipc.on('ipcProvider-write', _.bind(this._sendRequest, this, false));
        ipc.on('ipcProvider-writeSync', _.bind(this._sendRequest, this, true));

        // dynamically load in method processors
        let processors = fs.readdirSync(path.join(__dirname, 'methods'));

        this._processors = {};

        processors.forEach((p) => {
            let name = path.basename(p);

            this._processors[name] = 
                new (require(path.join(__dirname, 'methods', p))(name, this);
        });
    }


    /**
     * Handle IPC call to create new connection.
     */
    _createConnection (event) {
        const id = event.sender.getId();

        // get the actual window instance for this sender
        const wnd = Windows.getById(id);

        if (!wnd) {
            return log.error(`Unable to find window ${id}`);
        }

        // get or create a new socket
        log.debug('Get/create socket connection', wnd.id);

        const socket = Sockets.get(wnd.id, Sockets.TYPES.WEB3_IPC);

        return Q.try(() => {
            if (!socket.isConnected) {
                return socket.connect({
                    path: ipcPath,
                }, {
                    timeout: 5000,
                });
            }
        })
        .then(() => {
            // save to collection
            this._connections[wnd.id] = {
                owner: wnd,
                socket: socket,
            };

            // if something goes wrong destroy the socket
            ['error', 'timeout', 'end'].forEach((ev) => {
                socket.on(ev, (data) => {
                    log.debug('Destroy socket connection due to event', ev, wnd.id);

                    socket.destroy().finally(() => {
                        delete Connections[wnd.id];
                        
                        wnd.send(`ipcProvider-${ev}`, JSON.stringify(data));
                    });
                });                
            });

            // pass notifications back up the chain
            socket.on('data-notification', (data) => {
                log.trace('Notification received', wnd.id);

                wnd.send('ipcProvider-data', JSON.stringify(data));
            });

            return this._connections[wnd.id];
        });
    }


    /**
     * Handle IPC call to destroy a connection.
     */
    _destroyConnection (event) {
        const id = event.sender.getId();

        return Q.try(() => {
            if (this._connections[id]) {
                log.debug('Destroy socket connection', id);

                return this._connections[id].socket.destroy().finally({
                    delete this._connections[id];
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

                Q.map(this._connections, (item) => {
                    log.debug(`Tell owner (${item.sender.getId()}) that socket is not currently writeable`);

                    item.owner.send('ipcProvider-setWritable', false);

                    return item.socket.disconnect();
                })
                .catch((err) => {
                    log.error('Error disconnecting sockets', err);
                });

                break;
            // auto-sync whenever node gets connected
            case ethereumNode.STATES.CONNECTED:
                log.info('Ethereum node connected, re-connect sockets');

                Q.map(this._connections, (item) => {
                    item.socket.connect({ path: ipcPath}, {timeout: 5000})
                        .then(() => {
                            log.debug(`Tell owner (${item.sender.getId()}) that socket is again writeable`);

                            item.owner.send('ipcProvider-setWritable', true);
                        });
                })
                .catch((err) => {
                    log.error('Error re-connecting sockets', err);
                });

                break;
        }
    }

    /**
     * Handle IPC call to send a request.
     * @param  {Boolean} isSync  whether request is sync.
     * @param  {[type]}  event   IPC event.
     * @param  {[type]}  payload request payload.
     */
    _sendRequest (isSync, event, payload) {
        log.trace('sendRequest', isSync ? 'sync' : 'async', event.sender.getId(), payload);

        Q.try(() => {
            let conn = this._connections[event.sender.getId()];

            if (!conn) {
                return this._createConnection(event);
            }            

            return conn;
        })
        .then((conn) => {
            const jsonPayload = JSON.parse(payload);

            if (!conn.socket.isConnected) {
                log.trace('Socket not connected.');

                throw this._returnError(jsonPayload, ERRORS.METHOD_TIMEOUT);
            }

            this._validateRequestPayload(conn, jsonPayload);

            return [conn, jsonPayload];
        })
        .spread((conn, filteredPayload) => {
            if (!_.isArray(filteredPayload) && this._processors[filteredPayload.method]) {
                return this._processors[filteredPayload.method].exec(conn, filteredPayload);
            } else {
                return this._processors.generic.exec(conn, filteredPayload);                
            }
        })
        .then((result) => {
            log.trace('Got result', result);

            // check for error
            if (result.error) {
                throw this._makeError(payload, result.error);
            }

            let returnValue = JSON.stringify(
                this._makeReturnValue(payload, result)
            );

            if (isSync) {
                event.returnValue = returnValue;
            } else {
                event.sender.send('ipcProvider-data', returnValue);
            }
        })
        .catch((err) => {
            log.error('Send request failed', err);

            let returnValue = JSON.stringify(err);

            if (isSync) {
                event.returnValue = returnValue;
            } else {
                event.sender.send('ipcProvider-data', retVal);
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
        log.trace('Filter request payload', id);

        let wnd = conn.owner;

        // main window or popupwindows - always allow requests
        if ('main' === wnd.type || wnd.isPopup) {
            return p;
        }

        let __check = (p) => {
            if (!_.isObject(p)) {
                throw this._makeError(p, ERRORS.INVALID_PAYLOAD);
            }

            // prevent dapps from acccesing admin endpoints
            if(!/^eth_|^shh_|^net_|^web3_|^db_/.test(p.method)){
                throw this._makeError(p, ERRORS.METHOD_DENIED);
            }
        }


        if (_.isArray(payload)) {
            for (let p of payload) {
                if ('eth_sendTransaction' === p.method) {
                    throw this._makeError(payload, ERRORS.BATCH_TX_DENIED);                    
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

    @method makeError
    */
    _makeError (payload, error) {
        let e = ([].concat(payload)).map((item) => {
            let e = _.extend({}, error);

            if (e.error) {
                e.error.message = e.error.message.replace(/'[a-z_]*'/i, "'"+ item.method +"'");
            }

            e.id = item.id;

            return e;
        });

        return _.isArray(payload) ? e : e[0];
    }


    /**
    Make the retrun response object.

    @method makeReturnValue
    */
    _makeReturnValue (payload, value) {
        let result = ([].concat(payload)).map((item) => {
            let result = {
                jsonrpc: "2.0"
            };

            if (value) {
                result.result = value;
            }

            result.id = item.id;
            
            return result;
        });

        return _.isArray(payload) ? result : result[0];
    }

}



exports.init = function() {
    return new IpcProviderBackend();
};




