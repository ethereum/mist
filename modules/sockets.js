"use strict";

const net = require('net');
const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;

const _ = global._;
const log = require('./utils/logger').create('Sockets');
const dechunker = require('./ipc/dechunker.js');




/**
 * Socket connecting to Ethereum Node.
 */
class Socket extends EventEmitter {
    constructor (socketMgr, id) {
        super();

        this._mgr = socketMgr;
        this._id = id;

        this._log = log.create(this._id);

        this._state = null;
    }


    get id () {
        return this._id;
    }
    

    get isConnected () {
        return STATE.CONNECTED === this._state;
    }


    /**
     * Connect to host.
     * @param  {Object} connectConfig
     * @param  {Object} [options]
     * @param  {Number} [options.timeout] Milliseconds to wait before timeout.
     * @return {Promise}
     */
    connect (connectConfig, options) {
        this._log.info(`Connect to ${JSON.stringify(connectConfig)}`);

        options = options || {};

        return this._resetSocket()
            .then(() => {
                this._log.debug('Connecting...');

                this._state = STATE.CONNECTING;

                return new Q((resolve, reject) => {
                    this._socket.once('connect', () => {
                        this._log.info('Connected!');

                        this._state = STATE.CONNECTED;

                        this.emit('connect');

                        resolve();
                    });

                    this._socket.once('error', (err) => {
                        if (STATE.CONNECTING === this._state) {
                            this._log.error('Connection error', err);

                            this._state = STATE.ERROR;

                            return reject(new Error(`Unable to connect to socket: ${err.message}`));
                        }
                    });

                    if (options.timeout) {
                        this._log.debug(`Will wait ${options.timeout}ms for connection to happen.`);

                        setTimeout(() => {
                            if (STATE.CONNECTING === this._state) {
                                this._socket.emit('error', `Connection timeout (took longer than ${options.timeout} ms)`);
                            }
                        }, options.timeout);
                    }

                    this._socket.connect(connectConfig);
                });            
            });
    } 


    /**
     * Disconnect from socket.
     * @return {Promise}
     */
    disconnect (options) {
        if (!this._disconnectPromise) {
            this._disconnectPromise = new Q((resolve, reject) => {
                this._log.info('Disconnecting...');

                this._state = STATE.DISCONNECTING;

                // remove all existing listeners
                this._socket.removeAllListeners();

                let timer = setTimeout(() => {
                    log.warn('Disconnection timed out, continuing anyway...');

                    this._state = STATE.DISCONNECTION_TIMEOUT;

                    resolve();
                }, 5000 /* wait 5 seconds for disconnection */)

                this._socket.once('close', () => {
                    // if we manually killed it then all good
                    if (STATE.DISCONNECTING === this._state) {
                        this._log.debug('Disconnected as expected');
                    } else {
                        this._log.warn('Unexpectedly disconnected');
                    }

                    this._state = STATE.DISCONNECTED;

                    clearTimeout(timer);

                    resolve();
                });

                this._socket.destroy();
            })  
                .finally(() => {
                    this._disconnectPromise = null;
                });
        }
        
        return this._disconnectPromise;
    }


    /**
     * An alias to `disconnect()`.
     * @return {Promise}
     */
    destroy () {
        return this.disconnect();
    }


    write (data, encoding, callback) {
        if (STATE.CONNECTED !== this._state) {
            throw new Error('Socket not connected');
        }

        this._log.trace('Write data', data);

        this._socket.write(data, encoding, callback);
    }



    /**
     * Reset socket.
     */
    _resetSocket () {
        this._log.debug('Resetting socket');

        return Q.try(() => {
            if (STATE.CONNECTED === this._state) {
                this._log.debug('Disconnecting prior to reset');

                return this.disconnect();
            }
        })
            .then(() => {
                this._socket = new net.Socket();

                this._socket.setTimeout(0);
                this._socket.setEncoding('utf8');
                this._socket.unref(); /* allow app to exit even if socket fails to close */

                this._socket.on('close', (hadError) => {
                    // if we did the disconnection then all good
                    if (STATE.DISCONNECTING === this._state) {
                      return;
                    }

                    this.emit('close', hadError);
                });

                this._socket.on('end', () => {
                    this._log.debug('Got "end" event');

                    this.emit('end');
                });

                this._socket.on('data', (data) => {
                    this._log.trace('Got data');

                    this.emit('data', data);
                });

                this._socket.on('timeout', () => {
                    this._log.trace('Timeout');

                    this.emit('timeout');
                });

                this._socket.on('error', (err) => {
                    // connection errors will be handled in connect() code
                    if (STATE.CONNECTING === this._state) {
                      return;
                    }

                    this._log.error(err);

                    this.emit('error', err);
                });
            });
    }
}



class Web3IpcSocket extends Socket {
    constructor (socketMgr, id) {
        super(socketMgr, id);

        this._sendRequests = {};

        this.on('data', _.bind(this._handleSocketResponse, this));
    }



    /**
     * Send an RPC call.
     * @param {Array|Object} single or array of payloads.
     * @param {Object} options Additional options.
     * @param {Boolean} [options.fullResult] If set then will return full result JSON, not just result value.
     * @return {Promise}
     */
    send (payload, options) {
        return Q.try(() => {
            if (!this.isConnected) {
                throw new Error('Not connected');
            }

            const isBatch = _.isArray(payload);

            const finalPayload = isBatch
                ? _.map(payload, (p) => this._finalizeSinglePayload(p))
                : this._finalizeSinglePayload(payload);

            /*
            For batch requeests we use the id of the first request as the 
            id to refer to the batch as one. We can do this because the 
            response will also come back as a batch, in the same order as the 
            the requests within the batch were sent.
             */
            const id = isBatch
                ? finalPayload[0].id
                : finalPayload.id;

            this._log.trace(
                isBatch ? 'Batch request' : 'Request', 
                id, finalPayload
            );

            this._sendRequests[id] = {
                options: options,
                /* Preserve the original id of the request so that we can 
                update the response with it */
                origId: (
                    isBatch ? _.map(payload, (p) => p.id) : payload.id
                ),
            };

            this.write(JSON.stringify(finalPayload));

            return new Q((resolve, reject) => {
                _.extend(this._sendRequests[id], {
                    resolve: resolve,
                    reject: reject,
                });
            });
        });
    }



    /**
     * Construct a payload object.
     * @param {Object} payload Payload to send.
     * @param  {String} payload.method   Method name.
     * @param  {Object} [payload.params] Method arguments.
     * @return {Object} final payload object
     */
    _finalizeSinglePayload (payload) {
        if (!payload.method) {
            throw new Error('Method required');
        }

        return {
            jsonrpc: '2.0',
            id: _.uuid(),
            method: payload.method,
            params: payload.params || [],            
        };
    }




    /**
     * Handle responses from Geth.
     */
    _handleSocketResponse (data) {
        dechunker(data, (err, result) => {
            this._log.trace('Dechunked response', result);

            try {
                if (err) {
                    this._log.error('Socket response error', err);

                    _.each(this._sendRequests, (req) => {
                        req.reject(err);
                    });

                    this._sendRequests = {};
                } else {
                    const isBatch = _.isArray(result);

                    const firstItem = isBatch ? result[0] : result;

                    const req = firstItem.id ? this._sendRequests[firstItem.id] : null;                        

                    if (req) {
                        this._log.trace(
                            isBatch ? 'Batch response' : 'Response', 
                            firstItem.id, result
                        );
                        
                        // if we don't want full JSON result, send just the result
                        if (!_.get(req, 'options.fullResult')) {
                            if (isBatch) {
                                result = _.map(result, (r) => r.result);
                            } else {
                                result = result.result;
                            }
                        } else {
                            // restore original ids
                            if (isBatch) {
                                req.origId.forEach((id, idx) => {
                                    if (result[idx]) {
                                        result[idx].id = id;
                                    }
                                });
                            } else {
                                result.id = req.origId;
                            }
                        }

                        req.resolve({
                            isBatch: isBatch,
                            result: result
                        });
                    } else {
                        // not a response to a request so pass it on as a notification
                        this.emit('data-notification', result);
                    }
                }
            } catch (err) {
                this._log.error('Error handling socket response', err);
            }
        });
    }
}


const STATE = Socket.STATE = {
    CREATED: 0,
    CONNECTING: 1,
    CONNECTED: 2,
    DISCONNECTING: 3,
    DISCONNECTED: 4,
    ERROR: -1,
    DISCONNECTION_TIMEOUT: -2,
};


/**
 * `Socket` manager.
 */
class SocketManager {
    constructor () {
        this._sockets = {};

        this.TYPES = TYPES;
    }


    /**
     * Get socket with given id, creating it if it does not exist.
     * 
     * @return {Socket}
     */
    get (id, type) {
        if (!this._sockets[id]) {
            log.debug(`Create socket, id=${id}, type=${type}`);

            switch (type) {
                case TYPES.WEB3_IPC:
                    this._sockets[id] = new Web3IpcSocket(this, id);
                    break;
                default:
                    this._sockets[id] = new Socket(this, id);
            }
        }

        return this._sockets[id];
    }



    /**
     * @return {Promise}
     */
    destroyAll () {
        log.info('Destroy all sockets');

        return Q.all(_.map(this._sockets, (s) => {
            return s.destroy();
        }));
    }

    /**
     * Remove socket with given id from this manager.
     *
     * Usually called by `Socket` instances when they're destroyed.
     */
    _remove (id) {
        log.debug(`Remove socket, id=${id}`);

        delete this._sockets[id];
    }

}


const TYPES = {
    DEFAULT: 1,
    WEB3_IPC: 2,
};




module.exports = new SocketManager();

