"use strict";

const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;

const _ = global._;
const log = require('../utils/logger').create('Sockets');




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
     * Connect socket.
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


    /**
     * Write data to socket.
     * @param  {String}   data     
     */
    write (data) {
        if (STATE.CONNECTED !== this._state) {
            throw new Error('Socket not connected');
        }

        this._log.trace('Write data', data);

        this._socket.write(data);
    }



    /**
     * Reset socket.
     *
     * Upon completion `this._socket` will be set to a valid socket object, but 
     * not yet connected.
     *
     * To be implemented by subclasses.
     */
    _resetSocket () {
        return Q.reject(new Error('Not yet implemented'));
    }
}


exports.Socket = Socket;


const STATE = exports.STATE = Socket.STATE = {
    CREATED: 0,
    CONNECTING: 1,
    CONNECTED: 2,
    DISCONNECTING: 3,
    DISCONNECTED: 4,
    ERROR: -1,
    DISCONNECTION_TIMEOUT: -2,
};



