"use strict";

const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;
const got = require('got');

const _ = global._;
const dechunker = require('../ipc/dechunker.js');

const SocketBase = require('./base'),
    Socket = SocketBase.Socket,
    STATE = SocketBase.STATE;



class HttpSocket extends EventEmitter {
    constructor (_parentSocket) {
        super();

        this._log = _parentSocket._log.create('HttpSocket');
    }

    connect (connectConfig) {
        this._log.trace('Connect', connectConfig);

        this._hostPort = connectConfig.hostPort;

        let payload = JSON.stringify({
            jsonrpc: "2.0",
            id: 0,
            method: "eth_accounts",
            params: []
        });

        this._call(payload)
            .then(() => {
                this._log.trace('Connection successful');

                this.emit('connect');
            })
            .catch((err) => {
                this._log.trace('Connection failed', err);

                this.emit.bind(this, new Error('Unable to connect to HTTP RPC'));
            });
    }

    destroy () {
        this._log.trace('Destroy');

        this._hostPort = null;

        this.emit('close');
    }

    write (data) {
        this._log.trace('Write data', data);

        this._call(data)            
            .then((body) => {
                this._log.trace('Got response', body);

                this.emit('data', body);
            })
            .catch(this.emit.bind(this, 'error'));
    }

    setEncoding (enc) {
        this._log.trace('Set encoding', enc);

        this._encoding = enc;
    }

    _call (dataStr) {
        return got.post(this._hostPort, {
            encoding: this._encoding,
            headers: {
                'Content-Type': 'application/json',
            },
            body: dataStr,
        })
            .then((res) => {
                return res.body;
            });
    }
}



module.exports = class Web3HttpSocket extends Socket {
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
                this._socket = new HttpSocket(this);

                this._socket.setEncoding('utf8');

                this._socket.on('close', (hadError) => {
                    // if we did the disconnection then all good
                    if (STATE.DISCONNECTING === this._state) {
                      return;
                    }

                    this.emit('close', hadError);
                });

                this._socket.on('data', (data) => {
                    this._log.trace('Got data');

                    this.emit('data', data);
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
