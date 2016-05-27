"use strict";

/**
The IPC provider backend filter and tunnel all incoming request to the ethereum node.

@module ipcProviderBackend
*/

const _ = global._;
const Q = require('bluebird');
const electron = require('electron');
const ipc = electron.ipcMain;

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




class BaseProcessor {
    constructor (backend) {
        super();

        this._log = log.create(this.getName());
        this._backend = backend;
    }

    handle (conn, payload) {
        return conn.socket.write(JSON.stringify(payload));
    }

    canHandle (payload) {
        return true;
    }

    getName () {
        return 'base';
    }
}




/**
 * IPC provider backend.
 */
class IpcProviderBackend {
    constructor () {
        this._connections = {};

        ethereumNode.on('state', _.bind(this._onNodeStateChanged, this));

        ipc.on('ipcProvider-create', _.bind(this._createConnection, this));
        ipc.on('ipcProvider-destroy', _.bind(this._destroyConnection, this));
        ipc.on('ipcProvider-write', _.bind(this._sendRequest, this, false));
        ipc.on('ipcProvider-writeSync', _.bind(this._sendRequest, this, true));

        this._baseProcessor = new BaseProcessor(this);
        this._customProcessors = [
            new CompileSolidityProcessor(this),
            new SendTxProcessor(this),
        ];
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
                    socket.destroy().finally(() => {
                        delete Connections[wnd.id];
                        
                        wnd.send(`ipcProvider-${ev}`, data);
                    });
                });                
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

            return this._filterRequest(conn, jsonPayload);
        })
        .then((filteredRequest) => {
            if (filteredRequest.error) {
                log.trace('Not permitted to do request');

                throw filteredRequest;
            }

            for (let p of this._customProcessors) {
                if (p.canHandle(payload)) {
                    return p.handle(payload);
                }
            }

            return this._baseProcessor.handle(payload);
        })
        .then((result) => {
            if (isSync) {
                event.returnValue = JSON.stringify(response);
            } else {
                event.sender.send('ipcProvider-data', JSON.stringify(response));
            }
        })
        .catch((err) => {
            log.error('Send request failed', err);

            if (isSync) {
                event.returnValue = JSON.stringify(err);
            } else {
                event.sender.send('ipcProvider-data', JSON.stringify(err));
            }
        })

    }


    /**
    Filter given request.

    @method _filterRequest
    @param {Object} conn The connection.
    @param {Object} payload The request payload.
    @return {Object} Either payload or error object if request invalid.
    */
    _filterRequest(conn, payload) {
        let __filter = (p) => {
            if (!_.isObject(p)) {
                return this._makeError(p, ERRORS.INVALID_PAYLOAD);
            }

            let wnd = connection.owner;

            // main window or popupwindows - always allow requests
            if ('main' === wnd.type || wnd.isPopup) {
                return p;
            }

            // prevent dapps from acccesing admin endpoints
            if(!/^eth_|^shh_|^net_|^web3_|^db_/.test(p.method)){
                return this._makeError(p, ERRORS.METHOD_DENIED);
            }

            return p;
        }


        if (_.isArray(payload)) {
            if (_.find(payload, (p) => p.method === 'eth_sendTransaction')) {
                return this._returnError(payload, ERRORS.BATCH_TX_DENIED);
            }

            for (let p of payload) {
                let ret = __filter(p);

                if (ret !== p) {
                    return ret;
                }
            }
        } else {
            return __filter(payload);
        }
    }



    /**
    Filter requests and responses.

    @method filterRequestResponse
    @param {Object} connection The connection.
    @param {Object} requestPayload The request payload.
    @param {Object} responsePayload The response payload.
    @return {Boolean} TRUE when its a valid allowed request, otherWise FALSE
    */
    _filterRequestResponse (connection, requestPayload, responsePayload) {
        if(!_.isObject(requestPayload)) {
            return false;
        }

        let wnd = connection.owner;

        // main window or popupwindows - always allow requests
        if ('main' === wnd.type || wnd.isPopup) {
            return requestPayload;
        }

        if(_.isArray(requestPayload)) {
            return _.map(requestPayload, (load) => {
                let req = event ? _.find(event.requestPayload, function(re){
                    return (re.id === load.id);
                }) : false;

                return _this.testPayload(load, (load.result ? errorMethod : nonExistingRequest), (req ? req.method : false));
            });
        } else {
            return this.testPayload(jsonPayload, (jsonPayload.result ? errorMethod : false), (event ? event.jsonPayload.method : false));
        }

    }


    /**
    Make the error response object.

    @method makeError
    */
    _makeError (payload, error) {
        if (error.error) {
            error.error.message = error.error.message.replace(/'[a-z_]*'/i, "'"+ payload.method +"'");
        }

        error.id = payload.id;

        return error;
    }

    /**
    Make the retrun response object.

    @method makeReturnValue
    */
    _makeReturnValue (payload, value) {
        var result = {"jsonrpc": "2.0"};

        if (value) {
            result.result = value;
        }

        result.id = payload.id;

        return result;
    }

    /**
    Make the error response object for either an error or an batch array of errors

    @method returnError
    */
    _returnError (payload, error) {
        if(_.isArray(payload)) {
            return _.map(payload, function(load){
                return this._makeError(load, error);
            });
        } else {
            return this._makeError(payload, error);
        }
    }

    /**
    Make the return response object

    @method returnValue
    */
    _returnValue (payload, value) {
        if(_.isArray(payload)) {
            return _.map(payload, function(load){
                return this._makeReturnValue(load, value);
            });
        } else {
            return this._makeReturnValue(payload, value);
        }
    }

}



exports.init = function() {
    return new IpcProviderBackend();
};



