export const initialState = {
    active: 'remote',
    network: 'main',
    remote: {
        client: 'infura',
        blockNumber: 100,
        timestamp: 0,
    },
    local: {
        client: 'geth',
        currentBlock: 0,
        highestBlock: 0,
        knownStates: 0,
        pulledStates: 0,
        startingBlock: 0,
    }
}

const nodes = (state = initialState, action) => {
    switch (action.type) {
        case '[MAIN]:LOCAL_NODE:SYNC_UPDATE':
            return Object.assign({}, state, {
                local: {
                    client: 'geth',
                    currentBlock: action.payload.currentBlock,
                    highestBlock: action.payload.highestBlock,
                    knownStates: action.payload.knownStates,
                    pulledStates: action.payload.pulledStates,
                    startingBlock: action.payload.startingBlock,
                }
            });
        case '[MAIN]:REMOTE_NODE:BLOCK_HEADER_RECEIVED':
            return Object.assign({}, state, {
                remote: {
                    client: 'infura',
                    blockNumber: action.payload.blockNumber,
                    timestamp: action.payload.timestamp,
                }
            });
        case '[MAIN]:NODES:CHANGE_ACTIVE':
            return Object.assign({}, state, {
                active: action.payload.active,
            });
        case '[MAIN]:NODES:CHANGE_NETWORK':
            return Object.assign({}, state, {
                network: action.payload.network,
                remote: initialState.remote,
                local: initialState.local,
            });
        default:
            return state;
    }
}

export default nodes;
