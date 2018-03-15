const Q = require('bluebird');
const EventEmitter = require('events').EventEmitter;
const got = require('got');
const SocketBase = require('./base');

const STATE = SocketBase.STATE;

const Web3SocketBase = require('./web3Base');

class HttpSocket extends EventEmitter {
  constructor(_parentSocket) {
    super();

    this._log = _parentSocket._log.create('HttpSocket');
  }

  connect(connectConfig) {
    this._log.trace('Connect', connectConfig);

    this._hostPort = connectConfig.hostPort;

    const payload = JSON.stringify({
      jsonrpc: '2.0',
      id: 0,
      method: 'eth_accounts',
      params: []
    });

    this._call(payload)
      .then(() => {
        this._log.trace('Connection successful');

        this.emit('connect');
      })
      .catch(err => {
        this._log.trace('Connection failed', err);

        this.emit.bind(this, new Error('Unable to connect to HTTP RPC'));
      });
  }

  destroy() {
    this._log.trace('Destroy');

    this._hostPort = null;

    this.emit('close');
  }

  write(data) {
    this._log.trace('Write data', data);

    this._call(data)
      .then(body => {
        this._log.trace('Got response', body);

        this.emit('data', body);
      })
      .catch(this.emit.bind(this, 'error'));
  }

  setEncoding(enc) {
    this._log.trace('Set encoding', enc);

    this._encoding = enc;
  }

  _call(dataStr) {
    return got
      .post(this._hostPort, {
        encoding: this._encoding,
        headers: {
          'Content-Type': 'application/json'
        },
        body: dataStr
      })
      .then(res => {
        return res.body;
      });
  }
}

module.exports = class Web3HttpSocket extends Web3SocketBase {
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
      this._socket = new HttpSocket(this);

      this._socket.setEncoding('utf8');

      this._socket.on('close', hadError => {
        // if we did the disconnection then all good
        if (STATE.DISCONNECTING === this._state) {
          return;
        }

        this.emit('close', hadError);
      });

      this._socket.on('data', data => {
        this._log.trace('Got data');

        this.emit('data', data);
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
