export const initialState = {
    connectedClient: '',
    remote: {
        client: 'infura',
        blockNumber: 0,
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
        default:
            return state;
    }
}

export default nodes;
