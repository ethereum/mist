const _ = global._;
const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;
const log = require('./utils/logger').create('Sockets');
const net = require('net');
const dechunker = require('./ipc/dechunker.js');

const Web3IpcSocket = require('./sockets/web3Ipc');
const Web3HttpSocket = require('./sockets/web3Http');


/**
 * `Socket` manager.
 */
class SocketManager {
    constructor() {
        this._sockets = {};
    }


    /**
     * Get socket with given id, creating it if it does not exist.
     *
     * @return {Socket}
     */
    get(id, type) {
        if (!this._sockets[id]) {
            log.debug(`Create socket, id=${id}, type=${type}`);

            switch (type) {
            case 'ipc':
                this._sockets[id] = new Web3IpcSocket(this, id);
                break;
            case 'http':
                this._sockets[id] = new Web3HttpSocket(this, id);
                break;
            default:
                throw new Error(`Unrecognized socket type: ${type}`);
            }
        }

        return this._sockets[id];
    }


    /**
     * @return {Promise}
     */
    destroyAll() {
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
    _remove(id) {
        log.debug(`Remove socket, id=${id}`);

        delete this._sockets[id];
    }

}


module.exports = new SocketManager();
