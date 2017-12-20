import NodeState from '../ethereum_node/reducer';

export const initialState = {
    nodeState: NodeState.Disabled,
    enableOnStart: false
}

const swarm = (state = initialState, action) => {
    switch (action.type) {
        case '[SWARM]:NODE:ENABLING':
            return Object.assign({}, state, { nodeState: NodeState.Enabling });
        case '[SWARM]:NODE:ENABLED':
            return Object.assign({}, state, { nodeState: NodeState.Enabled });
        case '[SWARM]:NODE:DISABLING':
            return Object.assign({}, state, { nodeState: NodeState.Disabling });
        case '[SWARM]:NODE:DISABLED':
            return Object.assign({}, state, { nodeState: NodeState.Disabled });
        case '[SWARM]:NODE:ERROR':
            return Object.assign({}, state, { nodeState: NodeState.Error });
        case '[SWARM]:SETTINGS:ENABLE_ON_START':
            return Object.assign({}, state, { enableOnStart: true });
        case '[SWARM]:SETTINGS:DISABLE_ON_START':
            return Object.assign({}, state, { enableOnStart: false });
        default:
            return state;
    }
}

export default swarm;
