import { EventEmitter } from 'events';
import WebSocket from 'ws';
import logger from './utils/logger';
import Sockets from './socketManager';
import Settings from './settings';
import { resetRemoteNode, remoteBlockReceived } from './core/nodes/actions';
import { InfuraEndpoints } from './constants';

const ethereumNodeRemoteLog = logger.create('EthereumNodeRemote');

// Increase defaultMaxListeners since
// every subscription created in mist
// adds a new listener in the remote node
require('events').EventEmitter.defaultMaxListeners = 500;

let instance;

class EthereumNodeRemote extends EventEmitter {
  constructor() {
    super();

    if (!instance) {
      instance = this;

      this.lastRequestId = 0;
    }

    return instance;
  }

  async start() {
    if (this.starting) {
      ethereumNodeRemoteLog.trace('Already starting...');
      return this.starting;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      ethereumNodeRemoteLog.error('Starting connection but already open');
      return;
    }

    return (this.starting = new Promise((resolve, reject) => {
      this.network = store.getState().nodes.network;

      ethereumNodeRemoteLog.trace(
        `Connecting to remote node on ${this.network}...`
      );

      const provider = this._getProvider(this.network);

      if (!provider) {
        const errorMessage = `No provider for network: ${this.network}`;
        ethereumNodeRemoteLog.error(errorMessage);
        reject(errorMessage);
        return;
      }

      this.ws = new WebSocket(provider);

      this.ws.once('open', () => {
        this.starting = false;
        ethereumNodeRemoteLog.trace(
          `Connected to remote node on ${this.network}`
        );
        this.watchBlockHeaders();
        resolve(true);
      });

      this.ws.on('message', data => {
        if (!data) {
          return;
        }

        ethereumNodeRemoteLog.trace(
          'Message from remote WebSocket connection: ',
          data
        );
      });

      this.ws.on('close', (code, reason) => {
        let errorMessage = `Remote WebSocket connection closed (code: ${code})`;

        if (reason) {
          errorMessage += ` (reason: ${reason})`;
        }

        // Restart connection if didn't close on purpose
        if (code !== 1000) {
          this.start();
          errorMessage += '. Reopening connection...';
        }

        ethereumNodeRemoteLog.warn(errorMessage);
      });

      this.ws.on('error', error => {
        ethereumNodeRemoteLog.warn('Error from ws: ', error);
      });
    }));
  }

  async send(method, params = [], retry = false) {
    if (!Array.isArray(params)) {
      params = [params];
    }

    if (
      !this.ws ||
      !this.ws.readyState ||
      this.ws.readyState === WebSocket.CLOSED
    ) {
      ethereumNodeRemoteLog.warn(
        `Remote websocket connection not open, attempting to reconnect and retry ${method}...`
      );
      return new Promise(resolve => {
        this.start().then(() => {
          resolve(this.send(method, params, retry));
        });
      });
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      if (this.ws.readyState === WebSocket.CONNECTING) {
        ethereumNodeRemoteLog.error(
          `Can't send method ${method} because remote WebSocket is connecting`
        );
      } else if (this.ws.readyState === WebSocket.CLOSING) {
        ethereumNodeRemoteLog.error(
          `Can't send method ${method} because remote WebSocket is closing`
        );
      } else if (this.ws.readyState === WebSocket.CLOSED) {
        ethereumNodeRemoteLog.error(
          `Can't send method ${method} because remote WebSocket is closed`
        );
      }
      if (!retry) {
        ethereumNodeRemoteLog.error(`Retrying ${method} in 1.5s...`);
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(this.send(method, params));
          }, 1500);
        });
      } else {
        return null;
      }
    }

    this.lastRequestId += 1;

    const request = {
      jsonrpc: '2.0',
      id: this.lastRequestId,
      method,
      params
    };

    this.ws.send(JSON.stringify(request), error => {
      if (error) {
        ethereumNodeRemoteLog.error(
          'Error from sending request: ',
          error,
          request
        );
      } else {
        ethereumNodeRemoteLog.trace('Sent request to remote node: ', request);
      }
    });

    return request.id;
  }

  setNetwork(network) {
    this.stop();

    this.network = network;

    const provider = this._getProvider(network);

    if (!provider) {
      ethereumNodeRemoteLog.error('No provider');
      return;
    }

    this.ws = new WebSocket(provider);

    this.watchBlockHeaders();
  }

  _getProvider(network) {
    switch (network) {
      case 'main':
        return InfuraEndpoints.ethereum.websockets.Main;
      case 'test':
      // fall-through (uses Ropsten)
      case 'ropsten':
        return InfuraEndpoints.ethereum.websockets.Ropsten;
      case 'rinkeby':
        return InfuraEndpoints.ethereum.websockets.Rinkeby;
      case 'kovan':
        return InfuraEndpoints.ethereum.websockets.Kovan;
      default:
        ethereumNodeRemoteLog.error(`Unsupported network type: ${network}`);
        return null;
    }
  }

  stop() {
    this.unsubscribe();

    if (
      this.ws &&
      this.ws.readyState ===
        [WebSocket.OPEN, WebSocket.CONNECTING].includes(this.ws.readyState)
    ) {
      this.ws.close(
        1000,
        'Stopping WebSocket connection in ethereumNodeRemote.stop()'
      );
    }

    store.dispatch(resetRemoteNode());
  }

  async watchBlockHeaders() {
    // Unsubscribe before starting
    this.unsubscribe();

    const requestId = await this.send('eth_subscribe', ['newHeads']);

    if (!requestId) {
      ethereumNodeRemoteLog.error('No return request id for subscription');
      return;
    }

    const callback = data => {
      if (!data) {
        return;
      }

      try {
        data = JSON.parse(data);
      } catch (error) {
        ethereumNodeRemoteLog.trace('Error parsing data: ', data);
      }

      if (data.id === requestId && data.result) {
        this._syncSubscriptionId = data.result;
      }

      if (
        data.params &&
        data.params.subscription &&
        data.params.subscription === this._syncSubscriptionId &&
        data.params.result.number
      ) {
        store.dispatch(remoteBlockReceived(data.params.result));
      }
    };

    this.ws.on('message', callback);
  }

  unsubscribe() {
    if (this._syncSubscriptionId) {
      this.send('eth_unsubscribe', [this._syncSubscriptionId]);
      this._syncSubscriptionId = null;
    }
  }

  get connected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

module.exports = new EthereumNodeRemote();
