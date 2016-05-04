"use strict";

const log = require('./utils/logger').create('Socket');
const net = require('net');
const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;




/**
 * Etheruem nodes manager.
 */
class Socket extends EventEmitter {
    /**
     * Connect to host.
     * @param  {*} connectOptions
     * @return {Promise}
     */
    connect (connectOptions) {
        log.info(`Connect to ${JSON.stringify(connectOptions)}`);

        return this._resetSocket()
            .then(() => {
                log.debug('Connecting...');

                this._socket.state = Socket.CONNECTING;

                return new Q((resolve, reject) => {
                    this._socket.once('connect', () => {
                        log.debug('Connected!');

                        this._socket.state = Socket.CONNECTED;

                        resolve();
                    });

                    this._socket.once('error', (err) => {
                        if (Socket.CONNECTING === this._socket.state) {
                            log.error('Connection error', err);

                            this._socket.state = Socket.ERROR;

                            return reject(new Error(`Unable to connect to socket: ${err.message}`));
                        }
                    });

                    this._socket.connect(connectOptions);
                });            
            });
    } 


    /**
     * Disconnect from socket.
     * @return {Promise}
     */
    disconnect () {
        if (!this._disconnectPromise) {
            this._disconnectPromise = new Q((resolve, reject) => {
                log.info('Disconnecting...');

                this._socket.status = Socket.DISCONNECTING;

                let timer = setTimeout(() => {
                    this._socket.status = Socket.ERROR;

                    reject(new Error('Disconnection timed out'));
                }, 10000 /* wait 10 seconds for disconnection */)

                this._socket.once('close', () => {
                    // if we manually killed it then all good
                    if (Socket.DISCONNECTING === this._socket.status) {
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
     * Reset socket.
     */
    _resetSocket () {
        log.debug('Resetting socket');

        return Q.try(() => {
            if (Socket.CONNECTED === this._socket.state) {
                log.debug('Disconnecting prior to reset');

                return this.disconnect();
            }
        })
            .then(() => {
                this._socket = new net.Socket();

                this._socket.on('close', (hadError) => {
                    // if we did the disconnection then all good
                    if (Socket.DISCONNECTING === this._socket.status) {
                      return;
                    }

                    this.emit('close', hasError);
                });

                this._socket.on('end', () => {
                    log.debug('Server wants to end connection');

                    this.emit('end');
                });

                this._socket.on('data', (data) => {
                    log.trace('Got some data');

                    this.emit('data', data);
                });

                this._socket.on('error', (err) => {
                    // connection errors will be handled elsewhere
                    if (Socket.CONNECTING === this._socket.state) {
                      return;
                    }

                    log.error(err);

                    this.emit('error', err);
                });
            });
    }
}


const Socket.SOCKET_STATE = {
    CREATED: 0,
    CONNECTING: 1,
    CONNECTED: 2,
    DISCONNECTING: 3,
    ERROR: 4,
};


module.exports = Socket;

