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

export const Infura = {
    ethereum: {
        endpoints: {
            Main: 'https://mainnet.infura.io',
            Ropsten: 'https://ropsten.infura.io',
            Rinkeby: 'https://rinkeby.infura.io',
            Kovan: 'https://kovan.infura.io'
        },
        token: '76PyENot1npWxmi8u28i'
    },
    ipfs: {
        gateway: 'https://ipfs.infura.io',
        rpc: 'https://ipfs.infura.io:5001'
    }
}