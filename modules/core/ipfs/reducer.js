import NodeState from '../ethereum_node/reducer';

export const initialState = {
    nodeState: NodeState.Disabled,
    enableOnStart: false,
    gateway: null,
    rpc: null
}

const swarm = (state = initialState, action) => {
    switch (action.type) {
        case '[IPFS]:NODE:ENABLING':
            return Object.assign({}, state, { nodeState: NodeState.Enabling });
        case '[IPFS]:NODE:ENABLED':
            return Object.assign({}, state, { nodeState: NodeState.Enabled });
        case '[IPFS]:NODE:CONNECTED':
            return Object.assign({}, state, {
                nodeState: NodeState.Connected,
                gateway: action.gateway,
                rpc: action.rpc
            });
        case '[IPFS]:NODE:DISABLING':
            return Object.assign({}, state, { nodeState: NodeState.Disabling });
        case '[IPFS]:NODE:DISABLED':
            return Object.assign({}, state, {
                nodeState: NodeState.Disabled,
                gateway: null,
                rpc: null
            });
        case '[IPFS]:NODE:ERROR':
            return Object.assign({}, state, { nodeState: NodeState.Error });
        case '[IPFS]:SETTINGS:ENABLE_ON_START':
            return Object.assign({}, state, { enableOnStart: true });
        case '[IPFS]:SETTINGS:DISABLE_ON_START':
            return Object.assign({}, state, { enableOnStart: false });
        default:
            return state;
    }
}

export default swarm;
