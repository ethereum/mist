"use strict";

const log = require('./utils/logger').create('Sockets');
const net = require('net');
const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;




/**
 * Etheruem nodes manager.
 */
class Socket extends EventEmitter {
    constructor (socketMgr, id) {
        super();

        this._mgr = socketMgr;
        this._id = id;

        this._log = log.create(this._id);

        this._state = null;
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

                this._socket.status = STATE.DISCONNECTING;

                // remove all existing listeners
                this._socket.removeAllListeners();

                let timer = setTimeout(() => {
                    log.warn('Disconnection timed out, continuing anyway...');

                    this._socket.status = STATE.DISCONNECTION_TIMEOUT;

                    resolve();
                }, 5000 /* wait 5 seconds for disconnection */)

                this._socket.once('close', () => {
                    // if we manually killed it then all good
                    if (STATE.DISCONNECTING === this._socket.status) {
                        this._socket.status = STATE.DISCONNECTED;

                        clearTimeout(timer);

                        resolve();
                    }
                });

                this._socket.destroy();

                this._socket.unref(); /* allow app to exit even if socket fails to close */
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

        this._log.trace('Write data...');

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

                this._socket.on('close', (hadError) => {
                    // if we did the disconnection then all good
                    if (STATE.DISCONNECTING === this._socket.status) {
                      return;
                    }

                    this.emit('close', hadError);
                });

                this._socket.on('end', () => {
                    this._log.debug('Server wants to end connection');

                    this.emit('end');
                });

                this._socket.on('data', (data) => {
                    this._log.trace('Got data');

                    this.emit('data', data);
                });

                this._socket.on('error', (err) => {
                    // connection errors will be handled elsewhere
                    if (STATE.CONNECTING === this._state) {
                      return;
                    }

                    this._log.error(err);

                    this.emit('error', err);
                });
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



class SocketManager {
    constructor () {
        this._sockets = {};
    }


    /**
     * Get socket with given id, creating it if it does not exist.
     * 
     * @return {Socket}
     */
    get (id) {
        if (!this._sockets[id]) {
            log.debug('Create socket', id);

            this._sockets[id] = new Socket(this, id);
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
        log.debug('Remove socket', id);

        delete this._sockets[id];
    }

}




module.exports = new SocketManager();

