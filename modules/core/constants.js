export const NodeState = {
    Enabling: 'Enabling',
    Enabled: 'Enabled',
    Connecting: 'Connecting',
    Connected: 'Connected',
    Disconnected: 'Disconnected',
    Disabling: 'Disabling',
    Disabled: 'Disabled',
    Error: 'Error'
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