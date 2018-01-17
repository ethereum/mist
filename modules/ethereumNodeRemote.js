const EventEmitter = require('events').EventEmitter;
import logger from './utils/logger';
const ethereumNodeRemoteLog = logger.create('EthereumNodeRemote');

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

class EthereumNodeRemote extends EventEmitter {
    constructor() {
        super();

        // TODO: fetch previously used network

        // Infura needs to handle:
        // getBlock, isSyncing, getPeerCount?

        const provider = InfuraEndpoints.ethereum.websockets.Main;
        const Web3 = require('web3-1.0');
		this.web3 = new Web3(provider);
    }

    start() {
        const provider = InfuraEndpoints.ethereum.websockets.Main;
        const Web3 = require('web3-1.0');
        this.web3 = new Web3(provider);
    }

    stop() {
        this.web3 = null;
    }

    send(method) {
        // TODO:
    }

    subscribe() {
        console.log('∆∆∆ starting subscribe...');
        this._syncSubscription = this.web3.eth.subscribe('newBlockHeaders', (error, sync) => {
            if (error) { console.log('Subscription error:', error); }
        })
        .on("data", blockHeader => {
            console.log('∆∆∆ blockHeader', blockHeader);
            if (blockHeader.number) {
                store.dispatch({
                    type: '[MAIN]:INFURA_BLOCK_HEADER:RECEIVED',
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
