

/**
The IPC provider backend filter and tunnel all incoming request to the ethereum node.

@module ipcProviderBackend
*/

const _ = global._;
const Q = require('bluebird');
const { ipcMain: ipc } = require('electron');
const fs = require('fs');
const path = require('path');

const log = require('../utils/logger').create('ipcProviderBackend');
const Sockets = require('../sockets');
const Settings = require('../settings');
const ethereumNode = require('../ethereumNode');
const Windows = require('../windows');


const ERRORS = {
    INVALID_PAYLOAD: { code: -32600, message: 'Payload invalid.' },
    METHOD_DENIED: { code: -32601, message: "Method \'__method__\' not allowed." },
    METHOD_TIMEOUT: { code: -32603, message: "Request timed out for method  \'__method__\'." },
    TX_DENIED: { code: -32603, message: 'Transaction denied' },
    BATCH_TX_DENIED: { code: -32603, message: 'Transactions denied, sendTransaction is not allowed in batch requests.' },
    BATCH_COMPILE_DENIED: { code: -32603, message: 'Compilation denied, compileSolidity is not allowed in batch requests.' },
};


/**
 * IPC provider backend.
 */
class IpcProviderBackend {
    constructor() {
        this._connections = {};

        this.ERRORS = ERRORS;

        ethereumNode.on('state', _.bind(this._onNodeStateChanged, this));

        ipc.on('ipcProvider-create', _.bind(this._getOrCreateConnection, this));
        ipc.on('ipcProvider-destroy', _.bind(this._destroyConnection, this));
        ipc.on('ipcProvider-write', _.bind(this._sendRequest, this, false));
        ipc.on('ipcProvider-writeSync', _.bind(this._sendRequest, this, true));

        this._connectionPromise = {};

        // dynamically load in method processors
        const processors = fs.readdirSync(path.join(__dirname, 'methods'));

        // get response processors
        this._processors = {};
        processors.forEach((p) => {
            const name = path.basename(p, '.js');

            const PClass = require(path.join(__dirname, 'methods', p));

            this._processors[name] = new PClass(name, this);
        });

        log.trace('Loaded processors', _.keys(this._processors));
    }


    /**
     * Get/create new connection to node.
     * @return {Promise}
     */
    _getOrCreateConnection(event) {
        const owner = event.sender,
            ownerId = owner.getId();

        let socket;

        return Q.try(() => {
            // already got?
            if (this._connections[ownerId]) {
                socket = this._connections[ownerId].socket;
            } else {
                log.debug(`Get/create socket connection, id=${ownerId}`);

                socket = Sockets.get(ownerId, Settings.rpcMode);
            }
        })
        .then(() => {
            if (!this._connections[ownerId]) {
                // save to collection
                this._connections[ownerId] = {
                    id: ownerId,
                    owner,
                    socket,
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

                socket.on('connect', (data) => {
                    owner.send('ipcProvider-connect', JSON.stringify(data));
                });

                // pass notifications back up the chain
                socket.on('data-notification', (data) => {
                    log.trace('Notification received', ownerId, data);

                    if (data.error) {
                        data = this._makeErrorResponsePayload(data, data);
                    } else {
                        data = this._makeResponsePayload(data, data);
                    }

                    owner.send('ipcProvider-data', JSON.stringify(data));
                });
            }
        })
        .then(() => {
            if (!socket.isConnected) {
                // since we may enter this function multiple times for the same
                // event source's IPC we don't want to repeat the connection
                // process each time - so let's track things in a promise
                if (!this._connectionPromise[ownerId]) {
                    this._connectionPromise[ownerId] = Q.try(() => {
                        log.debug(`Connecting socket ${ownerId}`);

                        // wait for node to connect first.
                        if (ethereumNode.state !== ethereumNode.STATES.CONNECTED) {
                            return new Q((resolve, reject) => {
                                const onStateChange = (newState) => {
                                    if (ethereumNode.STATES.CONNECTED === newState) {
                                        ethereumNode.removeListener('state', onStateChange);

                                        log.debug(`Ethereum node connected, resume connecting socket ${ownerId}`);

                                        resolve();
                                    }
                                };

                                ethereumNode.on('state', onStateChange);
                            });
                        }
                    })
                    .then(() => {
                        return socket.connect(Settings.rpcConnectConfig, {
                            timeout: 5000,
                        });
                    })
                    .then(() => {
                        log.debug(`Socket connected, id=${ownerId}`);
                    })
                    .finally(() => {
                        delete this._connectionPromise[ownerId];
                    });
                }

                return this._connectionPromise[ownerId];
            }
        })
        .then(() => {
            owner.send('ipcProvider-setWritable', true);

            return this._connections[ownerId];
        });
    }


    /**
     * Handle IPC call to destroy a connection.
     */
    _destroyConnection(event) {
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
    _onNodeStateChanged(state) {
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
        }
    }

    /**
     * Handle IPC call to send a request.
     * @param  {Boolean} isSync  whether request is sync.
     * @param  {Object}  event   IPC event.
     * @param  {String}  payload request payload.
     */
    _sendRequest(isSync, event, payload) {
        const ownerId = event.sender.getId();

        log.trace('sendRequest', isSync ? 'sync' : 'async', ownerId, payload);

        const originalPayloadStr = payload;

        return Q.try(() => {
            // overwrite playload var with parsed version
            payload = JSON.parse(originalPayloadStr);

            return this._getOrCreateConnection(event);
        })
        .then((conn) => {
            if (!conn.socket.isConnected) {
                log.trace('Socket not connected.');

                throw this.ERRORS.METHOD_TIMEOUT;
            }

            // reparse original string (so that we don't modify input payload)
            const finalPayload = JSON.parse(originalPayloadStr);

            // is batch?
            const isBatch = _.isArray(finalPayload),
                finalPayloadList = isBatch ? finalPayload : [finalPayload];

             // sanitize each and every request payload
            _.each(finalPayloadList, (p) => {
                const processor = (this._processors[p.method])
                    ? this._processors[p.method]
                    : this._processors.base;

                processor.sanitizeRequestPayload(conn, p, isBatch);
            });

            // if a single payload and has an error then throw it
            if (!isBatch && finalPayload.error) {
                throw finalPayload.error;
            }

            // get non-error payloads
            const nonErrorPayloads = _.filter(finalPayloadList, p => (!p.error));

            // execute non-error payloads
            return Q.try(() => {
                if (nonErrorPayloads.length) {
                    // if single payload check if we have special processor for it
                    // if not then use base generic processor
                    const processor = (this._processors[finalPayload.method])
                        ? this._processors[finalPayload.method]
                        : this._processors.base;

                    return processor.exec(
                        conn,
                        isBatch ? nonErrorPayloads : nonErrorPayloads[0]
                    );
                } else {
                    return [];
                }
            })
            .then((ret) => {
                log.trace('Got result', ret);

                let finalResult = [];

                // collate results
                _.each(finalPayloadList, (p) => {
                    if (p.error) {
                        finalResult.push(p);
                    } else {
                        p = _.extend({}, p, isBatch ? ret.shift() : ret);

                        const processor = (this._processors[p.method])
                            ? this._processors[p.method]
                            : this._processors.base;

                        // sanitize response payload
                        processor.sanitizeResponsePayload(conn, p, isBatch);

                        finalResult.push(p);
                    }
                });

                // extract single payload result
                if (!isBatch) {
                    finalResult = finalResult.pop();

                    // check if it's an error
                    if (finalResult.error) {
                        throw finalResult.error;
                    }
                }

                return finalResult;
            });
        })
        .then((result) => {
            log.trace('Got result', result);

            return this._makeResponsePayload(payload, result);
        })
        .catch((err) => {

            err = this._makeErrorResponsePayload(payload || {}, {
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
        });
    }


    /**
    Sanitize a single or batch request payload.

    This will modify the passed-in payload.

    @param {Object} conn The connection.
    @param {Object|Array} payload The request payload.
    */
    _sanitizeRequestPayload(conn, payload) {
        if (_.isArray(payload)) {
            _.each(payload, (p) => {
                if (p.method === 'eth_sendTransaction') {
                    p.error = ERRORS.BATCH_TX_DENIED;
                } else {
                    this._processors.base.sanitizePayload(conn, p);
                }
            });
        } else {
            this._processors.base.sanitizePayload(conn, payload);
        }
    }


    /**
    Make an error response payload

    @param {Object|Array} originalPayload Original payload
    @param {Object} error Error result
    */
    _makeErrorResponsePayload(originalPayload, error) {
        const e = ([].concat(originalPayload)).map((item) => {
            const e = _.extend({
                jsonrpc: '2.0',
            }, error);

            if (e.message) {
                if (_.isArray(e.message)) {
                    e.message = e.message.pop();
                }

                e.error = {
                    code: e.code,
                    message: e.message.replace(/'[a-z_]*'/i, `'${item.method}'`),
                };

                delete e.code;
                delete e.message;
            }

            // delete stuff leftover from request
            delete e.params;
            delete e.method;

            e.id = item.id;

            return e;
        });

        return _.isArray(originalPayload) ? e : e[0];
    }


    /**
    Make a response payload.

    @param {Object|Array} originalPayload Original payload
    @param {Object|Array} value Response results.

    @method makeReturnValue
    */
    _makeResponsePayload(originalPayload, value) {
        const finalValue = _.isArray(originalPayload) ? value : [value];

        const allResults = ([].concat(originalPayload)).map((item, idx) => {
            const finalResult = finalValue[idx];

            let ret;

            // handle error result
            if (finalResult.error) {
                ret = this._makeErrorResponsePayload(item, finalResult.error);
            } else {
                ret = _.extend({}, item, {
                    result: finalResult.result,
                });
            }

            if (item.id) {
                delete ret.params;
                delete ret.method;
            }

            ret.jsonrpc = '2.0';

            return ret;
        });

        return _.isArray(originalPayload) ? allResults : allResults[0];
    }

}


exports.init = function () {
    return new IpcProviderBackend();
};
