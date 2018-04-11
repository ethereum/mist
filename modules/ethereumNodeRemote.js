const EventEmitter = require('events').EventEmitter;
import logger from './utils/logger';
const ethereumNodeRemoteLog = logger.create('EthereumNodeRemote');
const Sockets = require('./socketManager');
const Web3 = require('web3');
const Settings = require('./settings');
import { resetRemoteNode, remoteBlockReceived } from './core/nodes/actions';
import { InfuraEndpoints } from './constants';

let instance;

class EthereumNodeRemote extends EventEmitter {
  constructor() {
    super();

    if (!instance) {
      instance = this;
    }

    return instance;
  }

  async start() {
    if (this.starting) {
      ethereumNodeRemoteLog.trace('Already starting...');
      return;
    }

    this.starting = true;

    this.network =
      Settings.network || Settings.loadUserData('network') || 'main';

    const provider = this._getProvider(this.network);

    if (!provider) {
      return;
    }

    this.web3 = new Web3(provider);

    try {
      await this.watchBlockHeaders();
    } catch (error) {
      ethereumNodeRemoteLog.error('Error starting: ', error);
    } finally {
      this.starting = false;
    }

    return true;
  }

  setNetwork(network) {
    this.network = network;

    const provider = this._getProvider(network);

    if (!provider) {
      this.stop();
      return;
    }

    this.web3 = new Web3(provider);
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
    this.web3 = null;
    store.dispatch(resetRemoteNode());
  }

  watchBlockHeaders() {
    // Unsubscribe before starting
    this.unsubscribe();

    return (this._syncSubscription = this.web3.eth
      .subscribe('newBlockHeaders', (error, sync) => {
        if (error) {
          ethereumNodeRemoteLog.log('Subscription error:', error);

          if (error.toString().toLowerCase().includes('connect')) {
            // Try restarting connection
            this.start();
          }
        }
      })
      .on('data', blockHeader => {
        if (blockHeader.number) {
          store.dispatch(remoteBlockReceived(blockHeader));
        }
      }));
  }

  unsubscribe() {
    if (this._syncSubscription) {
      this._syncSubscription.unsubscribe((error, success) => {
        if (error) {
          ethereumNodeRemoteLog.error(
            'Error unsubscribing remote sync subscription: ',
            error
          );
          return;
        }
        if (success) {
          ethereumNodeRemoteLog.trace('Unsubscribed remote sync subscription');
          this._syncSubscription = null;
        }
      });
    }
  }

  get connected() {
    return this.web3 && this.web3.givenProvider;
  }
}

module.exports = new EthereumNodeRemote();
