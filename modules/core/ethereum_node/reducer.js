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
    providerAddress: null,
};

const ethereumNode = (state = initialState, action) => {
    switch (action.type) {
        case '[ETHEREUM]:NODE:ENABLING':
            return Object.assign({}, state, {
                state: NodeState.Enabling
            });
        case '[ETHEREUM]:NODE:SPAWN':
            return Object.assign({}, state, {
                process: action.payload.process
            });
        case '[ETHEREUM]:NODE:ENABLED':
            return Object.assign({}, state, {
                state: NodeState.Enabled,
                providerAddress: action.payload.webSocketAddress
            });
        case '[ETHEREUM]:NODE:CONNECTED':
            return Object.assign({}, state, {
                state: NodeState.Connected,
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
        default:
            return state;
    }
};

export default ethereumNode;
