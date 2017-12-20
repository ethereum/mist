import { NodeState } from '../constants';

export const NodeType = {
    Geth: 'Geth',
    Parity: 'Parity',
    Cpp: 'Cpp',
    Infura: 'Infura'
};

export const NodeNetwork = {
    Main: 'Main',
    Rinkeby: 'Rinkeby',
    Ropsten: 'Ropsten',
    Koavan: 'Kovan',
};

export const NodeSyncMode = {
    Full: 'Full',
    Fast: 'Fast',
    Light: 'Light',
};

export const initialState = {
    state: NodeState.Disabled,
    type: NodeType.Geth,
    network: NodeNetwork.Main,
    syncMode: NodeSyncMode.Light,
    rpc: null,
    process: null,
    currentProviderAddress: null,
    latestBlockHeader: null,
    accounts: []
};

const ethereumNode = (state = initialState, action) => {
    switch (action.type) {
        case '[ETHEREUM]:NODE:ENABLING':
            return Object.assign({}, state, {
                state: NodeState.Enabling
            });
        case '[ETHEREUM]:NODE:SPAWN':
            return Object.assign({}, state, {
                process: action.process
            });
        case '[ETHEREUM]:NODE:ENABLED':
            return Object.assign({}, state, {
                state: NodeState.Enabled,
            });
        case '[ETHEREUM]:NODE:CONNECTED':
            return Object.assign({}, state, {
                state: NodeState.Connected,
                currentProviderAddress: action.currentProviderAddress
            });
        case '[ETHEREUM]:NODE:DISABLING':
            return Object.assign({}, state, {
                state: NodeState.Disabling,
                webSocketAddress: null
            });
        case '[ETHEREUM]:NODE:DISABLED':
            return Object.assign({}, state, {
                state: NodeState.Disabled,
                process: null
            });
        case '[ETHEREUM]:NODE:ERROR':
            return Object.assign({}, state, {
                state: NodeState.Error
            });
        case '[ETHEREUM]:NETWORK:NEW_BLOCK_HEADER':
            return Object.assign({}, state, {
                latestBlockHeader: action.latestBlockHeader
            });
        case '[ETHEREUM]:ACCOUNTS:SYNC':
            return Object.assign({}, state, {
                accounts: action.accounts
            });
        default:
            return state;
    }
};

export default ethereumNode;
