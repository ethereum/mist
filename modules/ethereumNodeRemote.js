const EventEmitter = require('events').EventEmitter;
import logger from './utils/logger';
const ethereumNodeRemoteLog = logger.create('EthereumNodeRemote');
const Sockets = require('./socketManager');
const Web3 = require('web3-1.0');

const STATES = {
    STARTING: 0, /* Node about to be started */
    STARTED: 1, /* Node started */
    CONNECTED: 2, /* IPC connected - all ready */
    STOPPING: 3, /* Node about to be stopped */
    STOPPED: 4, /* Node stopped */
    ERROR: -1, /* Unexpected error */
};

export const InfuraEndpoints = {
    ethereum: {
        http: {
            Main: 'https://mainnet.infura.io/mist',
            Ropsten: 'https://ropsten.infura.io/mist',
            Rinkeby: 'https://rinkeby.infura.io/mist',
            Kovan: 'https://kovan.infura.io/mist'
        },
        websockets: {
            Main: 'wss://mainnet.infura.io/ws',
            Ropsten: 'wss://ropsten.infura.io/ws',
            Rinkeby: 'wss://rinkeby.infura.io/ws',
            Kovan: 'wss://kovan.infura.io/ws'
        }
    },
    ipfs: {
        gateway: 'https://ipfs.infura.io',
        rpc: 'https://ipfs.infura.io:5001'
    }
}

let instance;

class EthereumNodeRemote extends EventEmitter {
    constructor() {
        super();

        if (!instance) { instance = this; }

        // TODO: fetch previously used network from local storage

        this.start();

        return instance;
    }

    start() {
        const provider = InfuraEndpoints.ethereum.websockets.Rinkeby;
        this.web3 = new Web3(provider);
    }

    stop() {
        this.web3 = null;
    }

    send(method) {
        // TODO:
    }

    watchBlockHeaders() {
        console.log('∆∆∆ starting watchBlockHeaders...');
        this._syncSubscription = this.web3.eth.subscribe('newBlockHeaders', (error, sync) => {
            if (error) { console.log('Subscription error:', error); }
        })
        .on("data", blockHeader => {
            // console.log('∆∆∆ blockHeader', blockHeader);
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
}

module.exports = new EthereumNodeRemote();
