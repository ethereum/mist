import ethereumNodeRemote from '../../ethereumNodeRemote';

export function changeNetwork(network) {
    ethereumNodeRemote.setNetwork(network);
    return { type: '[MAIN]:NODES:CHANGE_NETWORK', payload: { network } };
}

export function syncLocalNode(payload) {
    return {
        type: '[MAIN]:LOCAL_NODE:SYNC_UPDATE',
        payload: {
            currentBlock: parseInt(payload.currentBlock, 16),
            highestBlock: parseInt(payload.highestBlock, 16),
            knownStates: parseInt(payload.knownStates, 16),
            pulledStates: parseInt(payload.pulledStates, 16),
            startingBlock: parseInt(payload.startingBlock, 16),
        }
    };
}
