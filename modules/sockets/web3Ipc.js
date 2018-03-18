const Q = require('bluebird');
const net = require('net');
const SocketBase = require('./base');

const STATE = SocketBase.STATE;

const Web3SocketBase = require('./web3Base');

module.exports = class Web3IpcSocket extends Web3SocketBase {
  /**
   * Reset socket.
   */
  _resetSocket() {
    this._log.debug('Resetting socket');

    return Q.try(() => {
      if (STATE.CONNECTED === this._state) {
        this._log.debug('Disconnecting prior to reset');

        return this.disconnect();
      }
    }).then(() => {
      this._socket = new net.Socket();

      this._socket.setTimeout(0);
      this._socket.setEncoding('utf8');
      this._socket.unref(); /* allow app to exit even if socket fails to close */

      this._socket.on('close', hadError => {
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

      this._socket.on('data', data => {
        this._log.trace('Got data');

        this.emit('data', data);
      });

      this._socket.on('timeout', () => {
        this._log.trace('Timeout');

        this.emit('timeout');
      });

      this._socket.on('error', err => {
        // connection errors will be handled in connect() code
        if (STATE.CONNECTING === this._state) {
          return;
        }

        this._log.error(err);

        this.emit('error', err);
      });
    });
  }
};
