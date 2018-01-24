const EventEmitter = require('events').EventEmitter;
import logger from './utils/logger';
const ethereumNodeRemoteLog = logger.create('EthereumNodeRemote');
const Sockets = require('./socketManager');
const Web3 = require('web3-1.0');
const Settings = require('./settings');
import { resetRemoteNode } from './core/nodes/actions';
import { InfuraEndpoints } from './constants';

const STATES = {
    STARTING: 0, /* Node about to be started */
    STARTED: 1, /* Node started */
    CONNECTED: 2, /* IPC connected - all ready */
    STOPPING: 3, /* Node about to be stopped */
    STOPPED: 4, /* Node stopped */
    ERROR: -1, /* Unexpected error */
};

let instance;

class EthereumNodeRemote extends EventEmitter {
    constructor() {
        super();

        if (!instance) { instance = this; }

        return instance;
    }

    start() {
        this.network = Settings.network || Settings.loadUserData('network') || 'main';

        const provider = this._getProvider(this.network);

        if (!provider) {
            return;
        }

        this.web3 = new Web3(provider);

        return this.watchBlockHeaders();
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
        switch(network) {
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
        this.web3 = null;
        store.dispatch(resetRemoteNode());
    }

    send(method) {
        // TODO:
    }

    watchBlockHeaders() {
        this._syncSubscription = this.web3.eth.subscribe('newBlockHeaders', (error, sync) => {
            if (error) {
                console.log('Subscription error:', error);

                if (error.reason.includes('Connection dropped by remote peer.')) {
                    // Try restarting connection
                    this.start();
                } else {
                    // Try restarting subscription
                    this.watchBlockHeaders();
                }
            }
        })
        .on("data", blockHeader => {
            if (blockHeader.number) {
                store.dispatch({
                    type: '[MAIN]:REMOTE_NODE:BLOCK_HEADER_RECEIVED',
                    payload: {
                        blockNumber: blockHeader.number,
                        timestamp: blockHeader.timestamp
                    }
                });
            }
        });
    }

    unsubscribe() {
        this._syncSubscription.unsubscribe((err, success) => {
            if (success) { console.log('∆∆∆ succesfully unsubscribed'); }
        });
    }

    get connected() {
        return this.web3 && this.web3.givenProvider
    }
}

module.exports = new EthereumNodeRemote();
